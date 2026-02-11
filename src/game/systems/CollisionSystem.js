import { CONFIG } from '../config.js';

/**
 * Collision detection between:
 * - Player bullets → Enemies
 * - Enemy bullets → Player
 * - Diving enemies → Player (body collision)
 *
 * Uses simple circle-based collision (screen space).
 */

const ENEMY_HIT_RADIUS = 10;
const PLAYER_HIT_RADIUS = 10;
const BULLET_HIT_RADIUS = 4;

export class CollisionSystem {
  constructor() {
    this.onEnemyKilled = null;  // (enemy, bullet) => void
    this.onEnemyHit = null;     // (enemy) => void — non-lethal hit
    this.onPlayerHit = null;    // () => void
    this.onBeamCapture = null;  // (boss) => void
    this.onCapturedShipHit = null; // (capturedShip) => void
    this.onDualHit = null;      // () => void
    this.onBulletDeflected = null; // (enemy) => void — spinner deflection
  }

  update(player, enemies, bulletManager, capturedShips) {
    if (!player.alive) return;

    const playerBullets = bulletManager.bullets.filter(b => b.alive && b.isPlayer);
    const enemyBullets = bulletManager.bullets.filter(b => b.alive && !b.isPlayer);

    // Player bullets → enemies
    for (const bullet of playerBullets) {
      for (const enemy of enemies) {
        if (!enemy.alive) continue;
        // Phantom: bullets pass through when invisible
        if (!enemy.isTargetable) continue;
        const dx = bullet.x - enemy.x;
        const dy = bullet.y - enemy.y;
        const dist = dx * dx + dy * dy;
        const hitDist = (BULLET_HIT_RADIUS + ENEMY_HIT_RADIUS);
        if (dist < hitDist * hitDist) {
          // Spinner deflection: check if a spoke is pointing downward
          if (enemy.type === 'spinner' && this._spinnerDeflects(enemy)) {
            bullet.alive = false;
            if (this.onBulletDeflected) this.onBulletDeflected(enemy);
            break;
          }
          bullet.alive = false;
          const survived = enemy.hit();
          if (survived) {
            if (this.onEnemyHit) this.onEnemyHit(enemy);
          } else {
            if (this.onEnemyKilled) this.onEnemyKilled(enemy);
          }
          break;
        }
      }
    }

    // Player bullets → captured ships (can accidentally destroy them)
    if (capturedShips) {
      for (const bullet of playerBullets) {
        if (!bullet.alive) continue;
        for (const cs of capturedShips) {
          if (!cs.alive || cs.state !== 'attached') continue;
          const dx = bullet.x - cs.x;
          const dy = bullet.y - cs.y;
          const dist = dx * dx + dy * dy;
          const hitDist = (BULLET_HIT_RADIUS + PLAYER_HIT_RADIUS);
          if (dist < hitDist * hitDist) {
            bullet.alive = false;
            cs.kill();
            // Remove reference from boss
            if (cs.boss) cs.boss.capturedShip = null;
            if (this.onCapturedShipHit) this.onCapturedShipHit(cs);
            break;
          }
        }
      }
    }

    // Enemy bullets → player
    for (const bullet of enemyBullets) {
      const dx = bullet.x - player.x;
      const dy = bullet.y - player.y;
      const dist = dx * dx + dy * dy;
      const hitDist = (BULLET_HIT_RADIUS + PLAYER_HIT_RADIUS);
      if (dist < hitDist * hitDist) {
        bullet.alive = false;
        const wasDual = player.dualFighter;
        const wasHit = player.kill();
        if (wasHit) {
          if (wasDual) {
            // Was dual, lost one ship (player still alive)
            if (this.onDualHit) this.onDualHit();
          } else {
            // Normal death
            if (this.onPlayerHit) this.onPlayerHit();
          }
        }
        break;
      }
    }

    // Diving enemies → player (body collision) — skip beaming bosses
    for (const enemy of enemies) {
      if (!enemy.alive || enemy.state === 'holding' || enemy.state === 'queued') continue;
      if (enemy.state === 'tractor_beaming') continue; // beam captures, doesn't body-hit
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const dist = dx * dx + dy * dy;
      const hitDist = (ENEMY_HIT_RADIUS + PLAYER_HIT_RADIUS);
      if (dist < hitDist * hitDist) {
        enemy.kill();
        if (this.onEnemyKilled) this.onEnemyKilled(enemy);
        const wasDual2 = player.dualFighter;
        const wasHit2 = player.kill();
        if (wasHit2) {
          if (wasDual2) {
            if (this.onDualHit) this.onDualHit();
          } else {
            if (this.onPlayerHit) this.onPlayerHit();
          }
        }
        break;
      }
    }

    // Tractor beam capture zone check
    for (const enemy of enemies) {
      if (!enemy.alive || !enemy.isBeaming) continue;
      const dx = Math.abs(enemy.x - player.x);
      if (dx < CONFIG.BEAM_CAPTURE_RANGE) {
        // Player is in beam zone
        if (!player.invulnerable && !player.captured) {
          if (this.onBeamCapture) this.onBeamCapture(enemy);
        }
      }
    }
  }

  /**
   * Challenge stage collision: only player bullets → enemies.
   * No enemy damage to player.
   */
  updateChallengeMode(enemies, bulletManager) {
    const playerBullets = bulletManager.bullets.filter(b => b.alive && b.isPlayer);

    for (const bullet of playerBullets) {
      for (const enemy of enemies) {
        if (!enemy.alive) continue;
        if (!enemy.isTargetable) continue;
        const dx = bullet.x - enemy.x;
        const dy = bullet.y - enemy.y;
        const dist = dx * dx + dy * dy;
        const hitDist = (BULLET_HIT_RADIUS + ENEMY_HIT_RADIUS);
        if (dist < hitDist * hitDist) {
          if (enemy.type === 'spinner' && this._spinnerDeflects(enemy)) {
            bullet.alive = false;
            if (this.onBulletDeflected) this.onBulletDeflected(enemy);
            break;
          }
          bullet.alive = false;
          const survived = enemy.hit();
          if (survived) {
            if (this.onEnemyHit) this.onEnemyHit(enemy);
          } else {
            if (this.onEnemyKilled) this.onEnemyKilled(enemy);
          }
          break;
        }
      }
    }
  }

  /**
   * Check if any of the spinner's 6 spokes is pointing roughly downward (toward bullets).
   * Returns true ~30% of the time depending on spin angle.
   */
  _spinnerDeflects(enemy) {
    const downAngle = Math.PI / 2; // straight down
    const tolerance = 10 * Math.PI / 180; // ±10 degrees
    for (let i = 0; i < 6; i++) {
      const spokeAngle = enemy.spinAngle + i * (Math.PI / 3);
      // Normalize to [0, 2π)
      const norm = ((spokeAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const diff = Math.abs(norm - downAngle);
      const wrapped = Math.min(diff, Math.PI * 2 - diff);
      if (wrapped < tolerance) return true;
    }
    return false;
  }
}
