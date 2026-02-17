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

// CRT mode: 3 discrete sprite frames
const CRT_LIFE_MS = 250;
const CRT_SPEED = 95;
// Radii for each frame: small → medium → large
const CRT_FRAME_RADII = [0.15, 0.55, 1.0];
const CRT_FRAME_ALPHAS = [1.0, 0.8, 0.45];

export class ExplosionRenderer {
  constructor() {
    this.explosions = [];
    this.crtMode = false;
  }

  spawn(x, y, color, count = PARTICLE_COUNT) {
    const particles = [];

    const r = Math.min(255, ((color >> 16) & 0xff) * 1.3);
    const g = Math.min(255, ((color >> 8) & 0xff) * 1.3);
    const b = Math.min(255, (color & 0xff) * 1.3);
    const particleColor = Phaser.Display.Color.GetColor(r, g, b);

    if (this.crtMode) {
      // Symmetric sprite-like burst: 4-way mirrored, uniform speed, tighter spread
      const quadCount = 3;
      const speed = PARTICLE_SPEED * 0.65;
      for (let i = 0; i < quadCount; i++) {
        // Angles in first quadrant only (0 to PI/2), then mirror
        const angle = (i / quadCount) * Math.PI * 0.5;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        // 4-way mirror: (+,+), (-,+), (+,-), (-,-)
        particles.push({ x, y, vx:  vx, vy:  vy, color: particleColor, length: 1.0 });
        particles.push({ x, y, vx: -vx, vy:  vy, color: particleColor, length: 1.0 });
        particles.push({ x, y, vx:  vx, vy: -vy, color: particleColor, length: 1.0 });
        particles.push({ x, y, vx: -vx, vy: -vy, color: particleColor, length: 1.0 });
      }
    } else {
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
        const speed = PARTICLE_SPEED * (0.5 + Math.random() * 0.8);
        particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: particleColor,
          length: 0.8 + Math.random() * 0.6,
        });
      }
    }

    this.explosions.push({ particles, elapsed: 0, crt: this.crtMode, ox: x, oy: y });
  }

  update(delta) {
    const dt = delta / 1000;
    for (const exp of this.explosions) {
      exp.elapsed += delta;
      if (!exp.crt) {
        for (const p of exp.particles) {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vx *= 0.98;
          p.vy *= 0.98;
        }
      }
    }
    this.explosions = this.explosions.filter(e =>
      e.elapsed < (e.crt ? CRT_LIFE_MS : PARTICLE_LIFE_MS)
    );
  }

  draw(gfx) {
    for (const exp of this.explosions) {
      if (exp.crt) {
        this._drawCrt(gfx, exp);
      } else {
        this._drawVector(gfx, exp);
      }
    }
  }

  _drawVector(gfx, exp) {
    const lifeRatio = 1 - exp.elapsed / PARTICLE_LIFE_MS;
    if (lifeRatio <= 0) return;
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

  _drawCrt(gfx, exp) {
    const t = exp.elapsed / CRT_LIFE_MS;
    if (t >= 1) return;

    // Quantize to 3 discrete frames
    const frame = Math.min(2, Math.floor(t * 3));
    const radius = CRT_FRAME_RADII[frame];
    const alpha = CRT_FRAME_ALPHAS[frame];
    const maxDist = CRT_SPEED * (CRT_LIFE_MS / 1000);

    for (const p of exp.particles) {
      // Unit direction from spawn origin
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (speed < 0.01) continue;
      const dx = p.vx / speed;
      const dy = p.vy / speed;

      // Snap to discrete radius
      const dist = maxDist * radius;
      const px = exp.ox + dx * dist;
      const py = exp.oy + dy * dist;

      // Short stubby lines (not long tails)
      const stubLen = 4 + frame * 3;
      const tx = px - dx * stubLen;
      const ty = py - dy * stubLen;

      gfx.lineStyle(LINE_WIDTH + 0.5, p.color, alpha);
      gfx.beginPath();
      gfx.moveTo(tx, ty);
      gfx.lineTo(px, py);
      gfx.strokePath();
    }
  }
}
