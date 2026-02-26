import { TOWER_CONFIG, CHEST_FLOORS, DOOR_POSITIONS, TOWER_BUTTONS } from './config.js';
import { towerState } from './state.js';
import { waitRandom, towerLog, getCanvas, pressEscape, clickAt } from './utils.js';
import { towerUpdateOverlay } from './overlay.js';

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
// COORD FINDER MODE
// ═════════════════════════════════════════════════════════════════════════

export function startTowerCoordMode() {
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
// TOWER — AUTOMATION FLOW
// ═════════════════════════════════════════════════════════════════════════

// Triggered by towerNextChest XHR (fires after "Select Chests Myself" and after each "Proceed").
// Clicks the door for the current floor, then randomly picks a chest.
// towerOpenChest XHR fires → towerOnChestOpened() takes over.
export async function towerOnNextChest() {
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

    const chests   = ['chest_1', 'chest_2', 'chest_3'];
    const chestBtn = chests[Math.floor(Math.random() * 3)];
    towerLog(`Floor ${floorNum}: randomly opening ${chestBtn}`);
    towerUpdateOverlay('Opening chest...');
    towerClickButton(chestBtn);
    // towerOpenChest XHR fires → towerOnChestOpened()
}

// Triggered by towerOpenChest XHR — chest is open.
// On all floors except the top: click Proceed → towerNextChest XHR fires for the next floor.
// On the top floor: press Escape, then finish the run.
export async function towerOnChestOpened() {
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

export async function towerStart() {
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

export function towerStop(reason) {
    towerState.running = false;
    if (towerState.statusInterval) {
        clearInterval(towerState.statusInterval);
        towerState.statusInterval = null;
    }
    const msg = reason || 'Stopped';
    towerLog(`${msg}. Chests this run: ${towerState.chestsOpened}`);
    towerUpdateOverlay(msg);
}

export function towerToggle() {
    if (towerState.running) towerStop('Stopped by user');
    else towerStart();
}
