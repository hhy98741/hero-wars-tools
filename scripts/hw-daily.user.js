// ==UserScript==
// @name         Hero Wars — Daily Automation
// @namespace    hero-wars-tools
// @version      1.0.4
// @description  Dungeon and tower daily automation. Main-account safe: UI clicks only, human-like timing.
// @match        https://www.hero-wars.com/*
// @match        https://hero-wars.com/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // ─────────────────────────────────────────────────────────────────────────
    // HOW THIS SCRIPT WORKS
    //
    // Press F9 (or click ▶ on the Dungeon row) while on the dungeon screen.
    // Press F8 (or click ▶ on the Tower row) while in the tower.
    //
    // DUNGEON — per-floor sequence (fully automatic):
    //   1. Click the door for this floor
    //   2. Floors 5, 7, 10 have two enemy teams — choose prime or nonprime based on power
    //      All other floors have one enemy team — click the single Attack button
    //   3. Click Battle → Auto → Speed Up
    //   4. Click OK when battle ends; repeat for next floor
    //   After floor 10: click reward icon → Collect → start next level
    //   Stops when battle is lost, session limit reached, or F9 pressed.
    //
    // TOWER — sequence (fully automatic):
    //   Once at start: Instant Clear → Select Chests Myself
    //   Per chest floor (15 specific tower levels: 4,8,10,14,16,20,22,26,28,32,35,39,42,46,50):
    //     1. Click the floor door (position varies: right / left / top)
    //     2. Click one of the 3 chests at random → it opens
    //     3. Click Proceed (floors 1–14) — or Escape on the top floor (50)
    //   Then: skull coin exchange → tower points → collect → Escape × 2
    //
    // SETUP ORDER (for any unmapped buttons):
    //   1. Set coordMode: true in the relevant CONFIG section below
    //   2. Install in Tampermonkey, reload the game
    //   3. Navigate to the relevant screen, click each button — coords print in console
    //   4. Fill in the coordinates in DUNGEON_BUTTONS / DOORS or TOWER_BUTTONS
    //   5. Set coordMode: false
    // ─────────────────────────────────────────────────────────────────────────

    // ═════════════════════════════════════════════════════════════════════════
    // DUNGEON CONFIG
    // ═════════════════════════════════════════════════════════════════════════

    const DUNGEON_CONFIG = {
        // Coordinate finder mode — set true to map button positions.
        coordMode: false,

        // ── Attack button choice ─────────────────────────────────────────────
        // 'auto'         — pick weaker team normally; if gap > attackPowerThreshold, pick stronger
        // 'avoid_heroes' — avoid teams containing specific hero IDs
        attackStrategy: 'auto',

        // Hero IDs to avoid (only used if attackStrategy is 'avoid_heroes').
        avoidHeroIds: [],

        // ── Session safety limits ────────────────────────────────────────────
        maxFloorsPerSession: 100,
        maxSessionMinutes:   90,

        // ── Click timing (milliseconds) ──────────────────────────────────────
        timing: {
            afterDoorClick:    { min: 2000, max: 2500 }, // wait for battle setup screen
            afterAttackChoice: { min: 1800, max: 2100 }, // wait after attack button click
            afterBattleButton: { min: 2100, max: 2350 }, // wait before clicking Auto
            afterAuto:         { min: 800,  max: 1000 }, // wait before Speed Up
            afterBattleEnd:    { min: 1800, max: 2000 }, // wait before OK
            afterOk:           { min: 3500, max: 4300 }, // wait before next door click
            afterRewardIcon:   { min: 3500, max: 4200 }, // wait for reward screen
            afterCollect:      { min: 6000, max: 6500 }, // wait for level transition

            // Occasional idle pause mid-session (simulates stepping away)
            idlePause: { frequency: 0.05, min: 90_000, max: 240_000 },
        },
    };

    // Floor positions (0-based) that present two enemy teams (prime + nonprime).
    // All other floors have a single Attack button.
    const TWO_TEAM_FLOORS = new Set([4, 6, 9]); // floors 5, 7, 10

    // ─────────────────────────────────────────────────────────────────────────
    // DUNGEON DOOR COORDINATES — one per floor position (index 0 = floor 1)
    // ─────────────────────────────────────────────────────────────────────────

    const DOORS = [
        { x: 0.6763, y: 0.3771 },  // floor 1
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
    // DUNGEON BUTTON COORDINATES
    // ─────────────────────────────────────────────────────────────────────────

    const DUNGEON_BUTTONS = {
        // Battle setup screen
        attack_single:   { x: 0.5126, y: 0.7512 },  // centered — single-enemy floors
        attack_prime:    { x: 0.3232, y: 0.7403 },  // left — two-enemy floors
        attack_nonprime: { x: 0.6835, y: 0.7393 },  // right — two-enemy floors
        battle:          { x: 0.8005, y: 0.8995 },  // Battle / start button

        // During battle
        auto:            { x: 0.9282, y: 0.9294 },  // Auto button
        speed_up:        { x: 0.9597, y: 0.8239 },  // Speed Up button

        // After battle
        ok:              { x: 0.5111, y: 0.8010 },  // OK / close results

        // After floor 10
        reward_icon:     { x: 0.3051, y: 0.3692 },  // symbol to open reward screen
        collect:         { x: 0.6526, y: 0.6965 },  // Collect button in reward screen
    };

    // ═════════════════════════════════════════════════════════════════════════
    // TOWER CONFIG
    // ═════════════════════════════════════════════════════════════════════════

    const TOWER_CONFIG = {
        // Coordinate finder mode — set true to map button positions.
        coordMode: false,

        // ── Session safety limits ────────────────────────────────────────────
        maxSessionMinutes: 30,

        // ── Click timing (milliseconds) ──────────────────────────────────────
        timing: {
            afterInstantClear: { min: 1500, max: 2000 }, // wait for "Select Chests Myself" button
            afterNextChest:    { min: 1200, max: 1600 }, // wait after towerNextChest fires before clicking door
            afterChestDoor:    { min: 1000, max: 1500 }, // wait for chest room to load (3 chests visible)
            afterChestOpen:    { min: 2500, max: 3200 }, // wait for chest animation to finish
            afterTopFloor:     { min: 1000, max: 1500 }, // wait after Escape on top floor
            afterSkullButton:  { min: 1200, max: 1600 }, // wait for skull exchange screen
            afterExchange:     { min: 1500, max: 2000 }, // wait after exchange (auto-exits)
            afterTowerPoints:  { min: 1200, max: 1600 }, // wait for rewards screen
            afterCollect:      { min: 1000, max: 1400 }, // wait after collect all
            afterEscape:       { min: 800,  max: 1200 }, // wait between Escape presses
        },
    };

    // ─────────────────────────────────────────────────────────────────────────
    // TOWER CHEST FLOORS — the 15 specific tower levels that have chests
    // DOOR_POSITIONS — which door to click on each floor (parallel array)
    // ─────────────────────────────────────────────────────────────────────────

    const CHEST_FLOORS   = [4, 8, 10, 14, 16, 20, 22, 26, 28, 32, 35, 39, 42, 46, 50];
    const DOOR_POSITIONS = [
        'right', 'right', 'right', 'right',  // floors 4, 8, 10, 14
        'right', 'right', 'right', 'right',  // floors 16, 20, 22, 26
        'right', 'right', 'left',  'left',   // floors 28, 32, 35, 39
        'right', 'right', 'top',             // floors 42, 46, 50
    ];

    // ─────────────────────────────────────────────────────────────────────────
    // TOWER BUTTON COORDINATES — all pre-mapped from coordMode session
    // ─────────────────────────────────────────────────────────────────────────

    const TOWER_BUTTONS = {
        // Run start (clicked once)
        instant_clear:      { x: 0.4785, y: 0.5042 },  // "Instant Clear" button
        select_chests_self: { x: 0.3398, y: 0.7107 },  // "Select Chests Myself" button

        // Floor doors (position varies by floor; click to enter the chest room)
        door_right:         { x: 0.6602, y: 0.5730 },  // right door (floors 4–32, 42, 46)
        door_left:          { x: 0.3659, y: 0.5442 },  // left door (floors 35, 39)
        door_top:           { x: 0.7551, y: 0.5265 },  // top floor door (floor 50)

        // Inside the chest room — 3 chests, randomly chosen each run
        chest_1:            { x: 0.2751, y: 0.6456 },  // left chest
        chest_2:            { x: 0.4978, y: 0.5405 },  // center chest
        chest_3:            { x: 0.7314, y: 0.6428 },  // right chest

        // After chest opens
        proceed:            { x: 0.7763, y: 0.8530 },  // "Proceed" (all floors except top)
        // top floor: press Escape instead — no button click needed

        // End of run — skull coin exchange
        skull_button:       { x: 0.0415, y: 0.0772 },  // open skull coin exchange
        exchange_skulls:    { x: 0.4874, y: 0.6614 },  // exchange skulls for coins (auto-exits)

        // End of run — tower points rewards
        tower_points:       { x: 0.1832, y: 0.9088 },  // Tower Points button
        collect_all:        { x: 0.4820, y: 0.8660 },  // Collect all rewards
        // close rewards and exit tower use pressEscape()
    };

    // ═════════════════════════════════════════════════════════════════════════
    // STATE
    // ═════════════════════════════════════════════════════════════════════════

    const dungeonState = {
        running:           false,
        sessionStart:      null,
        floorsThisSession: 0,
        floorIndex:        0,       // 0–9 within current level
        attackOptions:     null,    // { prime, nonprime } — only on floors 5/7/10
        absoluteFloor:     null,
        statusInterval:    null,
        altPickStronger:   false,   // alternates when powers are close: false = pick weaker, true = pick stronger
        statusLabel:       null,    // sticky status text — persists until next explicit update
    };

    const towerState = {
        running:        false,
        sessionStart:   null,
        chestIndex:     0,      // 0–14: current index into CHEST_FLOORS / DOOR_POSITIONS
        chestsOpened:   0,
        statusInterval: null,
    };

    // ═════════════════════════════════════════════════════════════════════════
    // SHARED UTILITIES
    // ═════════════════════════════════════════════════════════════════════════

    const rand       = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const wait       = ms => new Promise(resolve => setTimeout(resolve, ms));
    const waitRandom = range => wait(rand(range.min, range.max));

    function dungeonLog(msg, data) {
        data !== undefined
            ? console.log('[HW-Dungeon]', msg, data)
            : console.log('[HW-Dungeon]', msg);
    }

    function towerLog(msg, data) {
        data !== undefined
            ? console.log('[HW-Tower]', msg, data)
            : console.log('[HW-Tower]', msg);
    }

    function getCanvas() {
        return document.querySelector('canvas');
    }

    function pressEscape() {
        ['keydown', 'keyup'].forEach(type => {
            document.dispatchEvent(new KeyboardEvent(type, {
                key: 'Escape', code: 'Escape', keyCode: 27, which: 27,
                bubbles: true, cancelable: true,
            }));
        });
    }

    function clickAt(normX, normY, jitterPx = 10) {
        const canvas = getCanvas();
        if (!canvas) { dungeonLog('ERROR: canvas not found'); return false; }

        const rect = canvas.getBoundingClientRect();
        const x = rect.left + normX * rect.width  + rand(-jitterPx, jitterPx);
        const y = rect.top  + normY * rect.height + rand(-jitterPx, jitterPx);

        ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(type => {
            canvas.dispatchEvent(new MouseEvent(type, {
                clientX: x, clientY: y, bubbles: true, cancelable: true,
            }));
        });

        return true;
    }

    // ═════════════════════════════════════════════════════════════════════════
    // DUNGEON — CLICK HELPERS
    // ═════════════════════════════════════════════════════════════════════════

    function dungeonClickButton(name) {
        const btn = DUNGEON_BUTTONS[name];
        if (!btn) { dungeonLog(`ERROR: unknown button "${name}"`); return false; }
        if (btn.x === 0 && btn.y === 0) {
            dungeonLog(`WARNING: "${name}" not mapped — run coordMode first`); return false;
        }
        dungeonLog(`Click ${name} (${btn.x.toFixed(3)}, ${btn.y.toFixed(3)})`);
        return clickAt(btn.x, btn.y);
    }

    function clickDoor(floorIndex) {
        const door = DOORS[floorIndex];
        if (!door || (door.x === 0 && door.y === 0)) {
            dungeonLog(`WARNING: door for floor ${floorIndex + 1} not mapped — run coordMode first`);
            return false;
        }
        dungeonLog(`Clicking door for floor ${floorIndex + 1}`);
        return clickAt(door.x, door.y);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // TOWER — CLICK HELPER
    // ═════════════════════════════════════════════════════════════════════════

    function towerClickButton(name) {
        const btn = TOWER_BUTTONS[name];
        if (!btn) { towerLog(`ERROR: unknown button "${name}"`); return false; }
        if (btn.x === 0 && btn.y === 0) {
            towerLog(`WARNING: "${name}" not mapped — run coordMode first`); return false;
        }
        towerLog(`Click ${name} (${btn.x.toFixed(3)}, ${btn.y.toFixed(3)})`);
        return clickAt(btn.x, btn.y);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // COORD FINDER MODES
    // ═════════════════════════════════════════════════════════════════════════

    function startDungeonCoordMode() {
        dungeonLog('════════════════════════════════════════');
        dungeonLog('DUNGEON COORD MODE — click each element in the game');
        dungeonLog('');
        dungeonLog('DOORS (navigate to each floor, click its door):');
        dungeonLog('  DOORS[0]–DOORS[9]  —  floor 1–10');
        dungeonLog('');
        dungeonLog('DUNGEON_BUTTONS:');
        dungeonLog('  attack_single   — centered button, single-enemy floors');
        dungeonLog('  attack_prime    — left button, two-enemy floors');
        dungeonLog('  attack_nonprime — right button, two-enemy floors');
        dungeonLog('  battle          — Battle / start button');
        dungeonLog('  auto            — Auto button (during battle)');
        dungeonLog('  speed_up        — Speed Up button (during battle)');
        dungeonLog('  ok              — OK after battle ends');
        dungeonLog('  reward_icon     — reward symbol after floor 10');
        dungeonLog('  collect         — Collect button in reward screen');
        dungeonLog('════════════════════════════════════════');

        getCanvas().addEventListener('click', e => {
            const rect = getCanvas().getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width).toFixed(4);
            const y = ((e.clientY - rect.top)  / rect.height).toFixed(4);
            dungeonLog(`→ x: ${x},  y: ${y}`);
        });
    }

    function startTowerCoordMode() {
        towerLog('════════════════════════════════════════');
        towerLog('TOWER COORD MODE — click each element in the game');
        towerLog('');
        towerLog('TOWER coords are pre-mapped. To re-map any button:');
        towerLog('  instant_clear / select_chests_self — one-time start buttons');
        towerLog('  door_right / door_left / door_top  — floor doors');
        towerLog('  chest_1 / chest_2 / chest_3        — left / center / right chest in room');
        towerLog('  proceed                            — Proceed button (top floor uses Escape)');
        towerLog('  skull_button / exchange_skulls     — skull coin exchange');
        towerLog('  tower_points / collect_all         — tower rewards');
        towerLog('  (close rewards and exit tower use Escape — no mapping needed)');
        towerLog('════════════════════════════════════════');

        getCanvas().addEventListener('click', e => {
            const rect = getCanvas().getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width).toFixed(4);
            const y = ((e.clientY - rect.top)  / rect.height).toFixed(4);
            towerLog(`→ x: ${x},  y: ${y}`);
        });
    }

    // ═════════════════════════════════════════════════════════════════════════
    // SHARED XHR OBSERVER — read-only, never modifies or replays requests
    // ═════════════════════════════════════════════════════════════════════════

    function installXhrObserver() {
        const original = XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.send = function (body) {
            const requestBody = body;
            this.addEventListener('load', () => {
                try {
                    const url = this.responseURL || '';
                    if (!url.includes('nextersglobal.com/api/')) return;
                    const json = JSON.parse(this.responseText);
                    dungeonHandleResponse(json, requestBody);
                    towerHandleResponse(json, requestBody);
                } catch (_) {}
            });
            return original.apply(this, arguments);
        };

        dungeonLog('XHR observer active (dungeon + tower)');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DUNGEON XHR HANDLER
    // ─────────────────────────────────────────────────────────────────────────

    function dungeonHandleResponse(json, requestBody) {
        // All game calls: Request { calls: [{name, args, ident}] }
        //                 Response { results: [{ident, result: {response}}] }
        let calls;
        try {
            const text = (requestBody instanceof ArrayBuffer || ArrayBuffer.isView(requestBody))
                ? new TextDecoder().decode(requestBody)
                : requestBody;
            calls = JSON.parse(text)?.calls;
        } catch (_) { return; }
        if (!calls?.length) return;

        const callByIdent = Object.fromEntries(calls.map(c => [c.ident, c]));

        // Scan all dungeon-prefixed results for state data
        for (const resultEntry of (json?.results ?? [])) {
            const actionName = callByIdent[resultEntry.ident]?.name ?? '';
            if (!actionName.startsWith('dungeon')) continue;
            dungeonTryExtractData(actionName, resultEntry?.result?.response);
        }

        // Dispatch to known action handlers
        for (const call of calls) {
            const { name: actionName, args: requestArgs, ident } = call;
            const resultEntry = json?.results?.find(r => r.ident === ident);
            const data = resultEntry?.result?.response;

            if (actionName === 'dungeonGetInfo') {
                // Fires when the dungeon screen opens — returns current floor number
                const floorNum = Number(data?.floorNumber);
                if (floorNum) {
                    const newIndex = (floorNum % 10 + 9) % 10;
                    dungeonState.floorIndex    = newIndex;
                    dungeonState.absoluteFloor = floorNum;
                    dungeonLog(`dungeonGetInfo: floor ${floorNum} → position ${newIndex + 1}/10`);
                    dungeonUpdateOverlay();
                }
                dungeonExtractFloorData(data?.floor);

            } else if (actionName === 'dungeonStartBattle') {
                dungeonLog('← dungeonStartBattle', data);
                dungeonOnBattleStarted();

            } else if (actionName === 'dungeonEndBattle') {
                dungeonLog('← dungeonEndBattle', data);
                const won = requestArgs?.result?.win !== false;
                // Pre-load next floor's team data for the upcoming choice
                dungeonExtractFloorData(data?.dungeon?.floor);
                dungeonOnBattleEnded(won);

            } else if (actionName === 'dungeonSaveProgress') {
                dungeonLog('← dungeonSaveProgress — level complete');
                dungeonOnLevelComplete();
            }
        }
    }

    function dungeonTryExtractData(actionName, data) {
        if (!data || typeof data !== 'object') return;
        const floorNum = Number(
            data.dungeon?.floorNumber ?? data.floorNumber ?? data.floor?.number ?? data.dungeon?.floor
        );
        if (floorNum) {
            dungeonState.absoluteFloor = floorNum;
            dungeonLog(`[${actionName}] API floor: ${floorNum} (display only)`);
            dungeonUpdateOverlay();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TOWER XHR HANDLER
    // ─────────────────────────────────────────────────────────────────────────

    function towerHandleResponse(json, requestBody) {
        let calls;
        try {
            const text = (requestBody instanceof ArrayBuffer || ArrayBuffer.isView(requestBody))
                ? new TextDecoder().decode(requestBody)
                : requestBody;
            calls = JSON.parse(text)?.calls;
        } catch (_) { return; }
        if (!calls?.length) return;

        for (const call of calls) {
            const { name: actionName, ident } = call;
            const resultEntry = json?.results?.find(r => r.ident === ident);
            const data = resultEntry?.result?.response;

            if (actionName === 'towerNextChest') {
                towerLog(`towerNextChest → floor ${CHEST_FLOORS[towerState.chestIndex]} (${towerState.chestIndex + 1}/${CHEST_FLOORS.length})`);
                towerOnNextChest();

            } else if (actionName === 'towerOpenChest') {
                towerLog(`towerOpenChest: chest ${towerState.chestIndex + 1} opened`);
                towerOnChestOpened();

            } else if (actionName === 'tower_getSkullReward') {
                towerLog('tower_getSkullReward:', data);

            } else if (actionName === 'tower_farmSkullReward') {
                towerLog('tower_farmSkullReward:', data);

            } else if (actionName === 'tower_farmPointRewards') {
                towerLog('tower_farmPointRewards:', data);
            }
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // DUNGEON — ATTACK CHOICE LOGIC
    // ═════════════════════════════════════════════════════════════════════════

    function dungeonExtractFloorData(floorObj) {
        const userData = floorObj?.userData;
        if (!Array.isArray(userData) || userData.length < 2) return;

        // userData[0] = left button (prime), userData[1] = right button (nonprime).
        dungeonState.attackOptions = {
            prime:    { power: userData[0].power || 0, heroIds: (userData[0].team || []).map(h => h.id), defenderType: userData[0].defenderType || 'unknown' },
            nonprime: { power: userData[1].power || 0, heroIds: (userData[1].team || []).map(h => h.id), defenderType: userData[1].defenderType || 'unknown' },
        };
        dungeonLog(`Attack data: prime=${dungeonState.attackOptions.prime.power} (${dungeonState.attackOptions.prime.defenderType}), nonprime=${dungeonState.attackOptions.nonprime.power} (${dungeonState.attackOptions.nonprime.defenderType})`);
    }

    function dungeonChooseAttack() {
        if (!TWO_TEAM_FLOORS.has(dungeonState.floorIndex)) {
            dungeonLog(`Floor ${dungeonState.floorIndex + 1}: single team → attack_single`);
            return 'attack_single';
        }
        const opts = dungeonState.attackOptions;
        if (!opts?.prime) {
            dungeonLog('No attack data yet — defaulting to prime');
            return 'attack_prime';
        }
        if (DUNGEON_CONFIG.attackStrategy === 'auto') {
            const primeDef  = opts.prime.defenderType;
            const nonpDef   = opts.nonprime.defenderType;
            const pp        = opts.prime.power;
            const np        = opts.nonprime?.power ?? 0;

            // Priority 1: fire defender — always attack it
            if (primeDef === 'fire') {
                dungeonLog(`Attack: prime is fire → attack_prime`);
                return 'attack_prime';
            }
            if (nonpDef === 'fire') {
                dungeonLog(`Attack: nonprime is fire → attack_nonprime`);
                return 'attack_nonprime';
            }

            // Priority 2: neutral defender — always attack it
            if (primeDef === 'neutral') {
                dungeonLog(`Attack: prime is neutral → attack_prime`);
                return 'attack_prime';
            }
            if (nonpDef === 'neutral') {
                dungeonLog(`Attack: nonprime is neutral → attack_nonprime`);
                return 'attack_nonprime';
            }

            // Priority 3: no fire/neutral — alternate stronger/weaker each time
            const pickStronger = dungeonState.altPickStronger;
            dungeonState.altPickStronger = !dungeonState.altPickStronger;
            const choice = pickStronger
                ? (pp >= np ? 'attack_prime' : 'attack_nonprime')
                : (pp <= np ? 'attack_prime' : 'attack_nonprime');
            dungeonLog(`Attack: ${primeDef} vs ${nonpDef} → ${pickStronger ? 'stronger' : 'weaker'} (alt) → ${choice}`);
            return choice;
        }
        if (DUNGEON_CONFIG.attackStrategy === 'avoid_heroes') {
            const ph = DUNGEON_CONFIG.avoidHeroIds.some(id => opts.prime.heroIds?.includes(id));
            const nh = DUNGEON_CONFIG.avoidHeroIds.some(id => opts.nonprime?.heroIds?.includes(id));
            if (ph && !nh) { dungeonLog('Avoiding prime → nonprime'); return 'attack_nonprime'; }
            if (nh && !ph) { dungeonLog('Avoiding nonprime → prime'); return 'attack_prime'; }
            const pp   = opts.prime.power;
            const np   = opts.nonprime?.power ?? Infinity;
            const diff = Math.abs(pp - np);
            return diff > DUNGEON_CONFIG.attackPowerThreshold
                ? (pp >= np ? 'attack_prime' : 'attack_nonprime')
                : (pp <= np ? 'attack_prime' : 'attack_nonprime');
        }
        return 'attack_prime';
    }

    // ═════════════════════════════════════════════════════════════════════════
    // DUNGEON — AUTOMATION FLOW
    // ═════════════════════════════════════════════════════════════════════════

    async function dungeonClickNextDoor() {
        if (!dungeonState.running) return;
        clickDoor(dungeonState.floorIndex);
        dungeonUpdateOverlay('Entering floor...');
        await waitRandom(DUNGEON_CONFIG.timing.afterDoorClick);
        if (!dungeonState.running) return;

        // On choice floors (5/7/10), wait up to 3s for power data if not yet received
        if (TWO_TEAM_FLOORS.has(dungeonState.floorIndex) && !dungeonState.attackOptions) {
            dungeonLog('Waiting for floor power data...');
            dungeonUpdateOverlay('Loading teams...');
            for (let i = 0; i < 15 && dungeonState.running && !dungeonState.attackOptions; i++) {
                await wait(200);
            }
        }

        const attack = dungeonChooseAttack();
        dungeonClickButton(attack);
        dungeonUpdateOverlay('Choosing attack...');
        await waitRandom(DUNGEON_CONFIG.timing.afterAttackChoice);
        if (!dungeonState.running) return;

        dungeonClickButton('battle');
        // dungeonStartBattle XHR fires → dungeonOnBattleStarted()
    }

    async function dungeonOnBattleStarted() {
        if (!dungeonState.running) return;
        dungeonUpdateOverlay('Battle starting...');

        await waitRandom(DUNGEON_CONFIG.timing.afterBattleButton);
        if (!dungeonState.running) return;
        dungeonClickButton('auto');
        dungeonUpdateOverlay('In battle...');

        await waitRandom(DUNGEON_CONFIG.timing.afterAuto);
        if (!dungeonState.running) return;
        dungeonClickButton('speed_up');
        // dungeonEndBattle XHR fires when battle finishes → dungeonOnBattleEnded()
    }

    async function dungeonOnBattleEnded(won) {
        if (!dungeonState.running) return;

        dungeonState.floorsThisSession++;

        if (!won) {
            dungeonLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            dungeonLog(`BATTLE LOST — floor ${dungeonState.floorIndex + 1}, team too weak`);
            dungeonLog('Automation stopped. Handle the loss screen manually.');
            dungeonLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            dungeonStop('Battle lost');
            return;
        }

        dungeonLog(`Floor ${dungeonState.floorIndex + 1}/10 cleared (${dungeonState.floorsThisSession} this session)`);
        if (!dungeonSessionOk()) return;

        // Occasional idle pause
        if (Math.random() < DUNGEON_CONFIG.timing.idlePause.frequency) {
            const ms = rand(DUNGEON_CONFIG.timing.idlePause.min, DUNGEON_CONFIG.timing.idlePause.max);
            dungeonLog(`Idle pause: ${Math.round(ms / 60000)} min`);
            dungeonUpdateOverlay('Pausing...');
            await wait(ms);
            if (!dungeonState.running) return;
        }

        dungeonUpdateOverlay('Battle won...');
        await waitRandom(DUNGEON_CONFIG.timing.afterBattleEnd);
        if (!dungeonState.running) return;
        dungeonClickButton('ok');

        const justFinished = dungeonState.floorIndex;
        dungeonState.floorIndex = (dungeonState.floorIndex + 1) % 10;

        if (justFinished === 9) {
            // Floor 10 complete — collect rewards
            dungeonLog('Floor 10 cleared — collecting level rewards');
            dungeonUpdateOverlay('Collecting...');
            await waitRandom(DUNGEON_CONFIG.timing.afterOk);
            if (!dungeonState.running) return;
            dungeonClickButton('reward_icon');

            await waitRandom(DUNGEON_CONFIG.timing.afterRewardIcon);
            if (!dungeonState.running) return;
            dungeonClickButton('collect');
            // dungeonSaveProgress XHR fires → dungeonOnLevelComplete()
        } else {
            dungeonUpdateOverlay('Next floor...');
            await waitRandom(DUNGEON_CONFIG.timing.afterOk);
            if (!dungeonState.running) return;
            await dungeonClickNextDoor();
        }
    }

    async function dungeonOnLevelComplete() {
        if (!dungeonState.running) return;
        dungeonLog('Level complete — waiting for next level to load');
        dungeonUpdateOverlay('Next level...');
        await waitRandom(DUNGEON_CONFIG.timing.afterCollect);
        if (!dungeonState.running) return;
        if (!dungeonSessionOk()) return;
        dungeonLog('Starting next level from floor 1');
        dungeonState.floorIndex = 0;
        await dungeonClickNextDoor();
    }

    function dungeonSessionOk() {
        if (dungeonState.floorsThisSession >= DUNGEON_CONFIG.maxFloorsPerSession) {
            dungeonStop(`Reached max floors (${DUNGEON_CONFIG.maxFloorsPerSession})`);
            return false;
        }
        const elapsed = dungeonState.sessionStart
            ? Math.round((Date.now() - dungeonState.sessionStart) / 60_000) : 0;
        if (elapsed >= DUNGEON_CONFIG.maxSessionMinutes) {
            dungeonStop(`Reached max session time (${DUNGEON_CONFIG.maxSessionMinutes} min)`);
            return false;
        }
        return true;
    }

    // ═════════════════════════════════════════════════════════════════════════
    // DUNGEON — START / STOP
    // ═════════════════════════════════════════════════════════════════════════

    function dungeonStart() {
        if (dungeonState.running) return;
        dungeonState.running           = true;
        dungeonState.sessionStart      = Date.now();
        dungeonState.floorsThisSession = 0;
        dungeonState.altPickStronger   = false;
        dungeonState.statusLabel       = null;
        dungeonState.statusInterval    = setInterval(dungeonUpdateOverlay, 10_000);
        dungeonLog(`Starting — clicking door for floor ${dungeonState.floorIndex + 1}/10. F9 to stop.`);
        dungeonUpdateOverlay('Starting...');
        dungeonClickNextDoor();
    }

    function dungeonStop(reason) {
        dungeonState.running = false;
        if (dungeonState.statusInterval) {
            clearInterval(dungeonState.statusInterval);
            dungeonState.statusInterval = null;
        }
        const msg = reason || 'Stopped';
        dungeonLog(`${msg}. Floors this session: ${dungeonState.floorsThisSession}`);
        dungeonUpdateOverlay(msg);
    }

    function dungeonToggle() {
        if (dungeonState.running) dungeonStop('Stopped by user');
        else dungeonStart();
    }

    // ═════════════════════════════════════════════════════════════════════════
    // TOWER — AUTOMATION FLOW
    // ═════════════════════════════════════════════════════════════════════════

    // Triggered by towerNextChest XHR (fires after "Select Chests Myself" and after each "Proceed").
    // Clicks the door for the current floor, then randomly picks a chest.
    // towerOpenChest XHR fires → towerOnChestOpened() takes over.
    async function towerOnNextChest() {
        if (!towerState.running) return;

        const floorNum = CHEST_FLOORS[towerState.chestIndex];
        const pos      = DOOR_POSITIONS[towerState.chestIndex];
        const doorBtn  = pos === 'top'  ? 'door_top'
                       : pos === 'left' ? 'door_left'
                       :                  'door_right';

        towerLog(`Floor ${floorNum} (${towerState.chestIndex + 1}/${CHEST_FLOORS.length}) — clicking ${doorBtn}`);
        towerUpdateOverlay('Going to floor...');

        await waitRandom(TOWER_CONFIG.timing.afterNextChest);
        if (!towerState.running) return;

        towerClickButton(doorBtn);
        towerUpdateOverlay('Entering room...');

        await waitRandom(TOWER_CONFIG.timing.afterChestDoor);
        if (!towerState.running) return;

        const chests  = ['chest_1', 'chest_2', 'chest_3'];
        const chestBtn = chests[Math.floor(Math.random() * 3)];
        towerLog(`Floor ${floorNum}: randomly opening ${chestBtn}`);
        towerUpdateOverlay('Opening chest...');
        towerClickButton(chestBtn);
        // towerOpenChest XHR fires → towerOnChestOpened()
    }

    // Triggered by towerOpenChest XHR — chest is open.
    // On all floors except the top: click Proceed → towerNextChest XHR fires for the next floor.
    // On the top floor: press Escape, then finish the run.
    async function towerOnChestOpened() {
        if (!towerState.running) return;

        towerState.chestsOpened++;
        towerState.chestIndex++;
        towerUpdateOverlay('Chest opened...');

        await waitRandom(TOWER_CONFIG.timing.afterChestOpen);
        if (!towerState.running) return;

        if (towerState.chestIndex >= CHEST_FLOORS.length) {
            // Top floor (floor 50) — press Escape; no towerNextChest fires after this
            towerLog('Top floor complete — pressing Escape');
            towerUpdateOverlay('Exiting top floor...');
            pressEscape();
            await waitRandom(TOWER_CONFIG.timing.afterTopFloor);
            if (!towerState.running) return;
            towerFinishRun();
        } else {
            // Regular floor — click Proceed; towerNextChest XHR will fire for the next floor
            towerClickButton('proceed');
        }
    }

    // Called after the top floor chest. Time-driven (no more XHR events to wait for).
    async function towerFinishRun() {
        if (!towerState.running) return;
        towerLog('Finishing run — skull exchange, tower rewards, exit');
        towerUpdateOverlay('Finishing...');

        // Skull coin exchange
        towerUpdateOverlay('Skull exchange...');
        towerClickButton('skull_button');
        await waitRandom(TOWER_CONFIG.timing.afterSkullButton);
        if (!towerState.running) return;

        towerClickButton('exchange_skulls');
        await waitRandom(TOWER_CONFIG.timing.afterExchange);
        if (!towerState.running) return;
        // Game auto-exits skull exchange back to top floor

        // Tower points rewards
        towerUpdateOverlay('Tower rewards...');
        towerClickButton('tower_points');
        await waitRandom(TOWER_CONFIG.timing.afterTowerPoints);
        if (!towerState.running) return;

        towerClickButton('collect_all');
        towerUpdateOverlay('Collecting...');
        await waitRandom(TOWER_CONFIG.timing.afterCollect);
        if (!towerState.running) return;

        pressEscape(); // close tower rewards
        towerUpdateOverlay('Closing...');
        await waitRandom(TOWER_CONFIG.timing.afterEscape);
        if (!towerState.running) return;

        pressEscape(); // exit tower
        towerStop('Tower run complete');
    }

    // ═════════════════════════════════════════════════════════════════════════
    // TOWER — START / STOP
    // ═════════════════════════════════════════════════════════════════════════

    async function towerStart() {
        if (towerState.running) return;
        towerState.running        = true;
        towerState.sessionStart   = Date.now();
        towerState.chestIndex     = 0;
        towerState.chestsOpened   = 0;
        towerState.statusInterval = setInterval(towerUpdateOverlay, 10_000);
        towerLog('Starting tower run. F8 to stop.');
        towerUpdateOverlay('Starting...');

        // One-time sequence: Instant Clear → Select Chests Myself
        // After "Select Chests Myself" the game fires towerNextChest XHR for the first floor.
        // towerOnNextChest() takes over from there — no explicit loop needed here.
        towerClickButton('instant_clear');
        towerUpdateOverlay('Instant clear...');
        await waitRandom(TOWER_CONFIG.timing.afterInstantClear);
        if (!towerState.running) return;

        towerClickButton('select_chests_self');
        towerUpdateOverlay('Selecting chests...');
        // towerNextChest XHR fires → towerOnNextChest() for floor 4
    }

    function towerStop(reason) {
        towerState.running = false;
        if (towerState.statusInterval) {
            clearInterval(towerState.statusInterval);
            towerState.statusInterval = null;
        }
        const msg = reason || 'Stopped';
        towerLog(`${msg}. Chests this run: ${towerState.chestsOpened}`);
        towerUpdateOverlay(msg);
    }

    function towerToggle() {
        if (towerState.running) towerStop('Stopped by user');
        else towerStart();
    }

    // ═════════════════════════════════════════════════════════════════════════
    // OVERLAY UI — two-row panel centered at top
    // ═════════════════════════════════════════════════════════════════════════

    let overlayEl;
    let dungeonBtnToggle, dungeonLblStatus, dungeonLblFloor, dungeonLblFloors, dungeonLblTime, dungeonSpinner;
    let towerBtnToggle,   towerLblStatus,  towerLblChest,   towerLblTime,   towerSpinner;

    function buildOverlay() {
        const el = document.createElement('div');
        el.id = 'hw-daily-overlay';
        el.innerHTML = `
            <div id="hwo-brand">HW</div>
            <div id="hwo-rows">
                <div id="hwo-dungeon-row">
                    <span id="hwd-label">Dungeon</span>
                    <span class="hwo-sep">·</span>
                    <span id="hwd-floor">Floor —</span>
                    <span class="hwo-sep">·</span>
                    <span id="hwd-floors">0 floors</span>
                    <span class="hwo-sep">·</span>
                    <span id="hwd-time">0 min</span>
                    <span class="hwo-sep">·</span>
                    <span id="hwd-status">Ready</span>
                    <span class="hwo-spinner hwo-hidden" id="hwd-spinner"></span>
                    <button id="hwd-toggle">▶</button>
                    <span class="hwo-hint">F9</span>
                </div>
                <div id="hwo-tower-row">
                    <span id="hwt-label">Tower</span>
                    <span class="hwo-sep">·</span>
                    <span id="hwt-chest">—</span>
                    <span class="hwo-sep">·</span>
                    <span id="hwt-time">0 min</span>
                    <span class="hwo-sep">·</span>
                    <span id="hwt-status">Ready</span>
                    <span class="hwo-spinner hwo-hidden" id="hwt-spinner"></span>
                    <button id="hwt-toggle">▶</button>
                    <span class="hwo-hint">F8</span>
                </div>
            </div>
        `;

        const style = document.createElement('style');
        style.textContent = `
            #hw-daily-overlay {
                position: fixed;
                top: 0;
                left: 50%;
                transform: translateX(-50%);
                z-index: 999999;
                display: flex;
                align-items: center;
                gap: 12px;
                background: rgba(10, 10, 20, 0.90);
                border: 1px solid rgba(255,255,255,0.12);
                border-radius: 0 0 8px 8px;
                padding: 4px 16px 6px;
                font-family: monospace;
                font-size: 12px;
                color: #ddd;
                white-space: nowrap;
                user-select: none;
            }
            #hwo-brand {
                color: #f0c060;
                font-weight: bold;
                font-size: 13px;
                letter-spacing: 1px;
                align-self: center;
            }
            #hwo-rows {
                display: flex;
                flex-direction: column;
                gap: 2px;
            }
            #hwo-dungeon-row, #hwo-tower-row {
                display: flex;
                align-items: center;
                gap: 6px;
            }
            #hwd-label   { color: #f0c060; font-weight: bold; min-width: 56px; }
            #hwt-label   { color: #60c0f0; font-weight: bold; min-width: 56px; }
            #hwd-floor   { color: #fff; font-weight: bold; }
            #hwd-floors  { color: #aaa; }
            #hwd-time, #hwt-time { color: #aaa; }
            #hwd-status  { color: #f0c060; min-width: 76px; }
            #hwt-status  { color: #60c0f0; min-width: 76px; }
            #hwt-chest   { color: #fff; font-weight: bold; }
            .hwo-sep  { color: #444; }
            .hwo-hint { color: #444; font-size: 11px; }
            #hwd-toggle, #hwt-toggle {
                padding: 2px 8px;
                background: #2a5a2a;
                color: #7f7;
                border: 1px solid #4a9a4a;
                border-radius: 10px;
                font-family: monospace;
                font-size: 12px;
                cursor: pointer;
            }
            #hwd-toggle:hover, #hwt-toggle:hover { background: #3a7a3a; }
            #hwd-toggle.running, #hwt-toggle.running {
                background: #5a2a2a;
                color: #f77;
                border-color: #9a4a4a;
            }
            .hwo-spinner {
                display: inline-block;
                width: 9px;
                height: 9px;
                border: 1.5px solid rgba(255,255,255,0.15);
                border-top-color: #aaa;
                border-radius: 50%;
                animation: hwo-rotate 0.7s linear infinite;
                vertical-align: middle;
                margin-left: 1px;
            }
            .hwo-hidden { display: none; }
            @keyframes hwo-rotate { to { transform: rotate(360deg); } }
        `;

        document.head.appendChild(style);
        document.body.appendChild(el);

        overlayEl = el;

        dungeonBtnToggle = el.querySelector('#hwd-toggle');
        dungeonLblStatus = el.querySelector('#hwd-status');
        dungeonLblFloor  = el.querySelector('#hwd-floor');
        dungeonLblFloors = el.querySelector('#hwd-floors');
        dungeonLblTime   = el.querySelector('#hwd-time');

        towerBtnToggle = el.querySelector('#hwt-toggle');
        towerLblStatus = el.querySelector('#hwt-status');
        towerLblChest  = el.querySelector('#hwt-chest');
        towerLblTime   = el.querySelector('#hwt-time');
        dungeonSpinner = el.querySelector('#hwd-spinner');
        towerSpinner   = el.querySelector('#hwt-spinner');

        dungeonBtnToggle.addEventListener('click', e => { e.stopPropagation(); dungeonToggle(); });
        towerBtnToggle.addEventListener('click',   e => { e.stopPropagation(); towerToggle(); });

        dungeonUpdateOverlay();
        towerUpdateOverlay();
    }

    function dungeonUpdateOverlay(statusMsg) {
        if (!overlayEl) return;
        const elapsed = dungeonState.sessionStart
            ? Math.round((Date.now() - dungeonState.sessionStart) / 60_000) : 0;
        dungeonLblFloor.textContent  = `Floor ${dungeonState.floorIndex + 1}/10`;
        dungeonLblTime.textContent   = `${elapsed} min`;
        dungeonLblFloors.textContent = `${dungeonState.floorsThisSession} floors`;
        if (statusMsg) dungeonState.statusLabel = statusMsg;
        if (dungeonState.statusLabel)   dungeonLblStatus.textContent = dungeonState.statusLabel;
        else if (dungeonState.running)  dungeonLblStatus.textContent = 'Running';
        else                            dungeonLblStatus.textContent = 'Stopped';
        dungeonBtnToggle.textContent = dungeonState.running ? '■' : '▶';
        dungeonBtnToggle.className   = dungeonState.running ? 'running' : '';
        dungeonSpinner.classList.toggle('hwo-hidden', !dungeonState.running);
    }

    function towerUpdateOverlay(statusMsg) {
        if (!overlayEl) return;
        const elapsed = towerState.sessionStart
            ? Math.round((Date.now() - towerState.sessionStart) / 60_000) : 0;
        const floorNum = CHEST_FLOORS[Math.min(towerState.chestIndex, CHEST_FLOORS.length - 1)];
        towerLblChest.textContent = towerState.chestsOpened > 0
            ? `Fl ${floorNum} · ${towerState.chestsOpened}/${CHEST_FLOORS.length}` : '—';
        towerLblTime.textContent = `${elapsed} min`;
        if (statusMsg)                towerLblStatus.textContent = statusMsg;
        else if (towerState.running)  towerLblStatus.textContent = 'Running';
        else                          towerLblStatus.textContent = 'Ready';
        towerBtnToggle.textContent = towerState.running ? '■' : '▶';
        towerBtnToggle.className   = towerState.running ? 'running' : '';
        towerSpinner.classList.toggle('hwo-hidden', !towerState.running);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // KEYBOARD SHORTCUTS
    // ═════════════════════════════════════════════════════════════════════════

    function installKeyboardShortcuts() {
        document.addEventListener('keydown', e => {
            if (e.key === 'F9') { e.preventDefault(); dungeonToggle(); }
            if (e.key === 'F8') { e.preventDefault(); towerToggle(); }
        });
        dungeonLog('Keyboard shortcuts: F9 = Dungeon, F8 = Tower');
    }

    // ═════════════════════════════════════════════════════════════════════════
    // PUBLIC CONSOLE API
    //
    // HWDungeon.start()  — start dungeon automation
    // HWDungeon.stop()   — stop dungeon automation
    // HWDungeon.status() — show dungeon state
    // HWTower.start()    — start tower run
    // HWTower.stop()     — stop tower run
    // HWTower.status()   — show tower state
    // ═════════════════════════════════════════════════════════════════════════

    window.HWDungeon = {
        start:  dungeonStart,
        stop:   () => dungeonStop('Stopped by user'),
        status() {
            const elapsed = dungeonState.sessionStart
                ? Math.round((Date.now() - dungeonState.sessionStart) / 60_000) : 0;
            dungeonLog('Status:', {
                running:       dungeonState.running,
                floorInLevel:  dungeonState.floorIndex + 1,
                absoluteFloor: dungeonState.absoluteFloor,
                floorsSession: dungeonState.floorsThisSession,
                elapsedMin:    elapsed,
            });
        },
    };

    window.HWTower = {
        start: towerStart,
        stop:  () => towerStop('Stopped by user'),
        status() {
            const elapsed = towerState.sessionStart
                ? Math.round((Date.now() - towerState.sessionStart) / 60_000) : 0;
            towerLog('Status:', {
                running:      towerState.running,
                floor:        CHEST_FLOORS[Math.min(towerState.chestIndex, CHEST_FLOORS.length - 1)],
                chestsOpened: `${towerState.chestsOpened}/${CHEST_FLOORS.length}`,
                elapsedMin:   elapsed,
            });
        },
    };

    // ═════════════════════════════════════════════════════════════════════════
    // INIT
    // ═════════════════════════════════════════════════════════════════════════

    function init() {
        installXhrObserver();
        installKeyboardShortcuts();

        const poll = setInterval(() => {
            if (document.body) {
                clearInterval(poll);
                buildOverlay();

                if (DUNGEON_CONFIG.coordMode) {
                    dungeonUpdateOverlay('Coord Mode');
                    dungeonLog('DUNGEON COORD MODE active — click buttons in the game.');
                    const cp = setInterval(() => {
                        if (getCanvas()) { clearInterval(cp); startDungeonCoordMode(); }
                    }, 500);
                }

                if (TOWER_CONFIG.coordMode) {
                    towerUpdateOverlay('Coord Mode');
                    towerLog('TOWER COORD MODE active — click buttons in the game.');
                    const cp = setInterval(() => {
                        if (getCanvas()) { clearInterval(cp); startTowerCoordMode(); }
                    }, 500);
                }

                if (!DUNGEON_CONFIG.coordMode && !TOWER_CONFIG.coordMode) {
                    dungeonLog('Hero Wars Daily Automation v1.0.4 ready. F9 = Dungeon · F8 = Tower.');
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
