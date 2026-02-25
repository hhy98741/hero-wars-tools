# Recording XHR Calls from Hero Wars

This is a one-time data-gathering step done before writing any automation code.
The goal is to capture the exact API calls the game makes during a dungeon run and
tower session, so the automation scripts can be built from real data instead of guesses.

---

## What You're Capturing

Hero Wars is a canvas-rendered game — all visuals are drawn on a single `<canvas>` element.
The game still communicates with its server via XHR (HTTP) requests for all game logic.
These requests are visible in DevTools even though the UI is not inspectable.

The two request types you care about:

| Request name | What it is |
|---|---|
| `api/` | Main game API calls — start battle, end battle, collect reward, etc. |
| Numeric endpoints (e.g. `1771901505`) | Secondary game endpoints — also worth capturing |
| `clientStat/...` | Analytics telemetry — background noise, ignore |
| `collect` (204 status) | Tracking beacons — background noise, ignore |

---

## Step-by-Step: Exporting a HAR File

### 1. Open DevTools
- Mac shortcut: `Cmd + Option + I`
- Or: right-click anywhere on the page → "Inspect"

### 2. Go to the Network tab
Click "Network" in the DevTools tab bar at the top.

### 3. Filter to XHR/Fetch only
Click the **"Fetch/XHR"** filter button in the toolbar below the tab bar.
This hides images, CSS, fonts, and other noise — showing only API calls.

### 4. Clear the existing log
Click the **circle with a line through it (🚫)** button in the Network toolbar.
This clears all existing requests so you start fresh.

### 5. Play through the actions you want to capture
Do each of these as a separate recording session (clear between each):

**Session 1 — Dungeon run:**
- Navigate to the dungeon
- Start a battle and let it finish
- Collect the reward
- Continue to the next floor
- Repeat 2–3 more floors
- Exit the dungeon

**Session 2 — Tower run:**
- Navigate to the tower
- Start a battle and let it finish
- Collect/continue
- Do 2–3 floors
- Exit

**Session 3 — Any other daily tasks** (quests, arena, etc.) if you want to automate those too.

### 6. Export the HAR file
- Look for the **download arrow (↓) icon** in the Network panel toolbar
  (hover over it — tooltip says "Export HAR")
- Click it and save the `.har` file with a descriptive name, e.g.:
  - `dungeon-run.har`
  - `tower-run.har`

---

## After Capturing

Drop the `.har` file into Claude Code (this tool) and ask it to:
- Parse out all unique API endpoints
- Map the request body and response structure for each action
- Identify the sequence of calls that make up each game action
- Build the XHR observer and canvas click map from the real data

This is the foundation everything else is built on. The more complete the capture,
the less guessing the scripts have to do.

---

## Notes

- Background requests (`clientStat`, `collect`) will be in the HAR file — that's fine.
  Claude Code can filter them out when analyzing.
- If the session sits idle, you'll see polling requests fire on a timer. These are also
  easy to identify and ignore — they'll repeat at regular intervals with no action taken.
- Token and auth headers will be in the HAR file. These are sensitive — don't share
  the HAR file publicly. It's fine to share with Claude Code in a local session.
- The HAR format captures everything: URL, request headers, request body, response body,
  and timing. It's the complete picture needed to build the automation.
