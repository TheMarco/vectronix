import { CONFIG } from '../config.js';

/**
 * Formation grid: manages the home positions of all enemies.
 * The formation can sway left/right and breathe (scale pulse).
 * Each slot has a row/col that maps to a world position.
 */
export class Formation {
  constructor() {
    this.time = 0;
    this.originX = CONFIG.CENTER_X;
    this.originY = CONFIG.FORMATION_BASE_Y;
    this.crtMode = false;
  }

  update(dt) {
    this.time += dt;
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

    // Center the grid
    const gridWidth = (CONFIG.FORMATION_COLS - 1) * CONFIG.FORMATION_COL_SPACING;
    const gridHeight = (CONFIG.FORMATION_ROWS - 1) * CONFIG.FORMATION_ROW_SPACING;
    const startX = this.originX - gridWidth / 2;
    const startY = this.originY - gridHeight / 2;

    const localX = col * CONFIG.FORMATION_COL_SPACING;
    const localY = row * CONFIG.FORMATION_ROW_SPACING;

    const x = this.originX + (localX - gridWidth / 2) * breathe + sway;
    const y = this.originY + (localY - gridHeight / 2) * breathe;
    const z = CONFIG.FORMATION_Z;

    return { x, y, z };
  }
}
