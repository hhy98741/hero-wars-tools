import { DUNGEON_CONFIG, TOWER_CONFIG, CHEST_FLOORS } from './config.js';
import { dungeonState, towerState, dailyState } from './state.js';
import { dungeonLog, towerLog, dailyLog, getCanvas } from './utils.js';
import { dungeonStart, dungeonStop, dungeonToggle, startDungeonCoordMode } from './dungeon.js';
import { towerStart, towerStop, towerToggle, startTowerCoordMode } from './tower.js';
import { dailyStart, dailyStop, dailyToggle } from './daily.js';
import { buildOverlay, dungeonUpdateOverlay, towerUpdateOverlay } from './overlay.js';
import { installXhrObserver } from './xhr.js';

// ═════════════════════════════════════════════════════════════════════════
// PUBLIC CONSOLE API
//
// HWDungeon.start()  — start dungeon automation
// HWDungeon.stop()   — stop dungeon automation
// HWDungeon.status() — show dungeon state
// HWTower.start()    — start tower run
// HWTower.stop()     — stop tower run
// HWTower.status()   — show tower state
// HWDaily.start()    — start daily chore run
// HWDaily.stop()     — stop daily chore run
// HWDaily.status()   — show daily state
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

window.HWDaily = {
    start: dailyStart,
    stop:  () => dailyStop('Stopped by user'),
    status() {
        const elapsed = dailyState.sessionStart
            ? Math.round((Date.now() - dailyState.sessionStart) / 60_000) : 0;
        dailyLog('Status:', {
            running:     dailyState.running,
            currentStep: dailyState.currentStep,
            stepsDone:   dailyState.stepsDone,
            elapsedMin:  elapsed,
        });
    },
};

// ═════════════════════════════════════════════════════════════════════════
// KEYBOARD SHORTCUTS
// ═════════════════════════════════════════════════════════════════════════

function installKeyboardShortcuts() {
    document.addEventListener('keydown', e => {
        if (e.key === 'F9') { e.preventDefault(); dungeonToggle(); }
        if (e.key === 'F8') { e.preventDefault(); towerToggle(); }
        if (e.key === 'F7') { e.preventDefault(); dailyToggle(); }
    });
    dungeonLog('Keyboard shortcuts: F9 = Dungeon, F8 = Tower, F7 = Daily');
}

// ═════════════════════════════════════════════════════════════════════════
// INIT
// ═════════════════════════════════════════════════════════════════════════

function init() {
    installXhrObserver();
    installKeyboardShortcuts();

    const poll = setInterval(() => {
        if (document.body) {
            clearInterval(poll);
            buildOverlay(dungeonToggle, towerToggle, dailyToggle);

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
                dungeonLog('Hero Wars Daily Automation v1.0.5 ready. F9 = Dungeon · F8 = Tower · F7 = Daily.');
            }
        }
    }, 200);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
