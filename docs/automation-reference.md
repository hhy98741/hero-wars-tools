# Automation Reference — Architecture by Use Case

The two use cases have fundamentally different constraints and require different approaches.
Do not mix them — the safe patterns for the main account would be too slow for battle testing,
and the fast patterns for battle testing would risk the main account.

---

## Track 1: Main Account Grinding (Anti-Detection)

### Core Constraint

The existing tools (`hero-wars-helper`, `hw-simulator`) **bypass the game UI and replay raw API calls directly**. Analysis of those tools reveals specific detectable signatures (see [anti-detection.md](anti-detection.md)). For the main account, these approaches must not be used.

The safe rule: **let the game's own code make every API call.** The agent triggers actions by clicking actual DOM elements. The game's event handlers fire, the game's own code constructs and sends the request with proper sequential IDs, correct signatures, and natural timing.

### Recommended Architecture

```
Tampermonkey userscript (or lightweight Chrome extension)
  ├── READ ONLY: observe XHR responses → build game state model
  │     (no request modification, no API replay)
  └── WRITE: call element.click() on real game UI buttons
              → game's own code handles all API calls
```

Run in a **real headed Chrome browser** (not headless — headless browsers expose `navigator.webdriver = true`).

### Why This Is Safe

| Risk Factor | Raw API Replay (bad) | UI-Click Approach (safe) |
|------------|---------------------|--------------------------|
| X-Request-Id sequence | Script increments it — perfectly sequential, detectable | Game's own code increments it naturally |
| Request timing | Algorithmic (sub-100ms, no jitter) | Driven by DOM events and real UI delays |
| Auth signature | Script recalculates it — pattern detectable | Game calculates it internally |
| User input correlation | API call with no preceding click event | click() fires the real event chain |
| Headless fingerprint | Present if using Playwright headless | Not present in real Chrome |
| CSP header removal | Extension leaves fingerprint | Not needed; clicking UI doesn't need it |

### Human-Like Behavior Requirements

These must be baked into the automation, not bolted on later:

| Behavior | Implementation |
|----------|---------------|
| Variable delays between actions | `random(800ms, 3500ms)` between each click — not uniform |
| Mouse path variation | Move mouse to button with slight jitter (±5–15px from center) before clicking |
| Session length limits | Max 45–90 min continuous run; pause 10–30 min between sessions |
| Time-of-day scheduling | Only run during hours you'd normally play — never 3am grinding |
| Occasional idle periods | Random 2–5 min pauses mid-session, as if you stepped away |
| Fail gracefully | If something is unexpected, stop and wait — don't loop frantically |
| No perfect accuracy | Vary click position slightly each time, even to the same button |

### Game State: Read-Only XHR Observation

To know *what* to click, the agent needs to understand game state. Do this by observing XHR responses passively — **never modifying requests or replaying them**.

```
// Safe: read-only observation
XMLHttpRequest.prototype.send = (function(original) {
    return function(body) {
        this.addEventListener('load', function() {
            // read this.responseText, update local state model
            // never send your own request from here
        });
        return original.apply(this, arguments); // always let original proceed
    };
})(XMLHttpRequest.prototype.send);
```

This tells you: current floor, stamina count, heroes available, quest state — everything needed to decide the next click. The game server never sees anything unusual.

### Dungeon & Tower Specific Flow

```
Observe game state (passive XHR read)
  → Are we in dungeon/tower?
  → What floor?
  → Is a battle in progress or on the results screen?

If on results screen:
  → Find "Next Floor" or "Continue" button in DOM
  → setTimeout(random(1200, 2800), () => button.click())

If on floor select:
  → Find "Start Battle" button
  → Move mouse to button (with jitter)
  → setTimeout(random(900, 2000), () => button.click())

After each action:
  → Wait for XHR response confirming new state
  → Only then decide next action (prevents double-clicks from racing)
```

### What to Borrow from Existing Projects

| Source | What to Take | What to Ignore |
|--------|-------------|----------------|
| `hero-wars-helper` | Game state variable names, response parsing logic, DOM selectors for buttons | `makeRequest()`, signature calculation, any API replay |
| `reference-projects/hw-simulator/injected.js` | Event bridge pattern (DOM events as IPC) | CSP removal, request modification |
| `reference-projects/hw-simulator/assets/lords.json` | Hero data for display/decision logic | N/A |
| `HeroWarsAutoplay` | Concept only: pause-on-user-input, SSIM screen state detection | All code is Windows-only (`win32api`) — do not port directly; use `pyautogui` + Playwright screenshots instead |

### Stack Recommendation (Mac)

| Component | Choice | Reason |
|-----------|--------|--------|
| Browser | Real Chrome for Mac (headed) | No webdriver flag; extension APIs available; native on Mac |
| Script delivery | Tampermonkey userscript | Easiest to iterate on Mac; no extension packaging/signing needed |
| Game state | Passive XHR observer | Read-only; safe; gives full game data |
| Action execution | `element.click()` on real DOM | Game's own handlers fire; API calls are native |
| Timing | `setTimeout` with `Math.random()` | Human-like variance; not algorithmic |
| Scheduling | macOS `launchd` or manual trigger | Don't run autonomously 24/7; `launchd` is Mac's cron equivalent |
| Screen fallback (if needed) | Playwright `page.screenshot()` + `scikit-image` | Cross-platform; replaces HeroWarsAutoplay's `mss`+`win32api` |

---

## Track 2: Throwaway Account — Battle Testing (Efficiency)

### Core Constraint

No detection concern. Goal is to iterate through hero team combinations, execute battles, and record win rates as fast as possible.

### Recommended Architecture

```
Python or Node.js orchestrator
  ↕ Playwright (headless Chromium)
  ↕ page.addInitScript() — inject XHR hooks
  ↕ page.evaluate() — call game API endpoints directly
hero-wars.com (throwaway account session)
  → Results captured via XHR response observer
  → Written to SQLite / CSV
```

Playwright headless is fine here. The throwaway account being flagged is acceptable.

### API Replay Approach

Use `hero-wars-helper`'s `makeRequest()` pattern: capture a real session's XHR traffic once (headers, auth tokens, request format), then replay battle requests in a loop.

```
1. Log in with throwaway account manually
2. Capture one real battle request (all headers + body) via devtools
3. Build request template from captured data
4. For each hero combination:
   a. POST battle-start request with team composition
   b. Await battle-result response
   c. Parse win/loss and key stats from response
   d. Write to results DB
   e. Loop
```

The `X-Auth-Token`, `X-Auth-Session-Id`, and session cookies from step 1 authenticate all replayed requests.

### Hero Combination Enumeration

```python
from itertools import combinations

# Your available heroes (by ID from lords.json)
available_heroes = [hero_id_1, hero_id_2, ...]

# Team size (typically 5 for dungeon/tower)
team_size = 5

for team in combinations(available_heroes, team_size):
    result = run_battle(team, enemy_team)
    record_result(team, enemy_team, result)
```

With 30 heroes choosing 5: 142,506 combinations. With fast API replay (1–3 sec/battle), that's ~50–120 hours of compute. You'll want filters to prune obviously bad combinations early.

### Pruning Strategies

| Strategy | How |
|----------|-----|
| Role coverage filter | Require at least 1 tank + 1 healer before testing |
| Pre-filter with BattleCalc | Use `hero-wars-helper`'s `BattleCalc` to skip combinations that simulate badly |
| Incremental testing | Start with top N individual heroes by win rate, then combine |
| Fix known good anchors | Lock 2–3 proven heroes, only iterate the remaining slots |

### Data Recording Schema

```sql
CREATE TABLE battle_results (
    id          INTEGER PRIMARY KEY,
    team        TEXT,       -- JSON array of hero IDs
    enemy_team  TEXT,       -- JSON array of enemy hero IDs
    won         INTEGER,    -- 1 = win, 0 = loss
    raw_result  TEXT,       -- full JSON response for later analysis
    timestamp   INTEGER
);

CREATE VIEW team_win_rates AS
SELECT team, COUNT(*) as battles,
       SUM(won) as wins,
       ROUND(100.0 * SUM(won) / COUNT(*), 1) as win_pct
FROM battle_results
GROUP BY team
ORDER BY win_pct DESC;
```

### What to Borrow from Existing Projects

| Source | What to Take |
|--------|-------------|
| `hero-wars-helper` | `makeRequest()` pattern, `getSignature()` logic, all endpoint URLs, request/response schemas, `BattleCalc` engine |
| `reference-projects/hw-simulator/assets/lords.json` | Hero IDs and stats for building combination lists |
| `reference-projects/hw-simulator/injected.js` | Battle endpoint detection patterns (`startbattle`, `endbattle` URL fragments) |

### Stack Recommendation (Mac)

| Component | Choice | Reason |
|-----------|--------|--------|
| Browser driver | Playwright (headless Chromium) | `pip install playwright` + `playwright install chromium`; works on Mac |
| Auth | Capture real session once, reuse tokens | Simplest; tokens are long-lived |
| API calls | Direct XHR replay via `page.evaluate()` | Fastest; skip all UI rendering |
| Concurrency | Single browser, single session | Avoid session conflicts; game may reject parallel logins |
| Result storage | SQLite via Python `sqlite3` (stdlib) | No install needed; easy to query; portable `.db` file |
| Combination enumeration | Python `itertools.combinations` | Built-in, correct |
| Data analysis | `pandas` + SQLite or plain SQL queries | Easy win-rate aggregation on Mac |

---

## Shared: What to Build First

Regardless of which track you build first, this foundational work applies to both:

### 1. API Endpoint Map

Run `hero-wars-helper` with devtools open. Play through one complete dungeon run and one tower session. Export `requestHistory` to JSON. This gives you:
- All endpoint URLs
- Full request body schemas
- Full response data shapes
- The exact sequence of calls that constitute each game action

This is the single most valuable data-gathering step. Do this before writing any automation code.

### 2. Hero Database

`reference-projects/hw-simulator/assets/lords.json` is already built. Parse it to get hero IDs, base stats, and skill data. Use it for both the Track 2 combination engine and the Track 1 state display.

### 3. Battle Flow Map

Document the exact sequence of API calls for one complete battle:
```
dungeon/startBattle  → battle begins
(wait for result)
dungeon/endBattle    → result captured
(navigate to next floor)
```

Knowing this sequence is essential for Track 2's replay loop and for Track 1's XHR observer to know when an action is complete.

---

## Comparison Summary

| | Track 1: Main Account | Track 2: Battle Testing |
|-|----------------------|------------------------|
| Detection concern | Critical | None |
| API calls | Game's own code only | Direct replay |
| Browser | Real Chrome, headed | Playwright headless |
| Timing | Randomized, human-like | As fast as possible |
| Game state source | Passive XHR observation | XHR responses from replayed calls |
| Hero combinations | Not applicable | itertools.combinations + BattleCalc pre-filter |
| Result storage | Not applicable | SQLite with win-rate views |
| `hero-wars-helper` used as | Reference only | Direct pattern source |
| Build complexity | Moderate | Lower (no timing constraints) |
