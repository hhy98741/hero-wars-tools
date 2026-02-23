# Project: hw-simulator (Chrome Extension)

**Path:** `reference-projects/hw-simulator/`
**Type:** Chrome Extension (Manifest V3)
**Language:** JavaScript (bundled/minified)
**Version:** 1.4.1
**Relevance to future agent:** HIGH — clean MV3 architecture; best starting point for a Chrome-extension-based agent

---

## Purpose

A Chrome extension that:
1. Adds a **battle simulator** — calculate battle outcomes before committing
2. Provides **hero statistics** and a comprehensive hero/lord database
3. Automates common game actions (tower, dungeon, raids, quests, brawl, etc.)
4. Works both on the game page and on its own website `hw-simulator.com`

---

## Target URLs (Host Permissions)

```
https://www.hero-wars.com/*
https://apps.facebook.com/mobaheroes/*
https://apps-1701433570146040.apps.fbsbx.com/*
https://www.facebook.com/gaming/play/1701433570146040/*
https://www.hw-simulator.com/*
https://auth.hw-simulator.com/*
https://api.hw-simulator.com/*
https://heroesweb-a.akamaihd.net/*
https://heroes-fb.akamaized.net/*
https://api.imgbb.com/*
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Extension type | Chrome Manifest V3 |
| Background | Service Worker (`background.js`) |
| Content scripts | `contentscript.js` (game pages), `contentscript2.js` (hw-simulator.com) |
| Page injection | `injected.js` (runs in game page's own JS context) |
| Network rules | `rules.json` (declarative net request — strips CSP headers) |
| Data | `assets/lords.json` (190 KB hero database), `_locales/` i18n |
| Build | Webpack-like bundle (chunk files, polyfills) |

---

## Architecture: The 3-Layer Communication Bridge

```
┌─────────────────────────────────────────────┐
│  Game Page (hero-wars.com)                  │
│  ┌──────────────────────────────────────┐   │
│  │  injected.js                         │   │
│  │  • Runs in page JS context           │   │
│  │  • Hooks XHR / game events           │   │
│  │  • Fires custom DOM events           │   │
│  └──────────┬───────────────────────────┘   │
│             │ CustomEvent (document)         │
│  ┌──────────▼───────────────────────────┐   │
│  │  contentscript.js                    │   │
│  │  • Receives DOM events               │   │
│  │  • Relays to background via          │   │
│  │    chrome.runtime.sendMessage        │   │
│  └──────────┬───────────────────────────┘   │
└─────────────│───────────────────────────────┘
              │ chrome.runtime messaging
┌─────────────▼───────────────────────────────┐
│  background.js (Service Worker)             │
│  • Core logic, automation orchestration     │
│  • State management, API call queueing      │
│  • Communication with hw-simulator.com UI   │
└─────────────────────────────────────────────┘
```

---

## Key Files

### `manifest.json`
- Declares permissions, host permissions, content scripts, service worker
- Key permissions: `tabs`, `declarativeNetRequest`, `unlimitedStorage`, `userScripts`, `identity`

### `injected.js` (468 lines — most readable file)
Runs **inside** the game page's JavaScript context. Key responsibilities:

| Custom Event | Direction | Purpose |
|-------------|-----------|---------|
| `HWSimWebRequestEvent` | page → extension | Fired when game makes an XHR request |
| `HWSimWebResponseEvent` | page → extension | Fired when game receives an XHR response |
| `HWSimGameEvent` | page → extension | General game events |
| `HWSimUpdateDominion` | page → extension | Game state change (resources, hero updates) |
| `HwSimMouseDown` | page → extension | User mouse interactions |
| `HWSimPing` | bidirectional | Connectivity check |

The extension sends commands back by dispatching events the other direction.

### `background.js` (~7,900 lines, minified)
Core automation engine. Contains the orchestration logic for all automated features. Would need to be unminified/de-obfuscated to read fully.

### `rules.json`
Strips `Content-Security-Policy` headers from Facebook game URLs — allows the extension's injected scripts to load without being blocked.

```json
{
  "urlFilter": "apps-1701433570146040.apps.fbsbx.com/",
  "responseHeaders": [{ "header": "Content-Security-Policy", "operation": "remove" }]
}
```

---

## Automated Features (from `_locales/en/messages.json`)

| Feature Key | Description |
|-------------|-------------|
| `AutoArchdaemon` | Automates Archdaemon boss fights |
| `AutoBrawl` | Automated brawl battles |
| `AutoHalloweenFurnace` | Halloween event furnace automation |
| `BuyInShops` | Auto-purchase in game shops |
| `CollectMails` | Collect mail/inbox rewards |
| `DoQuests` | Complete daily quests |
| `RunDungeon` | Auto-run dungeon |
| `RaidMinions` | Raid minion farming |
| `RunTower` | Auto-run tower |
| `SendExpeditions` | Auto-send heroes on expeditions |

---

## Data Assets

### `assets/lords.json` (190 KB)
Comprehensive hero/lord database with:
- Base stats per hero
- Skill descriptions and values
- Upgrade paths and costs
- Used by the battle simulator to pre-calculate outcomes

---

## Key Patterns for Future Agent

| Pattern | File | Value |
|---------|------|-------|
| 3-layer event bridge | `injected.js` ↔ `contentscript.js` ↔ `background.js` | Clean architecture for extension-based agent |
| CSP header removal via declarativeNetRequest | `rules.json` | Allows injecting scripts on restricted game pages |
| Custom DOM events as IPC | `injected.js` | Page ↔ content script communication without shared memory |
| Service worker as orchestrator | `background.js` | Keeps automation logic out of the page context |
| Hero database | `assets/lords.json` | Pre-built data asset — no need to scrape hero stats |

---

## Approach to Adopt for Future Agent

The `injected.js` → `contentscript.js` → `background.js` pipeline is the cleanest architecture here. A future agent could:

1. Use `injected.js` style to hook XHR and observe all API traffic
2. Relay captured data to a background worker (or Node.js process via CDP)
3. Have the background/agent decide actions and dispatch commands back to the page
4. Use `lords.json` as the hero stat reference without needing to scrape it

This is compatible with Chrome DevTools Protocol (CDP) automation (Playwright, Puppeteer) if you want to drive the browser programmatically from outside.
