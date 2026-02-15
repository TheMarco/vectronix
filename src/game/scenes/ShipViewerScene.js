/**
 * Debug/reference page showing all enemy types in their visual states.
 * Access by adding ?ships to the URL.
 */
import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import { ENEMY_MODELS, UFO_SAUCER } from '../rendering/Models.js';
import { applyHoloGlitch } from '../rendering/HoloGlitch.js';
import { projectModelFlat } from '../rendering/Projection.js';
import { drawGlowLine } from '../rendering/GlowRenderer.js';
import { vectorText, vectorTextWidth } from '../rendering/VectorFont.js';

const TYPES = [
  'grunt', 'attacker', 'commander', 'spinner', 'bomber',
  'guardian', 'phantom', 'swarm', 'boss', 'ufo',
];

const COLUMNS = ['NORMAL', 'HIT', 'DAMAGED', 'CRITICAL', 'PHASE 2', 'FLICKER'];

const TYPE_COLUMNS = {
  grunt:     ['NORMAL', 'HIT'],
  attacker:  ['NORMAL', 'HIT'],
  commander: ['NORMAL', 'HIT', 'DAMAGED'],
  spinner:   ['NORMAL', 'HIT'],
  bomber:    ['NORMAL', 'HIT', 'DAMAGED'],
  guardian:  ['NORMAL', 'HIT', 'DAMAGED', 'CRITICAL'],
  phantom:   ['NORMAL', 'HIT', 'FLICKER'],
  swarm:     ['NORMAL', 'HIT'],
  boss:      ['NORMAL', 'HIT', 'DAMAGED', 'PHASE 2'],
  ufo:       ['NORMAL', 'HIT'],
};

const LABEL_X = 8;
const COL_START_X = 145;
const COL_SPACING = 105;
const HEADER_Y = 20;
const ROW_START_Y = 65;
const ROW_SPACING = 60;
const TEXT_SCALE = 2;

export class ShipViewerScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ShipViewerScene' });
  }

  create() {
    this.gfx = this.add.graphics();
    this.gfx.setBlendMode(Phaser.BlendModes.ADD);
    this.gfx.setDepth(2);

    this._scrollY = 0;
    this._maxScroll = Math.max(0, ROW_START_Y + TYPES.length * ROW_SPACING - CONFIG.HEIGHT + 20);
    this._cursors = this.input.keyboard.createCursorKeys();
  }

  update() {
    if (this._cursors.up.isDown) {
      this._scrollY = Math.max(0, this._scrollY - 4);
    } else if (this._cursors.down.isDown) {
      this._scrollY = Math.min(this._maxScroll, this._scrollY + 4);
    }

    this.gfx.clear();
    this._drawGrid();
  }

  _drawGrid() {
    const oy = -this._scrollY;

    // Column headers
    for (let c = 0; c < COLUMNS.length; c++) {
      const cx = COL_START_X + c * COL_SPACING;
      const tw = vectorTextWidth(COLUMNS[c], TEXT_SCALE);
      const lines = vectorText(COLUMNS[c], cx - tw / 2, HEADER_Y + oy, TEXT_SCALE);
      for (const l of lines) {
        drawGlowLine(this.gfx, l.x1, l.y1, l.x2, l.y2, 0x88ddff);
      }
    }

    // Enemy rows
    for (let r = 0; r < TYPES.length; r++) {
      const type = TYPES[r];
      const rowY = ROW_START_Y + r * ROW_SPACING + oy;

      // Skip if off-screen
      if (rowY < -40 || rowY > CONFIG.HEIGHT + 40) continue;

      // Row label
      const labelLines = vectorText(type.toUpperCase(), LABEL_X, rowY - 5, TEXT_SCALE);
      for (const l of labelLines) {
        drawGlowLine(this.gfx, l.x1, l.y1, l.x2, l.y2, 0x556677);
      }

      // Draw each applicable state
      const cols = TYPE_COLUMNS[type];
      for (const colName of cols) {
        const ci = COLUMNS.indexOf(colName);
        const cx = COL_START_X + ci * COL_SPACING;
        this._drawShip(type, colName, cx, rowY);
      }
    }
  }

  _drawShip(type, state, cx, cy) {
    let model = type === 'ufo' ? UFO_SAUCER : ENEMY_MODELS[type];
    const key = type.toUpperCase();
    let color1 = CONFIG.COLORS[key] || 0xffffff;
    let color2 = CONFIG.COLORS_2[key] || color1;

    // Larger models get scaled down to fit the grid
    let modelScale = 1.8;
    if (type === 'boss') modelScale = 1.2;
    if (type === 'ufo') modelScale = 1.4;
    if (type === 'guardian') modelScale = 1.4;

    // Spinner gets a static rotation to show 3D wobble
    const rotation = type === 'spinner' ? 0.5 : 0;
    let passes = null;

    let glitchLevel = 0;
    if (state === 'HIT') {
      color1 = 0xffffff;
      color2 = 0xffffff;
    } else if (state === 'DAMAGED') {
      color1 = this._shiftDamage(color1, 1);
      color2 = this._shiftDamage(color2, 1);
      glitchLevel = 1;
    } else if (state === 'CRITICAL') {
      color1 = this._shiftDamage(color1, 2);
      color2 = this._shiftDamage(color2, 2);
      glitchLevel = 2;
    } else if (state === 'PHASE 2') {
      color1 = this._shiftPhase2(color1);
      color2 = this._shiftPhase2(color2);
    } else if (state === 'FLICKER') {
      const alpha = 0.15;
      passes = [
        { width: 11, alpha: 0.07 * alpha },
        { width: 5.5, alpha: 0.2 * alpha },
        { width: 2, alpha: alpha },
      ];
    }

    const lines = projectModelFlat(model, cx, cy, modelScale, rotation);

    if (glitchLevel > 0) {
      applyHoloGlitch(lines, glitchLevel, performance.now());
    }

    for (const line of lines) {
      const col = line.c ? color2 : color1;
      if (passes) {
        drawGlowLine(this.gfx, line.x1, line.y1, line.x2, line.y2, col, false, passes);
      } else {
        drawGlowLine(this.gfx, line.x1, line.y1, line.x2, line.y2, col);
      }
    }
  }

  _shiftPhase2(base) {
    const r = (base >> 16) & 0xff;
    const g = (base >> 8) & 0xff;
    const b = base & 0xff;
    return ((Math.min(255, r + 60) << 16) | (Math.min(255, g + 30) << 8) | (Math.min(255, b + 40))) >>> 0;
  }

  _shiftDamage(base, level) {
    const r = (base >> 16) & 0xff;
    const g = (base >> 8) & 0xff;
    const b = base & 0xff;
    if (level >= 2) {
      return ((Math.min(255, r + 140) << 16) | (Math.max(0, g - 80) << 8) | Math.max(0, b - 80)) >>> 0;
    }
    return ((Math.min(255, r + 80) << 16) | (Math.max(0, g - 40) << 8) | Math.max(0, b - 40)) >>> 0;
  }
}
