import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import { drawGlowLine, drawGlowCircle, drawGlowDiamond } from '../rendering/GlowRenderer.js';
import { vectorText, vectorTextWidth } from '../rendering/VectorFont.js';
import { projectModel } from '../rendering/Projection.js';
import { GRUNT, ATTACKER, COMMANDER, SPINNER, BOMBER, GUARDIAN, PHANTOM, PLAYER_SHIP } from '../rendering/Models.js';

const CX = CONFIG.CENTER_X;
const CY = CONFIG.CENTER_Y;

/**
 * VECTRONIX title screen.
 * Spectacular vector-line animation:
 * - Title assembled from vector strokes with staggered reveal
 * - Orbiting enemy wireframes
 * - Pulsing geometric background
 * - Scrolling starfield
 * - Press ENTER to start
 */
export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  preload() {
    this.load.image('logo', 'logo.png');
  }

  create() {
    this.soundEngine = this.game.registry.get('soundEngine');

    this.gfx = this.add.graphics();
    this.gfx.setBlendMode(Phaser.BlendModes.ADD);
    this.gfx.setDepth(0);

    this.bgGfx = this.add.graphics();
    this.bgGfx.setBlendMode(Phaser.BlendModes.ADD);
    this.bgGfx.setDepth(-1);

    this.startKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this._time = 0;
    this._started = false;

    // Logo image — source is 2752px wide, fit to ~500px display width
    this._logo = this.add.image(CX, 155, 'logo');
    this._logo.setBlendMode(Phaser.BlendModes.ADD);
    this._logo.setDepth(1);
    this._logo.setAlpha(0);
    this._logo.setScale(500 / 2752);

    // Orbiting demo enemies — inner ring: classic trio, outer ring: new types
    this._orbiters = [
      { model: GRUNT, color: CONFIG.COLORS.GRUNT, angle: 0, radius: 140, speed: 0.45, y: 370 },
      { model: ATTACKER, color: CONFIG.COLORS.ATTACKER, angle: Math.PI * 0.666, radius: 140, speed: 0.45, y: 370 },
      { model: COMMANDER, color: CONFIG.COLORS.COMMANDER, angle: Math.PI * 1.333, radius: 140, speed: 0.45, y: 370 },
      // Outer ring — new enemy types, counter-rotating
      { model: SPINNER, color: CONFIG.COLORS.SPINNER, angle: 0.5, radius: 240, speed: -0.3, y: 380, spin: true },
      { model: BOMBER, color: CONFIG.COLORS.BOMBER, angle: 1.5, radius: 240, speed: -0.3, y: 380 },
      { model: PHANTOM, color: CONFIG.COLORS.PHANTOM, angle: 2.5, radius: 240, speed: -0.3, y: 380 },
      { model: GUARDIAN, color: CONFIG.COLORS.GUARDIAN, angle: 3.8, radius: 240, speed: -0.3, y: 380 },
    ];

    // Starfield (scrolling)
    this._stars = [];
    for (let i = 0; i < 120; i++) {
      this._stars.push({
        x: Math.random() * CONFIG.WIDTH,
        y: Math.random() * CONFIG.HEIGHT,
        speed: 15 + Math.random() * 40,
        brightness: 0.1 + Math.random() * 0.4,
        size: 0.5 + Math.random() * 1.0,
      });
    }

    // Expanding rings
    this._rings = [];
    this._ringTimer = 0;

    // Bass pulse timer
    this._pulseTimer = 0;

    // High score
    try {
      this._highScore = parseInt(localStorage.getItem('vectronix-highscore') || '0', 10);
    } catch (e) {
      this._highScore = 0;
    }
  }

  update(time, delta) {
    const dt = delta / 1000;
    if (dt > 0.1) return;
    this._time += dt;

    // Bass pulse
    this._pulseTimer += dt;
    if (this._pulseTimer > 0.8 && this.soundEngine) {
      this._pulseTimer = 0;
      this.soundEngine.playTitlePulse();
    }

    // Start game
    if (!this._started &&
        (Phaser.Input.Keyboard.JustDown(this.startKey) ||
         Phaser.Input.Keyboard.JustDown(this.spaceKey))) {
      this._started = true;
      if (this.soundEngine) this.soundEngine.playSelect();
      this.time.delayedCall(300, () => {
        this.scene.start('GameScene');
      });
    }

    // Spawn expanding rings periodically
    this._ringTimer += dt;
    if (this._ringTimer > 1.5) {
      this._ringTimer = 0;
      this._rings.push({ radius: 10, alpha: 0.5 });
    }

    // Update scrolling stars
    for (const star of this._stars) {
      star.y += star.speed * dt;
      if (star.y > CONFIG.HEIGHT) {
        star.y = -2;
        star.x = Math.random() * CONFIG.WIDTH;
      }
    }

    // Update orbiters
    for (const o of this._orbiters) {
      o.angle += o.speed * dt;
    }

    // ─── RENDER ───
    this.gfx.clear();
    this.bgGfx.clear();

    // Starfield
    for (const star of this._stars) {
      this.bgGfx.lineStyle(star.size, 0x334466, star.brightness);
      this.bgGfx.beginPath();
      this.bgGfx.moveTo(star.x, star.y);
      this.bgGfx.lineTo(star.x, star.y + star.speed * 0.04);
      this.bgGfx.strokePath();
    }

    // Expanding rings (behind title)
    for (let i = this._rings.length - 1; i >= 0; i--) {
      const ring = this._rings[i];
      ring.radius += 80 * dt;
      ring.alpha -= 0.3 * dt;
      if (ring.alpha <= 0) {
        this._rings.splice(i, 1);
        continue;
      }
      drawGlowCircle(this.bgGfx, CX, 200, ring.radius, 0x223366, 24);
    }

    // Geometric background decoration — hexagonal grid pulse
    const pulseA = 0.08 + Math.sin(this._time * 1.5) * 0.04;
    const hexR = 280;
    for (let i = 0; i < 6; i++) {
      const a1 = (i / 6) * Math.PI * 2 + this._time * 0.15;
      const a2 = ((i + 1) / 6) * Math.PI * 2 + this._time * 0.15;
      const x1 = CX + Math.cos(a1) * hexR;
      const y1 = CY - 50 + Math.sin(a1) * hexR * 0.6;
      const x2 = CX + Math.cos(a2) * hexR;
      const y2 = CY - 50 + Math.sin(a2) * hexR * 0.6;
      this.bgGfx.lineStyle(1.5, 0x222255, pulseA);
      this.bgGfx.beginPath();
      this.bgGfx.moveTo(x1, y1);
      this.bgGfx.lineTo(x2, y2);
      this.bgGfx.strokePath();
      // Radial spokes
      this.bgGfx.lineStyle(1, 0x222255, pulseA * 0.5);
      this.bgGfx.beginPath();
      this.bgGfx.moveTo(CX, CY - 50);
      this.bgGfx.lineTo(x1, y1);
      this.bgGfx.strokePath();
    }

    // ─── LOGO ───
    const logoReveal = Math.min(1, Math.max(0, (this._time - 0.3) * 1.5));
    const logoPulse = 0.85 + Math.sin(this._time * 2.0) * 0.15;
    this._logo.setAlpha(logoReveal * logoPulse);
    // Gentle tint cycle
    const tr = Math.floor((0.6 + 0.4 * Math.sin(this._time * 0.8)) * 255);
    const tg = Math.floor((0.7 + 0.3 * Math.sin(this._time * 0.8 + 2)) * 255);
    const tb = Math.floor((0.9 + 0.1 * Math.sin(this._time * 0.8 + 4)) * 255);
    this._logo.setTint((tr << 16) | (tg << 8) | tb);

    // ─── ORBITING ENEMIES ───
    for (const o of this._orbiters) {
      const ox = CX + Math.cos(o.angle) * o.radius;
      const oy = o.y + Math.sin(o.angle) * 30;
      const oz = Math.sin(o.angle) * 15;
      const rotation = o.spin ? this._time * 3.0 : o.angle * 0.5;

      const lines = projectModel(o.model, ox, oy, oz, 1.4, rotation);
      for (const line of lines) {
        drawGlowLine(this.gfx, line.x1, line.y1, line.x2, line.y2, o.color);
      }
    }

    // ─── PLAYER SHIP (static display) ───
    if (this._time > 2.5) {
      const shipAlpha = Math.min(1, (this._time - 2.5) * 2);
      const shipY = 500;
      const lines = projectModel(PLAYER_SHIP, CX, shipY, 0, 1.6);
      for (const line of lines) {
        drawGlowLine(this.gfx, line.x1, line.y1, line.x2, line.y2, CONFIG.COLORS.PLAYER);
      }
      // Thrust
      const flicker = Math.sin(this._time * 12) * 0.3 + 0.7;
      drawGlowLine(this.gfx, CX - 3, shipY + 12, CX, shipY + 12 + 8 * flicker, CONFIG.COLORS.PLAYER_THRUST);
      drawGlowLine(this.gfx, CX + 3, shipY + 12, CX, shipY + 12 + 8 * flicker, CONFIG.COLORS.PLAYER_THRUST);
    }

    // ─── SUB-TEXT ───
    if (this._time > 2.2) {
      // "PRESS ENTER" blinking
      const blink = Math.sin(this._time * 3.5) > -0.3;
      if (blink) {
        const subText = 'PRESS ENTER';
        const subScale = 4;
        const subW = vectorTextWidth(subText, subScale, 1.2);
        const subLines = vectorText(subText, CX - subW / 2, 560, subScale, 1.2);
        for (const line of subLines) {
          drawGlowLine(this.gfx, line.x1, line.y1, line.x2, line.y2, 0x6688cc);
        }
      }

      // Score display (between logo and VECTOR ARCADE)
      if (this._highScore > 0) {
        const hiText = 'HI ' + this._highScore;
        const hiScale = 3;
        const hiW = vectorTextWidth(hiText, hiScale, 1);
        const hiLines = vectorText(hiText, CX - hiW / 2, 240, hiScale, 1);
        for (const line of hiLines) {
          drawGlowLine(this.gfx, line.x1, line.y1, line.x2, line.y2, 0x445577);
        }
      }

      // Copyright
      const cpText = '\u00A9 2026 AI & DESIGN GAME STUDIOS';
      const cpScale = 3;
      const cpW = vectorTextWidth(cpText, cpScale, 1);
      const cpLines = vectorText(cpText, CX - cpW / 2, 620, cpScale, 1);
      for (const line of cpLines) {
        drawGlowLine(this.gfx, line.x1, line.y1, line.x2, line.y2, 0x445577);
      }
    }

    // ─── CREDITS ───
    if (this._time > 3.0) {
      const credAlpha = Math.min(1, (this._time - 3.0) * 1.5);
      const credText = 'VECTOR ARCADE';
      const credScale = 2.5;
      const credW = vectorTextWidth(credText, credScale, 1);
      const credLines = vectorText(credText, CX - credW / 2, 300, credScale, 1);
      for (const line of credLines) {
        drawGlowLine(this.gfx, line.x1, line.y1, line.x2, line.y2, 0x334466);
      }
    }
  }

}
