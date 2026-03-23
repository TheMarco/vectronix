/**
 * Handheld input module.
 * Gamepad + keyboard input with deadzone, D-pad, and multi-button action mapping.
 *
 * Call poll() exactly once per game frame.
 */

const DEFAULT_CONFIG = {
  deadzone: 0.25,
  // Standard gamepad: A=0, B=1, X=2, Y=3
  actionButtons: [0, 1, 2, 3],
  stickAxisX: 0,
  stickAxisY: 1,
  dpadUp: 12,
  dpadDown: 13,
  dpadLeft: 14,
  dpadRight: 15,
};

export class HandheldInput {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this._prevAction = false;
    this._prevMoveX = 0;
    this._prevMoveY = 0;
    this._keys = {};
    this._gamepadConnected = false;

    if (typeof window !== 'undefined') {
      // Only track real (trusted) keyboard events — ignore synthetic events
      // from our own input bridge to prevent feedback loops
      window.addEventListener('keydown', (e) => { if (e.isTrusted) this._keys[e.code] = true; });
      window.addEventListener('keyup', (e) => { if (e.isTrusted) this._keys[e.code] = false; });
      window.addEventListener('gamepadconnected', () => { this._gamepadConnected = true; });
      window.addEventListener('gamepaddisconnected', () => { this._gamepadConnected = false; });
    }
  }

  poll() {
    let moveX = 0;
    let moveY = 0;
    let action = false;

    // --- Gamepad ---
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (let i = 0; i < gamepads.length; i++) {
      const gp = gamepads[i];
      if (!gp) continue;

      let sx = gp.axes[this.config.stickAxisX] || 0;
      let sy = gp.axes[this.config.stickAxisY] || 0;
      sx = this._applyDeadzone(sx);
      sy = this._applyDeadzone(sy);

      const dpadX =
        (gp.buttons[this.config.dpadLeft]?.pressed ? -1 : 0) +
        (gp.buttons[this.config.dpadRight]?.pressed ? 1 : 0);
      const dpadY =
        (gp.buttons[this.config.dpadUp]?.pressed ? -1 : 0) +
        (gp.buttons[this.config.dpadDown]?.pressed ? 1 : 0);

      moveX = Math.abs(dpadX) > Math.abs(sx) ? dpadX : sx;
      moveY = Math.abs(dpadY) > Math.abs(sy) ? dpadY : sy;

      for (const bi of this.config.actionButtons) {
        if (bi < gp.buttons.length && gp.buttons[bi]?.pressed) {
          action = true;
          break;
        }
      }

      break; // use first connected gamepad
    }

    // --- Keyboard fallback ---
    const k = this._keys;
    const kx = (k.ArrowLeft || k.KeyA ? -1 : 0) + (k.ArrowRight || k.KeyD ? 1 : 0);
    const ky = (k.ArrowUp || k.KeyW ? -1 : 0) + (k.ArrowDown || k.KeyS ? 1 : 0);
    if (Math.abs(kx) > Math.abs(moveX)) moveX = kx;
    if (Math.abs(ky) > Math.abs(moveY)) moveY = ky;
    if (k.Space || k.KeyZ || k.KeyX || k.Enter) action = true;

    moveX = Math.max(-1, Math.min(1, moveX));
    moveY = Math.max(-1, Math.min(1, moveY));

    const actionPressed = action && !this._prevAction;
    const actionReleased = !action && this._prevAction;
    const directionChanged =
      Math.sign(moveX) !== Math.sign(this._prevMoveX) ||
      Math.sign(moveY) !== Math.sign(this._prevMoveY);

    this._prevAction = action;
    this._prevMoveX = moveX;
    this._prevMoveY = moveY;

    return { moveX, moveY, action, actionPressed, actionReleased, directionChanged };
  }

  _applyDeadzone(value) {
    const dz = this.config.deadzone;
    if (Math.abs(value) < dz) return 0;
    const sign = Math.sign(value);
    return sign * (Math.abs(value) - dz) / (1 - dz);
  }

  configure(overrides) {
    Object.assign(this.config, overrides);
  }

  loadCalibration() {
    try {
      const raw = localStorage.getItem('handheld-input-config');
      if (raw) {
        this.configure(JSON.parse(raw));
        return true;
      }
    } catch (_) {}
    return false;
  }

  saveCalibration() {
    try {
      localStorage.setItem('handheld-input-config', JSON.stringify(this.config));
    } catch (_) {}
  }
}
