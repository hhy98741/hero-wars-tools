# Hero Wars Tools — Codebase Notes

Research notes for building a future automation agent for **Hero Wars Dominion Era**.

---

## Projects at a Glance

| Project | Type | Language | Game Interaction |
|---------|------|----------|-----------------|
| [Hero-Wars](projects/hero-wars-server-plugin.md) | Game server plugin | Python | Server-side event system (CS:GO Source engine) |
| [HeroWarsAutoplay](projects/heroWarsAutoplay.md) | Standalone bot | Python | Windows mouse/keyboard + screen OCR |
| [hero-wars-helper](projects/hero-wars-helper.md) | Userscript | JavaScript | AJAX interception + DOM manipulation |
| [hw-simulator](projects/hw-simulator.md) | Chrome extension | JavaScript | Content scripts + DOM event bridge |

---

## Two Use Cases — Very Different Requirements

### Use Case 1: Main Account — Dungeon & Tower Grinding
- Account cannot be flagged or banned
- Must look indistinguishable from a human player
- **Constraint: NO raw API replay.** Must drive actions through the actual game UI.
- See: [automation-reference.md → Track 1](automation-reference.md#track-1-main-account-grinding-anti-detection)

### Use Case 2: Throwaway Account — Battle Combination Testing
- Iterate through hero team combinations, run battles, record win rates
- Efficiency is the priority; detection is not a concern
- **Can use direct API replay** for maximum speed
- See: [automation-reference.md → Track 2](automation-reference.md#track-2-throwaway-account-battle-testing-efficiency)

---

## Most Relevant Projects Per Use Case

| Project | Use Case 1 (Main) | Use Case 2 (Throwaway) |
|---------|-------------------|------------------------|
| **hero-wars-helper** | Read-only: game state knowledge, API endpoint map | Directly reusable: API replay, request schemas |
| **hw-simulator** | Architecture reference: clean extension event bridge | Hero database (`lords.json`) for combo enumeration |
| **HeroWarsAutoplay** | Concepts only (SSIM, OCR, pause-on-input) — code is Windows-only, cannot run on Mac | Not needed |
| **Hero-Wars** | Not relevant | Not relevant |

---

## Files in This Folder

- `README.md` — This file (index + use cases)
- `automation-reference.md` — Full architecture split by use case **(start here)**
- `anti-detection.md` — What the existing tools do that is detectable, and how to avoid it
- `projects/hero-wars-server-plugin.md` — CS:GO server plugin deep-dive
- `projects/heroWarsAutoplay.md` — Python mouse bot deep-dive
- `projects/hero-wars-helper.md` — Userscript deep-dive
- `projects/hw-simulator.md` — Chrome extension deep-dive
