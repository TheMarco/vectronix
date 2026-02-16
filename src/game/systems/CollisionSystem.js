import { CONFIG } from '../config.js';
import { projectPoint, getScale } from '../rendering/Projection.js';

/**
 * Collision detection between:
 * - Player bullets → Enemies
 * - Enemy bullets → Player
 * - Diving enemies → Player (body collision)
 *
 * All checks use screen-space positions (projected from world z)
 * so collisions match what the player sees on screen.
 *
 * Bullet→target checks use swept collision (segment vs circle)
 * to prevent tunneling at high relative velocities / low framerates.
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

/**
 * Swept collision: test if the line segment (ax,ay)→(bx,by)
 * passes within `radius` of the point (cx,cy).
 * Returns squared distance from closest point on segment to circle center,
 * or Infinity if no segment exists (degenerate).
 */
function sqDistSegmentToPoint(ax, ay, bx, by, cx, cy) {
  const abx = bx - ax;
  const aby = by - ay;
  const acx = cx - ax;
  const acy = cy - ay;
  const ab2 = abx * abx + aby * aby;
  if (ab2 === 0) {
    // Degenerate segment (bullet didn't move) — point-vs-point
    return acx * acx + acy * acy;
  }
  // Project point onto segment, clamped to [0,1]
  const t = Math.max(0, Math.min(1, (acx * abx + acy * aby) / ab2));
  const closestX = ax + t * abx;
  const closestY = ay + t * aby;
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy;
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

    // Player bullets → enemies (swept collision in screen space)
    for (const bullet of playerBullets) {
      const bs = screenXY(bullet.x, bullet.y, bullet.z);
      const bsPrev = screenXY(bullet.prevX, bullet.prevY, bullet.z);
      for (const enemy of enemies) {
        if (!enemy.alive) continue;
        // Phantom: bullets pass through when invisible
        if (!enemy.isTargetable) continue;
        const es = screenXY(enemy.x, enemy.y, enemy.z);
        // Scale enemy hit radius by projection so hitbox matches visual size
        const eScale = getScale(enemy.z);
        const hitDist = BULLET_HIT_RADIUS + ENEMY_HIT_RADIUS * eScale;
        const dist = sqDistSegmentToPoint(bsPrev.x, bsPrev.y, bs.x, bs.y, es.x, es.y);
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

    // Player bullets → captured ships (swept collision in screen space)
    if (capturedShips) {
      for (const bullet of playerBullets) {
        if (!bullet.alive) continue;
        const bs = screenXY(bullet.x, bullet.y, bullet.z);
        const bsPrev = screenXY(bullet.prevX, bullet.prevY, bullet.z);
        for (const cs of capturedShips) {
          if (!cs.alive || cs.state !== 'attached') continue;
          const css = screenXY(cs.x, cs.y, cs.z || 0);
          const csScale = getScale(cs.z || 0);
          const hitDist = BULLET_HIT_RADIUS + PLAYER_HIT_RADIUS * csScale;
          const dist = sqDistSegmentToPoint(bsPrev.x, bsPrev.y, bs.x, bs.y, css.x, css.y);
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

    // Enemy bullets → player (swept collision in screen space)
    const ps = screenXY(player.x, player.y, player.z || 0);
    for (const bullet of enemyBullets) {
      const bs = screenXY(bullet.x, bullet.y, bullet.z);
      const bsPrev = screenXY(bullet.prevX, bullet.prevY, bullet.z);
      const hitDist = (BULLET_HIT_RADIUS + PLAYER_HIT_RADIUS);
      const dist = sqDistSegmentToPoint(bsPrev.x, bsPrev.y, bs.x, bs.y, ps.x, ps.y);
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
      const bsPrev = screenXY(bullet.prevX, bullet.prevY, bullet.z);
      for (const enemy of enemies) {
        if (!enemy.alive) continue;
        if (!enemy.isTargetable) continue;
        const es = screenXY(enemy.x, enemy.y, enemy.z);
        const eScale = getScale(enemy.z);
        const hitDist = BULLET_HIT_RADIUS + ENEMY_HIT_RADIUS * eScale;
        const dist = sqDistSegmentToPoint(bsPrev.x, bsPrev.y, bs.x, bs.y, es.x, es.y);
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
