import { DUNGEON_CONFIG, TWO_TEAM_FLOORS, DOORS, DUNGEON_BUTTONS } from './config.js';
import { dungeonState } from './state.js';
import { rand, wait, waitRandom, dungeonLog, getCanvas, clickAt } from './utils.js';
import { dungeonUpdateOverlay } from './overlay.js';

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
// COORD FINDER MODE
// ═════════════════════════════════════════════════════════════════════════

export function startDungeonCoordMode() {
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

// ═════════════════════════════════════════════════════════════════════════
// DUNGEON — ATTACK CHOICE LOGIC
// ═════════════════════════════════════════════════════════════════════════

export function dungeonExtractFloorData(floorObj) {
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

export async function dungeonOnBattleStarted() {
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

export async function dungeonOnBattleEnded(won) {
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

export async function dungeonOnLevelComplete() {
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

export function dungeonStart() {
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

export function dungeonStop(reason) {
    dungeonState.running = false;
    if (dungeonState.statusInterval) {
        clearInterval(dungeonState.statusInterval);
        dungeonState.statusInterval = null;
    }
    const msg = reason || 'Stopped';
    dungeonLog(`${msg}. Floors this session: ${dungeonState.floorsThisSession}`);
    dungeonUpdateOverlay(msg);
}

export function dungeonToggle() {
    if (dungeonState.running) dungeonStop('Stopped by user');
    else dungeonStart();
}
