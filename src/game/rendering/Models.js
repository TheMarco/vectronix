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
// Detailed vector fighter with center fin, inner chevron, and stepped wings.
export const PLAYER_SHIP = [
  // Center fin (tall spike)
  { from: [0, -13, -1.5], to: [-2.5, -7, 0] },
  { from: [0, -13, -1.5], to: [2.5, -7, 0] },
  // Upper hull: fin base to wing roots
  { from: [-2.5, -7, 0], to: [-5, -1, 0.5] },
  { from: [2.5, -7, 0], to: [5, -1, 0.5] },
  // Inner chevron upper (V pointing down from fin base)
  { from: [-2.5, -7, 0], to: [0, -3, -0.5] },
  { from: [2.5, -7, 0], to: [0, -3, -0.5] },
  // Inner chevron lower (arms spreading out)
  { from: [0, -3, -0.5], to: [-4, 2, 0] },
  { from: [0, -3, -0.5], to: [4, 2, 0] },
  // Body edges: wing root to chevron outer
  { from: [-5, -1, 0.5], to: [-4, 2, 0] },
  { from: [5, -1, 0.5], to: [4, 2, 0] },
  // Wing sweep out
  { from: [-5, -1, 0.5], to: [-12, 3, 1.5] },
  { from: [5, -1, 0.5], to: [12, 3, 1.5] },
  // Wing step (notch inward)
  { from: [-12, 3, 1.5], to: [-9, 5, 1] },
  { from: [12, 3, 1.5], to: [9, 5, 1] },
  // Wing trailing edge to body rear
  { from: [-9, 5, 1], to: [-5, 7, 0.5] },
  { from: [9, 5, 1], to: [5, 7, 0.5] },
  // Body side panels
  { from: [-4, 2, 0], to: [-5, 7, 0.5] },
  { from: [4, 2, 0], to: [5, 7, 0.5] },
  // Rear converge to engine
  { from: [-5, 7, 0.5], to: [-3, 8, 0] },
  { from: [5, 7, 0.5], to: [3, 8, 0] },
  // Engine bar
  { from: [-3, 8, 0], to: [3, 8, 0] },
];

// ─── GRUNT ───
// Moth/butterfly with curved antennae, upper+lower wings, body spine.
export const GRUNT = [
  // Antennae (curved tips)
  { from: [0, -6, 0], to: [-3, -9, -0.5] },
  { from: [-3, -9, -0.5], to: [-5, -8, -0.5] },
  { from: [0, -6, 0], to: [3, -9, -0.5] },
  { from: [3, -9, -0.5], to: [5, -8, -0.5] },
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
  { from: [-5, -3, 0.8], to: [-6, -1, 0.8] },
  { from: [-6, -1, 0.8], to: [-4, -1, 0.8] },
  { from: [5, -3, 0.8], to: [6, -1, 0.8] },
  { from: [6, -1, 0.8], to: [4, -1, 0.8] },
  // Lower wings (smaller, pointed)
  { from: [0, 2, 0], to: [-6, 5, 1] },
  { from: [-6, 5, 1], to: [0, 5, 0] },
  { from: [0, 2, 0], to: [6, 5, 1] },
  { from: [6, 5, 1], to: [0, 5, 0] },
];

// ─── ATTACKER ───
// Wasp/hornet: segmented body, pinched waist, angular wings, stinger.
export const ATTACKER = [
  // Head (angular)
  { from: [0, -8, -0.5], to: [-3, -5, 0] },
  { from: [0, -8, -0.5], to: [3, -5, 0] },
  // Mandibles
  { from: [-3, -5, 0], to: [-5, -7, 0.5] },
  { from: [3, -5, 0], to: [5, -7, 0.5] },
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
  { from: [-3, -3, 0], to: [-10, -6, 1.5] },
  { from: [-10, -6, 1.5], to: [-8, 0, 1] },
  { from: [-8, 0, 1], to: [-3, -1, 0] },
  { from: [3, -3, 0], to: [10, -6, 1.5] },
  { from: [10, -6, 1.5], to: [8, 0, 1] },
  { from: [8, 0, 1], to: [3, -1, 0] },
];

// ─── COMMANDER ───
// Regal squid/crown: triple crown spikes, domed head, wide wings, trailing tentacles.
export const COMMANDER = [
  // Crown (three spikes, W-shape)
  { from: [-6, -10, -1], to: [0, -13, -1.5] },
  { from: [0, -13, -1.5], to: [6, -10, -1] },
  { from: [-6, -10, -1], to: [-3, -7, 0] },
  { from: [6, -10, -1], to: [3, -7, 0] },
  { from: [0, -13, -1.5], to: [0, -7, -0.5] },
  // Head dome
  { from: [-3, -7, 0], to: [3, -7, 0] },
  { from: [-3, -7, 0], to: [-5, -3, 0] },
  { from: [3, -7, 0], to: [5, -3, 0] },
  // Body
  { from: [-5, -3, 0], to: [-4, 2, 0] },
  { from: [5, -3, 0], to: [4, 2, 0] },
  // Wide ornate wings
  { from: [-5, -3, 0], to: [-12, -5, 2] },
  { from: [-12, -5, 2], to: [-12, 1, 1.5] },
  { from: [-12, 1, 1.5], to: [-4, 2, 0] },
  { from: [5, -3, 0], to: [12, -5, 2] },
  { from: [12, -5, 2], to: [12, 1, 1.5] },
  { from: [12, 1, 1.5], to: [4, 2, 0] },
  // Trailing tentacles
  { from: [-4, 2, 0], to: [-3, 7, 0.5] },
  { from: [4, 2, 0], to: [3, 7, 0.5] },
  { from: [0, -7, -0.5], to: [0, 5, 0] },
  { from: [-2, 2, 0], to: [-1, 6, 0.5] },
  { from: [2, 2, 0], to: [1, 6, 0.5] },
];

// ─── SPINNER ───
// 6-spoke gear wheel: hexagonal hub, 6 radial spokes, outer hex ring. Z-alternation for 3D spin.
export const SPINNER = [
  // Inner hexagon hub
  { from: [0, -2.5, 0], to: [2.2, -1.25, 0] },
  { from: [2.2, -1.25, 0], to: [2.2, 1.25, 0] },
  { from: [2.2, 1.25, 0], to: [0, 2.5, 0] },
  { from: [0, 2.5, 0], to: [-2.2, 1.25, 0] },
  { from: [-2.2, 1.25, 0], to: [-2.2, -1.25, 0] },
  { from: [-2.2, -1.25, 0], to: [0, -2.5, 0] },
  // 6 spokes (alternating Z for 3D wobble when spinning)
  { from: [0, -2.5, 0], to: [0, -8, 1] },
  { from: [2.2, -1.25, 0], to: [7, -4, -1] },
  { from: [2.2, 1.25, 0], to: [7, 4, 1] },
  { from: [0, 2.5, 0], to: [0, 8, -1] },
  { from: [-2.2, 1.25, 0], to: [-7, 4, 1] },
  { from: [-2.2, -1.25, 0], to: [-7, -4, -1] },
  // Outer hexagon ring (connects spoke tips)
  { from: [0, -8, 1], to: [7, -4, -1] },
  { from: [7, -4, -1], to: [7, 4, 1] },
  { from: [7, 4, 1], to: [0, 8, -1] },
  { from: [0, 8, -1], to: [-7, 4, 1] },
  { from: [-7, 4, 1], to: [-7, -4, -1] },
  { from: [-7, -4, -1], to: [0, -8, 1] },
];

// ─── BOMBER ───
// Heavy beetle: rounded shell, head pincers, center seam, side armor plates.
export const BOMBER = [
  // Shell outline (rounded)
  { from: [0, -8, -1], to: [5, -6, 0] },
  { from: [5, -6, 0], to: [7, -1, 0.5] },
  { from: [7, -1, 0.5], to: [6, 4, 0] },
  { from: [6, 4, 0], to: [0, 7, 0] },
  { from: [0, 7, 0], to: [-6, 4, 0] },
  { from: [-6, 4, 0], to: [-7, -1, 0.5] },
  { from: [-7, -1, 0.5], to: [-5, -6, 0] },
  { from: [-5, -6, 0], to: [0, -8, -1] },
  // Shell seam (center line)
  { from: [0, -8, -1], to: [0, 7, 0] },
  // Head pincers
  { from: [-5, -6, 0], to: [-3, -10, -1] },
  { from: [5, -6, 0], to: [3, -10, -1] },
  { from: [-3, -10, -1], to: [3, -10, -1] },
  // Side armor plates
  { from: [-7, -1, 0.5], to: [-10, 0, 1.5] },
  { from: [-10, 0, 1.5], to: [-10, 3, 1.5] },
  { from: [-10, 3, 1.5], to: [-6, 4, 0] },
  { from: [7, -1, 0.5], to: [10, 0, 1.5] },
  { from: [10, 0, 1.5], to: [10, 3, 1.5] },
  { from: [10, 3, 1.5], to: [6, 4, 0] },
];

// ─── GUARDIAN ───
// Diamond crystal fortress: nested diamonds with cross-braces and center cross.
export const GUARDIAN = [
  // Outer diamond
  { from: [0, -11, -1], to: [9, 0, 0.5] },
  { from: [9, 0, 0.5], to: [0, 11, -1] },
  { from: [0, 11, -1], to: [-9, 0, 0.5] },
  { from: [-9, 0, 0.5], to: [0, -11, -1] },
  // Inner diamond
  { from: [0, -6, 0], to: [5, 0, 0] },
  { from: [5, 0, 0], to: [0, 6, 0] },
  { from: [0, 6, 0], to: [-5, 0, 0] },
  { from: [-5, 0, 0], to: [0, -6, 0] },
  // Cross-braces (inner to outer)
  { from: [0, -6, 0], to: [0, -11, -1] },
  { from: [5, 0, 0], to: [9, 0, 0.5] },
  { from: [0, 6, 0], to: [0, 11, -1] },
  { from: [-5, 0, 0], to: [-9, 0, 0.5] },
  // Center cross
  { from: [-5, 0, 0], to: [5, 0, 0] },
  { from: [0, -6, 0], to: [0, 6, 0] },
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
  { from: [-3, -5, -0.5], to: [-1, -4, -0.5] },
  { from: [1, -5, -0.5], to: [3, -4, -0.5] },
  // Flowing body sides
  { from: [-7, -2, 0.5], to: [-6, 3, 0.5] },
  { from: [7, -2, 0.5], to: [6, 3, 0.5] },
  // Trailing tendrils (wavy zigzag)
  { from: [-6, 3, 0.5], to: [-4, 8, 1] },
  { from: [-4, 8, 1], to: [-2, 4, 0.5] },
  { from: [-2, 4, 0.5], to: [0, 9, 1] },
  { from: [0, 9, 1], to: [2, 4, 0.5] },
  { from: [2, 4, 0.5], to: [4, 8, 1] },
  { from: [4, 8, 1], to: [6, 3, 0.5] },
  // Center tendril
  { from: [0, -2, 0], to: [0, 10, 1] },
];

// ─── SWARM ───
// Small spider/ant: compact body, angular legs, antennae.
export const SWARM = [
  // Head
  { from: [0, -6, 0], to: [-2, -3, 0.3] },
  { from: [0, -6, 0], to: [2, -3, 0.3] },
  // Antennae
  { from: [0, -6, 0], to: [-3, -8, -0.5] },
  { from: [0, -6, 0], to: [3, -8, -0.5] },
  // Body
  { from: [-2, -3, 0.3], to: [-3, 1, 0.3] },
  { from: [2, -3, 0.3], to: [3, 1, 0.3] },
  { from: [-3, 1, 0.3], to: [0, 4, 0] },
  { from: [3, 1, 0.3], to: [0, 4, 0] },
  // Legs (angular, splayed)
  { from: [-2, -1, 0.3], to: [-6, -4, 1] },
  { from: [-3, 1, 0.3], to: [-6, 3, 1] },
  { from: [2, -1, 0.3], to: [6, -4, 1] },
  { from: [3, 1, 0.3], to: [6, 3, 1] },
];

// ─── BOSS GALAGA ───
// Grand warship: double crown, massive wings with inner struts, imposing tail, center spine.
export const BOSS_GALAGA = [
  // Double crown (outer W-shape)
  { from: [-8, -14, -1.5], to: [-4, -11, -1] },
  { from: [-4, -11, -1], to: [0, -16, -2] },
  { from: [0, -16, -2], to: [4, -11, -1] },
  { from: [4, -11, -1], to: [8, -14, -1.5] },
  // Inner crown
  { from: [-5, -12, -1], to: [0, -14, -1.5] },
  { from: [0, -14, -1.5], to: [5, -12, -1] },
  // Crown to head
  { from: [-8, -14, -1.5], to: [-6, -8, 0] },
  { from: [8, -14, -1.5], to: [6, -8, 0] },
  // Head
  { from: [-6, -8, 0], to: [6, -8, 0] },
  // Body
  { from: [-6, -8, 0], to: [-7, -1, 0] },
  { from: [6, -8, 0], to: [7, -1, 0] },
  // Wide wings
  { from: [-7, -5, 0], to: [-15, -7, 2.5] },
  { from: [-15, -7, 2.5], to: [-15, 1, 2] },
  { from: [-15, 1, 2], to: [-7, -1, 0] },
  { from: [7, -5, 0], to: [15, -7, 2.5] },
  { from: [15, -7, 2.5], to: [15, 1, 2] },
  { from: [15, 1, 2], to: [7, -1, 0] },
  // Wing inner struts
  { from: [-7, -5, 0], to: [-14, -1, 2] },
  { from: [7, -5, 0], to: [14, -1, 2] },
  // Tail
  { from: [-7, -1, 0], to: [-5, 6, 0.5] },
  { from: [7, -1, 0], to: [5, 6, 0.5] },
  { from: [-5, 6, 0.5], to: [0, 9, 1] },
  { from: [5, 6, 0.5], to: [0, 9, 1] },
  // Center spine
  { from: [0, -16, -2], to: [0, -8, -2] },
  { from: [0, -8, -2], to: [0, 2, -1.5] },
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
// Shell cracked, right armor plate destroyed, one pincer broken
const BOMBER_DAMAGED = [
  // Shell (gap on right side)
  { from: [0, -8, -1], to: [5, -6, 0] },
  { from: [5, -6, 0], to: [7, -1, 0.5] },
  { from: [7, -1, 0.5], to: [5, 2, 0] },
  // crack/gap
  { from: [4, 4, 0], to: [0, 7, 0] },
  { from: [0, 7, 0], to: [-6, 4, 0] },
  { from: [-6, 4, 0], to: [-7, -1, 0.5] },
  { from: [-7, -1, 0.5], to: [-5, -6, 0] },
  { from: [-5, -6, 0], to: [0, -8, -1] },
  // Shell seam
  { from: [0, -8, -1], to: [0, 7, 0] },
  // Head pincers (one broken)
  { from: [-5, -6, 0], to: [-3, -10, -1] },
  { from: [5, -6, 0], to: [4, -8, -0.5] },
  // Left armor intact
  { from: [-7, -1, 0.5], to: [-10, 0, 1.5] },
  { from: [-10, 0, 1.5], to: [-10, 3, 1.5] },
  { from: [-10, 3, 1.5], to: [-6, 4, 0] },
  // Right armor destroyed (stub)
  { from: [7, -1, 0.5], to: [8, 0, 1] },
];

// ─── COMMANDER DAMAGED ───
// Crown broken off, tentacles shortened
const COMMANDER_DAMAGED = [
  // Broken crown stubs
  { from: [-3, -7, 0], to: [-4, -9, -0.5] },
  { from: [3, -7, 0], to: [4, -9, -0.5] },
  // Head dome
  { from: [-3, -7, 0], to: [3, -7, 0] },
  { from: [-3, -7, 0], to: [-5, -3, 0] },
  { from: [3, -7, 0], to: [5, -3, 0] },
  // Body
  { from: [-5, -3, 0], to: [-4, 2, 0] },
  { from: [5, -3, 0], to: [4, 2, 0] },
  // Wings
  { from: [-5, -3, 0], to: [-12, -5, 2] },
  { from: [-12, -5, 2], to: [-12, 1, 1.5] },
  { from: [-12, 1, 1.5], to: [-4, 2, 0] },
  { from: [5, -3, 0], to: [12, -5, 2] },
  { from: [12, -5, 2], to: [12, 1, 1.5] },
  { from: [12, 1, 1.5], to: [4, 2, 0] },
  // Shortened tentacles
  { from: [-4, 2, 0], to: [-3, 5, 0.5] },
  { from: [4, 2, 0], to: [3, 5, 0.5] },
];

// ─── BOSS GALAGA DAMAGED ───
// One wing broken, crown damaged, missing strut
const BOSS_GALAGA_DAMAGED = [
  // Damaged crown (partial)
  { from: [-5, -12, -1], to: [0, -14, -1.5] },
  { from: [0, -14, -1.5], to: [4, -11, -1] },
  // Crown to head
  { from: [-5, -12, -1], to: [-6, -8, 0] },
  { from: [4, -11, -1], to: [6, -8, 0] },
  // Head
  { from: [-6, -8, 0], to: [6, -8, 0] },
  // Body
  { from: [-6, -8, 0], to: [-7, -1, 0] },
  { from: [6, -8, 0], to: [7, -1, 0] },
  // Left wing intact with strut
  { from: [-7, -5, 0], to: [-15, -7, 2.5] },
  { from: [-15, -7, 2.5], to: [-15, 1, 2] },
  { from: [-15, 1, 2], to: [-7, -1, 0] },
  { from: [-7, -5, 0], to: [-14, -1, 2] },
  // Right wing broken (stub)
  { from: [7, -5, 0], to: [11, -6, 1.5] },
  { from: [11, -6, 1.5], to: [9, -1, 1] },
  // Tail
  { from: [-7, -1, 0], to: [-5, 6, 0.5] },
  { from: [7, -1, 0], to: [5, 6, 0.5] },
  { from: [-5, 6, 0.5], to: [0, 9, 1] },
  { from: [5, 6, 0.5], to: [0, 9, 1] },
  // Center spine
  { from: [0, -14, -1.5], to: [0, -8, -2] },
  { from: [0, -8, -2], to: [0, 2, -1.5] },
];

// ─── GUARDIAN DAMAGED ───
// Half the outer diamond gone, braces remain
const GUARDIAN_DAMAGED = [
  // Outer diamond (partial — top-right and bottom-left only)
  { from: [0, -11, -1], to: [9, 0, 0.5] },
  { from: [0, 11, -1], to: [-9, 0, 0.5] },
  // Inner diamond (intact)
  { from: [0, -6, 0], to: [5, 0, 0] },
  { from: [5, 0, 0], to: [0, 6, 0] },
  { from: [0, 6, 0], to: [-5, 0, 0] },
  { from: [-5, 0, 0], to: [0, -6, 0] },
  // Remaining braces
  { from: [0, -6, 0], to: [0, -11, -1] },
  { from: [5, 0, 0], to: [9, 0, 0.5] },
  { from: [0, 6, 0], to: [0, 11, -1] },
  { from: [-5, 0, 0], to: [-9, 0, 0.5] },
  // Center cross
  { from: [-5, 0, 0], to: [5, 0, 0] },
  { from: [0, -6, 0], to: [0, 6, 0] },
];

// ─── GUARDIAN CRITICAL ───
// All outer shield gone, only inner diamond remains
const GUARDIAN_CRITICAL = [
  { from: [0, -6, 0], to: [5, 0, 0] },
  { from: [5, 0, 0], to: [0, 6, 0] },
  { from: [0, 6, 0], to: [-5, 0, 0] },
  { from: [-5, 0, 0], to: [0, -6, 0] },
];

// Damaged model lookup: { type: [damageLevel1Model, damageLevel2Model, ...] }
export const ENEMY_MODELS_DAMAGED = {
  bomber: [BOMBER_DAMAGED],
  commander: [COMMANDER_DAMAGED],
  boss: [BOSS_GALAGA_DAMAGED],
  guardian: [GUARDIAN_DAMAGED, GUARDIAN_CRITICAL],
};
