import { CONFIG } from '../config.js';

/**
 * Formation grid: manages the home positions of all enemies.
 * The formation can sway left/right and breathe (scale pulse).
 * Each slot has a row/col that maps to a world position.
 * Compresses when enemies are destroyed (<60% remaining).
 */
export class Formation {
  constructor() {
    this.time = 0;
    this.originX = CONFIG.CENTER_X;
    this.originY = CONFIG.FORMATION_BASE_Y;
    this.crtMode = false;

    // Compression state
    this._totalSlots = 0;
    this._aliveSlots = [];
    this._colSpacingTarget = CONFIG.FORMATION_COL_SPACING;
    this._colSpacingCurrent = CONFIG.FORMATION_COL_SPACING;
    this._rowSpacingTarget = CONFIG.FORMATION_ROW_SPACING;
    this._rowSpacingCurrent = CONFIG.FORMATION_ROW_SPACING;
  }

  /**
   * Called by WaveSystem to inform formation of alive enemy slots.
   * @param {Array<{row: number, col: number}>} slots
   * @param {number} totalCount - total enemies in the wave
   */
  setAliveSlots(slots, totalCount) {
    this._aliveSlots = slots;
    this._totalSlots = totalCount;

    const ratio = slots.length / Math.max(1, totalCount);

    if (ratio < 0.6 && slots.length > 0) {
      // Compute bounding box of alive enemies
      let minCol = 99, maxCol = -1, minRow = 99, maxRow = -1;
      for (const s of slots) {
        if (s.col < minCol) minCol = s.col;
        if (s.col > maxCol) maxCol = s.col;
        if (s.row < minRow) minRow = s.row;
        if (s.row > maxRow) maxRow = s.row;
      }

      const colSpan = maxCol - minCol;
      const rowSpan = maxRow - minRow;

      // Compress horizontally (floor prevents glow overlap at Z=12 perspective)
      const compressionFactor = 0.75 + ratio * 0.25; // ranges from ~0.75 to ~0.9
      const colTarget = Math.max(48, CONFIG.FORMATION_COL_SPACING * compressionFactor);
      // Vertical: gentler compression
      const rowCompress = 0.8 + ratio * 0.2;
      const rowTarget = Math.max(46, CONFIG.FORMATION_ROW_SPACING * rowCompress);

      this._colSpacingTarget = colTarget;
      this._rowSpacingTarget = rowTarget;
    } else {
      this._colSpacingTarget = CONFIG.FORMATION_COL_SPACING;
      this._rowSpacingTarget = CONFIG.FORMATION_ROW_SPACING;
    }
  }

  update(dt) {
    this.time += dt;

    // Smooth lerp spacing toward targets
    const lerpRate = 2.0 * dt;
    this._colSpacingCurrent += (this._colSpacingTarget - this._colSpacingCurrent) * lerpRate;
    this._rowSpacingCurrent += (this._rowSpacingTarget - this._rowSpacingCurrent) * lerpRate;
  }

  /**
   * Get the current world position for a formation slot.
   */
  getSlotPosition(row, col) {
    let sway = Math.sin(this.time * CONFIG.FORMATION_SWAY_SPEED * Math.PI * 2)
      * CONFIG.FORMATION_SWAY_AMOUNT;

    let breathe = 1.0 + Math.sin(this.time * CONFIG.FORMATION_BREATHE_SPEED * Math.PI * 2)
      * CONFIG.FORMATION_BREATHE_AMOUNT;

    // CRT mode: quantize breathe to 3 discrete steps (small / normal / large)
    if (this.crtMode) {
      const raw = breathe - 1.0; // ranges -0.04 to +0.04
      breathe = raw > 0.013 ? 1.04 : raw < -0.013 ? 0.96 : 1.0;
    }

    const colSpacing = this._colSpacingCurrent;
    const rowSpacing = this._rowSpacingCurrent;

    // Center the grid
    const gridWidth = (CONFIG.FORMATION_COLS - 1) * colSpacing;
    const gridHeight = (CONFIG.FORMATION_ROWS - 1) * rowSpacing;

    const localX = col * colSpacing;
    const localY = row * rowSpacing;

    const x = this.originX + (localX - gridWidth / 2) * breathe + sway;
    const y = this.originY + (localY - gridHeight / 2) * breathe;
    const z = CONFIG.FORMATION_Z;

    return { x, y, z };
  }
}
