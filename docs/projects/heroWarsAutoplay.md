# Project: HeroWarsAutoplay (Python Mouse Bot)

**Path:** `reference-projects/HeroWarsAutoplay/`
**Type:** Standalone Windows automation bot
**Language:** Python 3
**Relevance to future agent:** Low — Windows-only; cannot run on Mac. The concepts (SSIM comparison, OCR, pause-on-input) are worth borrowing, but the code itself is not portable.

---

## Purpose

Automates repetitive grinding in the Hero Wars **web game** by controlling the mouse and keyboard at the OS level and reading the screen with computer vision and OCR. No browser extension or script injection required.

---

## Tech Stack

| Layer | Library |
|-------|---------|
| Screen capture | `mss`, `PIL.ImageGrab` |
| Image comparison | `scikit-image` SSIM (structural similarity index) |
| OCR / text reading | `pytesseract` + Tesseract-OCR |
| Image processing | `opencv-python` (cv2), `Pillow` |
| Mouse & keyboard | `win32api` (pywin32), `ctypes` |
| Misc | `numpy`, `pyautogui` |

**Platform:** Windows only (win32api)

---

## Main Script: `V3_Autoplay.py`

### How It Works

1. **Captures** the game window (full screen or region) with `mss`/`ImageGrab`
2. **Analyzes** the captured frame:
   - OCR reads button labels and text
   - SSIM compares current frame to known reference images (>50% similarity = match)
3. **Decides** what action to take based on detected UI state
4. **Acts** by sending `win32api` mouse move/click events or keyboard events

### Coordinate System

- Assumes **1920×1080** resolution
- Uses `x_pad`, `y_pad` offsets to handle window positioning
- All click targets are hardcoded pixel coordinates

### Safety Features

- **Pause on mouse move:** Detects user mouse movement and pauses automation
- **Diamond protection:** Configurable check to avoid spending diamonds accidentally
- **Load time buffer:** `setLoadTime` variable (default 10 sec) waits for slow connections

---

## Automated Actions

| Action | Description |
|--------|-------------|
| Tower traversal | Navigates tower floors, auto-skips battles |
| Chest opening | Opens chests (with optional diamond-spend guard) |
| Dungeon runs | Enters and completes dungeon automatically |
| Daily quests | Completes daily activity list |
| Pop-up dismissal | Sends ESC key to close overlays |
| Screen state detection | SSIM-based state machine to know "where" in the UI the game is |

---

## Concepts Worth Borrowing (Not the Code)

The code itself cannot run on Mac, but the ideas translate:

| Concept | Original (Windows) | Mac Equivalent |
|---------|-------------------|----------------|
| SSIM screen state detection | `mss` + `scikit-image` | `playwright.screenshot()` + `scikit-image` |
| OCR text reading | `pytesseract` + Tesseract | `pytesseract` + `brew install tesseract` |
| Mouse/keyboard control | `win32api` (Windows-only) | `pyautogui` (cross-platform) or Playwright's `page.click()` |
| Pause-on-user-input | `win32api` mouse position polling | `pyautogui.position()` polling |

However, for our use cases the screen-based approach is mostly unnecessary:
- **Track 1 (main account):** DOM-based clicks are cleaner and safer
- **Track 2 (throwaway):** API replay doesn't need screen interaction at all

Screen capture would only be needed as a last resort if a specific UI element is canvas-rendered and not accessible via DOM selectors.

---

## Limitations

- **Windows only** — `win32api` / `pywin32` do not exist on macOS
- **Resolution-locked** — 1920×1080 hardcoded coordinates break on other resolutions
- **Fragile to UI changes** — pixel coordinates and reference images need updating whenever game UI changes
- **No game-state awareness** — reacts to what it sees on screen, doesn't know the underlying game data
