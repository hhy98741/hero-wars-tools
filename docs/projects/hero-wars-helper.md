# Project: hero-wars-helper (Tampermonkey Userscript)

**Path:** `reference-projects/hero-wars-helper/`
**Type:** Greasemonkey/Tampermonkey userscript
**Language:** JavaScript (~14,500+ lines)
**Author:** ZingerY (v2.434)
**Relevance to future agent:** HIGH — most comprehensive automation logic; best reference for game API shape and automation flows

---

## Purpose

A massive userscript that automates nearly every repetitive action in Hero Wars Dominion Era. Runs inside the browser alongside the game page, intercepts the game's HTTP traffic, and drives game actions by replaying API calls.

---

## Target URLs

```
https://www.hero-wars.com/*
https://apps-1701433570146040.apps.fbsbx.com/*   (Facebook gaming version)
```

---

## Tech Stack

| Layer | Approach |
|-------|---------|
| Script injection | Tampermonkey/Greasemonkey `@grant` APIs |
| Game API interception | Monkey-patches `XMLHttpRequest.prototype` (open, send, setRequestHeader) |
| UI additions | Direct DOM manipulation (adds buttons, checkboxes, status panels) |
| Persistence | `localStorage` for user settings |
| Battle simulation | Integrated `BattleCalc` engine |
| i18n | Multi-language support (EN, RU, DE, +more) |

---

## Core Mechanism: XHR Interception

The script hooks into the browser's XHR layer **before** the game code runs:

```javascript
// Conceptual (simplified from actual code)
const originalOpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function(method, url, ...) {
    this._url = url;  // capture the endpoint
    originalOpen.apply(this, arguments);
};

const originalSend = XMLHttpRequest.prototype.send;
XMLHttpRequest.prototype.send = function(body) {
    // inspect/log/modify the request body before it goes out
    requestHistory[this._url] = { body, timestamp };
    originalSend.apply(this, arguments);
};
```

Then on response, it reads and reacts to game data before the game UI does.

### What This Enables

- **Read all game state:** Every server response (hero data, quest state, battle results, resources) flows through the hook
- **Replay requests:** Can call game API endpoints directly by reusing captured request signatures
- **Modify responses:** Can alter what the game "sees" in server responses
- **Queue actions:** Can fire a sequence of API calls without waiting for user UI interaction

---

## Tracked Game State Variables

| Variable | Contents |
|----------|----------|
| `requestHistory` | Full log of all XHR requests by endpoint URL |
| `userInfo` | Player account data, resources, level |
| `questsInfo` | Daily/weekly quest states and progress |
| `missionBattle` | Current/last mission battle data |
| `lastBattleInfo` | Result of most recent battle |
| `heroData` | All hero stats, levels, equipment |

---

## Automation Functions (Grouped)

### Daily Routine
| Function | What It Does |
|----------|-------------|
| `dailyQuests()` | Auto-completes all daily quests |
| `getDailyBonus()` | Collects daily login rewards |
| `rewardsAndMailFarm()` | Collects quest rewards and mail |
| `farmStamina()` | Burns stamina via expeditions |

### Combat
| Function | What It Does |
|----------|-------------|
| `testDungeon()` / `executeDungeon()` | Runs dungeon (test=simulate, execute=do it) |
| `testTower()` / `executeTower()` | Runs tower floors |
| `autoBrawls()` | Automated brawl battles with team selection |
| `autoRaidAdventure()` | Runs raid adventure maps |

### Resources & Items
| Function | What It Does |
|----------|-------------|
| `getAutoGifts()` | Collects promotional gifts/bonuses |
| `buyInStoreForGold()` | Auto-purchases items in shops |
| `farmBattlePass()` | Farms battle pass activities |
| `bossOpenChestPay()` | Opens paid chests |
| `updateArtifacts()` | Manages artifact upgrades |
| `rollAscension()` | Auto-rolls ascension |

### Special Events
| Function | What It Does |
|----------|-------------|
| `bossRatingEvent()` | Farms boss rating events |
| `getAnswer()` | Auto-answers in-game quiz questions |

### Advanced / Internal
| Function | What It Does |
|----------|-------------|
| `BattleCalc` | Battle outcome simulator (pre-calculates before committing) |
| `skipBattle()` | Skips battle animations |
| `cancelFight()` | Cancels an in-progress fight |

---

## UI Controls Added to Game Page

The script injects its own control panel into the game UI:

- **Checkboxes:** Toggle individual automation features (skip battles, auto-quests, auto-brawl, quiz answers, etc.)
- **Number inputs:** Tune auto-battle attempt counts, load time buffers
- **Action buttons:** Launch automation sequences on demand
- **Status display:** Real-time messages with countdown timers
- **Modal confirmations:** For risky operations (spending diamonds, etc.)

---

## Key Patterns for Future Agent

| Pattern | Location | Value |
|---------|----------|-------|
| XHR monkey-patch | Top of script | Best way to observe all game traffic in-browser |
| `requestHistory` map | Global state | Template for building game API request library |
| `test*` / `execute*` pattern | Dungeon/Tower functions | "Dry run" before committing — good agent safety pattern |
| `BattleCalc` | Battle simulation module | Can pre-decide whether a fight is worth doing |
| `localStorage` settings | Settings management | Pattern for persisting agent configuration |
| Mouse-move pause detection | (borrowed from Autoplay) | Safety pattern to halt automation on user input |

---

## Things to Extract for Future Agent

1. **Full API endpoint map** — `requestHistory` reveals all game endpoints
2. **Request body schemas** — each captured request shows required parameters
3. **Response data shapes** — how the server returns hero data, quest states, etc.
4. **Battle flow** — the sequence of API calls that constitute a complete battle
5. **Quest flow** — the sequence to complete, collect, and refresh daily quests

---

## Notes

- Script is minified/obfuscated in some sections but readable overall
- Copyright ZingerY — treat as reference/inspiration, not copy-paste
- Version 2.434 suggests active long-term development; check for updates periodically
