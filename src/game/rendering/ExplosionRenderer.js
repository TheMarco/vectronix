/**
 * Vector explosion renderer — adapted from hexax.
 * Radial line bursts that expand outward and decay.
 * No particles, no sprites — pure vector lines.
 */
import Phaser from 'phaser';

const PARTICLE_COUNT = 14;
const PARTICLE_SPEED = 220;
const PARTICLE_LIFE_MS = 900;
const TAIL_LENGTH = 40;
const LINE_WIDTH = 2.5;

export class ExplosionRenderer {
  constructor() {
    this.explosions = [];
  }

  spawn(x, y, color, count = PARTICLE_COUNT) {
    const particles = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const speed = PARTICLE_SPEED * (0.5 + Math.random() * 0.8);

      const r = Math.min(255, ((color >> 16) & 0xff) * 1.3);
      const g = Math.min(255, ((color >> 8) & 0xff) * 1.3);
      const b = Math.min(255, (color & 0xff) * 1.3);
      const particleColor = Phaser.Display.Color.GetColor(r, g, b);

      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: particleColor,
        length: 0.8 + Math.random() * 0.6,
      });
    }
    this.explosions.push({ particles, elapsed: 0 });
  }

  update(delta) {
    const dt = delta / 1000;
    for (const exp of this.explosions) {
      exp.elapsed += delta;
      for (const p of exp.particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.98;
        p.vy *= 0.98;
      }
    }
    this.explosions = this.explosions.filter(e => e.elapsed < PARTICLE_LIFE_MS);
  }

  draw(gfx) {
    for (const exp of this.explosions) {
      const lifeRatio = 1 - exp.elapsed / PARTICLE_LIFE_MS;
      if (lifeRatio <= 0) continue;
      const alpha = lifeRatio * lifeRatio;

      for (const p of exp.particles) {
        const tailLen = TAIL_LENGTH * p.length;
        const tailX = p.x - (p.vx / PARTICLE_SPEED) * tailLen;
        const tailY = p.y - (p.vy / PARTICLE_SPEED) * tailLen;

        gfx.lineStyle(LINE_WIDTH, p.color, alpha);
        gfx.beginPath();
        gfx.moveTo(tailX, tailY);
        gfx.lineTo(p.x, p.y);
        gfx.strokePath();
      }
    }
  }
}
