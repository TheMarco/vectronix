import { CONFIG } from '../config.js';
import { projectPoint } from '../rendering/Projection.js';

/**
 * Collision detection between:
 * - Player bullets → Enemies
 * - Enemy bullets → Player
 * - Diving enemies → Player (body collision)
 *
 * All checks use screen-space positions (projected from world z)
 * so collisions match what the player sees on screen.
 */

const ENEMY_HIT_RADIUS = 10;
const PLAYER_HIT_RADIUS = 10;
const BULLET_HIT_RADIUS = 4;

/** Project world coords to screen x/y for collision testing */
function screenXY(wx, wy, wz) {
  if (wz === 0) return { x: wx, y: wy };
  const p = projectPoint(wx, wy, wz);
  return { x: p.x, y: p.y };
}

export class CollisionSystem {
  constructor() {
    this.onEnemyKilled = null;  // (enemy, bullet) => void
    this.onEnemyHit = null;     // (enemy) => void — non-lethal hit
    this.onPlayerHit = null;    // () => void
    this.onBeamCapture = null;  // (boss) => void
    this.onCapturedShipHit = null; // (capturedShip) => void
    this.onDualHit = null;      // () => void
    this.onBulletDeflected = null; // (enemy) => void — spinner deflection
    this.onShieldBreak = null;    // () => void — shield absorbed a hit
  }

  update(player, enemies, bulletManager, capturedShips) {
    if (!player.alive) return;

    const playerBullets = bulletManager.bullets.filter(b => b.alive && b.isPlayer);
    const enemyBullets = bulletManager.bullets.filter(b => b.alive && !b.isPlayer);

    // Player bullets → enemies (both projected to screen space)
    for (const bullet of playerBullets) {
      const bs = screenXY(bullet.x, bullet.y, bullet.z);
      for (const enemy of enemies) {
        if (!enemy.alive) continue;
        // Phantom: bullets pass through when invisible
        if (!enemy.isTargetable) continue;
        const es = screenXY(enemy.x, enemy.y, enemy.z);
        const dx = bs.x - es.x;
        const dy = bs.y - es.y;
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

    // Player bullets → captured ships (both projected to screen space)
    if (capturedShips) {
      for (const bullet of playerBullets) {
        if (!bullet.alive) continue;
        const bs = screenXY(bullet.x, bullet.y, bullet.z);
        for (const cs of capturedShips) {
          if (!cs.alive || cs.state !== 'attached') continue;
          const css = screenXY(cs.x, cs.y, cs.z || 0);
          const dx = bs.x - css.x;
          const dy = bs.y - css.y;
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

    // Enemy bullets → player (both projected to screen space)
    const ps = screenXY(player.x, player.y, player.z || 0);
    for (const bullet of enemyBullets) {
      const bs = screenXY(bullet.x, bullet.y, bullet.z);
      const dx = bs.x - ps.x;
      const dy = bs.y - ps.y;
      const dist = dx * dx + dy * dy;
      const hitDist = (BULLET_HIT_RADIUS + PLAYER_HIT_RADIUS);
      if (dist < hitDist * hitDist) {
        bullet.alive = false;
        const wasDual = player.dualFighter;
        const hadShield = player.shieldActive;
        const wasHit = player.kill();
        if (wasHit) {
          if (wasDual) {
            if (this.onDualHit) this.onDualHit();
          } else {
            if (this.onPlayerHit) this.onPlayerHit();
          }
        } else if (hadShield && !player.shieldActive) {
          if (this.onShieldBreak) this.onShieldBreak();
        }
        break;
      }
    }

    // Diving enemies → player (body collision, screen space) — skip beaming bosses
    for (const enemy of enemies) {
      if (!enemy.alive || enemy.state === 'holding' || enemy.state === 'queued' || enemy.state === 'entering') continue;
      if (enemy.state === 'tractor_beaming') continue; // beam captures, doesn't body-hit
      const es = screenXY(enemy.x, enemy.y, enemy.z);
      const dx = es.x - ps.x;
      const dy = es.y - ps.y;
      const dist = dx * dx + dy * dy;
      const hitDist = (ENEMY_HIT_RADIUS + PLAYER_HIT_RADIUS);
      if (dist < hitDist * hitDist) {
        enemy.kill();
        if (this.onEnemyKilled) this.onEnemyKilled(enemy);
        const wasDual2 = player.dualFighter;
        const hadShield2 = player.shieldActive;
        const wasHit2 = player.kill();
        if (wasHit2) {
          if (wasDual2) {
            if (this.onDualHit) this.onDualHit();
          } else {
            if (this.onPlayerHit) this.onPlayerHit();
          }
        } else if (hadShield2 && !player.shieldActive) {
          if (this.onShieldBreak) this.onShieldBreak();
        }
        break;
      }
    }

    // Tractor beam capture zone check (screen space)
    for (const enemy of enemies) {
      if (!enemy.alive || !enemy.isBeaming) continue;
      const es = screenXY(enemy.x, enemy.y, enemy.z);
      const dx = Math.abs(es.x - ps.x);
      const captureRange = enemy.bossPhase === 2 ? CONFIG.BEAM_CAPTURE_RANGE * 1.1 : CONFIG.BEAM_CAPTURE_RANGE;
      if (dx < captureRange) {
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
      const bs = screenXY(bullet.x, bullet.y, bullet.z);
      for (const enemy of enemies) {
        if (!enemy.alive) continue;
        if (!enemy.isTargetable) continue;
        const es = screenXY(enemy.x, enemy.y, enemy.z);
        const dx = bs.x - es.x;
        const dy = bs.y - es.y;
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
