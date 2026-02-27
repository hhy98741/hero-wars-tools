import { dailyState } from './state.js';

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

// ═════════════════════════════════════════════════════════════════════════
// DAILY RUN CONFIG
// ═════════════════════════════════════════════════════════════════════════

export const DAILY_CONFIG = {
    timing: {
        menuOpen:  { min: 1300, max: 1800 }, // opening a panel within the current area
        areaEnter: { min: 1800, max: 2500 }, // navigating to a new game area
        action:    { min: 1300, max: 1800 }, // after a collect / open / confirm click
        click:     { min: 1000, max: 1500 }, // quick UI response
        escape:    { min: 1000, max: 1500 }, // after pressing Escape
        raidStart: { min: 4000, max: 6000 }, // after RAID ALL — wait for Show All to appear
        showAll:   { min: 5000, max: 8000 }, // after Show All — wait for battles to finish
    },
};

// Shorthand so DAILY_STEPS stays readable
const DT = DAILY_CONFIG.timing;

// ─────────────────────────────────────────────────────────────────────────
// DAILY STEPS — sequential click/escape actions for the daily chore run.
// Each step: { type, label, x?, y?, wait? }
//   type 'section' — log a section header, no click, no wait
//   type 'click'   — clickAt(x, y), then wait
//   type 'escape'  — pressEscape(), then wait
// ─────────────────────────────────────────────────────────────────────────

export const DAILY_STEPS = [

    // ── Free Energy ───────────────────────────────────────────────────────
    { type: 'section', label: 'Free Energy' },
    { type: 'click',  label: 'Opening Daily Quests',    x: 0.1728, y: 0.0549, wait: DT.menuOpen  },
    { type: 'click',  label: 'Collecting free energy',  x: 0.6701, y: 0.3135, wait: DT.action    },
    { type: 'escape', label: 'Closing Daily Quests',                           wait: DT.escape    },

    // ── Mail ──────────────────────────────────────────────────────────────
    { type: 'section', label: 'Mail' },
    { type: 'click',  label: 'Opening mail',            x: 0.1793, y: 0.1265, wait: DT.menuOpen  },
    { type: 'click',  label: 'Collecting all mail',     x: 0.4988, y: 0.8381, wait: DT.action    },
    { type: 'click',  label: 'Show all mail',           x: 0.4988, y: 0.7833, wait: DT.click     },
    { type: 'click',  label: 'Collecting mail results', x: 0.4988, y: 0.7833, wait: DT.action    },
    { type: 'escape', label: 'Closing mail',                                   wait: DT.escape    },

    // ── Gifts ─────────────────────────────────────────────────────────────
    { type: 'section', label: 'Gifts' },
    { type: 'click',  label: 'Opening gifts',           x: 0.6879, y: 0.8856, wait: DT.menuOpen  },
    { type: 'click',  label: 'View sendable gifts',     x: 0.3911, y: 0.6549, wait: DT.action    },
    { type: 'click',  label: 'Sending presents',        x: 0.4923, y: 0.5684, wait: DT.action    },
    { type: 'escape', label: 'Closing send gifts',                             wait: DT.escape    },
    { type: 'escape', label: 'Closing gifts menu',                             wait: DT.escape    },

    // ── Airship ───────────────────────────────────────────────────────────
    { type: 'section', label: 'Airship' },
    { type: 'click',  label: 'Entering airship',            x: 0.4030, y: 0.1628, wait: DT.areaEnter },
    { type: 'click',  label: "Opening Valkyrie's Favor",    x: 0.4993, y: 0.2781, wait: DT.menuOpen  },
    { type: 'click',  label: "Collecting Valkyrie's gifts", x: 0.4958, y: 0.7274, wait: DT.action    },
    { type: 'escape', label: "Closing Valkyrie's Favor",                          wait: DT.escape    },
    { type: 'click',  label: 'Opening expedition map',      x: 0.4993, y: 0.6865, wait: DT.menuOpen  },
    { type: 'click',  label: 'Claiming expedition rewards', x: 0.5062, y: 0.8944, wait: DT.action,
      condition: () => dailyState.expeditionRewardsAvailable },
    { type: 'click',  label: 'Collecting expedition loot',  x: 0.5000, y: 0.7374, wait: DT.action,
      condition: () => dailyState.expeditionRewardsAvailable },
    { type: 'click',  label: 'Allocating heroes',           x: 0.4968, y: 0.8977, wait: DT.action    },
    { type: 'escape', label: 'Closing expedition map',                             wait: DT.escape    },
    { type: 'escape', label: 'Exiting airship',                                    wait: DT.escape    },

    // ── Soul Atrium ───────────────────────────────────────────────────────
    { type: 'section', label: 'Soul Atrium' },
    { type: 'click',  label: 'Entering Soul Atrium',   x: 0.5249, y: 0.4279, wait: DT.areaEnter },
    { type: 'click',  label: 'Claiming soul crystal',  x: 0.9407, y: 0.2056, wait: DT.action    },
    { type: 'escape', label: 'Exiting Soul Atrium',                           wait: DT.escape    },

    // ── Outland ───────────────────────────────────────────────────────────
    { type: 'section', label: 'Outland' },
    { type: 'click',  label: 'Entering Outland',        x: 0.7022, y: 0.2121, wait: DT.areaEnter },
    // Boss 1
    { type: 'click',  label: 'Boss 1: claiming reward', x: 0.2370, y: 0.5433, wait: DT.action    },
    { type: 'click',  label: 'Boss 1: opening chests',  x: 0.4943, y: 0.6251, wait: DT.click     },
    { type: 'click',  label: 'Boss 1: opening chest',   x: 0.4933, y: 0.6595, wait: DT.action    },
    { type: 'click',  label: 'Back to Outland',         x: 0.9674, y: 0.1228, wait: DT.click     },
    // Boss 2
    { type: 'click',  label: 'Going to boss 2',         x: 0.8336, y: 0.8363, wait: DT.menuOpen  },
    { type: 'click',  label: 'Boss 2: claiming reward', x: 0.2370, y: 0.5433, wait: DT.action    },
    { type: 'click',  label: 'Boss 2: opening chests',  x: 0.4943, y: 0.6251, wait: DT.click     },
    { type: 'click',  label: 'Boss 2: opening chest',   x: 0.4933, y: 0.6595, wait: DT.action    },
    { type: 'click',  label: 'Back to Outland',         x: 0.9674, y: 0.1228, wait: DT.click     },
    // Boss 3
    { type: 'click',  label: 'Going to boss 3',         x: 0.8360, y: 0.8288, wait: DT.menuOpen  },
    { type: 'click',  label: 'Boss 3: claiming reward', x: 0.2370, y: 0.5433, wait: DT.action    },
    { type: 'click',  label: 'Boss 3: opening chests',  x: 0.4943, y: 0.6251, wait: DT.click     },
    { type: 'click',  label: 'Boss 3: opening chest',   x: 0.4933, y: 0.6595, wait: DT.action    },
    { type: 'click',  label: 'Back to Outland',         x: 0.9674, y: 0.1228, wait: DT.click     },
    { type: 'escape', label: 'Exiting Outland',                                wait: DT.escape    },

    // ── Guild ─────────────────────────────────────────────────────────────
    { type: 'section', label: 'Guild' },
    { type: 'click',  label: 'Entering Guild',  x: 0.0494, y: 0.8558, wait: DT.areaEnter },
    { type: 'escape', label: 'Exiting Guild',                          wait: DT.escape    },

    // ── Sanctuary ─────────────────────────────────────────────────────────
    { type: 'section', label: 'Sanctuary' },
    { type: 'click',  label: 'Entering Sanctuary',      x: 0.5975, y: 0.1991, wait: DT.areaEnter },
    { type: 'click',  label: 'Opening Pet Summoning',   x: 0.7284, y: 0.7358, wait: DT.menuOpen  },
    { type: 'click',  label: 'Summoning pet',           x: 0.6622, y: 0.8753, wait: DT.action    },
    { type: 'escape', label: 'Accepting summon result',                        wait: DT.escape    },
    { type: 'escape', label: 'Exiting Pet Summoning',                          wait: DT.escape    },
    { type: 'escape', label: 'Exiting Sanctuary',                              wait: DT.escape    },

    // ── Titan Valley ──────────────────────────────────────────────────────
    { type: 'section', label: 'Titan Valley' },
    { type: 'click',  label: 'Entering Titan Valley',         x: 0.3783, y: 0.3358, wait: DT.areaEnter },
    // Altar of Elements
    { type: 'click',  label: 'Entering Altar of Elements',   x: 0.4914, y: 0.7842, wait: DT.menuOpen  },
    { type: 'click',  label: 'Opening element',              x: 0.6257, y: 0.8670, wait: DT.action    },
    { type: 'escape', label: 'Accepting element result',                            wait: DT.escape    },
    { type: 'escape', label: 'Exiting Altar of Elements',                           wait: DT.escape    },
    // Tournament of Elements
    { type: 'click',  label: 'Entering Tournament',          x: 0.2543, y: 0.3088, wait: DT.menuOpen  },
    { type: 'click',  label: 'Opening Tournament Raid',      x: 0.6281, y: 0.7684, wait: DT.menuOpen  },
    { type: 'click',  label: 'Starting RAID ALL',            x: 0.5605, y: 0.7684, wait: DT.raidStart },
    { type: 'click',  label: 'Show all battles',             x: 0.4969, y: 0.8337, wait: DT.showAll   },
    { type: 'click',  label: 'Viewing battle rewards',       x: 0.4998, y: 0.8316, wait: DT.action    },
    { type: 'click',  label: 'Claiming battle rewards',      x: 0.4953, y: 0.6586, wait: DT.action    },
    { type: 'click',  label: 'Opening tournament chest',     x: 0.9373, y: 0.6949, wait: DT.menuOpen  },
    { type: 'click',  label: 'Claiming tournament rewards',  x: 0.4933, y: 0.8000, wait: DT.action    },
    { type: 'click',  label: 'Collecting all rewards',       x: 0.4988, y: 0.7898, wait: DT.action    },
    { type: 'escape', label: 'Exiting tournament',                                  wait: DT.escape    },
    { type: 'escape', label: 'Exiting Titan Valley',                                wait: DT.escape    },

    // ── Guild War ─────────────────────────────────────────────────────────
    { type: 'section', label: 'Guild War' },
    { type: 'click',  label: 'Entering Guild War', x: 0.7195, y: 0.4242, wait: DT.areaEnter },
    { type: 'escape', label: 'Exiting Guild War',                          wait: DT.escape    },
];
