/**
 * Handheld runtime bootstrap.
 *
 * For Vectronix, the input bridge dispatches synthetic KeyboardEvents
 * so all existing Phaser keyboard handling works unchanged.
 */

import { applyHandheldDisplay, applyPixelCSS } from './display.js';
import { HandheldInput } from './input.js';
import { isNativePlatform, initPlatform } from './platform.js';

export { isNativePlatform } from './platform.js';
export { HandheldInput } from './input.js';

// Synthetic keyboard event helpers
function keyDown(keyCode, code, key) {
  window.dispatchEvent(new KeyboardEvent('keydown', { keyCode, code, key, bubbles: true }));
}
function keyUp(keyCode, code, key) {
  window.dispatchEvent(new KeyboardEvent('keyup', { keyCode, code, key, bubbles: true }));
}

export function initHandheld(phaserConfig, opts) {
  const isNative = isNativePlatform();
  const input = new HandheldInput();
  input.loadCalibration();

  if (isNative) {
    applyHandheldDisplay(phaserConfig, opts.logicalWidth, opts.logicalHeight, opts.scale);
    applyPixelCSS();
    initPlatform();
  }

  return {
    input,
    isNative,

    /**
     * Bridge gamepad input into synthetic keyboard events.
     * Left/Right → ArrowLeft/ArrowRight
     * Action (face buttons) → Space (fire) + Enter (start/restart)
     */
    startInputBridge(game) {
      let prevLeft = false;
      let prevRight = false;
      let prevAction = false;

      game.events.on('prestep', () => {
        const s = input.poll();
        const left = s.moveX < -0.3;
        const right = s.moveX > 0.3;

        // Left arrow
        if (left && !prevLeft) keyDown(37, 'ArrowLeft', 'ArrowLeft');
        if (!left && prevLeft) keyUp(37, 'ArrowLeft', 'ArrowLeft');

        // Right arrow
        if (right && !prevRight) keyDown(39, 'ArrowRight', 'ArrowRight');
        if (!right && prevRight) keyUp(39, 'ArrowRight', 'ArrowRight');

        // Action → Space (fire) + Enter (start/restart)
        if (s.action && !prevAction) {
          keyDown(32, 'Space', ' ');
          keyDown(13, 'Enter', 'Enter');
        }
        if (!s.action && prevAction) {
          keyUp(32, 'Space', ' ');
          keyUp(13, 'Enter', 'Enter');
        }

        prevLeft = left;
        prevRight = right;
        prevAction = s.action;
      });
    },
  };
}
