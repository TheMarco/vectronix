import { CONFIG } from '../config.js';

/**
 * Parametric dive paths for enemy attacks.
 * Each function takes (startX, startY, playerX) and returns a function path(t) → {x, y, z}
 * where t ∈ [0, 1]. Path starts at enemy position and ends near formation area.
 *
 * Paths are deterministic — no randomness in shape.
 * Only start position and player position vary.
 */

// Smooth interpolation helper
function lerp(a, b, t) { return a + (b - a) * t; }

// Smoothstep easing [0,1]
function smoothstep(t) { return t * t * (3 - 2 * t); }

// Quadratic bezier
function bezier2(p0, p1, p2, t) {
  const u = 1 - t;
  return u * u * p0 + 2 * u * t * p1 + t * t * p2;
}

/**
 * DIVE TYPE 1: Swoop
 * Curves toward player, sweeps across at attack altitude, exits off the side.
 */
export function createSwoopDive(startX, startY, playerX) {
  const attackY = CONFIG.PLAYER_Y - 60;
  const side = startX > CONFIG.CENTER_X ? 1 : -1;
  const midX = playerX + side * 100;
  const sweepX = midX - side * 220;
  // Exit off opposite side
  const exitX = side > 0 ? -60 : CONFIG.WIDTH + 60;

  return function(t) {
    let x, y, z;
    if (t < 0.35) {
      const lt = smoothstep(t / 0.35);
      x = lerp(startX, midX, lt);
      y = lerp(startY, attackY, lt);
      z = lerp(CONFIG.FORMATION_Z, -6, lt);
    } else if (t < 0.65) {
      const lt = smoothstep((t - 0.35) / 0.3);
      x = lerp(midX, sweepX, lt);
      y = attackY - Math.sin(lt * Math.PI) * 50;
      z = lerp(-6, -3, lt);
    } else {
      // Sweep off the side while climbing slightly
      const lt = smoothstep((t - 0.65) / 0.35);
      x = lerp(sweepX, exitX, lt);
      y = lerp(attackY, CONFIG.CENTER_Y - 40, lt);
      z = lerp(-3, CONFIG.FORMATION_Z, lt);
    }
    return { x, y, z };
  };
}

/**
 * DIVE TYPE 2: Direct dive
 * Aggressive dive at player, pulls through and exits off the side.
 */
export function createDirectDive(startX, startY, playerX) {
  const attackY = CONFIG.PLAYER_Y - 40;
  const side = startX > CONFIG.CENTER_X ? 1 : -1;
  // After diving at player, arc off to the side
  const exitX = side > 0 ? -60 : CONFIG.WIDTH + 60;

  return function(t) {
    let x, y, z;
    if (t < 0.45) {
      const lt = smoothstep(t / 0.45);
      x = lerp(startX, playerX, lt);
      y = lerp(startY, attackY, lt);
      z = lerp(CONFIG.FORMATION_Z, -10, lt);
    } else if (t < 0.65) {
      // Pull through — cross player zone
      const lt = smoothstep((t - 0.45) / 0.2);
      x = lerp(playerX, playerX - side * 120, lt);
      y = attackY - Math.sin(lt * Math.PI) * 30;
      z = lerp(-10, -5, lt);
    } else {
      // Exit off the side while climbing
      const lt = smoothstep((t - 0.65) / 0.35);
      x = lerp(playerX - side * 120, exitX, lt);
      y = lerp(attackY, CONFIG.CENTER_Y, lt);
      z = lerp(-5, CONFIG.FORMATION_Z, lt);
    }
    return { x, y, z };
  };
}

/**
 * DIVE TYPE 3: Zigzag
 * Zigzag descent to player zone, then exits off the side.
 */
export function createZigzagDive(startX, startY, playerX) {
  const amplitude = 110;
  const attackY = CONFIG.PLAYER_Y - 50;
  const side = startX > CONFIG.CENTER_X ? 1 : -1;
  const exitX = side > 0 ? -60 : CONFIG.WIDTH + 60;

  return function(t) {
    let x, y, z;
    if (t < 0.6) {
      const lt = t / 0.6;
      const st = smoothstep(lt);
      x = startX + Math.sin(lt * Math.PI * 3) * amplitude * Math.sin(lt * Math.PI);
      y = lerp(startY, attackY, st);
      z = lerp(CONFIG.FORMATION_Z, -6, Math.sin(lt * Math.PI));
    } else {
      // Exit off the side
      const lt = smoothstep((t - 0.6) / 0.4);
      x = lerp(startX, exitX, lt);
      y = lerp(attackY, CONFIG.CENTER_Y - 20, lt);
      z = CONFIG.FORMATION_Z;
    }
    return { x, y, z };
  };
}

/**
 * DIVE TYPE 4: Deep loop
 * Circular arc through player zone. Full loop, exits off the side.
 */
export function createLoopDive(startX, startY, playerX) {
  const side = startX > CONFIG.CENTER_X ? 1 : -1;
  const loopCenterX = CONFIG.CENTER_X + side * 80;
  const loopCenterY = CONFIG.CENTER_Y + 40;
  const loopRadiusX = 180;
  const loopRadiusY = 180;
  const startAngle = Math.atan2(startY - loopCenterY, startX - loopCenterX);
  const exitX = side > 0 ? -60 : CONFIG.WIDTH + 60;

  // Precompute loop-end values for seamless transition
  const loopEndSt = 0.75; // st at the transition (the easing collapses to t at this point)
  const loopEndAngle = startAngle + loopEndSt * Math.PI * 2 * side;
  const loopEndX = loopCenterX + Math.cos(loopEndAngle) * loopRadiusX;
  const loopEndY = loopCenterY + Math.sin(loopEndAngle) * loopRadiusY;
  const loopEndZ = CONFIG.FORMATION_Z * (1 - Math.sin(loopEndSt * Math.PI) * 1.2);

  return function(t) {
    if (t < 0.75) {
      const st = t < 0.08 ? smoothstep(t / 0.08) * 0.08
               : t > 0.67 ? 0.67 + smoothstep((t - 0.67) / 0.08) * 0.08
               : t;
      const angle = startAngle + st * Math.PI * 2 * side;
      const x = loopCenterX + Math.cos(angle) * loopRadiusX;
      const y = loopCenterY + Math.sin(angle) * loopRadiusY;
      const z = CONFIG.FORMATION_Z * (1 - Math.sin(st * Math.PI) * 1.2);
      return { x, y, z };
    }
    // Exit off side after loop — starts exactly where loop phase ended
    const lt = smoothstep((t - 0.75) / 0.25);
    return {
      x: lerp(loopEndX, exitX, lt),
      y: lerp(loopEndY, CONFIG.CENTER_Y - 40, lt),
      z: lerp(loopEndZ, CONFIG.FORMATION_Z, lt),
    };
  };
}

/**
 * DIVE TYPE 5: Spiral Descent
 * Tightening spiral toward player zone, then exits off the side.
 */
export function createSpiralDive(startX, startY, playerX) {
  const side = startX > CONFIG.CENTER_X ? 1 : -1;
  const attackY = CONFIG.PLAYER_Y - 70;
  const exitX = side > 0 ? -60 : CONFIG.WIDTH + 60;

  // Precompute spiral endpoint for seamless exit transition
  // At lt=1: sin(1*PI)=0, so z ends at FORMATION_Z
  // radius=0 so x = baseX = lerp(startX, playerX, 0.6)
  const spiralEndX = lerp(startX, playerX, 0.6);

  return function(t) {
    let x, y, z;
    if (t < 0.7) {
      const lt = t / 0.7;
      const st = smoothstep(lt);
      const radius = (1 - st) * 140;
      const angle = lt * Math.PI * 4;
      const baseX = lerp(startX, playerX, st * 0.6);
      x = baseX + Math.cos(angle) * radius;
      y = lerp(startY, attackY, st);
      z = lerp(CONFIG.FORMATION_Z, -8, Math.sin(lt * Math.PI));
    } else {
      // Exit off side — starts at spiral endpoint (z=FORMATION_Z, x=spiralEndX, y=attackY)
      const lt = smoothstep((t - 0.7) / 0.3);
      x = lerp(spiralEndX, exitX, lt);
      y = lerp(attackY, CONFIG.CENTER_Y - 20, lt);
      z = CONFIG.FORMATION_Z;
    }
    return { x, y, z };
  };
}

/**
 * DIVE TYPE 6: Banking S-Curve
 * Wide S-turn sweeping across full screen width, exits off the opposite side.
 */
export function createBankingSCurve(startX, startY, playerX) {
  const side = startX > CONFIG.CENTER_X ? 1 : -1;
  const exitX = side > 0 ? -60 : CONFIG.WIDTH + 60;
  const attackY = CONFIG.PLAYER_Y - 50;

  return function(t) {
    const st = smoothstep(t);
    const sAmplitude = 250;
    const x = lerp(startX, exitX, st) + Math.sin(t * Math.PI * 2) * sAmplitude * (1 - t * 0.6) * -side;
    const y = lerp(startY, attackY, Math.sin(t * Math.PI));
    const z = lerp(CONFIG.FORMATION_Z, -6, Math.sin(t * Math.PI));
    return { x, y, z };
  };
}

/**
 * DIVE TYPE 7: Feint & Strike
 * Dips toward player, pulls up briefly (feint), then commits to a side exit.
 */
export function createFeintStrike(startX, startY, playerX) {
  const feintY = CONFIG.CENTER_Y + 40;
  const attackY = CONFIG.PLAYER_Y - 40;
  const side = startX > CONFIG.CENTER_X ? 1 : -1;
  const exitX = side > 0 ? -60 : CONFIG.WIDTH + 60;

  return function(t) {
    let x, y, z;
    if (t < 0.3) {
      // Initial dip toward player
      const lt = smoothstep(t / 0.3);
      x = lerp(startX, playerX, lt * 0.7);
      y = lerp(startY, feintY, lt);
      z = lerp(CONFIG.FORMATION_Z, -4, lt);
    } else if (t < 0.45) {
      // Pull up feint
      const lt = smoothstep((t - 0.3) / 0.15);
      x = lerp(playerX * 0.7 + startX * 0.3, startX * 0.4 + playerX * 0.6, lt);
      y = lerp(feintY, feintY - 70, lt);
      z = lerp(-4, -2, lt);
    } else if (t < 0.7) {
      // Committed dive toward player
      const lt = smoothstep((t - 0.45) / 0.25);
      const commitX = startX * 0.4 + playerX * 0.6;
      x = lerp(commitX, playerX - side * 60, lt);
      y = lerp(feintY - 70, attackY, lt);
      z = lerp(-2, -8, lt);
    } else {
      // Exit off side
      const lt = smoothstep((t - 0.7) / 0.3);
      x = lerp(playerX - side * 60, exitX, lt);
      y = lerp(attackY, CONFIG.CENTER_Y - 30, lt);
      z = lerp(-8, CONFIG.FORMATION_Z, lt);
    }
    return { x, y, z };
  };
}

/**
 * DIVE TYPE 8: Peel-Off
 * Dives to one side, crosses through player zone, peels off to opposite side exit.
 */
export function createPeelOff(startX, startY, playerX) {
  const side = startX > CONFIG.CENTER_X ? 1 : -1;
  const exitX = side > 0 ? -60 : CONFIG.WIDTH + 60;
  const attackY = CONFIG.PLAYER_Y - 50;

  return function(t) {
    let x, y, z;
    if (t < 0.35) {
      // Dive to one side toward player zone
      const lt = smoothstep(t / 0.35);
      x = lerp(startX, startX + side * 140, lt);
      y = lerp(startY, attackY, lt);
      z = lerp(CONFIG.FORMATION_Z, -8, lt);
    } else if (t < 0.65) {
      // Cross through player zone to other side
      const lt = smoothstep((t - 0.35) / 0.3);
      x = lerp(startX + side * 140, playerX - side * 100, lt);
      y = attackY - Math.sin(lt * Math.PI) * 40;
      z = lerp(-8, -4, lt);
    } else {
      // Peel off to opposite side exit
      const lt = smoothstep((t - 0.65) / 0.35);
      x = lerp(playerX - side * 100, exitX, lt);
      y = lerp(attackY, CONFIG.CENTER_Y - 20, lt);
      z = lerp(-4, CONFIG.FORMATION_Z, lt);
    }
    return { x, y, z };
  };
}

/**
 * TRACTOR BEAM DIVE: Boss dives down, hovers above player for beam deployment.
 * t ∈ [0, 0.3]: dive down to hover position
 * t ∈ [0.3, 0.8]: hover in place (beam active during this phase)
 * t ∈ [0.8, 1.0]: return to formation
 */
export function createTractorBeamDive(startX, startY, playerX) {
  const hoverY = CONFIG.PLAYER_Y - CONFIG.BEAM_HOVER_HEIGHT;
  const hoverX = playerX; // aim at player's current X

  return function(t) {
    let x, y, z;
    if (t < 0.3) {
      // Dive down to hover position
      const lt = t / 0.3;
      const ease = lt * lt * (3 - 2 * lt);
      x = lerp(startX, hoverX, ease);
      y = lerp(startY, hoverY, ease);
      z = lerp(CONFIG.FORMATION_Z, -4, ease);
    } else if (t < 0.8) {
      // Hover in place — slight sway
      const lt = (t - 0.3) / 0.5;
      x = hoverX + Math.sin(lt * Math.PI * 2) * 8;
      y = hoverY + Math.sin(lt * Math.PI * 3) * 4;
      z = -4;
    } else {
      // Return to formation
      const lt = (t - 0.8) / 0.2;
      const ease = lt * lt * (3 - 2 * lt);
      x = lerp(hoverX, startX, ease);
      y = lerp(hoverY, startY, ease);
      z = lerp(-4, CONFIG.FORMATION_Z, ease);
    }
    return { x, y, z };
  };
}

// All dive path generators for random selection
export const DIVE_PATHS = [
  createSwoopDive,
  createDirectDive,
  createZigzagDive,
  createLoopDive,
  createSpiralDive,
  createBankingSCurve,
  createFeintStrike,
  createPeelOff,
];

/**
 * Entrance path generators.
 * Each takes (targetX, targetY) and returns path(t) → {x, y, z}
 */

export function createEntranceFromLeft(targetX, targetY, delay) {
  const startX = -40;
  const startY = CONFIG.CENTER_Y - 80 + delay * 30;
  const midX = CONFIG.CENTER_X - 100;
  const midY = CONFIG.FIELD_TOP + 40;

  return function(t) {
    if (t < 0.5) {
      const lt = t / 0.5;
      const x = bezier2(startX, midX, targetX, lt);
      const y = bezier2(startY, midY, targetY, lt);
      const z = lerp(30, CONFIG.FORMATION_Z, lt);
      return { x, y, z };
    }
    // Ease into position
    const lt = (t - 0.5) / 0.5;
    const ease = lt * lt * (3 - 2 * lt);
    return {
      x: lerp(targetX + (targetX - midX) * 0.1, targetX, ease),
      y: lerp(targetY + (targetY - midY) * 0.1, targetY, ease),
      z: CONFIG.FORMATION_Z,
    };
  };
}

export function createEntranceFromRight(targetX, targetY, delay) {
  const startX = CONFIG.WIDTH + 40;
  const startY = CONFIG.CENTER_Y - 80 + delay * 30;
  const midX = CONFIG.CENTER_X + 100;
  const midY = CONFIG.FIELD_TOP + 40;

  return function(t) {
    if (t < 0.5) {
      const lt = t / 0.5;
      const x = bezier2(startX, midX, targetX, lt);
      const y = bezier2(startY, midY, targetY, lt);
      const z = lerp(30, CONFIG.FORMATION_Z, lt);
      return { x, y, z };
    }
    const lt = (t - 0.5) / 0.5;
    const ease = lt * lt * (3 - 2 * lt);
    return {
      x: lerp(targetX + (targetX - midX) * 0.1, targetX, ease),
      y: lerp(targetY + (targetY - midY) * 0.1, targetY, ease),
      z: CONFIG.FORMATION_Z,
    };
  };
}

export function createEntranceFromTop(targetX, targetY, delay) {
  const startX = targetX + (Math.sin(delay * 2.5) * 120);
  const startY = -40;
  const midX = targetX;
  const midY = CONFIG.FIELD_TOP + 20;

  return function(t) {
    if (t < 0.6) {
      const lt = t / 0.6;
      const x = bezier2(startX, midX, targetX, lt);
      const y = bezier2(startY, midY, targetY, lt);
      const z = lerp(40, CONFIG.FORMATION_Z, lt);
      return { x, y, z };
    }
    const lt = (t - 0.6) / 0.4;
    const ease = lt * lt * (3 - 2 * lt);
    return {
      x: targetX,
      y: lerp(targetY - 10, targetY, ease),
      z: CONFIG.FORMATION_Z,
    };
  };
}

/**
 * Spiral entrance: enter off-screen, spiral inward (2 rotations) toward formation slot
 */
export function createEntranceSpiral(targetX, targetY, delay) {
  const side = delay % 2 === 0 ? -1 : 1;
  const startX = side > 0 ? CONFIG.WIDTH + 60 : -60;
  const startY = CONFIG.CENTER_Y - 60;

  return function(t) {
    const st = smoothstep(t);
    // Spiral: radius shrinks from large to 0, 2 full rotations
    const radius = (1 - st) * 180;
    const angle = t * Math.PI * 4 * side;
    const cx = lerp(startX, targetX, st);
    const cy = lerp(startY, targetY, st);
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    const z = lerp(30, CONFIG.FORMATION_Z, st);
    return { x, y, z };
  };
}

/**
 * Figure-S entrance: enter from side, wide S-curve arcs before settling
 */
export function createEntranceFigureS(targetX, targetY, delay) {
  const side = delay % 2 === 0 ? -1 : 1;
  const startX = side > 0 ? CONFIG.WIDTH + 60 : -60;
  const startY = -40;

  return function(t) {
    const st = smoothstep(t);
    const baseX = lerp(startX, targetX, st);
    const baseY = lerp(startY, targetY, st);
    // S-curve: two opposing arcs
    const sAmplitude = (1 - st) * 160;
    const x = baseX + Math.sin(t * Math.PI * 2) * sAmplitude * side;
    const y = baseY + Math.cos(t * Math.PI * 2) * sAmplitude * 0.3;
    const z = lerp(35, CONFIG.FORMATION_Z, st);
    return { x, y, z };
  };
}

/**
 * Corkscrew entrance: enter from top, helical descent with shrinking radius
 */
export function createEntranceCorkscrew(targetX, targetY, delay) {
  const startX = targetX + Math.sin(delay * 2) * 80;
  const startY = -60;

  return function(t) {
    const st = smoothstep(t);
    // Helix: circular motion with shrinking radius as t→1
    const radius = (1 - st) * 120;
    const angle = t * Math.PI * 6; // 3 full rotations
    const x = lerp(startX, targetX, st) + Math.cos(angle) * radius;
    const y = lerp(startY, targetY, st);
    const z = lerp(40, CONFIG.FORMATION_Z, st) + Math.sin(angle) * radius * 0.05;
    return { x, y, z };
  };
}

export const ENTRANCE_PATHS = [
  createEntranceFromLeft,
  createEntranceFromRight,
  createEntranceFromTop,
  createEntranceSpiral,
  createEntranceFigureS,
  createEntranceCorkscrew,
];

// ═══════════════════════════════════════════════════════════
// CHALLENGE STAGE FLYTHROUGH PATHS
// ═══════════════════════════════════════════════════════════
//
// Like real Galaga: enemies fly in small groups (4-5) with clear
// gaps between each wave. Each path is a single clean swoop
// across the screen — enter from one side, curve through the
// playfield, exit another side. One path per enemy.
// t ∈ [0, 1] maps to the full flight across screen.

const CX = CONFIG.CENTER_X;
const CY = CONFIG.CENTER_Y;
const W = CONFIG.WIDTH;
const H = CONFIG.HEIGHT;

/**
 * Swoop from left, arc down through center, exit right.
 * posInGroup offsets vertically for spacing within group.
 */
function challengeSwoopLR(posInGroup) {
  const yOff = posInGroup * 36;
  return function(t) {
    const x = lerp(-60, W + 60, t);
    const y = 120 + yOff + Math.sin(t * Math.PI) * 200;
    const z = CONFIG.FORMATION_Z + Math.sin(t * Math.PI) * -15;
    return { x, y, z };
  };
}

/**
 * Swoop from right, arc down through center, exit left.
 */
function challengeSwoopRL(posInGroup) {
  const yOff = posInGroup * 36;
  return function(t) {
    const x = lerp(W + 60, -60, t);
    const y = 120 + yOff + Math.sin(t * Math.PI) * 200;
    const z = CONFIG.FORMATION_Z + Math.sin(t * Math.PI) * -15;
    return { x, y, z };
  };
}

/**
 * Dive from top center, split left or right, loop at bottom, exit top.
 */
function challengeDiveLoop(posInGroup) {
  const side = posInGroup % 2 === 0 ? -1 : 1;
  const spread = Math.floor(posInGroup / 2) * 40 + 30;
  return function(t) {
    let x, y, z;
    if (t < 0.35) {
      // Dive down center
      const lt = t / 0.35;
      x = CX + side * spread * lt;
      y = lerp(-60, CONFIG.PLAYER_Y - 40, lt);
      z = lerp(30, -8, lt);
    } else if (t < 0.65) {
      // Curve at bottom
      const lt = (t - 0.35) / 0.3;
      const angle = lt * Math.PI;
      x = CX + side * (spread + Math.sin(angle) * 120);
      y = CONFIG.PLAYER_Y - 40 + Math.sin(angle) * 40;
      z = lerp(-8, 5, lt);
    } else {
      // Exit upward
      const lt = (t - 0.65) / 0.35;
      x = CX + side * (spread + 120) * (1 - lt * 0.5);
      y = lerp(CONFIG.PLAYER_Y - 40, -60, lt);
      z = lerp(5, 30, lt);
    }
    return { x, y, z };
  };
}

/**
 * Figure-8: enter from left, do a full figure-8, exit right.
 * Each enemy in the group has a slightly different radius.
 */
function challengeFigure8(posInGroup) {
  const radiusOff = posInGroup * 15;
  return function(t) {
    const angle = t * Math.PI * 2;
    const x = lerp(-40, W + 40, t);
    const y = CY - 30 + Math.sin(angle * 2) * (100 + radiusOff);
    const z = CONFIG.FORMATION_Z + Math.sin(angle) * 12;
    return { x, y, z };
  };
}

/**
 * Zigzag descent: enter top, zigzag down, exit bottom.
 */
function challengeZigzag(posInGroup) {
  const xOff = (posInGroup - 2) * 44;
  return function(t) {
    const x = CX + xOff + Math.sin(t * Math.PI * 4) * 130;
    const y = lerp(-60, H + 60, t);
    const z = CONFIG.FORMATION_Z + Math.sin(t * Math.PI * 2) * -10;
    return { x, y, z };
  };
}

/**
 * Wide arc from bottom-left to top-right (or mirrored).
 */
function challengeArc(posInGroup, mirror) {
  const yOff = posInGroup * 32;
  const dir = mirror ? -1 : 1;
  return function(t) {
    const x = lerp(dir > 0 ? -60 : W + 60, dir > 0 ? W + 60 : -60, t);
    const arcY = Math.sin(t * Math.PI) * 280;
    const y = H - 40 - arcY + yOff * (1 - t);
    const z = CONFIG.FORMATION_Z + Math.sin(t * Math.PI) * -18;
    return { x, y, z };
  };
}

/**
 * V-formation: group flies in a V shape from top to bottom.
 */
function challengeVFormation(posInGroup) {
  // V offsets: center leads, sides trail
  const vOffsets = [
    [0, 0],     // point
    [-50, 30],  // left wing
    [50, 30],   // right wing
    [-100, 60], // far left
    [100, 60],  // far right
  ];
  const [xOff, yOff] = vOffsets[posInGroup] || [0, 0];
  return function(t) {
    const x = CX + xOff + Math.sin(t * Math.PI * 2) * 80;
    const y = lerp(-60 - yOff, H + 60, t);
    const z = CONFIG.FORMATION_Z + Math.sin(t * Math.PI) * -10;
    return { x, y, z };
  };
}

/**
 * Circle fly: group enters and does a big circle in the playfield.
 */
function challengeCircle(posInGroup, clockwise) {
  const angleOff = posInGroup * 0.15;
  const dir = clockwise ? 1 : -1;
  return function(t) {
    if (t < 0.15) {
      // Enter from left/right
      const lt = t / 0.15;
      const startX = clockwise ? -60 : W + 60;
      return {
        x: lerp(startX, CX + dir * 200, lt),
        y: lerp(CY, CY - 100, lt),
        z: lerp(30, CONFIG.FORMATION_Z, lt),
      };
    }
    if (t > 0.85) {
      // Exit opposite side
      const lt = (t - 0.85) / 0.15;
      const endX = clockwise ? W + 60 : -60;
      return {
        x: lerp(CX + dir * 200, endX, lt),
        y: lerp(CY - 100, CY, lt),
        z: lerp(CONFIG.FORMATION_Z, 30, lt),
      };
    }
    // Circle portion
    const ct = (t - 0.15) / 0.7;
    const angle = (ct + angleOff) * Math.PI * 2 * dir;
    const radius = 200;
    return {
      x: CX + Math.cos(angle) * radius,
      y: CY - 30 + Math.sin(angle) * 160,
      z: CONFIG.FORMATION_Z + Math.sin(angle) * -12,
    };
  };
}

/**
 * Challenge stage layout definitions.
 * Each layout is an array of groups. Each group is an array of path-factory calls.
 * Groups are sent one at a time with ~2s gaps between them.
 */
export const CHALLENGE_LAYOUTS = [
  // Layout 1: Alternating left-right swoops
  [
    [challengeSwoopLR(0), challengeSwoopLR(1), challengeSwoopLR(2), challengeSwoopLR(3)],
    [challengeSwoopRL(0), challengeSwoopRL(1), challengeSwoopRL(2), challengeSwoopRL(3)],
    [challengeSwoopLR(0), challengeSwoopLR(1), challengeSwoopLR(2), challengeSwoopLR(3)],
    [challengeSwoopRL(0), challengeSwoopRL(1), challengeSwoopRL(2), challengeSwoopRL(3)],
    [challengeDiveLoop(0), challengeDiveLoop(1), challengeDiveLoop(2), challengeDiveLoop(3), challengeDiveLoop(4)],
    [challengeSwoopLR(0), challengeSwoopLR(1), challengeSwoopLR(2), challengeSwoopLR(3)],
    [challengeSwoopRL(0), challengeSwoopRL(1), challengeSwoopRL(2), challengeSwoopRL(3)],
    [challengeDiveLoop(0), challengeDiveLoop(1), challengeDiveLoop(2), challengeDiveLoop(3), challengeDiveLoop(4)],
  ],
  // Layout 2: Dive-loops and figure-8s
  [
    [challengeDiveLoop(0), challengeDiveLoop(1), challengeDiveLoop(2), challengeDiveLoop(3), challengeDiveLoop(4)],
    [challengeFigure8(0), challengeFigure8(1), challengeFigure8(2), challengeFigure8(3)],
    [challengeDiveLoop(0), challengeDiveLoop(1), challengeDiveLoop(2), challengeDiveLoop(3), challengeDiveLoop(4)],
    [challengeFigure8(0), challengeFigure8(1), challengeFigure8(2), challengeFigure8(3)],
    [challengeZigzag(0), challengeZigzag(1), challengeZigzag(2), challengeZigzag(3), challengeZigzag(4)],
    [challengeFigure8(0), challengeFigure8(1), challengeFigure8(2), challengeFigure8(3)],
    [challengeDiveLoop(0), challengeDiveLoop(1), challengeDiveLoop(2), challengeDiveLoop(3), challengeDiveLoop(4)],
  ],
  // Layout 3: V-formations and arcs
  [
    [challengeVFormation(0), challengeVFormation(1), challengeVFormation(2), challengeVFormation(3), challengeVFormation(4)],
    [challengeArc(0, false), challengeArc(1, false), challengeArc(2, false), challengeArc(3, false)],
    [challengeArc(0, true), challengeArc(1, true), challengeArc(2, true), challengeArc(3, true)],
    [challengeVFormation(0), challengeVFormation(1), challengeVFormation(2), challengeVFormation(3), challengeVFormation(4)],
    [challengeCircle(0, true), challengeCircle(1, true), challengeCircle(2, true), challengeCircle(3, true)],
    [challengeArc(0, false), challengeArc(1, false), challengeArc(2, false), challengeArc(3, false)],
    [challengeCircle(0, false), challengeCircle(1, false), challengeCircle(2, false), challengeCircle(3, false)],
  ],
  // Layout 4: Zigzags and circles
  [
    [challengeZigzag(0), challengeZigzag(1), challengeZigzag(2), challengeZigzag(3), challengeZigzag(4)],
    [challengeCircle(0, true), challengeCircle(1, true), challengeCircle(2, true), challengeCircle(3, true)],
    [challengeZigzag(0), challengeZigzag(1), challengeZigzag(2), challengeZigzag(3), challengeZigzag(4)],
    [challengeCircle(0, false), challengeCircle(1, false), challengeCircle(2, false), challengeCircle(3, false)],
    [challengeSwoopLR(0), challengeSwoopLR(1), challengeSwoopLR(2), challengeSwoopLR(3)],
    [challengeSwoopRL(0), challengeSwoopRL(1), challengeSwoopRL(2), challengeSwoopRL(3)],
    [challengeZigzag(0), challengeZigzag(1), challengeZigzag(2), challengeZigzag(3), challengeZigzag(4)],
    [challengeDiveLoop(0), challengeDiveLoop(1), challengeDiveLoop(2), challengeDiveLoop(3), challengeDiveLoop(4)],
  ],
  // Layout 5: Mixed spectacular
  [
    [challengeFigure8(0), challengeFigure8(1), challengeFigure8(2), challengeFigure8(3)],
    [challengeVFormation(0), challengeVFormation(1), challengeVFormation(2), challengeVFormation(3), challengeVFormation(4)],
    [challengeCircle(0, true), challengeCircle(1, true), challengeCircle(2, true), challengeCircle(3, true)],
    [challengeSwoopLR(0), challengeSwoopLR(1), challengeSwoopLR(2), challengeSwoopLR(3)],
    [challengeArc(0, true), challengeArc(1, true), challengeArc(2, true), challengeArc(3, true)],
    [challengeDiveLoop(0), challengeDiveLoop(1), challengeDiveLoop(2), challengeDiveLoop(3), challengeDiveLoop(4)],
    [challengeCircle(0, false), challengeCircle(1, false), challengeCircle(2, false), challengeCircle(3, false)],
    [challengeZigzag(0), challengeZigzag(1), challengeZigzag(2), challengeZigzag(3), challengeZigzag(4)],
  ],
];
