# Hero Wars Tools

## Build

```bash
npm run build        # builds dist/hw-daily.user.js
npm run watch        # rebuild on file save
```

Entry point: `src/hw-daily/index.js` → bundled via esbuild (IIFE, no minification).

## Source files (`src/hw-daily/`)

| File | Role |
|------|------|
| `config.js` | All coordinates, timing, and step definitions. Edit this to tune clicks or timings. |
| `state.js` | Shared mutable state objects for dungeon, tower, and daily. |
| `utils.js` | `clickAt`, `pressEscape`, `waitRandom`, and `*Log` helpers. |
| `xhr.js` | Read-only XHR observer — detects game API responses and dispatches to automation handlers. |
| `dungeon.js` | Dungeon automation (XHR-driven loop). |
| `tower.js` | Tower automation (XHR-driven loop). |
| `daily.js` | Daily chore run (sequential step runner, single pass). |
| `overlay.js` | Fixed HUD overlay: Daily (green, row 1), Tower (blue, row 2), Dungeon (violet, row 3). |
| `index.js` | Wires up `window.HWDaily/HWDungeon/HWTower`, keyboard shortcuts (F7/F8/F9), and init. |

## Key patterns

**XHR observer** (`xhr.js`): wraps `XMLHttpRequest.prototype.send`, reads responses from `nextersglobal.com/api/`. All game actions use a single endpoint with a `calls: [{name, args, ident}]` request body and `results: [{ident, result: {response}}]` response.

**Dungeon/Tower** are XHR-driven: a game API response triggers the next action (e.g. `dungeonEndBattle` → click OK → click next door).

**Daily** is a sequential step runner over `DAILY_STEPS` in `config.js`. Each step is `{type, label, x?, y?, wait?, condition?}`. Steps with a falsy `condition()` are skipped. The only conditional steps currently are the expedition claim steps, gated on `dailyState.expeditionRewardsAvailable` (set by the `expeditionGet` XHR when the expedition map opens).

## Reference files (`exports/`)

- `daily-click-coordinates.md` — normalized (x, y) click coordinates for all daily sections
- `*.har` — recorded network traffic for each game area; filename matches the section heading in the coordinates file
- `titan-choices.md` — notes on titan valley

## Console API

```js
HWDaily.start() / .stop() / .status()    // F7
HWTower.start() / .stop() / .status()    // F8
HWDungeon.start() / .stop() / .status()  // F9
```

## Two Use Cases — Different Detection Requirements

The codebase serves two distinct tracks with fundamentally different constraints. Do not mix approaches between them.

### Track 1: Main Account — Grinding (anti-detection required)
- Account cannot be banned — must be indistinguishable from a human player
- **Must NOT** replay raw API calls; all API calls must come from the game's own code
- **Must** use `element.click()` on real DOM buttons + passive XHR observation only
- **Must** use randomized delays (`random(800ms, 3500ms)`), session length limits, and jitter
- The current `hw-daily` tool follows this track: it clicks real DOM elements and observes XHR read-only

### Track 2: Throwaway Account — Battle Combination Testing (no detection concern)
- Iterates hero team combinations and records win rates; efficiency is the only priority
- **Can** replay API calls directly (Playwright headless + `page.evaluate()` is fine)
- Detection/banning is acceptable on this account

See [`docs/README.md`](docs/README.md) for the full use-case overview, [`docs/automation-reference.md`](docs/automation-reference.md) for architecture details per track, and [`docs/anti-detection.md`](docs/anti-detection.md) for a ranked list of detectable signatures to avoid in Track 1.
