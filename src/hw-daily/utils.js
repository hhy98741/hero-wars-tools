export const rand       = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
export const wait       = ms => new Promise(resolve => setTimeout(resolve, ms));
export const waitRandom = range => wait(rand(range.min, range.max));

export function dungeonLog(msg, data) {
    data !== undefined
        ? console.log('[HW-Dungeon]', msg, data)
        : console.log('[HW-Dungeon]', msg);
}

export function towerLog(msg, data) {
    data !== undefined
        ? console.log('[HW-Tower]', msg, data)
        : console.log('[HW-Tower]', msg);
}

export function getCanvas() {
    return document.querySelector('canvas');
}

export function pressEscape() {
    ['keydown', 'keyup'].forEach(type => {
        document.dispatchEvent(new KeyboardEvent(type, {
            key: 'Escape', code: 'Escape', keyCode: 27, which: 27,
            bubbles: true, cancelable: true,
        }));
    });
}

export function clickAt(normX, normY, jitterPx = 10) {
    const canvas = getCanvas();
    if (!canvas) { dungeonLog('ERROR: canvas not found'); return false; }

    const rect = canvas.getBoundingClientRect();
    const x = rect.left + normX * rect.width  + rand(-jitterPx, jitterPx);
    const y = rect.top  + normY * rect.height + rand(-jitterPx, jitterPx);

    ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(type => {
        canvas.dispatchEvent(new MouseEvent(type, {
            clientX: x, clientY: y, bubbles: true, cancelable: true,
        }));
    });

    return true;
}
