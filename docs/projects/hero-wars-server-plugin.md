# Project: Hero-Wars (CS:GO Server Plugin)

**Path:** `reference-projects/Hero-Wars/`
**Type:** Source.Python server-side plugin
**Language:** Python
**Relevance to future agent:** Low — this targets the CS:GO/Source engine game server, not the web game

---

## Purpose

Implements a "Hero Wars" game mode on a Counter-Strike / Source engine game server. Players pick heroes, level up skills, equip items, and earn XP through kills and deaths — all managed server-side.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Plugin framework | Source.Python |
| Database | SQLite3 (`herowars.db`) |
| Architecture | Event-driven (game events trigger skill/level logic) |

---

## Key Files

| File | Role |
|------|------|
| `herowars.py` | Entry point; registers game event listeners (spawn, death, hurt, jump) |
| `core.py` | Core classes: Client, Entity, Hero, Skill; XP/leveling engine |
| `entities.py` | Base classes: Entity, Hero, Skill, Item, Passive with property management |
| `player.py` | Player class extending Source.Python's PlayerEntity; holds heroes, gold, active hero |
| `database.py` | SQLite3 read/write: player data, hero state, skill levels |
| `tools.py` | Utility decorators: `classproperty`, cooldown timers, probability/chance helpers |
| `configs.py` | XP values for kills/headshots, DB path |
| `heroes/__init__.py` | Dynamic hero loader — discovers and registers hero modules at runtime |

---

## Architecture Notes

- **Event-driven:** All skill triggers hang off Source.Python game event hooks
- **Cooldown system:** Threaded timers manage per-skill cooldowns
- **Dynamic heroes:** Hero classes are discovered and loaded at runtime via `heroes/__init__.py`
- **Persistence:** Full save/load cycle on player connect/disconnect via SQLite

---

## Not Relevant For

This project has no relation to the web game's API, browser DOM, or HTTP traffic. Skip when designing the future web automation agent.
