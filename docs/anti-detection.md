# Anti-Detection Analysis

This document explains what the existing tools do that would be detectable by the game's server,
and what patterns to avoid when building automation for the **main account**.

---

## How the Existing Tools Work (and Why They're Risky)

Both `hero-wars-helper` and `hw-simulator` use the same core technique: they monkey-patch
`XMLHttpRequest.prototype` to intercept game API calls, then replay those calls directly
(bypassing the game UI entirely). This is fast and powerful, but leaves clear fingerprints.

---

## Detectable Signatures (Ranked by Risk)

### 1. Sequential X-Request-Id (CRITICAL)

`hero-wars-helper` captures the `X-Request-Id` header from real requests and increments it
programmatically for each replayed request:

```javascript
// From hero-wars-helper
headers['X-Request-Id'] = ++currentRequestId;
```

**Why it's detectable:** A human playing the game also increments this ID, but with natural
variation — sometimes clicking quickly, sometimes slowly, sometimes navigating away and back.
A bot produces a perfectly monotonic sequence at regular intervals. If the server plots
request ID vs. timestamp, a bot looks like a straight line; a human looks like a curve with
varying slopes and pauses.

### 2. Sub-100ms Inter-Request Timing (CRITICAL)

`reference-projects/hw-simulator/injected.js` logs a warning when requests exceed 100ms — meaning it expects
to process requests in under 100ms. A human navigating the game UI takes 500ms–3000ms
between meaningful actions (reading the screen, moving the mouse, clicking).

**Why it's detectable:** Server-side, the gap between a `startBattle` request and the next
`endBattle` + next `startBattle` cycle reveals the pacing. Humans: 3–15 seconds between
battles. Bots: under 1 second.

### 3. API Calls Without Preceding UI Events (HIGH)

When a human starts a dungeon battle, the server sees:
- Asset requests (battle screen textures loading)
- The cursor movement to the Start button
- A small delay (150–400ms human reaction time)
- The `startBattle` POST request

When the bot replays, the server sees:
- Just the `startBattle` POST request
- Nothing before it

Modern game backends often correlate API calls with expected client activity. A `startBattle`
call with no preceding page activity is a red flag.

### 4. Perfect Auth Signature Recalculation (HIGH)

`hero-wars-helper`'s `getSignature()` function:
```javascript
// Captures these from real requests, then reproduces them for replayed calls:
// X-Auth-Token, X-Auth-Session-Id, X-Auth-Signature (MD5 hash)
// X-Env-Unique-Session-Id, X-Env-Unique-Session-Uuid
```

The signature algorithm may embed a timestamp or nonce. If the server validates that the
signature timestamp matches the actual request time, a replayed signature will fail or
look anomalous.

### 5. CSP Header Removal (MEDIUM)

`reference-projects/hw-simulator/rules.json` removes the `Content-Security-Policy` header from Facebook game
responses via Chrome's declarativeNetRequest API. This is necessary for the extension's
injected scripts to load on that domain.

**Why it's detectable:** Server-side logging may notice that CSP-restricted resources are
being loaded successfully when they shouldn't be. Also, the absence of the CSP header on
responses can be observed by client-side telemetry that the game itself sends back.

### 6. Battle Mutex Locking (MEDIUM)

`reference-projects/hw-simulator/injected.js` uses a `battleMutex` to synchronize battle-related requests —
preventing race conditions that would never occur in a real human session. The consistent
synchronization adds a subtle but consistent timing signature.

### 7. Regular Polling Intervals (LOW–MEDIUM)

`reference-projects/hw-simulator/injected.js` pings every 30 seconds and polls state every 100ms or 1000ms.
These generate mechanical request patterns that don't match human browsing behavior.

---

## What Not to Do for the Main Account

| Do Not | Why |
|--------|-----|
| Call `makeRequest()` or equivalent directly | Bypasses UI; no user event chain; suspicious timing |
| Increment `X-Request-Id` in your own code | Produces perfectly sequential pattern |
| Recalculate `X-Auth-Signature` | Signature may embed timestamp; pattern is detectable |
| Remove CSP headers | Leaves extension fingerprint |
| Run requests faster than ~1 per 2 seconds | Below human reaction threshold |
| Use fixed delays (e.g., always 1000ms) | Algorithmic timing is detectable; use random ranges |
| Run headless Chrome | `navigator.webdriver = true`; easily fingerprinted |
| Chain actions without pauses | Humans pause to read the screen |
| Run at unusual hours continuously | No human plays for 6 hours without stopping |

---

## What Is Safe

| Safe Pattern | Why |
|-------------|-----|
| `element.click()` on real DOM buttons | Game's own code fires, no forged API calls |
| Passive XHR `load` listener (read-only) | Server never sees anything unusual; only you read the response |
| `setTimeout(fn, random(800, 3000))` | Realistic inter-action timing |
| Real Chrome with Tampermonkey | No webdriver flag; normal browser fingerprint |
| Stopping after a realistic session length | Matches human play patterns |
| Pausing if the game state is unexpected | Humans also stop and think |

---

## The Key Principle

> The server cannot directly see your JavaScript. It can only see HTTP requests and their
> timing. If the HTTP traffic looks like a human's, you're safe. If it looks like a machine's
> (perfect timing, no gaps, sequential IDs, no UI events), you're at risk.

The safest automation produces HTTP traffic that is indistinguishable from a human's —
because it IS generated by human-facing code paths, just triggered programmatically.

---

## Server-Side Detection Strategies (What the Game Likely Monitors)

These are common techniques used by web game anti-cheat systems:

| Detection Method | What It Catches |
|-----------------|----------------|
| Request timing statistics (std dev of inter-request gaps) | Bots with consistent timing; human std dev is high |
| X-Request-Id vs. time correlation | Perfect linear sequences indicate non-human incrementing |
| Resource request correlation | Battle start with no preceding asset load |
| Session activity entropy | Bot sessions have low entropy (repetitive patterns) |
| Anomalous request rates | Actions/minute far exceeding human capability |
| Behavioral baselines | Your account's own historical patterns vs. sudden change |
| Signature timestamp validation | Replayed signatures with stale timestamps |
| Client telemetry | Game may send back mouse movement / click event logs |

---

## Bottom Line

For the **main account**, treat the existing projects as read-only references — mine them
for game state knowledge and API structure, but never use their request-replay mechanisms.

For the **throwaway account**, the existing tools' techniques are exactly right — fast,
direct, and efficient.
