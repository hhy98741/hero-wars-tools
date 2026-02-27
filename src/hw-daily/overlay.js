import { dungeonState, towerState, dailyState } from './state.js';
import { CHEST_FLOORS } from './config.js';

let overlayEl;
let dungeonBtnToggle, dungeonLblStatus, dungeonLblFloor, dungeonLblFloors, dungeonLblTime, dungeonSpinner;
let towerBtnToggle,   towerLblStatus,  towerLblChest,   towerLblTime,   towerSpinner;
let dailyBtnToggle,   dailyLblStatus,  dailyLblStep,    dailyLblTime,   dailySpinner;

export function buildOverlay(onDungeonToggle, onTowerToggle, onDailyToggle) {
    const el = document.createElement('div');
    el.id = 'hw-daily-overlay';
    el.innerHTML = `
        <div id="hwo-brand">HW</div>
        <div id="hwo-rows">
            <div id="hwo-daily-row">
                <span id="hwdy-label">Daily</span>
                <span class="hwo-sep">·</span>
                <span id="hwdy-step">—</span>
                <span class="hwo-sep">·</span>
                <span id="hwdy-time">0 min</span>
                <span class="hwo-sep">·</span>
                <span id="hwdy-status">Ready</span>
                <span class="hwo-spinner hwo-hidden" id="hwdy-spinner"></span>
                <button id="hwdy-toggle">▶</button>
                <span class="hwo-hint">F7</span>
            </div>
            <div id="hwo-tower-row">
                <span id="hwt-label">Tower</span>
                <span class="hwo-sep">·</span>
                <span id="hwt-chest">—</span>
                <span class="hwo-sep">·</span>
                <span id="hwt-time">0 min</span>
                <span class="hwo-sep">·</span>
                <span id="hwt-status">Ready</span>
                <span class="hwo-spinner hwo-hidden" id="hwt-spinner"></span>
                <button id="hwt-toggle">▶</button>
                <span class="hwo-hint">F8</span>
            </div>
            <div id="hwo-dungeon-row">
                <span id="hwd-label">Dungeon</span>
                <span class="hwo-sep">·</span>
                <span id="hwd-floor">Floor —</span>
                <span class="hwo-sep">·</span>
                <span id="hwd-floors">0 floors</span>
                <span class="hwo-sep">·</span>
                <span id="hwd-time">0 min</span>
                <span class="hwo-sep">·</span>
                <span id="hwd-status">Ready</span>
                <span class="hwo-spinner hwo-hidden" id="hwd-spinner"></span>
                <button id="hwd-toggle">▶</button>
                <span class="hwo-hint">F9</span>
            </div>
        </div>
    `;

    const style = document.createElement('style');
    style.textContent = `
        #hw-daily-overlay {
            position: fixed;
            top: 0;
            left: 50%;
            transform: translateX(-50%);
            z-index: 999999;
            display: flex;
            align-items: center;
            gap: 12px;
            background: rgba(10, 10, 20, 0.90);
            border: 1px solid rgba(255,255,255,0.12);
            border-radius: 0 0 8px 8px;
            padding: 4px 16px 6px;
            font-family: monospace;
            font-size: 12px;
            color: #ddd;
            white-space: nowrap;
            user-select: none;
        }
        #hwo-brand {
            color: #f0c060;
            font-weight: bold;
            font-size: 13px;
            letter-spacing: 1px;
            align-self: center;
        }
        #hwo-rows {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }
        #hwo-daily-row, #hwo-tower-row, #hwo-dungeon-row {
            display: flex;
            align-items: center;
            gap: 6px;
        }
        #hwdy-label  { color: #60f0a0; font-weight: bold; min-width: 56px; }
        #hwt-label   { color: #60a8f0; font-weight: bold; min-width: 56px; }
        #hwd-label   { color: #c060f0; font-weight: bold; min-width: 56px; }
        #hwd-floor   { color: #fff; font-weight: bold; }
        #hwd-floors  { color: #aaa; }
        #hwdy-time, #hwt-time, #hwd-time { color: #aaa; }
        #hwdy-status { color: #60f0a0; min-width: 76px; }
        #hwt-status  { color: #60a8f0; min-width: 76px; }
        #hwd-status  { color: #c060f0; min-width: 76px; }
        #hwt-chest   { color: #fff; font-weight: bold; }
        .hwo-sep  { color: #444; }
        .hwo-hint { color: #444; font-size: 11px; }
        #hwdy-step { color: #fff; font-weight: bold; max-width: 180px; overflow: hidden; text-overflow: ellipsis; }
        #hwdy-toggle, #hwd-toggle, #hwt-toggle {
            padding: 2px 8px;
            background: #2a5a2a;
            color: #7f7;
            border: 1px solid #4a9a4a;
            border-radius: 10px;
            font-family: monospace;
            font-size: 12px;
            cursor: pointer;
        }
        #hwdy-toggle:hover, #hwd-toggle:hover, #hwt-toggle:hover { background: #3a7a3a; }
        #hwdy-toggle.running, #hwd-toggle.running, #hwt-toggle.running {
            background: #5a2a2a;
            color: #f77;
            border-color: #9a4a4a;
        }
        .hwo-spinner {
            display: inline-block;
            width: 9px;
            height: 9px;
            border: 1.5px solid rgba(255,255,255,0.15);
            border-top-color: #aaa;
            border-radius: 50%;
            animation: hwo-rotate 0.7s linear infinite;
            vertical-align: middle;
            margin-left: 1px;
        }
        .hwo-hidden { display: none; }
        @keyframes hwo-rotate { to { transform: rotate(360deg); } }
    `;

    document.head.appendChild(style);
    document.body.appendChild(el);

    overlayEl = el;

    dungeonBtnToggle = el.querySelector('#hwd-toggle');
    dungeonLblStatus = el.querySelector('#hwd-status');
    dungeonLblFloor  = el.querySelector('#hwd-floor');
    dungeonLblFloors = el.querySelector('#hwd-floors');
    dungeonLblTime   = el.querySelector('#hwd-time');

    towerBtnToggle = el.querySelector('#hwt-toggle');
    towerLblStatus = el.querySelector('#hwt-status');
    towerLblChest  = el.querySelector('#hwt-chest');
    towerLblTime   = el.querySelector('#hwt-time');
    dungeonSpinner = el.querySelector('#hwd-spinner');
    towerSpinner   = el.querySelector('#hwt-spinner');

    dailyBtnToggle = el.querySelector('#hwdy-toggle');
    dailyLblStatus = el.querySelector('#hwdy-status');
    dailyLblStep   = el.querySelector('#hwdy-step');
    dailyLblTime   = el.querySelector('#hwdy-time');
    dailySpinner   = el.querySelector('#hwdy-spinner');

    dungeonBtnToggle.addEventListener('click', e => { e.stopPropagation(); onDungeonToggle(); });
    towerBtnToggle.addEventListener('click',   e => { e.stopPropagation(); onTowerToggle(); });
    dailyBtnToggle.addEventListener('click',   e => { e.stopPropagation(); onDailyToggle(); });

    dungeonUpdateOverlay();
    towerUpdateOverlay();
    dailyUpdateOverlay();
}

export function dungeonUpdateOverlay(statusMsg) {
    if (!overlayEl) return;
    const elapsed = dungeonState.sessionStart
        ? Math.round((Date.now() - dungeonState.sessionStart) / 60_000) : 0;
    dungeonLblFloor.textContent  = `Floor ${dungeonState.floorIndex + 1}/10`;
    dungeonLblTime.textContent   = `${elapsed} min`;
    dungeonLblFloors.textContent = `${dungeonState.floorsThisSession} floors`;
    if (statusMsg) dungeonState.statusLabel = statusMsg;
    if (dungeonState.statusLabel)   dungeonLblStatus.textContent = dungeonState.statusLabel;
    else if (dungeonState.running)  dungeonLblStatus.textContent = 'Running';
    else                            dungeonLblStatus.textContent = 'Stopped';
    dungeonBtnToggle.textContent = dungeonState.running ? '■' : '▶';
    dungeonBtnToggle.className   = dungeonState.running ? 'running' : '';
    dungeonSpinner.classList.toggle('hwo-hidden', !dungeonState.running);
}

export function towerUpdateOverlay(statusMsg) {
    if (!overlayEl) return;
    const elapsed = towerState.sessionStart
        ? Math.round((Date.now() - towerState.sessionStart) / 60_000) : 0;
    const floorNum = CHEST_FLOORS[Math.min(towerState.chestIndex, CHEST_FLOORS.length - 1)];
    towerLblChest.textContent = towerState.chestsOpened > 0
        ? `Fl ${floorNum} · ${towerState.chestsOpened}/${CHEST_FLOORS.length}` : '—';
    towerLblTime.textContent = `${elapsed} min`;
    if (statusMsg)                towerLblStatus.textContent = statusMsg;
    else if (towerState.running)  towerLblStatus.textContent = 'Running';
    else                          towerLblStatus.textContent = 'Ready';
    towerBtnToggle.textContent = towerState.running ? '■' : '▶';
    towerBtnToggle.className   = towerState.running ? 'running' : '';
    towerSpinner.classList.toggle('hwo-hidden', !towerState.running);
}

export function dailyUpdateOverlay(statusMsg) {
    if (!overlayEl) return;
    const elapsed = dailyState.sessionStart
        ? Math.round((Date.now() - dailyState.sessionStart) / 60_000) : 0;
    dailyLblStep.textContent = dailyState.currentStep || '—';
    dailyLblTime.textContent = `${elapsed} min`;
    if (statusMsg)                dailyLblStatus.textContent = statusMsg;
    else if (dailyState.running)  dailyLblStatus.textContent = 'Running';
    else                          dailyLblStatus.textContent = 'Ready';
    dailyBtnToggle.textContent = dailyState.running ? '■' : '▶';
    dailyBtnToggle.className   = dailyState.running ? 'running' : '';
    dailySpinner.classList.toggle('hwo-hidden', !dailyState.running);
}
