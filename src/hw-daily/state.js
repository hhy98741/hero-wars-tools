export const dungeonState = {
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

export const towerState = {
    running:        false,
    sessionStart:   null,
    chestIndex:     0,      // 0–14: current index into CHEST_FLOORS / DOOR_POSITIONS
    chestsOpened:   0,
    statusInterval: null,
};

export const dailyState = {
    running:                    false,
    sessionStart:               null,
    stepsDone:                  0,
    currentStep:                '',
    expeditionRewardsAvailable: null,  // null = unknown, true/false set by expeditionGet XHR
};
