import { dungeonState } from './state.js';
import { dungeonLog, towerLog } from './utils.js';
import { dungeonUpdateOverlay } from './overlay.js';
import { dungeonOnBattleStarted, dungeonOnBattleEnded, dungeonOnLevelComplete, dungeonExtractFloorData } from './dungeon.js';
import { towerOnNextChest, towerOnChestOpened } from './tower.js';
import { CHEST_FLOORS } from './config.js';
import { towerState } from './state.js';

// ═════════════════════════════════════════════════════════════════════════
// SHARED XHR OBSERVER — read-only, never modifies or replays requests
// ═════════════════════════════════════════════════════════════════════════

export function installXhrObserver() {
    const original = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.send = function (body) {
        const requestBody = body;
        this.addEventListener('load', () => {
            try {
                const url = this.responseURL || '';
                if (!url.includes('nextersglobal.com/api/')) return;
                const json = JSON.parse(this.responseText);
                dungeonHandleResponse(json, requestBody);
                towerHandleResponse(json, requestBody);
            } catch (_) {}
        });
        return original.apply(this, arguments);
    };

    dungeonLog('XHR observer active (dungeon + tower)');
}

// ─────────────────────────────────────────────────────────────────────────
// DUNGEON XHR HANDLER
// ─────────────────────────────────────────────────────────────────────────

function dungeonHandleResponse(json, requestBody) {
    // All game calls: Request { calls: [{name, args, ident}] }
    //                 Response { results: [{ident, result: {response}}] }
    let calls;
    try {
        const text = (requestBody instanceof ArrayBuffer || ArrayBuffer.isView(requestBody))
            ? new TextDecoder().decode(requestBody)
            : requestBody;
        calls = JSON.parse(text)?.calls;
    } catch (_) { return; }
    if (!calls?.length) return;

    const callByIdent = Object.fromEntries(calls.map(c => [c.ident, c]));

    // Scan all dungeon-prefixed results for state data
    for (const resultEntry of (json?.results ?? [])) {
        const actionName = callByIdent[resultEntry.ident]?.name ?? '';
        if (!actionName.startsWith('dungeon')) continue;
        dungeonTryExtractData(actionName, resultEntry?.result?.response);
    }

    // Dispatch to known action handlers
    for (const call of calls) {
        const { name: actionName, args: requestArgs, ident } = call;
        const resultEntry = json?.results?.find(r => r.ident === ident);
        const data = resultEntry?.result?.response;

        if (actionName === 'dungeonGetInfo') {
            // Fires when the dungeon screen opens — returns current floor number
            const floorNum = Number(data?.floorNumber);
            if (floorNum) {
                const newIndex = (floorNum % 10 + 9) % 10;
                dungeonState.floorIndex    = newIndex;
                dungeonState.absoluteFloor = floorNum;
                dungeonLog(`dungeonGetInfo: floor ${floorNum} → position ${newIndex + 1}/10`);
                dungeonUpdateOverlay();
            }
            dungeonExtractFloorData(data?.floor);

        } else if (actionName === 'dungeonStartBattle') {
            dungeonLog('← dungeonStartBattle', data);
            dungeonOnBattleStarted();

        } else if (actionName === 'dungeonEndBattle') {
            dungeonLog('← dungeonEndBattle', data);
            const won = requestArgs?.result?.win !== false;
            // Pre-load next floor's team data for the upcoming choice
            dungeonExtractFloorData(data?.dungeon?.floor);
            dungeonOnBattleEnded(won);

        } else if (actionName === 'dungeonSaveProgress') {
            dungeonLog('← dungeonSaveProgress — level complete');
            dungeonOnLevelComplete();
        }
    }
}

function dungeonTryExtractData(actionName, data) {
    if (!data || typeof data !== 'object') return;
    const floorNum = Number(
        data.dungeon?.floorNumber ?? data.floorNumber ?? data.floor?.number ?? data.dungeon?.floor
    );
    if (floorNum) {
        dungeonState.absoluteFloor = floorNum;
        dungeonLog(`[${actionName}] API floor: ${floorNum} (display only)`);
        dungeonUpdateOverlay();
    }
}

// ─────────────────────────────────────────────────────────────────────────
// TOWER XHR HANDLER
// ─────────────────────────────────────────────────────────────────────────

function towerHandleResponse(json, requestBody) {
    let calls;
    try {
        const text = (requestBody instanceof ArrayBuffer || ArrayBuffer.isView(requestBody))
            ? new TextDecoder().decode(requestBody)
            : requestBody;
        calls = JSON.parse(text)?.calls;
    } catch (_) { return; }
    if (!calls?.length) return;

    for (const call of calls) {
        const { name: actionName, ident } = call;
        const resultEntry = json?.results?.find(r => r.ident === ident);
        const data = resultEntry?.result?.response;

        if (actionName === 'towerNextChest') {
            towerLog(`towerNextChest → floor ${CHEST_FLOORS[towerState.chestIndex]} (${towerState.chestIndex + 1}/${CHEST_FLOORS.length})`);
            towerOnNextChest();

        } else if (actionName === 'towerOpenChest') {
            towerLog(`towerOpenChest: chest ${towerState.chestIndex + 1} opened`);
            towerOnChestOpened();

        } else if (actionName === 'tower_getSkullReward') {
            towerLog('tower_getSkullReward:', data);

        } else if (actionName === 'tower_farmSkullReward') {
            towerLog('tower_farmSkullReward:', data);

        } else if (actionName === 'tower_farmPointRewards') {
            towerLog('tower_farmPointRewards:', data);
        }
    }
}
