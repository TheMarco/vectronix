import { CONFIG } from '../config.js';

/**
 * Represents a player ship captured by a Boss Galaga.
 * States: capturing → attached → releasing → rescued
 *
 * Capture animation:
 *   Phase 1 (t 0→0.2): slide horizontally to center under beam
 *   Phase 2 (t 0.2→1.0): rise up to boss, spinning and shrinking slightly
 */
export class CapturedShip {
  constructor(startX, startY, boss) {
    this.x = startX;
    this.y = startY;
    this.z = 0;
    this.boss = boss;
    this.state = 'capturing'; // flying up to boss
    this.alive = true;
    this.captureT = 0;
    this.captureStartX = startX;
    this.captureStartY = startY;
    this.rotation = 0;
    this.releaseStartX = 0;
    this.releaseStartY = 0;
    this.releaseStartZ = 0;
    this.releaseT = 0;
  }

  update(dt, playerX, playerY) {
    if (!this.alive) return;

    switch (this.state) {
      case 'capturing': {
        this.captureT += dt * 0.4;
        if (this.captureT >= 1) {
          this.state = 'attached';
          this.x = this.boss.x;
          this.y = this.boss.y + CONFIG.CAPTURED_SHIP_Y_OFFSET;
          this.z = this.boss.z;
          this.rotation = 0;
        } else {
          const t = this.captureT;
          const bossTargetX = this.boss.x;
          const bossTargetY = this.boss.y + CONFIG.CAPTURED_SHIP_Y_OFFSET;

          if (t < 0.2) {
            // Phase 1: slide to beam center (horizontal alignment)
            const lt = t / 0.2;
            const ease = lt * lt * (3 - 2 * lt); // smoothstep
            this.x = this.captureStartX + (bossTargetX - this.captureStartX) * ease;
            this.y = this.captureStartY; // stay at bottom
            this.z = 0;
            // Start a gentle wobble
            this.rotation = Math.sin(lt * Math.PI * 2) * 0.3;
          } else {
            // Phase 2: rise up to boss while spinning
            const lt = (t - 0.2) / 0.8;
            const ease = lt * lt; // accelerating rise
            this.x = bossTargetX + Math.sin(lt * Math.PI * 4) * 6 * (1 - lt); // slight lateral wobble, damping out
            this.y = this.captureStartY + (bossTargetY - this.captureStartY) * ease;
            this.z = this.boss.z * ease;
            // Spin: fast at start, slowing as it locks in
            this.rotation = lt * Math.PI * 6 * (1.2 - lt * 0.4);
          }
        }
        break;
      }

      case 'attached': {
        // Follow boss
        this.x = this.boss.x;
        this.y = this.boss.y + CONFIG.CAPTURED_SHIP_Y_OFFSET;
        this.z = this.boss.z;
        this.rotation = 0;
        break;
      }

      case 'releasing': {
        // Float down to player position
        this.releaseT += dt * 1.2;
        if (this.releaseT >= 1) {
          this.state = 'rescued';
          this.rotation = 0;
        } else {
          const t = this.releaseT;
          const ease = t * t * (3 - 2 * t);
          this.x = this.releaseStartX + (playerX - this.releaseStartX) * ease;
          this.y = this.releaseStartY + (playerY - this.releaseStartY) * ease;
          this.z = this.releaseStartZ * (1 - ease);
          // Gentle corrective spin back to upright
          this.rotation = (1 - ease) * Math.PI * 2;
        }
        break;
      }
    }
  }

  /** Boss was killed — release this ship */
  release() {
    this.state = 'releasing';
    this.releaseStartX = this.x;
    this.releaseStartY = this.y;
    this.releaseStartZ = this.z;
    this.releaseT = 0;
    this.boss = null;
  }

  kill() {
    this.alive = false;
  }
}
