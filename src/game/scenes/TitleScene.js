import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import { drawGlowLine } from '../rendering/GlowRenderer.js';
import { vectorText, vectorTextWidth } from '../rendering/VectorFont.js';
import { projectPoint, projectModelFlat } from '../rendering/Projection.js';
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

    this._time = 0;
    this._started = false;
    this._idleTimer = 0;
    this._demoLaunched = false;
    this._startPending = false;
    this._anyKeyPending = false;

    console.log('[TITLE] create() called');

    // Remove stale listener from previous create() cycle (defensive)
    if (this._onKeyDown) {
      console.log('[TITLE] removing stale keydown listener');
      window.removeEventListener('keydown', this._onKeyDown);
    }

    // Raw DOM keydown — sets flags consumed by update loop
    this._onKeyDown = (e) => {
      console.log(`[TITLE] keydown: ${e.code}, _started=${this._started}, _time=${this._time.toFixed(2)}`);
      this._anyKeyPending = true;
      if (e.code === 'Space' || e.code === 'Enter') {
        this._startPending = true;
        console.log('[TITLE] _startPending = true');
      }
    };
    window.addEventListener('keydown', this._onKeyDown);
    this.events.once('shutdown', () => {
      console.log('[TITLE] shutdown — removing keydown listener');
      window.removeEventListener('keydown', this._onKeyDown);
    });

    // Logo image — source is 2752px wide, fit to ~500px display width
    this._logo = this.add.image(CX, 155, 'logo');
    this._logo.setBlendMode(Phaser.BlendModes.ADD);
    this._logo.setDepth(1);
    this._logo.setAlpha(0);
    this._logo.setScale(500 / 2752);

    // Orbiting demo enemies — inner ring: classic trio, outer ring: new types
    this._orbiters = [
      { model: GRUNT, color: CONFIG.COLORS.GRUNT, color2: CONFIG.COLORS_2.GRUNT, angle: 0, radius: 140, speed: 0.45, y: 370 },
      { model: ATTACKER, color: CONFIG.COLORS.ATTACKER, color2: CONFIG.COLORS_2.ATTACKER, angle: Math.PI * 0.666, radius: 140, speed: 0.45, y: 370 },
      { model: COMMANDER, color: CONFIG.COLORS.COMMANDER, color2: CONFIG.COLORS_2.COMMANDER, angle: Math.PI * 1.333, radius: 140, speed: 0.45, y: 370 },
      // Outer ring — new enemy types, counter-rotating
      { model: SPINNER, color: CONFIG.COLORS.SPINNER, color2: CONFIG.COLORS_2.SPINNER, angle: 0.5, radius: 240, speed: -0.3, y: 380, spin: true },
      { model: BOMBER, color: CONFIG.COLORS.BOMBER, color2: CONFIG.COLORS_2.BOMBER, angle: 1.5, radius: 240, speed: -0.3, y: 380 },
      { model: PHANTOM, color: CONFIG.COLORS.PHANTOM, color2: CONFIG.COLORS_2.PHANTOM, angle: 2.5, radius: 240, speed: -0.3, y: 380 },
      { model: GUARDIAN, color: CONFIG.COLORS.GUARDIAN, color2: CONFIG.COLORS_2.GUARDIAN, angle: 3.8, radius: 240, speed: -0.3, y: 380 },
    ];

    // Parallax scrolling starfield (3 layers, same as GameScene)
    this._stars = [];
    const starColors = [0x88bbee, 0x88bbee, 0xaaccff, 0xddeeff, 0xffccaa, 0xffaa88, 0xaaddff];
    const starLayers = [
      { count: 40, speed: 22, brightnessMin: 0.25, brightnessMax: 0.45, sizeMin: 0.5, sizeMax: 0.8 },
      { count: 30, speed: 48, brightnessMin: 0.40, brightnessMax: 0.65, sizeMin: 0.7, sizeMax: 1.1 },
      { count: 15, speed: 85, brightnessMin: 0.55, brightnessMax: 0.85, sizeMin: 1.0, sizeMax: 1.5 },
    ];
    for (const layer of starLayers) {
      for (let i = 0; i < layer.count; i++) {
        this._stars.push({
          x: CONFIG.FIELD_LEFT + Math.random() * (CONFIG.FIELD_RIGHT - CONFIG.FIELD_LEFT),
          y: CONFIG.FIELD_TOP + Math.random() * (CONFIG.FIELD_BOTTOM - CONFIG.FIELD_TOP),
          speed: layer.speed,
          brightness: layer.brightnessMin + Math.random() * (layer.brightnessMax - layer.brightnessMin),
          size: layer.sizeMin + Math.random() * (layer.sizeMax - layer.sizeMin),
          color: starColors[Math.floor(Math.random() * starColors.length)],
        });
      }
    }

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

    // Consume DOM key flags
    if (this._anyKeyPending) {
      this._idleTimer = 0;
      this._anyKeyPending = false;
    }

    // Ignore first 0.3s of input (carry-over from demo exit keypress)
    if (this._time < 0.3) {
      if (this._startPending) {
        console.log(`[TITLE] discarding startPending during cooldown (_time=${this._time.toFixed(3)})`);
      }
      this._startPending = false;
    }

    // Start game on Space/Enter
    if (!this._started && this._startPending) {
      this._startPending = false;
      this._started = true;
      console.log('[TITLE] >>> STARTING GAME <<<');
      if (this.soundEngine) this.soundEngine.playSelect();
      this.scene.start('GameScene', { demo: false });
      return;
    }

    // Attract mode: launch demo after 8 seconds idle (only after title fully revealed)
    if (!this._started && !this._demoLaunched && this._time > 3.5) {
      this._idleTimer += dt;
      if (this._idleTimer >= 8) {
        this._demoLaunched = true;
        console.log('[TITLE] >>> LAUNCHING ATTRACT MODE <<<');
        this.scene.start('GameScene', { demo: true });
        return;
      }
    }

    // Update scrolling stars
    for (const star of this._stars) {
      star.y += star.speed * dt;
      if (star.y > CONFIG.FIELD_BOTTOM) {
        star.y = CONFIG.FIELD_TOP;
        star.x = CONFIG.FIELD_LEFT + Math.random() * (CONFIG.FIELD_RIGHT - CONFIG.FIELD_LEFT);
      }
    }

    // Update orbiters
    for (const o of this._orbiters) {
      o.angle += o.speed * dt;
    }

    // ─── RENDER ───
    this.gfx.clear();
    this.bgGfx.clear();

    // Starfield (parallax streaks, same as GameScene)
    for (const star of this._stars) {
      const streakLen = star.speed * 0.08;
      this.bgGfx.lineStyle(star.size, star.color, star.brightness);
      this.bgGfx.beginPath();
      this.bgGfx.moveTo(star.x, star.y);
      this.bgGfx.lineTo(star.x, star.y + streakLen);
      this.bgGfx.strokePath();
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

      const op = projectPoint(ox, oy, oz);
      const lines = projectModelFlat(o.model, op.x, op.y, op.scale * 1.4, rotation);
      for (const line of lines) {
        const col = line.c ? o.color2 : o.color;
        drawGlowLine(this.gfx, line.x1, line.y1, line.x2, line.y2, col);
      }
    }

    // ─── PLAYER SHIP (static display) ───
    if (this._time > 2.5) {
      const shipAlpha = Math.min(1, (this._time - 2.5) * 2);
      const shipY = 500;
      const shipScale = 1.6;
      const lines = projectModelFlat(PLAYER_SHIP, CX, shipY, shipScale);
      for (const line of lines) {
        if (line.c === 1) continue;
        const col = line.c === 3 ? CONFIG.COLORS.PLAYER_RED
          : line.c === 2 ? CONFIG.COLORS.PLAYER_BLUE
          : CONFIG.COLORS.PLAYER;
        drawGlowLine(this.gfx, line.x1, line.y1, line.x2, line.y2, col);
      }
      for (const line of lines) {
        if (line.c !== 1) continue;
        drawGlowLine(this.gfx, line.x1, line.y1, line.x2, line.y2, CONFIG.COLORS.PLAYER_WHITE);
      }
      // Dual nacelle thrust
      const flicker = Math.sin(this._time * 12) * 0.3 + 0.7;
      const nacX = 5.5 * shipScale;
      const engY = shipY + 9 * shipScale;
      const tLen = 8 * flicker;
      drawGlowLine(this.gfx, CX - nacX - 1, engY, CX - nacX, engY + tLen, CONFIG.COLORS.PLAYER_THRUST);
      drawGlowLine(this.gfx, CX - nacX + 1, engY, CX - nacX, engY + tLen, CONFIG.COLORS.PLAYER_THRUST);
      drawGlowLine(this.gfx, CX + nacX - 1, engY, CX + nacX, engY + tLen, CONFIG.COLORS.PLAYER_THRUST);
      drawGlowLine(this.gfx, CX + nacX + 1, engY, CX + nacX, engY + tLen, CONFIG.COLORS.PLAYER_THRUST);
    }

    // ─── SUB-TEXT ───
    if (this._time > 2.2) {
      // "PRESS FIRE" blinking
      const blink = Math.sin(this._time * 3.5) > -0.3;
      if (blink) {
        const subText = 'PRESS FIRE';
        const subScale = 4;
        const subW = vectorTextWidth(subText, subScale, 1.2);
        const subLines = vectorText(subText, CX - subW / 2, 560, subScale, 1.2);
        for (const line of subLines) {
          drawGlowLine(this.gfx, line.x1, line.y1, line.x2, line.y2, 0x99bbee);
        }
      }

      // Score display
      if (this._highScore > 0) {
        const hiText = 'HIGH SCORE ' + this._highScore;
        const hiScale = 3;
        const hiW = vectorTextWidth(hiText, hiScale, 1);
        const hiLines = vectorText(hiText, CX - hiW / 2, 240, hiScale, 1);
        for (const line of hiLines) {
          drawGlowLine(this.gfx, line.x1, line.y1, line.x2, line.y2, 0x88aadd);
        }
      }

      // Copyright
      const cpText = '\u00A9 2026 AI & DESIGN GAME STUDIOS';
      const cpScale = 3;
      const cpW = vectorTextWidth(cpText, cpScale, 1);
      const cpLines = vectorText(cpText, CX - cpW / 2, 620, cpScale, 1);
      for (const line of cpLines) {
        drawGlowLine(this.gfx, line.x1, line.y1, line.x2, line.y2, 0x88aadd);
      }
    }

  }

}
