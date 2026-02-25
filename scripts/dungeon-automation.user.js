// ==UserScript==
// @name         Hero Wars — Dungeon Automation
// @namespace    hero-wars-tools
// @version      0.4.5
// @description  Automates daily dungeon grinding. Main-account safe: UI clicks only, human-like timing.
// @match        https://www.hero-wars.com/*
// @match        https://hero-wars.com/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // ─────────────────────────────────────────────────────────────────────────
    // HOW THIS SCRIPT WORKS
    //
    // Press F9 (or click Start in the overlay) while on the dungeon screen.
    // The script runs automatically until your team loses a battle.
    //
    // Per-floor sequence (fully automatic):
    //   1. Click the door for this floor
    //   2. Floors 5, 7, 10 have two enemy teams — choose prime or nonprime based on power
    //      All other floors have one enemy team — click the single Attack button
    //   3. Click Battle → Auto → Speed Up
    //   4. Click OK when battle ends
    //   5. Repeat for the next floor
    //
    // After floor 10:
    //   Click reward icon → Collect → automatically starts next level
    //
    // Stops when:
    //   • Battle is lost (team too weak)
    //   • Session floor/time limit is reached
    //   • You press F9 or click Stop
    //
    // SETUP ORDER:
    //   1. Set coordMode: true, install in Tampermonkey, reload the game
    //   2. Click each button/door — coordinates print in the console
    //   3. Fill in DOORS and BUTTONS below
    //   4. Set coordMode: false
    //   5. Navigate into the dungeon, press F9 or click Start
    //      — the script clicks the door automatically from there
    // ─────────────────────────────────────────────────────────────────────────

    const CONFIG = {
        // Coordinate finder mode. Set true to map button positions.
        coordMode: false,

        // ── Attack button choice ─────────────────────────────────────────────
        // 'auto'         — pick weaker team normally; if gap > attackPowerThreshold, pick stronger
        // 'avoid_heroes' — avoid teams containing specific hero IDs
        attackStrategy: 'auto',

        // Power gap at which 'auto' switches to the STRONGER team.
        // Small gap (≤ threshold): fight the weaker team (easier win).
        // Large gap (> threshold): fight the stronger team (likely the one your prime titans counter).
        attackPowerThreshold: 50_000,

        // Hero IDs to avoid (only used if attackStrategy is 'avoid_heroes').
        // Find IDs in: reference-projects/hw-simulator/dist/assets/json/lords.json
        avoidHeroIds: [],

        // ── Session safety limits ────────────────────────────────────────────
        maxFloorsPerSession: 100,  // effectively unlimited — adjust if needed
        maxSessionMinutes:   90,   // hard stop after 90 minutes

        // ── Click timing (milliseconds) ──────────────────────────────────────
        timing: {
            afterDoorClick:    { min: 2000, max: 2500 }, // wait for battle setup screen
            afterAttackChoice: { min: 1800, max: 2100 }, // wait after attack button click
            afterBattleButton: { min: 2100, max: 2350 }, // wait before clicking Auto
            afterAuto:         { min: 800,  max: 1000  }, // wait before Speed Up
            afterBattleEnd:    { min: 1800, max: 2000 }, // wait before OK
            afterOk:           { min: 3500, max: 4300 }, // wait before next door click
            afterRewardIcon:   { min: 3500, max: 4200 }, // wait for reward screen
            afterCollect:      { min: 6000, max: 6500 }, // wait for level transition — tune as needed

            // Occasional idle pause mid-session (simulates stepping away)
            idlePause: { frequency: 0.05, min: 90_000, max: 240_000 },
        },
    };

    // Floor positions (0-based) that present two enemy teams (prime + nonprime choice).
    // All other floors have a single Attack button.
    const TWO_TEAM_FLOORS = new Set([4, 6, 9]); // floors 5, 7, 10

    // ─────────────────────────────────────────────────────────────────────────
    // DOOR COORDINATES — one per floor position (floor 1–10)
    // Each floor's door appears in a different spot on screen.
    // Index 0 = floor 1, index 9 = floor 10.
    // ─────────────────────────────────────────────────────────────────────────

    const DOORS = [
        { x: 0.6763, y: 0.3771 },  // floor 1  — mapped with coordMode
        { x: 0.4925, y: 0.3313 },  // floor 2
        { x: 0.4941, y: 0.3682 },  // floor 3
        { x: 0.4884, y: 0.3751 },  // floor 4
        { x: 0.5250, y: 0.3443 },  // floor 5
        { x: 0.5126, y: 0.3632 },  // floor 6
        { x: 0.5101, y: 0.3602 },  // floor 7
        { x: 0.4951, y: 0.3373 },  // floor 8
        { x: 0.4925, y: 0.3672 },  // floor 9
        { x: 0.6639, y: 0.3254 },  // floor 10
    ];

    // ─────────────────────────────────────────────────────────────────────────
    // FIXED BUTTON COORDINATES
    // These appear in the same position regardless of floor.
    // ─────────────────────────────────────────────────────────────────────────

    const BUTTONS = {
        // Battle setup screen (after clicking the door)
        attack_single:   { x: 0.5126, y: 0.7512 },  // centered button — single-enemy floors
        attack_prime:    { x: 0.3232, y: 0.7403 },  // left button — two-enemy floors
        attack_nonprime: { x: 0.6835, y: 0.7393 },  // right button — two-enemy floors
        battle:          { x: 0.8005, y: 0.8995 },  // Battle / start button

        // During battle
        auto:            { x: 0.9282, y: 0.9294 },  // Auto button
        speed_up:        { x: 0.9597, y: 0.8239 },  // Speed Up button

        // After battle
        ok:              { x: 0.5111, y: 0.8010 },  // OK / close results

        // After floor 10
        reward_icon:     { x: 0.3051, y: 0.3692 },  // symbol to open reward screen
        collect:         { x: 0.6526, y: 0.6965 },  // Collect button inside reward screen
    };

    // ─────────────────────────────────────────────────────────────────────────
    // STATE
    // ─────────────────────────────────────────────────────────────────────────

    const state = {
        running:           false,
        sessionStart:      null,
        floorsThisSession: 0,
        floorIndex:        0,       // 0–9 within current level
        attackOptions:     null,    // { prime: {...}, nonprime: {...} } — only used on floors 5/7/10
        absoluteFloor:     null,
        statusInterval:    null,    // timer that updates the overlay display
    };

    // ─────────────────────────────────────────────────────────────────────────
    // UTILITIES
    // ─────────────────────────────────────────────────────────────────────────

    const rand       = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const wait       = ms => new Promise(resolve => setTimeout(resolve, ms));
    const waitRandom = range => wait(rand(range.min, range.max));

    function log(msg, data) {
        const prefix = '[HW-Dungeon]';
        data !== undefined ? console.log(prefix, msg, data) : console.log(prefix, msg);
    }

    function elapsedMinutes() {
        return state.sessionStart
            ? Math.round((Date.now() - state.sessionStart) / 60_000)
            : 0;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CANVAS CLICKER
    // ─────────────────────────────────────────────────────────────────────────

    function getCanvas() {
        return document.querySelector('canvas');
    }

    function clickAt(normX, normY, jitterPx = 10) {
        const canvas = getCanvas();
        if (!canvas) { log('ERROR: canvas not found'); return false; }

        const rect = canvas.getBoundingClientRect();
        const x = rect.left + normX * rect.width  + rand(-jitterPx, jitterPx);
        const y = rect.top  + normY * rect.height + rand(-jitterPx, jitterPx);

        ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(type => {
            canvas.dispatchEvent(new MouseEvent(type, {
                clientX: x, clientY: y, bubbles: true, cancelable: true,
            }));
        });

        log(`Click (${normX.toFixed(3)}, ${normY.toFixed(3)})`);
        return true;
    }

    function clickButton(name) {
        const btn = BUTTONS[name];
        if (!btn) { log(`ERROR: unknown button "${name}"`); return false; }
        if (btn.x === 0 && btn.y === 0) {
            log(`WARNING: "${name}" not mapped — run coordMode first`); return false;
        }
        return clickAt(btn.x, btn.y);
    }

    function clickDoor(floorIndex) {
        const door = DOORS[floorIndex];
        if (!door || (door.x === 0 && door.y === 0)) {
            log(`WARNING: door for floor ${floorIndex + 1} not mapped — run coordMode first`);
            return false;
        }
        log(`Clicking door for floor ${floorIndex + 1}`);
        return clickAt(door.x, door.y);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // COORDINATE FINDER MODE
    // ─────────────────────────────────────────────────────────────────────────

    function startCoordMode() {
        log('════════════════════════════════════════');
        log('COORD MODE ACTIVE — click each button in the game');
        log('');
        log('DOORS (navigate to each floor, click its door):');
        log('  DOORS[0] through DOORS[9]  — floor 1 through floor 10');
        log('');
        log('BUTTONS (fixed positions — map once from any floor):');
        log('  attack_single   — centered button, single-enemy floors');
        log('  attack_prime    — left button, two-enemy floors');
        log('  attack_nonprime — right button, two-enemy floors');
        log('  battle          — Battle / start button');
        log('  auto            — Auto button (during battle)');
        log('  speed_up        — Speed Up button (during battle)');
        log('  ok              — OK after battle ends');
        log('  reward_icon     — reward symbol after floor 10');
        log('  collect         — Collect button in reward screen');
        log('════════════════════════════════════════');

        getCanvas().addEventListener('click', e => {
            const rect = getCanvas().getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width).toFixed(4);
            const y = ((e.clientY - rect.top)  / rect.height).toFixed(4);
            log(`→ x: ${x},  y: ${y}`);
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ATTACK CHOICE LOGIC
    // ─────────────────────────────────────────────────────────────────────────

    // Reads floor.userData from a dungeonGetInfo or dungeonEndBattle response
    // and stores the prime/nonprime team power for the upcoming choice floors (5, 7, 10).
    // Ignored for single-team floors — chooseAttack() uses TWO_TEAM_FLOORS to decide.
    function extractFloorData(floorObj) {
        const userData = floorObj?.userData;
        if (!Array.isArray(userData) || userData.length < 2) return;

        // userData[0] = left button (prime), userData[1] = right button (nonprime).
        // Use positional order — element string matching is unreliable across floor types.
        state.attackOptions = {
            prime:    { power: userData[0].power || 0, heroIds: (userData[0].team || []).map(h => h.id) },
            nonprime: { power: userData[1].power || 0, heroIds: (userData[1].team || []).map(h => h.id) },
        };
        log(`Attack data: prime power ${state.attackOptions.prime.power}, nonprime power ${state.attackOptions.nonprime.power}`);
    }

    // Returns the BUTTONS key to click
    function chooseAttack() {
        if (!TWO_TEAM_FLOORS.has(state.floorIndex)) {
            log(`Floor ${state.floorIndex + 1}: single team → attack_single`);
            return 'attack_single';
        }
        const opts = state.attackOptions;
        if (!opts?.prime) {
            log('No attack data yet — defaulting to prime');
            return 'attack_prime';
        }
        if (CONFIG.attackStrategy === 'auto') {
            const pp   = opts.prime.power;
            const np   = opts.nonprime?.power ?? Infinity;
            const diff = Math.abs(pp - np);
            let choice;
            if (diff > CONFIG.attackPowerThreshold) {
                // Large gap: fight the stronger team (likely the element your prime titans counter)
                choice = pp >= np ? 'attack_prime' : 'attack_nonprime';
                log(`Attack choice: prime=${pp} nonprime=${np} diff=${diff} > threshold → stronger → ${choice}`);
            } else {
                // Small gap: fight the weaker team
                choice = pp <= np ? 'attack_prime' : 'attack_nonprime';
                log(`Attack choice: prime=${pp} nonprime=${np} diff=${diff} ≤ threshold → weaker → ${choice}`);
            }
            return choice;
        }
        if (CONFIG.attackStrategy === 'avoid_heroes') {
            const ph = CONFIG.avoidHeroIds.some(id => opts.prime.heroIds?.includes(id));
            const nh = CONFIG.avoidHeroIds.some(id => opts.nonprime?.heroIds?.includes(id));
            if (ph && !nh) { log('Avoiding prime → nonprime'); return 'attack_nonprime'; }
            if (nh && !ph) { log('Avoiding nonprime → prime'); return 'attack_prime'; }
            const pp   = opts.prime.power;
            const np   = opts.nonprime?.power ?? Infinity;
            const diff = Math.abs(pp - np);
            const choice = diff > CONFIG.attackPowerThreshold
                ? (pp >= np ? 'attack_prime' : 'attack_nonprime')
                : (pp <= np ? 'attack_prime' : 'attack_nonprime');
            return choice;
        }
        return 'attack_prime';
    }

    // ─────────────────────────────────────────────────────────────────────────
    // XHR OBSERVER — read-only, never modifies or replays requests
    // ─────────────────────────────────────────────────────────────────────────

    function installXhrObserver() {
        const original = XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.send = function (body) {
            const requestBody = body;
            this.addEventListener('load', () => {
                try {
                    const url = this.responseURL || '';
                    if (!url.includes('nextersglobal.com/api/')) return;

                    const json = JSON.parse(this.responseText);
                    handleResponse(json, requestBody);
                } catch (_) {}
            });
            return original.apply(this, arguments);
        };

        log('XHR observer active');
    }

    function handleResponse(json, requestBody) {
        // All game calls go to /api/ with structure:
        //   Request:  { calls: [{ name, args, ident }, ...] }
        //   Response: { results: [{ ident, result: { response: {...} } }, ...] }
        //
        // The body is a binary ArrayBuffer — decode it with TextDecoder first.
        // Multiple calls can be batched in one request (e.g. stashClient + dungeonStartBattle).
        // Match each call to its result by ident.

        let calls;
        try {
            const text = (requestBody instanceof ArrayBuffer || ArrayBuffer.isView(requestBody))
                ? new TextDecoder().decode(requestBody)
                : requestBody;
            calls = JSON.parse(text)?.calls;
        } catch (_) { return; }

        if (!calls?.length) return;

        // Build a name→call map so we can log action names alongside results
        const callByIdent = Object.fromEntries(calls.map(c => [c.ident, c]));

        // ── Dungeon state scanner ────────────────────────────────────────────
        // Only scan results from dungeon-prefixed actions to avoid picking up
        // floorNumber fields from unrelated calls (e.g. towerGetInfo).
        for (const resultEntry of (json?.results ?? [])) {
            const actionName = callByIdent[resultEntry.ident]?.name ?? '';
            if (!actionName.startsWith('dungeon')) continue;
            tryExtractDungeonData(actionName, resultEntry?.result?.response);
        }

        // ── Known action dispatch ────────────────────────────────────────────
        for (const call of calls) {
            const { name: actionName, args: requestArgs, ident } = call;
            const resultEntry = json?.results?.find(r => r.ident === ident);
            const data = resultEntry?.result?.response;

            if (actionName === 'dungeonGetInfo') {
                // Fires when the dungeon screen opens — returns the CURRENT floor number
                // and floor.userData describing the team(s) to fight on this floor.
                const floorNum = Number(data?.floorNumber);
                if (floorNum) {
                    const newIndex = (floorNum % 10 + 9) % 10;
                    state.floorIndex    = newIndex;
                    state.absoluteFloor = floorNum;
                    log(`dungeonGetInfo: floor ${floorNum} → position ${newIndex + 1}/10`);
                    updateOverlay();
                }
                extractFloorData(data?.floor);

            } else if (actionName === 'dungeonStartBattle') {
                log('← dungeonStartBattle', data);
                onBattleStarted();

            } else if (actionName === 'dungeonEndBattle') {
                log('← dungeonEndBattle', data);
                const won = requestArgs?.result?.win !== false;
                // Pre-load next floor's team structure so chooseAttack is ready
                // when clickNextDoor() fires after the OK click.
                extractFloorData(data?.dungeon?.floor);
                onBattleEnded(won);

            } else if (actionName === 'dungeonSaveProgress') {
                log('← dungeonSaveProgress — level complete');
                onLevelComplete();
            }
        }
    }

    // Scans any API response object for dungeon state data.
    // Called on EVERY result in every batch — regardless of which action sent it.
    // The dungeon floor/element data may come from the door-click action, not dungeonStartBattle.
    function tryExtractDungeonData(actionName, data) {
        if (!data || typeof data !== 'object') return;

        // ── Floor number ──────────────────────────────────────────────────────
        // Try multiple known paths — we don't yet know which action carries this.
        const floorNum = Number(
            data.dungeon?.floorNumber
            ?? data.floorNumber
            ?? data.floor?.number
            ?? data.dungeon?.floor
        );

        if (floorNum) {
            // Store for display only. Do NOT sync floorIndex from the API — the API
            // may return the NEXT floor number (one ahead of current), which would
            // cause the wrong door to be clicked. floorIndex is driven by the local
            // counter (incremented after each battle win) which is always correct.
            state.absoluteFloor = floorNum;
            log(`[${actionName}] API floor number: ${floorNum} (display only — local counter drives door clicks)`);
            updateOverlay();
        }

    }

    // ─────────────────────────────────────────────────────────────────────────
    // AUTOMATION FLOW
    // ─────────────────────────────────────────────────────────────────────────

    // Clicks the current floor's door, then attack button, then battle button
    async function clickNextDoor() {
        if (!state.running) return;
        clickDoor(state.floorIndex);
        await waitRandom(CONFIG.timing.afterDoorClick);
        if (!state.running) return;

        // On choice floors (5/7/10), wait up to 3s for power data if not yet received.
        if (TWO_TEAM_FLOORS.has(state.floorIndex) && !state.attackOptions) {
            log('Waiting for floor power data...');
            for (let i = 0; i < 15 && state.running && !state.attackOptions; i++) {
                await wait(200);
            }
        }

        const attack = chooseAttack();
        clickButton(attack);
        await waitRandom(CONFIG.timing.afterAttackChoice);
        if (!state.running) return;

        clickButton('battle');
        // dungeonStartBattle XHR fires → onBattleStarted() called by observer
    }

    async function onBattleStarted() {
        if (!state.running) return;
        updateOverlay();

        await waitRandom(CONFIG.timing.afterBattleButton);
        if (!state.running) return;
        clickButton('auto');

        await waitRandom(CONFIG.timing.afterAuto);
        if (!state.running) return;
        clickButton('speed_up');
        // dungeonEndBattle XHR fires when battle finishes → onBattleEnded() called by observer
    }

    async function onBattleEnded(won) {
        if (!state.running) return;

        state.floorsThisSession++;

        if (!won) {
            log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            log(`BATTLE LOST — floor ${state.floorIndex + 1}, team is too weak to continue`);
            log('Automation stopped. Handle the loss screen manually.');
            log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            stopAutomation('Battle lost');
            return;
        }

        log(`Floor ${state.floorIndex + 1}/10 cleared (${state.floorsThisSession} this session)`);

        if (!sessionOk()) return;

        // Occasional idle pause
        if (Math.random() < CONFIG.timing.idlePause.frequency) {
            const ms = rand(CONFIG.timing.idlePause.min, CONFIG.timing.idlePause.max);
            log(`Idle pause: ${Math.round(ms / 60000)} min`);
            updateOverlay('Pausing...');
            await wait(ms);
            if (!state.running) return;
        }

        // Click OK to dismiss battle results
        await waitRandom(CONFIG.timing.afterBattleEnd);
        if (!state.running) return;
        clickButton('ok');

        const justFinished = state.floorIndex;
        state.floorIndex   = (state.floorIndex + 1) % 10;

        if (justFinished === 9) {
            // Floor 10 complete — collect rewards
            log('Floor 10 cleared — collecting level rewards');
            updateOverlay('Collecting...');
            await waitRandom(CONFIG.timing.afterOk);
            if (!state.running) return;
            clickButton('reward_icon');

            await waitRandom(CONFIG.timing.afterRewardIcon);
            if (!state.running) return;
            clickButton('collect');
            // dungeonSaveProgress XHR fires → onLevelComplete() called by observer
        } else {
            // Normal floor — move to next
            await waitRandom(CONFIG.timing.afterOk);
            if (!state.running) return;
            await clickNextDoor();
        }
    }

    async function onLevelComplete() {
        if (!state.running) return;

        log('Level complete — waiting for next level to load');
        updateOverlay('Next level...');

        await waitRandom(CONFIG.timing.afterCollect);
        if (!state.running) return;

        if (!sessionOk()) return;

        log('Starting next level from floor 1');
        state.floorIndex = 0;
        await clickNextDoor();
    }

    function sessionOk() {
        if (state.floorsThisSession >= CONFIG.maxFloorsPerSession) {
            stopAutomation(`Reached max floors (${CONFIG.maxFloorsPerSession})`);
            return false;
        }
        if (elapsedMinutes() >= CONFIG.maxSessionMinutes) {
            stopAutomation(`Reached max session time (${CONFIG.maxSessionMinutes} min)`);
            return false;
        }
        return true;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // START / STOP
    // ─────────────────────────────────────────────────────────────────────────

    function startAutomation() {
        if (state.running) return;
        state.running           = true;
        state.sessionStart      = Date.now();
        state.floorsThisSession = 0;

        state.statusInterval = setInterval(updateOverlay, 10_000);

        log(`Starting — clicking door for floor ${state.floorIndex + 1}/10. F9 to stop.`);
        updateOverlay('Starting...');
        clickNextDoor();
    }

    function stopAutomation(reason) {
        state.running = false;
        if (state.statusInterval) {
            clearInterval(state.statusInterval);
            state.statusInterval = null;
        }
        const msg = reason || 'Stopped';
        log(`${msg}. Floors this session: ${state.floorsThisSession}`);
        updateOverlay(msg);
    }

    function toggleAutomation() {
        if (state.running) {
            stopAutomation('Stopped by user');
        } else {
            startAutomation();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // OVERLAY UI
    // A floating panel injected into the page (not the canvas).
    // Clicking overlay buttons does NOT interact with the game canvas.
    // ─────────────────────────────────────────────────────────────────────────

    let overlayEl, btnToggle, lblStatus, lblFloor, lblFloors, lblTime;

    function buildOverlay() {
        const el = document.createElement('div');
        el.id = 'hw-dungeon-overlay';
        el.innerHTML = `
            <span id="hw-title">HW</span>
            <span id="hw-floor">Floor —</span>
            <span id="hw-sep">·</span>
            <span id="hw-floors">0 floors</span>
            <span id="hw-sep2">·</span>
            <span id="hw-time">0 min</span>
            <span id="hw-sep3">·</span>
            <span id="hw-status">Ready</span>
            <button id="hw-toggle">Start</button>
            <span id="hw-hint">F9</span>
        `;

        const style = document.createElement('style');
        style.textContent = `
            #hw-dungeon-overlay {
                position: fixed;
                top: 0;
                left: 50%;
                transform: translateX(-50%);
                z-index: 999999;
                display: flex;
                align-items: center;
                gap: 8px;
                background: rgba(10, 10, 20, 0.90);
                border: 1px solid rgba(255,255,255,0.12);
                border-radius: 0 0 8px 8px;
                padding: 4px 14px 6px;
                font-family: monospace;
                font-size: 12px;
                color: #ddd;
                white-space: nowrap;
                user-select: none;
            }
            #hw-title { color: #f0c060; font-weight: bold; letter-spacing: 1px; }
            #hw-floor  { color: #fff; font-weight: bold; }
            #hw-floors { color: #aaa; }
            #hw-time   { color: #aaa; }
            #hw-status { color: #f0c060; }
            #hw-sep, #hw-sep2, #hw-sep3 { color: #444; }
            #hw-toggle {
                padding: 3px 10px;
                background: #2a5a2a;
                color: #7f7;
                border: 1px solid #4a9a4a;
                border-radius: 10px;
                font-family: monospace;
                font-size: 12px;
                cursor: pointer;
            }
            #hw-toggle:hover { background: #3a7a3a; }
            #hw-toggle.running {
                background: #5a2a2a;
                color: #f77;
                border-color: #9a4a4a;
            }
            #hw-hint { color: #444; font-size: 11px; }
        `;

        document.head.appendChild(style);
        document.body.appendChild(el);

        overlayEl  = el;
        btnToggle  = el.querySelector('#hw-toggle');
        lblStatus  = el.querySelector('#hw-status');
        lblFloor   = el.querySelector('#hw-floor');
        lblFloors  = el.querySelector('#hw-floors');
        lblTime    = el.querySelector('#hw-time');

        btnToggle.addEventListener('click', e => {
            e.stopPropagation();
            toggleAutomation();
        });

        // Sync display with any state that was set before the overlay was built
        // (e.g. dungeonGetInfo fires before DOMContentLoaded completes).
        updateOverlay();
    }

    function updateOverlay(statusMsg) {
        if (!overlayEl) return;

        lblFloor.textContent  = `Floor ${state.floorIndex + 1}/10`;
        lblTime.textContent   = `${elapsedMinutes()} min`;
        lblFloors.textContent = `${state.floorsThisSession} floors`;

        if (statusMsg) lblStatus.textContent = statusMsg;
        else if (state.running) lblStatus.textContent = 'Running';
        else lblStatus.textContent = 'Stopped';

        btnToggle.textContent = state.running ? '■ Stop' : '▶ Start';
        btnToggle.className   = state.running ? 'running' : '';
    }

    // ─────────────────────────────────────────────────────────────────────────
    // KEYBOARD SHORTCUT — F9 toggles start/stop
    // ─────────────────────────────────────────────────────────────────────────

    function installKeyboardShortcut() {
        document.addEventListener('keydown', e => {
            if (e.key === 'F9') {
                e.preventDefault();
                toggleAutomation();
            }
        });
        log('Keyboard shortcut: F9 to start/stop');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PUBLIC CONSOLE API — available as fallback if needed
    //
    // HWDungeon.start()   — start automation
    // HWDungeon.stop()    — stop automation
    // HWDungeon.status()  — show current state
    // ─────────────────────────────────────────────────────────────────────────

    window.HWDungeon = {
        start:  startAutomation,
        stop:   () => stopAutomation('Stopped by user'),
        status() {
            log('Status:', {
                running:       state.running,
                floorInLevel:  state.floorIndex + 1,
                absoluteFloor: state.absoluteFloor,
                floorsSession: state.floorsThisSession,
                elapsedMin:    elapsedMinutes(),
            });
        },
    };

    // ─────────────────────────────────────────────────────────────────────────
    // INIT
    // ─────────────────────────────────────────────────────────────────────────

    function init() {
        installXhrObserver();
        installKeyboardShortcut();

        // Always build the overlay — visible in both normal and coordMode
        const poll = setInterval(() => {
            if (document.body) {
                clearInterval(poll);
                buildOverlay();

                if (CONFIG.coordMode) {
                    updateOverlay('Coord Mode');
                    log('Hero Wars Dungeon Automation — COORD MODE. Click buttons in the game.');
                    // Start coord listener once canvas appears
                    const canvasPoll = setInterval(() => {
                        if (getCanvas()) { clearInterval(canvasPoll); startCoordMode(); }
                    }, 500);
                } else {
                    log('Hero Wars Dungeon Automation v0.4.1 ready. Press F9 or click Start.');
                }
            }
        }, 200);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
