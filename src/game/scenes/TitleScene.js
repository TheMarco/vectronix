import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import { drawGlowLine, drawGlowDot } from '../rendering/GlowRenderer.js';
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
    const overlay = this.game.registry.get('shaderOverlay');
    this._pkt = overlay && overlay.gpuLinesReady ? overlay.packet : null;

    if (this._pkt) {
      this._pkt.reset();
      this._pkt.shakeX = 0;
      this._pkt.shakeY = 0;
    }

    this.gfx.clear();
    this.bgGfx.clear();

    // Starfield (parallax streaks, same as GameScene)
    for (const star of this._stars) {
      const streakLen = star.speed * 0.08;
      this._starLine(star.x, star.y, star.x, star.y + streakLen, star.color, star.brightness, star.size * 0.5);
    }

    // Geometric background decoration — hexagonal grid pulse (skip in CRT: aliases badly)
    const isCRT = overlay && overlay.getShaderName && overlay.getShaderName() === 'crt';
    if (!isCRT) {
      const pulseA = 0.08 + Math.sin(this._time * 1.5) * 0.04;
      const hexR = 280;
      for (let i = 0; i < 6; i++) {
        const a1 = (i / 6) * Math.PI * 2 + this._time * 0.15;
        const a2 = ((i + 1) / 6) * Math.PI * 2 + this._time * 0.15;
        const x1 = CX + Math.cos(a1) * hexR;
        const y1 = CY - 50 + Math.sin(a1) * hexR * 0.6;
        const x2 = CX + Math.cos(a2) * hexR;
        const y2 = CY - 50 + Math.sin(a2) * hexR * 0.6;
        this._starLine(x1, y1, x2, y2, 0x222255, pulseA, 0.75);
        // Radial spokes
        this._starLine(CX, CY - 50, x1, y1, 0x222255, pulseA * 0.5, 0.5);
      }
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
        this._glowLine(line.x1, line.y1, line.x2, line.y2, col);
      }
      this._drawVertexDots(lines, (line) => line.c ? o.color2 : o.color);
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
        this._glowLine(line.x1, line.y1, line.x2, line.y2, col);
      }
      for (const line of lines) {
        if (line.c !== 1) continue;
        this._glowLine(line.x1, line.y1, line.x2, line.y2, CONFIG.COLORS.PLAYER_WHITE);
      }
      this._drawVertexDots(lines, (line) => {
        if (line.c === 1) return CONFIG.COLORS.PLAYER_WHITE;
        if (line.c === 3) return CONFIG.COLORS.PLAYER_RED;
        if (line.c === 2) return CONFIG.COLORS.PLAYER_BLUE;
        return CONFIG.COLORS.PLAYER;
      });
      // Dual nacelle thrust
      const flicker = Math.sin(this._time * 12) * 0.3 + 0.7;
      const nacX = 5.5 * shipScale;
      const engY = shipY + 9 * shipScale;
      const tLen = 8 * flicker;
      this._glowLine(CX - nacX - 1, engY, CX - nacX, engY + tLen, CONFIG.COLORS.PLAYER_THRUST);
      this._glowLine(CX - nacX + 1, engY, CX - nacX, engY + tLen, CONFIG.COLORS.PLAYER_THRUST);
      this._glowLine(CX + nacX - 1, engY, CX + nacX, engY + tLen, CONFIG.COLORS.PLAYER_THRUST);
      this._glowLine(CX + nacX + 1, engY, CX + nacX, engY + tLen, CONFIG.COLORS.PLAYER_THRUST);
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
          this._glowLine(line.x1, line.y1, line.x2, line.y2, 0x99bbee);
        }
      }

      // Score display
      if (this._highScore > 0) {
        const hiText = 'HIGH SCORE ' + this._highScore;
        const hiScale = 3;
        const hiW = vectorTextWidth(hiText, hiScale, 1);
        const hiLines = vectorText(hiText, CX - hiW / 2, 240, hiScale, 1);
        for (const line of hiLines) {
          this._glowLine(line.x1, line.y1, line.x2, line.y2, 0x88aadd);
        }
      }

      // Copyright
      const cpText = '\u00A9 2026 AI & DESIGN GAME STUDIOS';
      const cpScale = 3;
      const cpW = vectorTextWidth(cpText, cpScale, 1);
      const cpLines = vectorText(cpText, CX - cpW / 2, 620, cpScale, 1);
      for (const line of cpLines) {
        this._glowLine(line.x1, line.y1, line.x2, line.y2, 0x88aadd);
      }
    }

    // Submit packet for GPU rendering
    if (this._pkt) {
      overlay.submitPacket(this._pkt);
    }

  }

  _glowLine(x1, y1, x2, y2, color, mask = false, passes = null) {
    if (this._pkt) {
      this._pkt.glowLine(x1, y1, x2, y2, color, mask, passes);
    } else {
      drawGlowLine(this.gfx, x1, y1, x2, y2, color, mask, passes || undefined);
    }
  }

  _starLine(x1, y1, x2, y2, color, alpha, halfWidth) {
    if (this._pkt) {
      this._pkt.addBgLine(x1, y1, x2, y2, color, alpha, halfWidth);
    } else {
      this.bgGfx.lineStyle(halfWidth * 2, color, alpha);
      this.bgGfx.beginPath();
      this.bgGfx.moveTo(x1, y1);
      this.bgGfx.lineTo(x2, y2);
      this.bgGfx.strokePath();
    }
  }

  _glowDot(x, y, color) {
    if (this._pkt) {
      this._pkt.glowLine(x, y, x + 0.5, y + 0.5, color, false, [
        { width: 4.5, alpha: 0.04 },
        { width: 3, alpha: 0.15 },
        { width: 1.5, alpha: 0.6 },
      ]);
    } else {
      drawGlowDot(this.gfx, x, y, color);
    }
  }

  _drawVertexDots(lines, colorFn) {
    // Skip in CRT mode
    const overlay = this.game.registry.get('shaderOverlay');
    if (overlay && overlay.getShaderName() === 'crt') return;

    const seen = new Set();
    for (const line of lines) {
      const k1 = (Math.round(line.x1) << 16) | (Math.round(line.y1) & 0xFFFF);
      if (!seen.has(k1)) {
        seen.add(k1);
        this._glowDot(line.x1, line.y1, colorFn(line));
      }
      const k2 = (Math.round(line.x2) << 16) | (Math.round(line.y2) & 0xFFFF);
      if (!seen.has(k2)) {
        seen.add(k2);
        this._glowDot(line.x2, line.y2, colorFn(line));
      }
    }
  }

}
