import { CONFIG } from '../config.js';

/**
 * Simple AI for attract mode demo play.
 * Priority: dodge enemy bullets > aim at diving enemies > idle drift.
 */
export class DemoAI {
  constructor() {
    this._driftDir = 1;
    this._driftTimer = 0;
    this._fireCooldown = 0;
  }

  /**
   * @param {object} player - { x, y, alive }
   * @param {Array} enemies - array of enemy objects
   * @param {Array} bullets - array of bullet objects (enemy bullets)
   * @returns {{ inputDir: number, shouldFire: boolean }}
   */
  update(dt, player, enemies, bullets) {
    if (!player.alive) return { inputDir: 0, shouldFire: false };

    this._fireCooldown -= dt;
    let inputDir = 0;
    let shouldFire = false;

    // 1. Dodge: find closest threatening enemy bullet
    let dodgeThreat = null;
    let closestDist = Infinity;
    for (const b of bullets) {
      if (!b.alive || b.isPlayer) continue;
      const dx = Math.abs(b.x - player.x);
      const dy = b.y - player.y;
      // Bullet approaching from above, within horizontal danger zone
      if (dy < 0 && dy > -120 && dx < 50) {
        const dist = Math.abs(dy);
        if (dist < closestDist) {
          closestDist = dist;
          dodgeThreat = b;
        }
      }
    }

    if (dodgeThreat) {
      // Move away from bullet
      inputDir = dodgeThreat.x > player.x ? -1 : 1;
    } else {
      // 2. Aim: find nearest diving enemy or any enemy roughly above
      let targetX = null;
      let bestPriority = Infinity;

      for (const e of enemies) {
        if (!e.alive || e.state === 'queued') continue;
        const dx = Math.abs(e.x - player.x);
        const isDiving = e.state === 'diving' || e.state === 'entering';
        // Priority: diving enemies closer to player get highest priority
        const priority = isDiving ? dx * 0.5 : dx * 2;
        if (priority < bestPriority) {
          bestPriority = priority;
          targetX = e.x;
        }
      }

      if (targetX !== null) {
        const dx = targetX - player.x;
        if (Math.abs(dx) > 15) {
          inputDir = dx > 0 ? 1 : -1;
        }
        // Fire when an enemy is roughly above
        if (Math.abs(dx) < 40 && this._fireCooldown <= 0) {
          shouldFire = true;
          this._fireCooldown = 0.2 + Math.random() * 0.15;
        }
      } else {
        // 3. Idle drift
        this._driftTimer -= dt;
        if (this._driftTimer <= 0) {
          this._driftDir = Math.random() > 0.5 ? 1 : -1;
          this._driftTimer = 1.0 + Math.random() * 2.0;
        }
        inputDir = this._driftDir;
        // Reverse at edges
        if (player.x < CONFIG.FIELD_LEFT + 60) inputDir = 1;
        if (player.x > CONFIG.FIELD_RIGHT - 60) inputDir = -1;
      }
    }

    return { inputDir, shouldFire };
  }
}
