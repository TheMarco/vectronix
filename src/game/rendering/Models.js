/**
 * 3D wireframe model definitions.
 * Each model is an array of line segments: { from: [x,y,z], to: [x,y,z] }
 * Coordinates are in local space, centered on (0,0,0).
 * Scale is applied during projection.
 *
 * Design principle: Silhouette clarity is king.
 * Fewer lines > more lines. Readable at a glance > detail.
 * These are small 3D wire sculptures, not detailed meshes.
 */

// ─── PLAYER SHIP ───
// Sci-fi fighter: tall nose spike, elongated fuselage, swept wings, twin engine nacelles, cockpit canopy.
export const PLAYER_SHIP = [
  // ── Nose spike ──
  { from: [0, -14, -1.5], to: [-2, -9, 0] },
  { from: [0, -14, -1.5], to: [2, -9, 0] },

  // ── Fuselage (elongated central body) ──
  // Upper fuselage: nose base widens to shoulders
  { from: [-2, -9, 0], to: [-3, -3, 0.3] },
  { from: [2, -9, 0], to: [3, -3, 0.3] },
  // Mid fuselage: parallel sides
  { from: [-3, -3, 0.3], to: [-3, 3, 0.3] },
  { from: [3, -3, 0.3], to: [3, 3, 0.3] },
  // Lower fuselage: taper to tail
  { from: [-3, 3, 0.3], to: [-1.5, 7, 0] },
  { from: [3, 3, 0.3], to: [1.5, 7, 0] },
  // Tail bar
  { from: [-1.5, 7, 0], to: [1.5, 7, 0] },

  // ── Cockpit canopy (secondary color — pink/magenta) ──
  { from: [0, -6, -0.5], to: [-1.5, -4, -0.5], c: 1 },
  { from: [0, -6, -0.5], to: [1.5, -4, -0.5], c: 1 },
  { from: [-1.5, -4, -0.5], to: [-1, -2.5, -0.5], c: 1 },
  { from: [1.5, -4, -0.5], to: [1, -2.5, -0.5], c: 1 },
  { from: [-1, -2.5, -0.5], to: [1, -2.5, -0.5], c: 1 },

  // ── Wings ──
  // Wing sweep out from fuselage shoulder
  { from: [-3, -2, 0.5], to: [-11, 3, 1.5] },
  { from: [3, -2, 0.5], to: [11, 3, 1.5] },
  // Wing step (notch inward)
  { from: [-11, 3, 1.5], to: [-9, 5, 1] },
  { from: [11, 3, 1.5], to: [9, 5, 1] },
  // Wing trailing edge to nacelle outer wall
  { from: [-9, 5, 1], to: [-6.5, 3, 0.5] },
  { from: [9, 5, 1], to: [6.5, 3, 0.5] },

  // ── Engine nacelles (twin rectangular pods) ──
  // Left nacelle
  { from: [-4.5, 2, 0.5], to: [-6.5, 2, 0.5] },
  { from: [-6.5, 2, 0.5], to: [-6.5, 9, 0.5] },
  { from: [-6.5, 9, 0.5], to: [-4.5, 9, 0.5] },
  { from: [-4.5, 9, 0.5], to: [-4.5, 2, 0.5] },
  // Right nacelle
  { from: [4.5, 2, 0.5], to: [6.5, 2, 0.5] },
  { from: [6.5, 2, 0.5], to: [6.5, 9, 0.5] },
  { from: [6.5, 9, 0.5], to: [4.5, 9, 0.5] },
  { from: [4.5, 9, 0.5], to: [4.5, 2, 0.5] },
];

// ─── GRUNT ───
// Moth/butterfly with curved antennae, upper+lower wings, body spine.
export const GRUNT = [
  // Antennae (curved tips)
  { from: [0, -6, 0], to: [-3, -9, -0.5] },
  { from: [-3, -9, -0.5], to: [-5, -8, -0.5], c: 1 },
  { from: [0, -6, 0], to: [3, -9, -0.5] },
  { from: [3, -9, -0.5], to: [5, -8, -0.5], c: 1 },
  // Body spine
  { from: [0, -6, 0], to: [0, 6, 0] },
  // Upper wings (rounded moth wings)
  { from: [0, -3, 0], to: [-8, -6, 1] },
  { from: [-8, -6, 1], to: [-9, 0, 1.5] },
  { from: [-9, 0, 1.5], to: [0, 0, 0] },
  { from: [0, -3, 0], to: [8, -6, 1] },
  { from: [8, -6, 1], to: [9, 0, 1.5] },
  { from: [9, 0, 1.5], to: [0, 0, 0] },
  // Wing eye spots (inner triangles)
  { from: [-5, -3, 0.8], to: [-6, -1, 0.8], c: 1 },
  { from: [-6, -1, 0.8], to: [-4, -1, 0.8], c: 1 },
  { from: [5, -3, 0.8], to: [6, -1, 0.8], c: 1 },
  { from: [6, -1, 0.8], to: [4, -1, 0.8], c: 1 },
  // Lower wings (smaller, pointed)
  { from: [0, 2, 0], to: [-6, 5, 1], c: 1 },
  { from: [-6, 5, 1], to: [0, 5, 0], c: 1 },
  { from: [0, 2, 0], to: [6, 5, 1], c: 1 },
  { from: [6, 5, 1], to: [0, 5, 0], c: 1 },
];

// ─── ATTACKER ───
// Wasp/hornet: segmented body, pinched waist, angular wings, stinger.
export const ATTACKER = [
  // Head (angular)
  { from: [0, -8, -0.5], to: [-3, -5, 0] },
  { from: [0, -8, -0.5], to: [3, -5, 0] },
  // Mandibles
  { from: [-3, -5, 0], to: [-5, -7, 0.5], c: 1 },
  { from: [3, -5, 0], to: [5, -7, 0.5], c: 1 },
  // Thorax
  { from: [-3, -5, 0], to: [3, -5, 0] },
  { from: [-3, -5, 0], to: [-3, -1, 0] },
  { from: [3, -5, 0], to: [3, -1, 0] },
  // Waist (pinched)
  { from: [-3, -1, 0], to: [-1, 1, 0] },
  { from: [3, -1, 0], to: [1, 1, 0] },
  // Abdomen
  { from: [-1, 1, 0], to: [-3, 5, 0] },
  { from: [1, 1, 0], to: [3, 5, 0] },
  // Stinger
  { from: [-3, 5, 0], to: [0, 8, 0.5] },
  { from: [3, 5, 0], to: [0, 8, 0.5] },
  // Wings (swept angular)
  { from: [-3, -3, 0], to: [-10, -6, 1.5], c: 1 },
  { from: [-10, -6, 1.5], to: [-8, 0, 1], c: 1 },
  { from: [-8, 0, 1], to: [-3, -1, 0], c: 1 },
  { from: [3, -3, 0], to: [10, -6, 1.5], c: 1 },
  { from: [10, -6, 1.5], to: [8, 0, 1], c: 1 },
  { from: [8, 0, 1], to: [3, -1, 0], c: 1 },
];

// ─── COMMANDER ───
// Robotic armored figure: rounded dome helmet, wide angular shoulders, vent panels, Y-split legs.
export const COMMANDER = [
  // Dome helmet (accent)
  { from: [-3, -10, -0.5], to: [-1, -12, -1], c: 1 },
  { from: [-1, -12, -1], to: [1, -12, -1], c: 1 },
  { from: [1, -12, -1], to: [3, -10, -0.5], c: 1 },
  // Dome base
  { from: [-3, -10, -0.5], to: [3, -10, -0.5] },
  // Neck
  { from: [-2, -10, -0.5], to: [-2, -8, 0] },
  { from: [2, -10, -0.5], to: [2, -8, 0] },
  // Wide angular shoulders
  { from: [-2, -8, 0], to: [-10, -7, 1] },
  { from: [2, -8, 0], to: [10, -7, 1] },
  // Shoulder drops
  { from: [-10, -7, 1], to: [-9, -3, 0.5] },
  { from: [10, -7, 1], to: [9, -3, 0.5] },
  // Vent panels on shoulders (accent)
  { from: [-8, -7, 0.8], to: [-8, -4, 0.5], c: 1 },
  { from: [-6, -7, 0.6], to: [-6, -4, 0.3], c: 1 },
  { from: [8, -7, 0.8], to: [8, -4, 0.5], c: 1 },
  { from: [6, -7, 0.6], to: [6, -4, 0.3], c: 1 },
  // Torso (narrowing)
  { from: [-9, -3, 0.5], to: [-5, 2, 0] },
  { from: [9, -3, 0.5], to: [5, 2, 0] },
  // Center seam (accent)
  { from: [0, -8, -0.3], to: [0, 2, -0.3], c: 1 },
  // Waist bar
  { from: [-5, 2, 0], to: [5, 2, 0] },
  // Y-split legs
  { from: [-5, 2, 0], to: [-6, 8, 0.5] },
  { from: [5, 2, 0], to: [6, 8, 0.5] },
  // Center V (accent)
  { from: [0, 2, -0.3], to: [-2, 7, 0.3], c: 1 },
  { from: [0, 2, -0.3], to: [2, 7, 0.3], c: 1 },
];

// ─── SPINNER ───
// Vortex pinwheel: nested offset diamonds with spiral connections and outward spikes.
export const SPINNER = [
  // Outer diamond (z-alternating for 3D wobble)
  { from: [0, -8, 1.5], to: [8, 0, -1.5] },
  { from: [8, 0, -1.5], to: [0, 8, 1.5] },
  { from: [0, 8, 1.5], to: [-8, 0, -1.5] },
  { from: [-8, 0, -1.5], to: [0, -8, 1.5] },
  // Inner diamond (accent, rotated ~30°)
  { from: [2, -3.5, -0.5], to: [3.5, 2, 0.5], c: 1 },
  { from: [3.5, 2, 0.5], to: [-2, 3.5, -0.5], c: 1 },
  { from: [-2, 3.5, -0.5], to: [-3.5, -2, 0.5], c: 1 },
  { from: [-3.5, -2, 0.5], to: [2, -3.5, -0.5], c: 1 },
  // Vortex spokes: outer corners → offset inner corners (creates spiral)
  { from: [0, -8, 1.5], to: [2, -3.5, -0.5], c: 1 },
  { from: [8, 0, -1.5], to: [3.5, 2, 0.5], c: 1 },
  { from: [0, 8, 1.5], to: [-2, 3.5, -0.5], c: 1 },
  { from: [-8, 0, -1.5], to: [-3.5, -2, 0.5], c: 1 },
  // Outer spikes (tangent to spin direction)
  { from: [0, -8, 1.5], to: [3, -11, 2] },
  { from: [8, 0, -1.5], to: [11, 3, -2] },
  { from: [0, 8, 1.5], to: [-3, 11, 2] },
  { from: [-8, 0, -1.5], to: [-11, -3, -2] },
];

// ─── BOMBER ───
// Armored angular craft: flat head plate, upward horns, side armor, cockpit window.
export const BOMBER = [
  // Head plate (flat angular top)
  { from: [-5, -6, -0.5], to: [5, -6, -0.5] },
  // Body (angular, widening then tapering)
  { from: [-5, -6, -0.5], to: [-7, -1, 0.5] },
  { from: [5, -6, -0.5], to: [7, -1, 0.5] },
  { from: [-7, -1, 0.5], to: [-6, 4, 0.3] },
  { from: [7, -1, 0.5], to: [6, 4, 0.3] },
  { from: [-6, 4, 0.3], to: [0, 7, 0] },
  { from: [6, 4, 0.3], to: [0, 7, 0] },
  // Center seam
  { from: [0, -6, -0.5], to: [0, 7, 0] },
  // Horns
  { from: [-4, -6, -0.5], to: [-5, -11, -1.5], c: 1 },
  { from: [-5, -11, -1.5], to: [-3, -10, -1], c: 1 },
  { from: [4, -6, -0.5], to: [5, -11, -1.5], c: 1 },
  { from: [5, -11, -1.5], to: [3, -10, -1], c: 1 },
  // Side armor plates
  { from: [-7, -1, 0.5], to: [-10, 0, 1.5], c: 1 },
  { from: [-10, 0, 1.5], to: [-10, 3, 1.5], c: 1 },
  { from: [-10, 3, 1.5], to: [-6, 4, 0.3], c: 1 },
  { from: [7, -1, 0.5], to: [10, 0, 1.5], c: 1 },
  { from: [10, 0, 1.5], to: [10, 3, 1.5], c: 1 },
  { from: [10, 3, 1.5], to: [6, 4, 0.3], c: 1 },
  // Cockpit window
  { from: [-2, -3, -0.3], to: [2, -3, -0.3], c: 1 },
  { from: [2, -3, -0.3], to: [2, 1, -0.3], c: 1 },
  { from: [2, 1, -0.3], to: [-2, 1, -0.3], c: 1 },
  { from: [-2, 1, -0.3], to: [-2, -3, -0.3], c: 1 },
];

// ─── GUARDIAN ───
// Triple crystal: three diamonds in Y-formation, connected at center junction, inner cores.
export const GUARDIAN = [
  // Upper-left diamond (outer)
  { from: [-3, -5, -1], to: [-8, -10, 0.5] },
  { from: [-8, -10, 0.5], to: [-13, -5, -1] },
  { from: [-13, -5, -1], to: [-8, 0, 0.5] },
  { from: [-8, 0, 0.5], to: [-3, -5, -1] },
  // Upper-left diamond (inner core, accent)
  { from: [-6, -5, -0.3], to: [-8, -8, 0.3], c: 1 },
  { from: [-8, -8, 0.3], to: [-10, -5, -0.3], c: 1 },
  { from: [-10, -5, -0.3], to: [-8, -2, 0.3], c: 1 },
  { from: [-8, -2, 0.3], to: [-6, -5, -0.3], c: 1 },
  // Upper-right diamond (outer)
  { from: [3, -5, -1], to: [8, -10, 0.5] },
  { from: [8, -10, 0.5], to: [13, -5, -1] },
  { from: [13, -5, -1], to: [8, 0, 0.5] },
  { from: [8, 0, 0.5], to: [3, -5, -1] },
  // Upper-right diamond (inner core, accent)
  { from: [6, -5, -0.3], to: [8, -8, 0.3], c: 1 },
  { from: [8, -8, 0.3], to: [10, -5, -0.3], c: 1 },
  { from: [10, -5, -0.3], to: [8, -2, 0.3], c: 1 },
  { from: [8, -2, 0.3], to: [6, -5, -0.3], c: 1 },
  // Bottom diamond (outer)
  { from: [0, 2, -1], to: [5, 7, 0.5] },
  { from: [5, 7, 0.5], to: [0, 12, -1] },
  { from: [0, 12, -1], to: [-5, 7, 0.5] },
  { from: [-5, 7, 0.5], to: [0, 2, -1] },
  // Bottom diamond (inner core, accent)
  { from: [0, 4.5, -0.3], to: [2.5, 7, 0.3], c: 1 },
  { from: [2.5, 7, 0.3], to: [0, 9.5, -0.3], c: 1 },
  { from: [0, 9.5, -0.3], to: [-2.5, 7, 0.3], c: 1 },
  { from: [-2.5, 7, 0.3], to: [0, 4.5, -0.3], c: 1 },
  // Junction bars (connecting diamonds at center)
  { from: [-3, -5, -1], to: [0, 0, 0], c: 1 },
  { from: [3, -5, -1], to: [0, 0, 0], c: 1 },
  { from: [0, 2, -1], to: [0, 0, 0], c: 1 },
];

// ─── PHANTOM ───
// Jellyfish ghost: wide curved hood, glowing eyes, flowing tendrils.
export const PHANTOM = [
  // Wide hood (curved)
  { from: [0, -9, -1], to: [-4, -6, 0] },
  { from: [0, -9, -1], to: [4, -6, 0] },
  { from: [-4, -6, 0], to: [-7, -2, 0.5] },
  { from: [4, -6, 0], to: [7, -2, 0.5] },
  { from: [-7, -2, 0.5], to: [7, -2, 0.5] },
  // Eyes
  { from: [-3, -5, -0.5], to: [-1, -4, -0.5], c: 1 },
  { from: [1, -5, -0.5], to: [3, -4, -0.5], c: 1 },
  // Flowing body sides
  { from: [-7, -2, 0.5], to: [-6, 3, 0.5] },
  { from: [7, -2, 0.5], to: [6, 3, 0.5] },
  // Trailing tendrils (wavy zigzag)
  { from: [-6, 3, 0.5], to: [-4, 8, 1], c: 1 },
  { from: [-4, 8, 1], to: [-2, 4, 0.5], c: 1 },
  { from: [-2, 4, 0.5], to: [0, 9, 1], c: 1 },
  { from: [0, 9, 1], to: [2, 4, 0.5], c: 1 },
  { from: [2, 4, 0.5], to: [4, 8, 1], c: 1 },
  { from: [4, 8, 1], to: [6, 3, 0.5], c: 1 },
  // Center tendril
  { from: [0, -2, 0], to: [0, 10, 1], c: 1 },
];

// ─── SWARM ───
// Circular pod: octagonal shell, inner diamond ring, connecting struts.
export const SWARM = [
  // Octagonal outer shell
  { from: [-3, -7, 0], to: [3, -7, 0] },
  { from: [3, -7, 0], to: [7, -3, 0.5] },
  { from: [7, -3, 0.5], to: [7, 3, 0.5] },
  { from: [7, 3, 0.5], to: [3, 6, 0] },
  { from: [3, 6, 0], to: [-3, 6, 0] },
  { from: [-3, 6, 0], to: [-7, 3, 0.5] },
  { from: [-7, 3, 0.5], to: [-7, -3, 0.5] },
  { from: [-7, -3, 0.5], to: [-3, -7, 0] },
  // Inner diamond ring (accent)
  { from: [0, -3.5, -0.3], to: [3.5, 0, 0.3], c: 1 },
  { from: [3.5, 0, 0.3], to: [0, 3, -0.3], c: 1 },
  { from: [0, 3, -0.3], to: [-3.5, 0, 0.3], c: 1 },
  { from: [-3.5, 0, 0.3], to: [0, -3.5, -0.3], c: 1 },
  // Connecting struts (accent)
  { from: [0, -7, 0], to: [0, -3.5, -0.3], c: 1 },
  { from: [7, 0, 0.5], to: [3.5, 0, 0.3], c: 1 },
  { from: [0, 6, 0], to: [0, 3, -0.3], c: 1 },
  { from: [-7, 0, 0.5], to: [-3.5, 0, 0.3], c: 1 },
];

// ─── BOSS GALAGA ───
// Angular warship: twin crown peaks, wide diamond wings, central diamond, W-pattern tail.
export const BOSS_GALAGA = [
  // Twin crown peaks (accent)
  { from: [-4, -15, -1.5], to: [-7, -9, 0], c: 1 },
  { from: [-4, -15, -1.5], to: [-1, -9, -0.5], c: 1 },
  { from: [4, -15, -1.5], to: [7, -9, 0], c: 1 },
  { from: [4, -15, -1.5], to: [1, -9, -0.5], c: 1 },
  // Crown valley (accent)
  { from: [-1, -9, -0.5], to: [0, -11, -1], c: 1 },
  { from: [1, -9, -0.5], to: [0, -11, -1], c: 1 },
  // Crown base bars
  { from: [-7, -9, 0], to: [-1, -9, -0.5] },
  { from: [1, -9, -0.5], to: [7, -9, 0] },
  // Wide angular wings (diamond-shaped, pointed at sides)
  { from: [-7, -9, 0], to: [-15, -1, 2] },
  { from: [-15, -1, 2], to: [-7, 5, 0] },
  { from: [7, -9, 0], to: [15, -1, 2] },
  { from: [15, -1, 2], to: [7, 5, 0] },
  // Wing struts (accent)
  { from: [-7, -9, 0], to: [-14, 2, 1.5], c: 1 },
  { from: [7, -9, 0], to: [14, 2, 1.5], c: 1 },
  // Bottom W-pattern
  { from: [-7, 5, 0], to: [-3, 9, 0.5] },
  { from: [-3, 9, 0.5], to: [0, 5, 0] },
  { from: [0, 5, 0], to: [3, 9, 0.5] },
  { from: [3, 9, 0.5], to: [7, 5, 0] },
  // Central diamond (accent)
  { from: [0, -6, -0.5], to: [4, -1, -0.5], c: 1 },
  { from: [4, -1, -0.5], to: [0, 4, -0.5], c: 1 },
  { from: [0, 4, -0.5], to: [-4, -1, -0.5], c: 1 },
  { from: [-4, -1, -0.5], to: [0, -6, -0.5], c: 1 },
];

// ─── UFO SAUCER ───
// Flat flying saucer: wide disc with low bubble canopy, accent windows, bottom glow.
export const UFO_SAUCER = [
  // Wide disc body
  { from: [-16, 0, 0], to: [-12, -2, -0.3] },
  { from: [-12, -2, -0.3], to: [-5, -3, -0.5] },
  { from: [-5, -3, -0.5], to: [5, -3, -0.5] },
  { from: [5, -3, -0.5], to: [12, -2, -0.3] },
  { from: [12, -2, -0.3], to: [16, 0, 0] },
  { from: [16, 0, 0], to: [12, 2, 0.3] },
  { from: [12, 2, 0.3], to: [-12, 2, 0.3] },
  { from: [-12, 2, 0.3], to: [-16, 0, 0] },
  // Low bubble canopy
  { from: [-5, -3, -0.5], to: [-3, -5, -0.8] },
  { from: [-3, -5, -0.8], to: [3, -5, -0.8] },
  { from: [3, -5, -0.8], to: [5, -3, -0.5] },
  // Windows (accent color)
  { from: [-9, -1, 0], to: [-6, -1, 0], c: 1 },
  { from: [-2, -1, 0], to: [2, -1, 0], c: 1 },
  { from: [6, -1, 0], to: [9, -1, 0], c: 1 },
  // Bottom glow line (accent color)
  { from: [-12, 2, 0.3], to: [-6, 3.5, 0.6], c: 1 },
  { from: [-6, 3.5, 0.6], to: [6, 3.5, 0.6], c: 1 },
  { from: [6, 3.5, 0.6], to: [12, 2, 0.3], c: 1 },
];

// ─── PLAYER BULLET ───
// Simple upward line segment
export const PLAYER_BULLET = [
  { from: [0, -4, 0], to: [0, 4, 0] },
];

// ─── ENEMY BULLET ───
// Small diamond/dart shape
export const ENEMY_BULLET = [
  { from: [0, -3, 0], to: [1.5, 0, 0] },
  { from: [1.5, 0, 0], to: [0, 3, 0] },
  { from: [0, 3, 0], to: [-1.5, 0, 0] },
  { from: [-1.5, 0, 0], to: [0, -3, 0] },
];

// Model lookup by enemy type
export const ENEMY_MODELS = {
  grunt: GRUNT,
  attacker: ATTACKER,
  commander: COMMANDER,
  spinner: SPINNER,
  bomber: BOMBER,
  guardian: GUARDIAN,
  phantom: PHANTOM,
  swarm: SWARM,
  boss: BOSS_GALAGA,
};

// ═══════════════════════════════════════════════════════════
// DAMAGED MODEL VARIANTS (multi-hit enemies)
// ═══════════════════════════════════════════════════════════

// ─── BOMBER DAMAGED ───
// Full shape preserved but right side warped: buckled hull, bent horn, displaced armor plate.
const BOMBER_DAMAGED = [
  // Head plate (cracked — diagonal fracture splits it)
  { from: [-5, -6, -0.5], to: [1, -6, -0.5] },
  { from: [2, -5.5, -0.3], to: [5, -6, -0.5] },
  { from: [1, -6, -0.5], to: [2, -5.5, -0.3] },  // crack line
  // Left body (intact)
  { from: [-5, -6, -0.5], to: [-7, -1, 0.5] },
  { from: [-7, -1, 0.5], to: [-6, 4, 0.3] },
  { from: [-6, 4, 0.3], to: [0, 7, 0] },
  // Right body (buckled inward — vertices shifted)
  { from: [5, -6, -0.5], to: [5.5, -1, 0.3] },
  { from: [5.5, -1, 0.3], to: [5, 4, 0.5] },
  { from: [5, 4, 0.5], to: [0, 7, 0] },
  // Center seam (bent at impact point)
  { from: [0, -6, -0.5], to: [0.5, 0, 0] },
  { from: [0.5, 0, 0], to: [0, 7, 0] },
  // Left horn (intact)
  { from: [-4, -6, -0.5], to: [-5, -11, -1.5], c: 1 },
  { from: [-5, -11, -1.5], to: [-3, -10, -1], c: 1 },
  // Right horn (bent outward at wrong angle)
  { from: [4, -6, -0.5], to: [6.5, -10, -0.8], c: 1 },
  { from: [6.5, -10, -0.8], to: [5, -9, -0.5], c: 1 },
  // Left armor (intact)
  { from: [-7, -1, 0.5], to: [-10, 0, 1.5], c: 1 },
  { from: [-10, 0, 1.5], to: [-10, 3, 1.5], c: 1 },
  { from: [-10, 3, 1.5], to: [-6, 4, 0.3], c: 1 },
  // Right armor (displaced outward — separating from buckled hull)
  { from: [8, -1, 1.5], to: [11, 0.5, 2], c: 1 },
  { from: [11, 0.5, 2], to: [11, 3.5, 2], c: 1 },
  { from: [11, 3.5, 2], to: [7, 5, 1], c: 1 },
  // Cockpit window (skewed from impact)
  { from: [-2, -3, -0.3], to: [2.5, -2.5, -0.3], c: 1 },
  { from: [2.5, -2.5, -0.3], to: [2, 1, -0.3], c: 1 },
  { from: [2, 1, -0.3], to: [-2, 1, -0.3], c: 1 },
  { from: [-2, 1, -0.3], to: [-2, -3, -0.3], c: 1 },
];

// ─── COMMANDER DAMAGED ───
// Full shape preserved but distorted: dome cracked, right shoulder drooping, damage scar across torso.
const COMMANDER_DAMAGED = [
  // Dome helmet (accent — cracked with visible fracture)
  { from: [-3, -10, -0.5], to: [-1, -12, -1], c: 1 },
  { from: [-1, -12, -1], to: [0.5, -12, -1], c: 1 },
  { from: [0.5, -12, -1], to: [1, -11, -0.8], c: 1 },  // fracture jog
  { from: [1, -11, -0.8], to: [3, -10, -0.5], c: 1 },
  // Dome base
  { from: [-3, -10, -0.5], to: [3, -10, -0.5] },
  // Neck
  { from: [-2, -10, -0.5], to: [-2, -8, 0] },
  { from: [2, -10, -0.5], to: [2, -8, 0] },
  // Left shoulder (intact)
  { from: [-2, -8, 0], to: [-10, -7, 1] },
  { from: [-10, -7, 1], to: [-9, -3, 0.5] },
  // Right shoulder (drooping — displaced downward + outward)
  { from: [2, -8, 0], to: [11, -5, 1.5] },
  { from: [11, -5, 1.5], to: [10, -1, 1] },
  // Left vents (intact, accent)
  { from: [-8, -7, 0.8], to: [-8, -4, 0.5], c: 1 },
  { from: [-6, -7, 0.6], to: [-6, -4, 0.3], c: 1 },
  // Right vents (tilted/dangling from drooped shoulder, accent)
  { from: [9, -5, 1.2], to: [9.5, -2, 0.8], c: 1 },
  { from: [7, -5.5, 0.8], to: [7.5, -2.5, 0.5], c: 1 },
  // Torso (left intact, right connects to displaced shoulder)
  { from: [-9, -3, 0.5], to: [-5, 2, 0] },
  { from: [10, -1, 1], to: [5, 2, 0] },
  // Center seam (accent)
  { from: [0, -8, -0.3], to: [0, 2, -0.3], c: 1 },
  // Damage scar across chest (diagonal slash)
  { from: [-3, -1, 0], to: [4, 1, 0.3] },
  // Waist bar
  { from: [-5, 2, 0], to: [5, 2, 0] },
  // Left leg (intact)
  { from: [-5, 2, 0], to: [-6, 8, 0.5] },
  // Right leg (splayed outward at wrong angle)
  { from: [5, 2, 0], to: [7, 7, 0.8] },
  // Center V (accent — left intact, right bent)
  { from: [0, 2, -0.3], to: [-2, 7, 0.3], c: 1 },
  { from: [0, 2, -0.3], to: [1.5, 5, 0.2], c: 1 },
];

// ─── BOSS GALAGA DAMAGED ───
// Full shape but distorted: right crown bent, right wing compressed, diamond warped with fracture.
const BOSS_GALAGA_DAMAGED = [
  // Left crown peak intact (accent)
  { from: [-4, -15, -1.5], to: [-7, -9, 0], c: 1 },
  { from: [-4, -15, -1.5], to: [-1, -9, -0.5], c: 1 },
  // Right crown peak (bent sideways — twisted from impact, accent)
  { from: [5, -13, -1], to: [8, -9, 0.5], c: 1 },
  { from: [5, -13, -1], to: [2, -9, -0.3], c: 1 },
  // Crown valley (accent)
  { from: [-1, -9, -0.5], to: [0, -11, -1], c: 1 },
  { from: [1, -9, -0.5], to: [0, -11, -1], c: 1 },
  // Crown base bars
  { from: [-7, -9, 0], to: [-1, -9, -0.5] },
  { from: [1, -9, -0.5], to: [7, -9, 0] },
  // Left wing (intact)
  { from: [-7, -9, 0], to: [-15, -1, 2] },
  { from: [-15, -1, 2], to: [-7, 5, 0] },
  // Left wing strut (accent)
  { from: [-7, -9, 0], to: [-14, 2, 1.5], c: 1 },
  // Right wing (compressed inward — vertices pulled in)
  { from: [7, -9, 0], to: [12, -1, 1.5] },
  { from: [12, -1, 1.5], to: [6, 4, 0] },
  // Right wing strut (bent, accent)
  { from: [7, -9, 0], to: [11, 1, 1], c: 1 },
  // Bottom W-pattern (right side warped)
  { from: [-7, 5, 0], to: [-3, 9, 0.5] },
  { from: [-3, 9, 0.5], to: [0, 5, 0] },
  { from: [0, 5, 0], to: [3.5, 8.5, 0.5] },
  { from: [3.5, 8.5, 0.5], to: [6, 4, 0] },
  // Central diamond (warped — right vertex displaced, accent)
  { from: [0, -6, -0.5], to: [5, -0.5, -0.3], c: 1 },
  { from: [5, -0.5, -0.3], to: [0, 4, -0.5], c: 1 },
  { from: [0, 4, -0.5], to: [-4, -1, -0.5], c: 1 },
  { from: [-4, -1, -0.5], to: [0, -6, -0.5], c: 1 },
  // Fracture line through diamond
  { from: [-2, -3.5, -0.5], to: [3, 1.5, -0.4] },
];

// ─── GUARDIAN DAMAGED ───
// Upper-right diamond displaced (+2,-1) from formation — drifting away. Fracture at break point.
const GUARDIAN_DAMAGED = [
  // Upper-left diamond (outer — intact)
  { from: [-3, -5, -1], to: [-8, -10, 0.5] },
  { from: [-8, -10, 0.5], to: [-13, -5, -1] },
  { from: [-13, -5, -1], to: [-8, 0, 0.5] },
  { from: [-8, 0, 0.5], to: [-3, -5, -1] },
  // Upper-left inner core (accent — intact)
  { from: [-6, -5, -0.3], to: [-8, -8, 0.3], c: 1 },
  { from: [-8, -8, 0.3], to: [-10, -5, -0.3], c: 1 },
  { from: [-10, -5, -0.3], to: [-8, -2, 0.3], c: 1 },
  { from: [-8, -2, 0.3], to: [-6, -5, -0.3], c: 1 },
  // Upper-right diamond (outer — DISPLACED +2,-1, bottom edge cracked)
  { from: [5, -6, -1], to: [10, -11, 0.5] },
  { from: [10, -11, 0.5], to: [15, -6, -1] },
  { from: [15, -6, -1], to: [10, -1, 0.5] },
  // bottom edge: stub (doesn't close cleanly)
  { from: [6, -4, -0.5], to: [5, -6, -1] },
  // Upper-right inner core (accent — displaced, slightly warped)
  { from: [8, -6, -0.3], to: [10, -9, 0.3], c: 1 },
  { from: [10, -9, 0.3], to: [12, -6, -0.3], c: 1 },
  { from: [12, -6, -0.3], to: [10, -3, 0.3], c: 1 },
  { from: [10, -3, 0.3], to: [8, -6, -0.3], c: 1 },
  // Bottom diamond (outer — intact)
  { from: [0, 2, -1], to: [5, 7, 0.5] },
  { from: [5, 7, 0.5], to: [0, 12, -1] },
  { from: [0, 12, -1], to: [-5, 7, 0.5] },
  { from: [-5, 7, 0.5], to: [0, 2, -1] },
  // Bottom inner core (accent — intact)
  { from: [0, 4.5, -0.3], to: [2.5, 7, 0.3], c: 1 },
  { from: [2.5, 7, 0.3], to: [0, 9.5, -0.3], c: 1 },
  { from: [0, 9.5, -0.3], to: [-2.5, 7, 0.3], c: 1 },
  { from: [-2.5, 7, 0.3], to: [0, 4.5, -0.3], c: 1 },
  // Left junction (intact)
  { from: [-3, -5, -1], to: [0, 0, 0], c: 1 },
  // Right junction (broken — ends short, gap before center)
  { from: [5, -6, -1], to: [2, -2, -0.5], c: 1 },
  // Bottom junction (intact)
  { from: [0, 2, -1], to: [0, 0, 0], c: 1 },
  // Fracture mark at break point
  { from: [10, -1, 0.5], to: [6, -4, -0.5] },
];

// ─── GUARDIAN CRITICAL ───
// Upper-right diamond heavily displaced (+4,-2) and fragmenting. Upper-left cracking. Cores still glow.
const GUARDIAN_CRITICAL = [
  // Upper-left diamond (outer — cracking, one edge broken)
  { from: [-4, -5, -1], to: [-9, -10, 0.5] },
  { from: [-9, -10, 0.5], to: [-14, -5, -1] },
  { from: [-14, -5, -1], to: [-9, 0, 0.5] },
  // bottom edge broken — stub
  { from: [-6, -3, -0.5], to: [-4, -5, -1] },
  // Upper-left inner core (accent — still glowing)
  { from: [-7, -5, -0.3], to: [-9, -8, 0.3], c: 1 },
  { from: [-9, -8, 0.3], to: [-11, -5, -0.3], c: 1 },
  { from: [-11, -5, -0.3], to: [-9, -2, 0.3], c: 1 },
  { from: [-9, -2, 0.3], to: [-7, -5, -0.3], c: 1 },
  // Upper-right diamond (heavily displaced +4,-2 — fragmenting, only 2 outer sides)
  { from: [7, -7, -1], to: [12, -12, 0.5] },
  { from: [12, -12, 0.5], to: [17, -7, -1] },
  // Upper-right inner core fragment (accent — distorted, 2 sides only)
  { from: [10, -7, -0.3], to: [12, -10, 0.3], c: 1 },
  { from: [12, -10, 0.3], to: [14, -7, -0.3], c: 1 },
  // Bottom diamond (outer — intact but stressed)
  { from: [0, 2, -1], to: [5, 7, 0.5] },
  { from: [5, 7, 0.5], to: [0, 12, -1] },
  { from: [0, 12, -1], to: [-5, 7, 0.5] },
  { from: [-5, 7, 0.5], to: [0, 2, -1] },
  // Bottom inner core (accent — intact)
  { from: [0, 4.5, -0.3], to: [2.5, 7, 0.3], c: 1 },
  { from: [2.5, 7, 0.3], to: [0, 9.5, -0.3], c: 1 },
  { from: [0, 9.5, -0.3], to: [-2.5, 7, 0.3], c: 1 },
  { from: [-2.5, 7, 0.3], to: [0, 4.5, -0.3], c: 1 },
  // Junction stubs (all broken short)
  { from: [-4, -5, -1], to: [-2, -2.5, -0.5], c: 1 },
  { from: [0, 2, -1], to: [0, 0.5, -0.5], c: 1 },
];

// Damaged model lookup: { type: [damageLevel1Model, damageLevel2Model, ...] }
export const ENEMY_MODELS_DAMAGED = {
  bomber: [BOMBER_DAMAGED],
  commander: [COMMANDER_DAMAGED],
  boss: [BOSS_GALAGA_DAMAGED],
  guardian: [GUARDIAN_DAMAGED, GUARDIAN_CRITICAL],
};
