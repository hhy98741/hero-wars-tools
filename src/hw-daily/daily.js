import { DAILY_STEPS } from './config.js';
import { dailyState } from './state.js';
import { waitRandom, dailyLog, pressEscape, clickAt } from './utils.js';
import { dailyUpdateOverlay } from './overlay.js';

// ═════════════════════════════════════════════════════════════════════════
// DAILY — AUTOMATION FLOW
// ═════════════════════════════════════════════════════════════════════════

export async function dailyStart() {
    if (dailyState.running) return;
    dailyState.running                    = true;
    dailyState.sessionStart               = Date.now();
    dailyState.stepsDone                  = 0;
    dailyState.currentStep                = '';
    dailyState.expeditionRewardsAvailable = null;
    dailyLog('Starting daily run. F7 to stop.');
    dailyUpdateOverlay('Starting...');

    for (const step of DAILY_STEPS) {
        if (!dailyState.running) break;

        if (step.type === 'section') {
            dailyLog(`── ${step.label} ──`);
            dailyState.currentStep = step.label;
            dailyUpdateOverlay(step.label);
            continue;
        }

        if (step.condition && !step.condition()) {
            dailyLog(`Skipping: ${step.label}`);
            continue;
        }

        dailyLog(step.label);
        dailyState.currentStep = step.label;
        dailyUpdateOverlay(step.label);

        if (step.type === 'click') {
            clickAt(step.x, step.y);
        } else if (step.type === 'escape') {
            pressEscape();
        }

        dailyState.stepsDone++;

        if (step.wait) {
            await waitRandom(step.wait);
        }
    }

    if (dailyState.running) {
        dailyStop('Daily run complete');
    }
}

export function dailyStop(reason) {
    dailyState.running = false;
    const msg = reason || 'Stopped';
    dailyLog(msg);
    dailyUpdateOverlay(msg);
}

export function dailyToggle() {
    if (dailyState.running) dailyStop('Stopped by user');
    else dailyStart();
}
