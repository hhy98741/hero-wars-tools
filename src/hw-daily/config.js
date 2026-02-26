// ═════════════════════════════════════════════════════════════════════════
// DUNGEON CONFIG
// ═════════════════════════════════════════════════════════════════════════

export const DUNGEON_CONFIG = {
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
export const TWO_TEAM_FLOORS = new Set([4, 6, 9]); // floors 5, 7, 10

// ─────────────────────────────────────────────────────────────────────────
// DUNGEON DOOR COORDINATES — one per floor position (index 0 = floor 1)
// ─────────────────────────────────────────────────────────────────────────

export const DOORS = [
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

export const DUNGEON_BUTTONS = {
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

export const TOWER_CONFIG = {
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

export const CHEST_FLOORS   = [4, 8, 10, 14, 16, 20, 22, 26, 28, 32, 35, 39, 42, 46, 50];
export const DOOR_POSITIONS = [
    'right', 'right', 'right', 'right',  // floors 4, 8, 10, 14
    'right', 'right', 'right', 'right',  // floors 16, 20, 22, 26
    'right', 'right', 'left',  'left',   // floors 28, 32, 35, 39
    'right', 'right', 'top',             // floors 42, 46, 50
];

// ─────────────────────────────────────────────────────────────────────────
// TOWER BUTTON COORDINATES — all pre-mapped from coordMode session
// ─────────────────────────────────────────────────────────────────────────

export const TOWER_BUTTONS = {
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
