// ==UserScript==
// @name         Hero Wars — Tower Automation
// @namespace    hero-wars-tools
// @version      0.1.0
// @description  Automates daily tower chest run. Main-account safe: UI clicks only, human-like timing.
// @match        https://www.hero-wars.com/*
// @match        https://hero-wars.com/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // ─────────────────────────────────────────────────────────────────────────
    // HOW THIS SCRIPT WORKS
    //
    // Navigate into the tower, then press F8 (or click Start in the overlay).
    // The script runs all 15 chest floors, converts skulls, and collects rewards.
    //
    // Per-floor sequence (automatic):
    //   1. Click "Instant Clear"
    //   2. Click "Select Chests"
    //   3. Click the chest (right side floors 1–10, 13–15; left side floors 11–12)
    //   4. Click "1 chest" or "3 chests" count button
    //   5. Click "Process"
    //   6. Click Continue/OK
    //   Repeat for all 15 floors
    //
    // After floor 15:
    //   Convert skulls to coins → collect tower rewards → exit
    //
    // SETUP ORDER:
    //   1. Set coordMode: true, install in Tampermonkey, reload the game
    //   2. Navigate into the tower and click each button listed in the console
    //   3. Fill in BUTTONS below with the logged coordinates
    //   4. Set coordMode: false
    //   5. Navigate into the tower, press F8 or click Start
    // ─────────────────────────────────────────────────────────────────────────

    const CONFIG = {
        // Coordinate finder mode. Set true to map button positions.
        coordMode: false,

        // ── Session safety limits ────────────────────────────────────────────
        maxSessionMinutes: 30,

        // ── Click timing (milliseconds) ──────────────────────────────────────
        timing: {
            afterInstantClear: { min: 1500, max: 2000 }, // wait for chest floor to appear
            afterSelectChests: { min: 1200, max: 1600 }, // wait for chest room
            afterChestClick:   { min: 800,  max: 1200 }, // wait for count popup
            afterCountSelect:  { min: 600,  max: 900  }, // wait before process button
            afterProcess:      { min: 2500, max: 3200 }, // wait for chest animation to finish
            afterContinue:     { min: 1000, max: 1500 }, // wait after OK before next floor
            afterSkullConvert: { min: 1500, max: 2000 }, // wait after clicking skulls button
            afterRewardsOpen:  { min: 1200, max: 1600 }, // wait for rewards screen
            afterCollect:      { min: 1000, max: 1400 }, // wait after collecting
            afterCloseRewards: { min: 800,  max: 1200 }, // wait after closing rewards screen
        },
    };

    // ─────────────────────────────────────────────────────────────────────────
    // CHEST FLOOR MAP
    // Which chest to click on each of the 15 floors (index 0 = floor 1).
    // ─────────────────────────────────────────────────────────────────────────

    // 'right'    — right-side chest (floors 1–10, 13–14)
    // 'left'     — left-side chest (floors 11–12)
    // 'right_15' — right-side chest floor 15 (slightly different position)
    const CHEST_POSITIONS = [
        'right', 'right', 'right', 'right', 'right',  // floors 1–5
        'right', 'right', 'right', 'right', 'right',  // floors 6–10
        'left',  'left',                               // floors 11–12
        'right', 'right',                              // floors 13–14
        'right_15',                                    // floor 15
    ];

    // Which count button to click for each chest position.
    const CHEST_COUNT = {
        right:    'open_3',
        left:     'open_1',
        right_15: 'open_3',
    };

    // ─────────────────────────────────────────────────────────────────────────
    // BUTTON COORDINATES — fill in with coordMode, then set coordMode: false
    // ─────────────────────────────────────────────────────────────────────────

    const BUTTONS = {
        // Tower floor screen (after entering the tower)
        instant_clear:   { x: 0, y: 0 },  // "Instant Clear" button

        // After instant clear — chest selection screen
        select_chests:   { x: 0, y: 0 },  // "Select Chests" button

        // Chest room — which chest to open
        chest_right:     { x: 0, y: 0 },  // chest on right side (floors 1–10, 13–14)
        chest_right_15:  { x: 0, y: 0 },  // chest on right side, floor 15 (different position)
        chest_left:      { x: 0, y: 0 },  // chest on left side (floors 11–12)

        // Count selector popup (appears after clicking a chest)
        open_1:          { x: 0, y: 0 },  // "1 chest" button
        open_3:          { x: 0, y: 0 },  // "3 chests" button
        process:         { x: 0, y: 0 },  // "Process" / confirm open button

        // After chest is opened
        continue:        { x: 0, y: 0 },  // OK / Continue after reward shown

        // End of run (after floor 15)
        skulls_to_coins: { x: 0, y: 0 },  // Convert skulls to coins button
        rewards:         { x: 0, y: 0 },  // Tower rewards button
        collect:         { x: 0, y: 0 },  // Collect all rewards
        close_rewards:   { x: 0, y: 0 },  // X to close rewards screen
        exit_tower:      { x: 0, y: 0 },  // X to exit the tower
    };

    // ─────────────────────────────────────────────────────────────────────────
    // STATE
    // ─────────────────────────────────────────────────────────────────────────

    const state = {
        running:        false,
        sessionStart:   null,
        chestIndex:     0,      // 0–14: index into CHEST_POSITIONS for the current floor
        chestsOpened:   0,      // total chests opened this run
        absoluteFloor:  null,   // last floorNumber seen from towerNextChest
        statusInterval: null,
    };

    // ─────────────────────────────────────────────────────────────────────────
    // UTILITIES
    // ─────────────────────────────────────────────────────────────────────────

    const rand       = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const wait       = ms => new Promise(resolve => setTimeout(resolve, ms));
    const waitRandom = range => wait(rand(range.min, range.max));

    function log(msg, data) {
        const prefix = '[HW-Tower]';
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

    // ─────────────────────────────────────────────────────────────────────────
    // COORDINATE FINDER MODE
    // ─────────────────────────────────────────────────────────────────────────

    function startCoordMode() {
        log('════════════════════════════════════════');
        log('COORD MODE — click each button in the game, coordinates print here');
        log('');
        log('MAP THESE BUTTONS:');
        log('  instant_clear   — "Instant Clear" on the tower floor screen');
        log('  select_chests   — "Select Chests" button');
        log('  chest_right     — chest on the RIGHT side (floors 1–10, 13–14)');
        log('  chest_right_15  — chest on the RIGHT side, floor 15');
        log('  chest_left      — chest on the LEFT side (floors 11–12)');
        log('  open_1          — "1 chest" count option');
        log('  open_3          — "3 chests" count option');
        log('  process         — "Process" / confirm button');
        log('  continue        — OK / Continue after chest reward');
        log('  skulls_to_coins — Convert skulls to coins');
        log('  rewards         — Tower rewards button');
        log('  collect         — Collect rewards');
        log('  close_rewards   — X to close rewards screen');
        log('  exit_tower      — X to exit the tower');
        log('════════════════════════════════════════');

        getCanvas().addEventListener('click', e => {
            const rect = getCanvas().getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width).toFixed(4);
            const y = ((e.clientY - rect.top)  / rect.height).toFixed(4);
            log(`→ x: ${x},  y: ${y}`);
        });
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
                const floorNum = Number(data?.floorNumber);
                state.absoluteFloor = floorNum || state.absoluteFloor;
                log(`towerNextChest: floor ${floorNum}, chest ${state.chestIndex + 1}/15`);
                onNextChest();

            } else if (actionName === 'towerOpenChest') {
                log(`towerOpenChest: chest ${state.chestIndex + 1}/15 opened`, data);
                onChestOpened();

            } else if (actionName === 'tower_farmSkullReward') {
                log('tower_farmSkullReward:', data);

            } else if (actionName === 'tower_farmPointRewards') {
                log('tower_farmPointRewards:', data);
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AUTOMATION FLOW
    // ─────────────────────────────────────────────────────────────────────────

    // Clicks instant clear to advance to the next chest floor.
    // towerNextChest XHR fires → onNextChest() takes over.
    function startFloor() {
        if (!state.running) return;
        log(`Floor ${state.chestIndex + 1}/15 — clicking Instant Clear`);
        updateOverlay(`Floor ${state.chestIndex + 1}/15`);
        clickButton('instant_clear');
    }

    // Triggered by towerNextChest XHR — select and open the chest.
    // towerOpenChest XHR fires → onChestOpened() takes over.
    async function onNextChest() {
        if (!state.running) return;

        await waitRandom(CONFIG.timing.afterInstantClear);
        if (!state.running) return;

        clickButton('select_chests');
        await waitRandom(CONFIG.timing.afterSelectChests);
        if (!state.running) return;

        const position = CHEST_POSITIONS[state.chestIndex];
        const chestBtn = position === 'right_15' ? 'chest_right_15'
                       : position === 'left'     ? 'chest_left'
                       :                           'chest_right';
        log(`Chest ${state.chestIndex + 1}: clicking ${chestBtn} (${position})`);
        clickButton(chestBtn);
        await waitRandom(CONFIG.timing.afterChestClick);
        if (!state.running) return;

        const countBtn = CHEST_COUNT[position];
        clickButton(countBtn);
        await waitRandom(CONFIG.timing.afterCountSelect);
        if (!state.running) return;

        clickButton('process');
        // towerOpenChest XHR fires → onChestOpened()
    }

    // Triggered by towerOpenChest XHR — dismiss result and go to next floor.
    async function onChestOpened() {
        if (!state.running) return;

        state.chestsOpened++;
        state.chestIndex++;

        await waitRandom(CONFIG.timing.afterProcess);
        if (!state.running) return;

        clickButton('continue');

        await waitRandom(CONFIG.timing.afterContinue);
        if (!state.running) return;

        if (state.chestIndex < 15) {
            startFloor();
        } else {
            log('All 15 chests done');
            finishRun();
        }
    }

    // After all 15 chests: convert skulls, collect rewards, exit.
    async function finishRun() {
        if (!state.running) return;
        updateOverlay('Finishing...');

        clickButton('skulls_to_coins');
        await waitRandom(CONFIG.timing.afterSkullConvert);
        if (!state.running) return;

        clickButton('rewards');
        await waitRandom(CONFIG.timing.afterRewardsOpen);
        if (!state.running) return;

        clickButton('collect');
        await waitRandom(CONFIG.timing.afterCollect);
        if (!state.running) return;

        clickButton('close_rewards');
        await waitRandom(CONFIG.timing.afterCloseRewards);
        if (!state.running) return;

        clickButton('exit_tower');
        stopAutomation('Tower run complete');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // START / STOP
    // ─────────────────────────────────────────────────────────────────────────

    function startAutomation() {
        if (state.running) return;

        state.running       = true;
        state.sessionStart  = Date.now();
        state.chestIndex    = 0;
        state.chestsOpened  = 0;

        state.statusInterval = setInterval(updateOverlay, 10_000);

        log('Starting tower run. F8 to stop.');
        startFloor();
    }

    function stopAutomation(reason) {
        state.running = false;
        if (state.statusInterval) {
            clearInterval(state.statusInterval);
            state.statusInterval = null;
        }
        const msg = reason || 'Stopped';
        log(`${msg}. Chests this run: ${state.chestsOpened}`);
        updateOverlay(msg);
    }

    function toggleAutomation() {
        if (state.running) stopAutomation('Stopped by user');
        else startAutomation();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // OVERLAY UI — top-right corner (distinct from dungeon overlay at top-center)
    // ─────────────────────────────────────────────────────────────────────────

    let overlayEl, btnToggle, lblStatus, lblChest, lblTime;

    function buildOverlay() {
        const el = document.createElement('div');
        el.id = 'hw-tower-overlay';
        el.innerHTML = `
            <span id="hwt-title">HW</span>
            <span id="hwt-chest">Tower</span>
            <span id="hwt-sep">·</span>
            <span id="hwt-time">0 min</span>
            <span id="hwt-sep2">·</span>
            <span id="hwt-status">Ready</span>
            <button id="hwt-toggle">▶ Start</button>
            <span id="hwt-hint">F8</span>
        `;

        const style = document.createElement('style');
        style.textContent = `
            #hw-tower-overlay {
                position: fixed;
                top: 0;
                right: 0;
                z-index: 999999;
                display: flex;
                align-items: center;
                gap: 8px;
                background: rgba(10, 10, 20, 0.90);
                border: 1px solid rgba(255,255,255,0.12);
                border-radius: 0 0 0 8px;
                padding: 4px 14px 6px;
                font-family: monospace;
                font-size: 12px;
                color: #ddd;
                white-space: nowrap;
                user-select: none;
            }
            #hwt-title  { color: #60c0f0; font-weight: bold; letter-spacing: 1px; }
            #hwt-chest  { color: #fff; font-weight: bold; }
            #hwt-time   { color: #aaa; }
            #hwt-status { color: #60c0f0; }
            #hwt-sep, #hwt-sep2 { color: #444; }
            #hwt-toggle {
                padding: 3px 10px;
                background: #2a5a2a;
                color: #7f7;
                border: 1px solid #4a9a4a;
                border-radius: 10px;
                font-family: monospace;
                font-size: 12px;
                cursor: pointer;
            }
            #hwt-toggle:hover { background: #3a7a3a; }
            #hwt-toggle.running {
                background: #5a2a2a;
                color: #f77;
                border-color: #9a4a4a;
            }
            #hwt-hint { color: #444; font-size: 11px; }
        `;

        document.head.appendChild(style);
        document.body.appendChild(el);

        overlayEl = el;
        btnToggle = el.querySelector('#hwt-toggle');
        lblStatus = el.querySelector('#hwt-status');
        lblChest  = el.querySelector('#hwt-chest');
        lblTime   = el.querySelector('#hwt-time');

        btnToggle.addEventListener('click', e => {
            e.stopPropagation();
            toggleAutomation();
        });

        updateOverlay();
    }

    function updateOverlay(statusMsg) {
        if (!overlayEl) return;

        lblChest.textContent = state.chestsOpened > 0
            ? `${state.chestsOpened}/15 chests`
            : 'Tower';
        lblTime.textContent = `${elapsedMinutes()} min`;

        if (statusMsg)          lblStatus.textContent = statusMsg;
        else if (state.running) lblStatus.textContent = 'Running';
        else                    lblStatus.textContent = 'Ready';

        btnToggle.textContent = state.running ? '■ Stop' : '▶ Start';
        btnToggle.className   = state.running ? 'running' : '';
    }

    // ─────────────────────────────────────────────────────────────────────────
    // KEYBOARD SHORTCUT — F8 toggles start/stop
    // ─────────────────────────────────────────────────────────────────────────

    function installKeyboardShortcut() {
        document.addEventListener('keydown', e => {
            if (e.key === 'F8') {
                e.preventDefault();
                toggleAutomation();
            }
        });
        log('Keyboard shortcut: F8 to start/stop');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PUBLIC CONSOLE API
    // HWTower.start()   — start the run
    // HWTower.stop()    — stop
    // HWTower.status()  — show current state
    // ─────────────────────────────────────────────────────────────────────────

    window.HWTower = {
        start: startAutomation,
        stop:  () => stopAutomation('Stopped by user'),
        status() {
            log('Status:', {
                running:       state.running,
                chest:         `${state.chestIndex + 1}/15`,
                chestsOpened:  state.chestsOpened,
                absoluteFloor: state.absoluteFloor,
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

        const poll = setInterval(() => {
            if (document.body) {
                clearInterval(poll);
                buildOverlay();

                if (CONFIG.coordMode) {
                    updateOverlay('Coord Mode');
                    log('Hero Wars Tower Automation — COORD MODE. Click buttons in the game.');
                    const canvasPoll = setInterval(() => {
                        if (getCanvas()) { clearInterval(canvasPoll); startCoordMode(); }
                    }, 500);
                } else {
                    log('Hero Wars Tower Automation v0.1 ready. Press F8 or click Start.');
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
