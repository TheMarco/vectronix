export const CONFIG = Object.freeze({
  // Screen dimensions (match hexax for shader overlay compatibility)
  WIDTH: 768,
  HEIGHT: 672,
  CENTER_X: 384,
  CENTER_Y: 336,

  // Playfield bounds
  FIELD_LEFT: 40,
  FIELD_RIGHT: 728,
  FIELD_TOP: 30,
  FIELD_BOTTOM: 640,

  // Perspective projection
  PERSPECTIVE: 0.006,

  // Player
  PLAYER_Y: 600,
  PLAYER_SPEED: 320,
  PLAYER_SIZE: 14,
  RESPAWN_DELAY_MS: 2000,
  START_LIVES: 3,

  // Bullets
  MAX_PLAYER_BULLETS: 4,
  PLAYER_BULLET_SPEED: 500,
  ENEMY_BULLET_SPEED: 180,

  // Formation
  FORMATION_COLS: 10,
  FORMATION_ROWS: 5,
  FORMATION_COL_SPACING: 48,
  FORMATION_ROW_SPACING: 46,
  FORMATION_BASE_Y: 195,
  FORMATION_Z: 12,
  FORMATION_SWAY_SPEED: 0.4,
  FORMATION_SWAY_AMOUNT: 18,
  FORMATION_BREATHE_SPEED: 0.6,
  FORMATION_BREATHE_AMOUNT: 0.04,

  // Enemy types → row mapping
  // Row 0: commanders (top)
  // Rows 1-2: attackers
  // Rows 3-4: grunts (bottom)

  // Dive attack
  DIVE_SPEED: 200,
  DIVE_RETURN_SPEED: 160,

  // Scoring
  SCORE_GRUNT: 50,
  SCORE_GRUNT_DIVING: 100,
  SCORE_ATTACKER: 80,
  SCORE_ATTACKER_DIVING: 160,
  SCORE_COMMANDER: 250,
  SCORE_COMMANDER_DIVING: 600,
  SCORE_SPINNER: 100,
  SCORE_SPINNER_DIVING: 200,
  SCORE_BOMBER: 200,
  SCORE_BOMBER_DIVING: 500,
  SCORE_GUARDIAN: 400,
  SCORE_GUARDIAN_DIVING: 800,
  SCORE_PHANTOM: 160,
  SCORE_PHANTOM_DIVING: 350,
  SCORE_SWARM: 30,
  SCORE_SWARM_DIVING: 60,
  SCORE_BOSS: 400,
  SCORE_BOSS_DIVING: 800,
  SCORE_BOSS_WITH_CAPTURE: 1600,
  SCORE_RESCUE_BONUS: 2000,

  // Extra lives
  EXTRA_LIFE_THRESHOLDS: [15000, 50000],
  EXTRA_LIFE_REPEAT: 50000,

  // Challenge stage
  CHALLENGE_BONUS_PER_HIT: 100,
  CHALLENGE_PERFECT_BONUS: 10000,

  // Boss / Tractor beam
  BEAM_DURATION: 4500,        // ms beam stays active
  BEAM_CAPTURE_RANGE: 70,     // horizontal px for capture
  BEAM_HOVER_HEIGHT: 200,     // px above player to hover
  CAPTURED_SHIP_Y_OFFSET: -24, // attached ship offset ABOVE boss

  // Dual fighter
  DUAL_OFFSET_X: 14,          // px offset per ship from center
  DUAL_FIRE_COOLDOWN: 0.10,   // seconds between dual shots
  DUAL_MAX_BULLETS: 8,        // double the single max when dual

  // Colors
  COLORS: {
    BG: 0x000000,
    PLAYER: 0x44bbff,
    PLAYER_THRUST: 0x4488ff,
    GRUNT: 0x44ff66,
    ATTACKER: 0xff6644,
    COMMANDER: 0xffdd44,
    SPINNER: 0xff44ff,
    BOMBER: 0xff8822,
    GUARDIAN: 0x44ffff,
    PHANTOM: 0x8866ff,
    SWARM: 0xaaff44,
    BULLET_PLAYER: 0xaaddff,
    BULLET_ENEMY: 0xff4466,
    HUD: '#88ddff',
    BOSS: 0xff4488,
    CAPTURED_SHIP: 0x225588,
    TRACTOR_BEAM: 0x44ddff,
    STARFIELD: 0x88bbee,
  },

  // Secondary accent colors (warm↔cool contrast for max readability with ADD glow)
  COLORS_2: {
    GRUNT: 0xffff44,      // yellow spots/wings against green body
    ATTACKER: 0x44aaff,   // cool blue wings against hot red body
    COMMANDER: 0xff44aa,  // magenta crown/tentacles against gold body
    SPINNER: 0x44ffdd,    // cyan spokes against magenta hub/ring
    BOMBER: 0xffee44,     // bright gold armor/pincers against orange shell
    GUARDIAN: 0xffaa22,   // warm amber core against cool cyan shield
    PHANTOM: 0x44ffaa,    // mint eyes/tendrils against purple hood
    SWARM: 0xff66aa,      // pink legs/antennae against lime body
    BOSS: 0x44ddff,       // cyan crown/struts against pink body
  },
});
