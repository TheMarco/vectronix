import { CONFIG } from '../config.js';

export class Bullet {
  constructor(x, y, z, vx, vy, isPlayer) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.vx = vx;
    this.vy = vy;
    this.isPlayer = isPlayer;
    this.alive = true;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Out of bounds
    if (this.y < CONFIG.FIELD_TOP - 20 || this.y > CONFIG.FIELD_BOTTOM + 20 ||
        this.x < CONFIG.FIELD_LEFT - 20 || this.x > CONFIG.FIELD_RIGHT + 20) {
      this.alive = false;
    }
  }
}

export class BulletManager {
  constructor() {
    this.bullets = [];
  }

  get playerBulletCount() {
    let n = 0;
    for (const b of this.bullets) if (b.alive && b.isPlayer) n++;
    return n;
  }

  firePlayer(x, y) {
    if (this.playerBulletCount >= 2) return false;
    this.bullets.push(new Bullet(x, y - 12, 0, 0, -CONFIG.PLAYER_BULLET_SPEED, true));
    return true;
  }

  fireDual(x1, y1, x2, y2) {
    if (this.playerBulletCount >= 4) return false;
    this.bullets.push(new Bullet(x1, y1 - 12, 0, 0, -CONFIG.PLAYER_BULLET_SPEED, true));
    this.bullets.push(new Bullet(x2, y2 - 12, 0, 0, -CONFIG.PLAYER_BULLET_SPEED, true));
    return true;
  }

  fireEnemy(x, y, z) {
    this.bullets.push(new Bullet(x, y, z, 0, CONFIG.ENEMY_BULLET_SPEED, false));
  }

  fireEnemyAimed(x, y, z, targetX, targetY) {
    const dx = targetX - x;
    const dy = targetY - y;
    // Clamp angle to ±55° from straight down so bullets can't go near-horizontal
    const maxDeflection = 55 * Math.PI / 180;
    let angle = Math.atan2(dy, dx);
    const straight = Math.PI / 2; // straight down
    const diff = angle - straight;
    if (Math.abs(diff) > maxDeflection) {
      angle = straight + Math.sign(diff) * maxDeflection;
    }
    const speed = CONFIG.ENEMY_BULLET_SPEED;
    this.bullets.push(new Bullet(x, y, z, Math.cos(angle) * speed, Math.sin(angle) * speed, false));
  }

  fireEnemySpread(x, y, z, count, spreadAngle) {
    const baseAngle = Math.PI / 2; // straight down
    const step = count > 1 ? spreadAngle / (count - 1) : 0;
    const startAngle = baseAngle - spreadAngle / 2;
    const speed = CONFIG.ENEMY_BULLET_SPEED;
    for (let i = 0; i < count; i++) {
      const angle = startAngle + step * i;
      this.bullets.push(new Bullet(x, y, z, Math.cos(angle) * speed, Math.sin(angle) * speed, false));
    }
  }

  fireEnemyBomb(x, y, z) {
    this.bullets.push(new Bullet(x, y, z, 0, CONFIG.ENEMY_BULLET_SPEED * 0.5, false));
  }

  update(dt) {
    for (const b of this.bullets) {
      if (b.alive) b.update(dt);
    }
    this.bullets = this.bullets.filter(b => b.alive);
  }
}
