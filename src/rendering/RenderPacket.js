/**
 * Render packet: collects line segments and mask circles for GPU rendering.
 * Data is stored in flat typed arrays matching the GPU attribute layout
 * for efficient transfer to InstancedBufferAttributes.
 *
 * Buffer layout per line:
 *   P0 (vec2): x1, y1
 *   P1 (vec2): x2, y2
 *   Color (vec3): r, g, b  (0–1)
 *   Params (vec2): intensity, halfWidth
 *
 * Buffer layout per mask circle:
 *   Center (vec2): cx, cy
 *   Radius (float): r
 */

const MAX_LINES = 4096;
const MAX_MASKS = 512;
const MAX_BG_LINES = 256;

export class RenderPacket {
  constructor() {
    // ── Main glow lines ──
    this.lineP0 = new Float32Array(MAX_LINES * 2);
    this.lineP1 = new Float32Array(MAX_LINES * 2);
    this.lineColor = new Float32Array(MAX_LINES * 3);
    this.lineParams = new Float32Array(MAX_LINES * 2);
    this.lineCount = 0;

    // ── Mask circles ──
    this.maskCenter = new Float32Array(MAX_MASKS * 2);
    this.maskRadius = new Float32Array(MAX_MASKS);
    this.maskCount = 0;

    // ── Background lines (starfield) ──
    this.bgP0 = new Float32Array(MAX_BG_LINES * 2);
    this.bgP1 = new Float32Array(MAX_BG_LINES * 2);
    this.bgColor = new Float32Array(MAX_BG_LINES * 3);
    this.bgParams = new Float32Array(MAX_BG_LINES * 2);
    this.bgCount = 0;

    // Screen shake offset (applied in vertex shader)
    this.shakeX = 0;
    this.shakeY = 0;
  }

  reset() {
    this.lineCount = 0;
    this.maskCount = 0;
    this.bgCount = 0;
    this.shakeX = 0;
    this.shakeY = 0;
  }

  // ═══════════════════════════════════════════════════════════
  // Low-level add methods
  // ═══════════════════════════════════════════════════════════

  /**
   * Add a glow line segment.
   * @param {number} x1,y1,x2,y2 — screen-space endpoints
   * @param {number} color — 0xRRGGBB
   * @param {number} intensity — overall alpha/brightness multiplier (default 1)
   * @param {number} halfWidth — glow extent in px (default 7 = full 3-Gaussian glow)
   */
  addLine(x1, y1, x2, y2, color, intensity = 1.0, halfWidth = 7.0) {
    if (this.lineCount >= MAX_LINES) return;
    const n = this.lineCount;
    const i2 = n * 2;
    const i3 = n * 3;

    this.lineP0[i2] = x1;
    this.lineP0[i2 + 1] = y1;
    this.lineP1[i2] = x2;
    this.lineP1[i2 + 1] = y2;
    this.lineColor[i3] = ((color >> 16) & 0xff) / 255;
    this.lineColor[i3 + 1] = ((color >> 8) & 0xff) / 255;
    this.lineColor[i3 + 2] = (color & 0xff) / 255;
    this.lineParams[i2] = intensity;
    this.lineParams[i2 + 1] = halfWidth;

    this.lineCount++;
  }

  /**
   * Add a mask circle (opaque black, drawn before glow lines).
   */
  addMaskCircle(cx, cy, radius) {
    if (this.maskCount >= MAX_MASKS) return;
    const n = this.maskCount;
    this.maskCenter[n * 2] = cx;
    this.maskCenter[n * 2 + 1] = cy;
    this.maskRadius[n] = radius;
    this.maskCount++;
  }

  /**
   * Add a background line (starfield — thin, drawn before masks).
   */
  addBgLine(x1, y1, x2, y2, color, alpha = 1.0, halfWidth = 0.8) {
    if (this.bgCount >= MAX_BG_LINES) return;
    const n = this.bgCount;
    const i2 = n * 2;
    const i3 = n * 3;

    this.bgP0[i2] = x1;
    this.bgP0[i2 + 1] = y1;
    this.bgP1[i2] = x2;
    this.bgP1[i2 + 1] = y2;
    this.bgColor[i3] = ((color >> 16) & 0xff) / 255;
    this.bgColor[i3 + 1] = ((color >> 8) & 0xff) / 255;
    this.bgColor[i3 + 2] = (color & 0xff) / 255;
    this.bgParams[i2] = alpha;
    this.bgParams[i2 + 1] = halfWidth;

    this.bgCount++;
  }

  // ═══════════════════════════════════════════════════════════
  // High-level helpers matching GlowRenderer API
  // ═══════════════════════════════════════════════════════════

  /**
   * Equivalent of drawGlowLine. Adds a single glow line segment.
   * @param {boolean} mask — if true, adds mask circles along the line (matching 20px mask stroke)
   * @param {Array|null} passes — custom glow passes [{width, alpha}] or null for defaults
   */
  glowLine(x1, y1, x2, y2, color, mask = false, passes = null) {
    let intensity = 1.0;
    let halfWidth = 7.0;

    if (passes) {
      // Extract intensity from core pass alpha
      const core = passes.find(p => p.width <= 3) || passes[passes.length - 1];
      intensity = core.alpha;
      // Scale from outer pass width ratio (default outer = 11)
      const outer = passes.find(p => p.width >= 8) || passes[0];
      halfWidth = (outer.width / 11) * 7;
    }

    if (mask) {
      // Approximate the 20px-wide mask stroke with circles along the line
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.sqrt(dx * dx + dy * dy);
      const steps = Math.max(1, Math.ceil(len / 12));
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        this.addMaskCircle(x1 + dx * t, y1 + dy * t, 10);
      }
    }

    this.addLine(x1, y1, x2, y2, color, intensity, halfWidth);
  }

  /**
   * Equivalent of drawGlowPolygon. Closed polygon outline.
   */
  glowPolygon(points, color, mask = false) {
    if (mask && points.length >= 3) {
      // Approximate polygon mask with a circle at centroid
      let cx = 0, cy = 0;
      for (const p of points) { cx += p.x; cy += p.y; }
      cx /= points.length;
      cy /= points.length;
      let maxR = 0;
      for (const p of points) {
        const d = Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2);
        if (d > maxR) maxR = d;
      }
      this.addMaskCircle(cx, cy, maxR);
    }

    for (let i = 0; i < points.length; i++) {
      const a = points[i];
      const b = points[(i + 1) % points.length];
      this.addLine(a.x, a.y, b.x, b.y, color);
    }
  }

  /**
   * Equivalent of drawGlowCircle.
   */
  glowCircle(cx, cy, radius, color, segments = 16, mask = false) {
    if (mask) {
      this.addMaskCircle(cx, cy, radius);
    }
    for (let i = 0; i < segments; i++) {
      const a1 = (i / segments) * Math.PI * 2;
      const a2 = ((i + 1) / segments) * Math.PI * 2;
      this.addLine(
        cx + radius * Math.cos(a1), cy + radius * Math.sin(a1),
        cx + radius * Math.cos(a2), cy + radius * Math.sin(a2),
        color,
      );
    }
  }

  /**
   * Equivalent of drawGlowDiamond.
   */
  glowDiamond(cx, cy, size, color) {
    this.glowPolygon([
      { x: cx, y: cy - size },
      { x: cx + size, y: cy },
      { x: cx, y: cy + size },
      { x: cx - size, y: cy },
    ], color);
  }

  /**
   * Equivalent of drawGlowArc (open arc, not closed).
   */
  glowArc(cx, cy, rx, ry, color, rotation = 0, startAngle = 0, endAngle = Math.PI * 2, segments = 16) {
    const cosR = Math.cos(rotation);
    const sinR = Math.sin(rotation);
    const range = endAngle - startAngle;
    const numPts = Math.max(2, Math.round(segments * Math.abs(range) / (Math.PI * 2)));

    let prevX, prevY;
    for (let i = 0; i <= numPts; i++) {
      const angle = startAngle + (i / numPts) * range;
      const lx = rx * Math.cos(angle);
      const ly = ry * Math.sin(angle);
      const px = cx + lx * cosR - ly * sinR;
      const py = cy + lx * sinR + ly * cosR;

      if (i > 0) {
        this.addLine(prevX, prevY, px, py, color);
      }
      prevX = px;
      prevY = py;
    }
  }
}
