/**
 * Holographic glitch damage effect.
 * Animates horizontal displacement bands and random line skipping
 * to convey damage as visual corruption over the normal model.
 */

// Mulberry32 seeded PRNG — deterministic per glitch frame
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Damage level tuning
const PARAMS = [
  null, // index 0 unused
  { holdMs: 120, bandMin: 1, bandMax: 1, heightMin: 4, heightMax: 7, dispMin: 2, dispMax: 5, skipChance: 0.05 },
  { holdMs: 80, bandMin: 1, bandMax: 2, heightMin: 5, heightMax: 9, dispMin: 3, dispMax: 7, skipChance: 0.10 },
];

/**
 * Apply holographic glitch corruption to projected lines in-place.
 * @param {Array} lines — projected line segments [{x1,y1,x2,y2,c}]
 * @param {number} damageLevel — 1 (damaged) or 2 (critical)
 * @param {number} time — current time in ms (e.g. performance.now())
 */
export function applyHoloGlitch(lines, damageLevel, time) {
  const level = Math.min(damageLevel, 2);
  const p = PARAMS[level];
  if (!p || lines.length === 0) return;

  // Compute model center Y from lines
  let minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.y1 < minY) minY = l.y1;
    if (l.y2 < minY) minY = l.y2;
    if (l.y1 > maxY) maxY = l.y1;
    if (l.y2 > maxY) maxY = l.y2;
  }
  const centerY = (minY + maxY) * 0.5;

  // Quantize time into glitch frames
  const frame = Math.floor(time / p.holdMs);
  const rng = mulberry32(frame * 7919 + level * 131);

  // Generate bands near model center (within ±25px)
  const bandCount = p.bandMin + Math.floor(rng() * (p.bandMax - p.bandMin + 1));
  const bands = [];
  for (let i = 0; i < bandCount; i++) {
    const bandY = centerY + (rng() - 0.5) * 50; // ±25px
    const height = p.heightMin + rng() * (p.heightMax - p.heightMin);
    const offset = (rng() - 0.5) * 2 * p.dispMax;
    const clampedOff = offset > 0
      ? Math.max(p.dispMin, Math.min(p.dispMax, offset))
      : Math.min(-p.dispMin, Math.max(-p.dispMax, offset));
    bands.push({ top: bandY - height * 0.5, bot: bandY + height * 0.5, dx: clampedOff });
  }

  // Process lines in reverse so splicing doesn't shift indices
  for (let i = lines.length - 1; i >= 0; i--) {
    const l = lines[i];
    const midY = (l.y1 + l.y2) * 0.5;

    for (let b = 0; b < bands.length; b++) {
      if (midY >= bands[b].top && midY <= bands[b].bot) {
        // Line is in a glitch band — skip or displace
        if (rng() < p.skipChance) {
          lines.splice(i, 1);
        } else {
          l.x1 += bands[b].dx;
          l.x2 += bands[b].dx;
        }
        break;
      }
    }
  }
}
