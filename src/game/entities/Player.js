import { CONFIG } from '../config.js';

export class Player {
  constructor() {
    this.x = CONFIG.CENTER_X;
    this.y = CONFIG.PLAYER_Y;
    this.z = 0;
    this.alive = true;
    this.respawnTimer = 0;
    this.lives = CONFIG.START_LIVES;
    this.invulnerable = false;
    this.invulnerableTimer = 0;
    this.flickerPhase = 0;

    // Dual fighter
    this.dualFighter = false;
    this.captured = false; // true while being captured by beam

    // Shield (UFO power-up)
    this.shieldActive = false;
  }

  kill() {
    if (!this.alive || this.invulnerable) return false;

    // Shield absorbs one hit
    if (this.shieldActive) {
      this.shieldActive = false;
      return false; // absorbed
    }

    // In dual fighter mode: lose one ship instead of dying
    if (this.dualFighter) {
      this.dualFighter = false;
      return true; // signal hit happened, but no life lost
    }

    this.alive = false;
    this.lives--;
    this.respawnTimer = CONFIG.RESPAWN_DELAY_MS;
    return true;
  }

  /** Called when tractor beam captures player */
  capture() {
    if (!this.alive || this.invulnerable || this.captured) return false;

    // Shield absorbs capture
    if (this.shieldActive) {
      this.shieldActive = false;
      return false;
    }
    this.captured = true;
    this.alive = false;
    this.lives--;
    this.respawnTimer = CONFIG.RESPAWN_DELAY_MS;
    return true;
  }

  /** Called when captured ship reaches player after boss is killed */
  enterDualFighter() {
    this.dualFighter = true;
  }

  loseDualShip() {
    this.dualFighter = false;
  }

  update(dt, inputDir) {
    if (!this.alive) {
      // Don't count down respawn while being abducted
      if (!this.captured) this.respawnTimer -= dt * 1000;
      if (this.respawnTimer <= 0 && this.lives > 0) {
        this.alive = true;
        this.captured = false;
        this.x = CONFIG.CENTER_X;
        this.invulnerable = true;
        this.invulnerableTimer = 1500;
      }
      return;
    }

    if (this.invulnerable) {
      this.invulnerableTimer -= dt * 1000;
      this.flickerPhase += dt * 20;
      if (this.invulnerableTimer <= 0) {
        this.invulnerable = false;
      }
    }

    // Movement: snappy, capped, predictable
    // Wider bounds in dual fighter mode to keep both ships onscreen
    const margin = this.dualFighter ? 16 + CONFIG.DUAL_OFFSET_X : 16;
    this.x += inputDir * CONFIG.PLAYER_SPEED * dt;
    this.x = Math.max(CONFIG.FIELD_LEFT + margin, Math.min(CONFIG.FIELD_RIGHT - margin, this.x));
  }

  get isVisible() {
    if (!this.alive) return false;
    if (this.invulnerable) return Math.sin(this.flickerPhase) > 0;
    return true;
  }

  get isGameOver() {
    return !this.alive && this.lives <= 0;
  }
}
