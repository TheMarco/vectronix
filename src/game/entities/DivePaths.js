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

// ═══════════════════════════════════════════════════════════
// GROUP FORMATION DIVE PATHS
// ═══════════════════════════════════════════════════════════

const GROUP_FORMATIONS = {
  v:       [[0, 0], [-35, 22], [35, 22], [-70, 44], [70, 44]],
  echelon: [[0, 0], [30, 18],  [60, 36], [90, 54],  [120, 72]],
  line:    [[-80, 0], [-40, 0], [0, 0],   [40, 0],   [80, 0]],
};

/**
 * GROUP DIVE: Coordinated formation dive for N enemies.
 * Enemies blend from their actual positions into a shared reference
 * trajectory with formation offsets, then hold formation through
 * attack run and exit.
 *
 * @param {Array} enemies - Array of enemy objects (need .x, .y for start pos)
 * @param {number} playerX - Current player X position
 * @param {string} formationType - 'v' | 'echelon' | 'line'
 * @returns {Array} Array of path functions, one per enemy
 */
export function createGroupDivePaths(enemies, playerX, formationType) {
  const offsets = GROUP_FORMATIONS[formationType] || GROUP_FORMATIONS.v;

  // Group center as reference start
  let cx = 0, cy = 0;
  for (const e of enemies) { cx += e.x; cy += e.y; }
  cx /= enemies.length;
  cy /= enemies.length;

  const side = cx > CONFIG.CENTER_X ? 1 : -1;
  const attackY = CONFIG.PLAYER_Y - 55;
  const exitX = side > 0 ? -80 : CONFIG.WIDTH + 80;

  // Reference trajectory control points
  const refStartX = cx;
  const refStartY = cy;
  const refMidX = playerX + side * 60;
  const refSweepEndX = refMidX - side * 200;

  // Build a path for each enemy
  return enemies.map((enemy, i) => {
    const offset = offsets[i] || [0, 0];
    const ox = offset[0] * -side; // mirror offsets based on approach side
    const oy = offset[1];
    const startX = enemy.x;
    const startY = enemy.y;

    return function(t) {
      let refX, refY, refZ;

      if (t < 0.4) {
        // Approach: dive toward player
        const lt = smoothstep(t / 0.4);
        refX = lerp(refStartX, refMidX, lt);
        refY = lerp(refStartY, attackY, lt);
        refZ = lerp(CONFIG.FORMATION_Z, -6, lt);
      } else if (t < 0.7) {
        // Sweep across at attack altitude
        const lt = smoothstep((t - 0.4) / 0.3);
        refX = lerp(refMidX, refSweepEndX, lt);
        refY = attackY - Math.sin(lt * Math.PI) * 35;
        refZ = lerp(-6, -3, lt);
      } else {
        // Exit off-screen
        const lt = smoothstep((t - 0.7) / 0.3);
        refX = lerp(refSweepEndX, exitX, lt);
        refY = lerp(attackY, CONFIG.CENTER_Y - 40, lt);
        refZ = lerp(-3, CONFIG.FORMATION_Z, lt);
      }

      // Blend from actual start position into formation offset
      let x, y;
      if (t < 0.3) {
        // Converge: blend from actual position to (ref + offset)
        const blend = smoothstep(t / 0.3);
        const targetX = refX + ox;
        const targetY = refY + oy;
        x = lerp(startX, targetX, blend);
        y = lerp(startY, targetY, blend);
      } else {
        // Hold formation offset
        x = refX + ox;
        y = refY + oy;
      }

      return { x, y, z: refZ };
    };
  });
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
    if (t < 0.8) {
      const lt = t / 0.8;
      const x = bezier2(startX, midX, targetX, lt);
      const y = bezier2(startY, midY, targetY, lt);
      const z = lerp(30, CONFIG.FORMATION_Z, lt);
      return { x, y, z };
    }
    return { x: targetX, y: targetY, z: CONFIG.FORMATION_Z };
  };
}

export function createEntranceFromRight(targetX, targetY, delay) {
  const startX = CONFIG.WIDTH + 40;
  const startY = CONFIG.CENTER_Y - 80 + delay * 30;
  const midX = CONFIG.CENTER_X + 100;
  const midY = CONFIG.FIELD_TOP + 40;

  return function(t) {
    if (t < 0.8) {
      const lt = t / 0.8;
      const x = bezier2(startX, midX, targetX, lt);
      const y = bezier2(startY, midY, targetY, lt);
      const z = lerp(30, CONFIG.FORMATION_Z, lt);
      return { x, y, z };
    }
    return { x: targetX, y: targetY, z: CONFIG.FORMATION_Z };
  };
}

export function createEntranceFromTop(targetX, targetY, delay) {
  const startX = targetX + (Math.sin(delay * 2.5) * 120);
  const startY = -40;
  const midX = targetX;
  const midY = CONFIG.FIELD_TOP + 20;

  return function(t) {
    if (t < 0.8) {
      const lt = t / 0.8;
      const x = bezier2(startX, midX, targetX, lt);
      const y = bezier2(startY, midY, targetY, lt);
      const z = lerp(40, CONFIG.FORMATION_Z, lt);
      return { x, y, z };
    }
    return { x: targetX, y: targetY, z: CONFIG.FORMATION_Z };
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

/**
 * Wide swoop: enter from the side, wide upward U-curve to formation
 * (enters at mid-screen height — never crosses player zone)
 */
export function createEntranceBottomSwoop(targetX, targetY, delay) {
  const side = delay % 1.5 < 0.75 ? -1 : 1;
  const startX = side > 0 ? CONFIG.WIDTH + 80 : -80;
  const startY = CONFIG.CENTER_Y + 40;
  const peakY = CONFIG.FIELD_TOP + 30;

  return function(t) {
    if (t < 0.5) {
      // Wide upward U-curve from side
      const lt = t / 0.5;
      const x = bezier2(startX, CONFIG.CENTER_X + side * 60, targetX, lt);
      const y = bezier2(startY, peakY - 50, peakY, lt);
      const z = lerp(25, CONFIG.FORMATION_Z + 3, lt);
      return { x, y, z };
    }
    // Settle into formation slot
    const lt = (t - 0.5) / 0.5;
    const ease = lt * lt * (3 - 2 * lt);
    return {
      x: targetX,
      y: lerp(peakY, targetY, ease),
      z: lerp(CONFIG.FORMATION_Z + 3, CONFIG.FORMATION_Z, ease),
    };
  };
}

/**
 * Diving loop: enter from top, dive down to mid-screen, loop back up to formation
 */
export function createEntranceDivingLoop(targetX, targetY, delay) {
  const startX = targetX + Math.sin(delay * 3) * 150;
  const startY = -60;
  const loopY = CONFIG.CENTER_Y + 60;
  const side = startX > targetX ? 1 : -1;

  return function(t) {
    if (t < 0.3) {
      // Dive down
      const lt = t / 0.3;
      const x = lerp(startX, targetX + side * 100, lt);
      const y = lerp(startY, loopY, lt * lt);
      const z = lerp(35, -5, lt);
      return { x, y, z };
    }
    if (t < 0.6) {
      // Loop at bottom — half circle
      const lt = (t - 0.3) / 0.3;
      const angle = lt * Math.PI;
      const x = targetX + side * 100 - Math.sin(angle) * 100 * side;
      const y = loopY - Math.sin(angle) * 60;
      const z = lerp(-5, CONFIG.FORMATION_Z, lt);
      return { x, y, z };
    }
    // Rise to formation (start where Phase 2 half-circle ends)
    const lt = (t - 0.6) / 0.4;
    const ease = lt * lt * (3 - 2 * lt);
    return {
      x: lerp(targetX + side * 100, targetX, ease),
      y: lerp(loopY, targetY, ease),
      z: CONFIG.FORMATION_Z,
    };
  };
}

/**
 * Cascade: enter from corner, sweep diagonally across screen, then arc to slot
 */
export function createEntranceCascade(targetX, targetY, delay) {
  const fromRight = delay % 1 > 0.5;
  const startX = fromRight ? CONFIG.WIDTH + 60 : -60;
  const startY = -40;
  const sweepX = fromRight ? CONFIG.FIELD_LEFT + 80 : CONFIG.FIELD_RIGHT - 80;
  const sweepY = CONFIG.CENTER_Y;

  return function(t) {
    if (t < 0.5) {
      // Diagonal sweep across screen
      const lt = t / 0.5;
      const x = bezier2(startX, (startX + sweepX) * 0.5, sweepX, lt);
      const y = bezier2(startY, CONFIG.FIELD_TOP + 30, sweepY, lt);
      const z = lerp(30, CONFIG.FORMATION_Z + 3, lt);
      return { x, y, z };
    }
    // Arc to formation slot
    const lt = (t - 0.5) / 0.5;
    const ease = lt * lt * (3 - 2 * lt);
    return {
      x: lerp(sweepX, targetX, ease),
      y: lerp(sweepY, targetY, ease),
      z: lerp(CONFIG.FORMATION_Z + 3, CONFIG.FORMATION_Z, ease),
    };
  };
}

export const ENTRANCE_PATHS = [
  createEntranceFromLeft,
  createEntranceFromRight,
  createEntranceFromTop,
  createEntranceSpiral,
  createEntranceFigureS,
  createEntranceCorkscrew,
  createEntranceBottomSwoop,
  createEntranceDivingLoop,
  createEntranceCascade,
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
  const loopY = CY + 80; // stay well above player
  return function(t) {
    let x, y, z;
    if (t < 0.35) {
      // Dive down center
      const lt = t / 0.35;
      x = CX + side * spread * lt;
      y = lerp(-60, loopY, lt);
      z = lerp(30, -8, lt);
    } else if (t < 0.65) {
      // Curve at bottom
      const lt = (t - 0.35) / 0.3;
      const angle = lt * Math.PI;
      x = CX + side * (spread + Math.sin(angle) * 120);
      y = loopY + Math.sin(angle) * 30;
      z = lerp(-8, 5, lt);
    } else {
      // Exit upward (start where half-circle ends: CX + side*spread)
      const lt = (t - 0.65) / 0.35;
      x = lerp(CX + side * spread, CX + side * (spread + 80), lt);
      y = lerp(loopY, -60, lt);
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
    const y = lerp(-60, CY + 100, t);
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
    const y = CY + 80 - arcY + yOff * (1 - t);
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
    const y = lerp(-60 - yOff, CY + 100, t);
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
  const radius = 200;

  // Precompute circle position at entry/exit transitions for seamless joins
  const entryAngle = angleOff * Math.PI * 2 * dir;
  const circEntryX = CX + Math.cos(entryAngle) * radius;
  const circEntryY = CY - 30 + Math.sin(entryAngle) * 160;
  const circEntryZ = CONFIG.FORMATION_Z + Math.sin(entryAngle) * -12;

  const exitAngle = (1 + angleOff) * Math.PI * 2 * dir;
  const circExitX = CX + Math.cos(exitAngle) * radius;
  const circExitY = CY - 30 + Math.sin(exitAngle) * 160;
  const circExitZ = CONFIG.FORMATION_Z + Math.sin(exitAngle) * -12;

  const startX = clockwise ? -60 : W + 60;
  const endX = clockwise ? W + 60 : -60;

  return function(t) {
    if (t < 0.15) {
      // Enter from side → match circle entry point
      const lt = t / 0.15;
      return {
        x: lerp(startX, circEntryX, lt),
        y: lerp(CY, circEntryY, lt),
        z: lerp(30, circEntryZ, lt),
      };
    }
    if (t > 0.85) {
      // Exit from circle exit point → off-screen
      const lt = (t - 0.85) / 0.15;
      return {
        x: lerp(circExitX, endX, lt),
        y: lerp(circExitY, CY, lt),
        z: lerp(circExitZ, 30, lt),
      };
    }
    // Circle portion
    const ct = (t - 0.15) / 0.7;
    const angle = (ct + angleOff) * Math.PI * 2 * dir;
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
    [challengeDiveLoop(0), challengeDiveLoop(1), challengeDiveLoop(2), challengeDiveLoop(3)],
    [challengeFigure8(0), challengeFigure8(1), challengeFigure8(2)],
    [challengeDiveLoop(0), challengeDiveLoop(1), challengeDiveLoop(2), challengeDiveLoop(3)],
    [challengeFigure8(0), challengeFigure8(1), challengeFigure8(2)],
    [challengeZigzag(0), challengeZigzag(1), challengeZigzag(2), challengeZigzag(3)],
    [challengeFigure8(0), challengeFigure8(1), challengeFigure8(2)],
    [challengeDiveLoop(0), challengeDiveLoop(1), challengeDiveLoop(2), challengeDiveLoop(3)],
  ],
  // Layout 3: V-formations and arcs
  [
    [challengeVFormation(0), challengeVFormation(1), challengeVFormation(2), challengeVFormation(3)],
    [challengeArc(0, false), challengeArc(1, false), challengeArc(2, false)],
    [challengeArc(0, true), challengeArc(1, true), challengeArc(2, true)],
    [challengeVFormation(0), challengeVFormation(1), challengeVFormation(2), challengeVFormation(3)],
    [challengeCircle(0, true), challengeCircle(1, true), challengeCircle(2, true)],
    [challengeArc(0, false), challengeArc(1, false), challengeArc(2, false)],
    [challengeCircle(0, false), challengeCircle(1, false), challengeCircle(2, false)],
  ],
  // Layout 4: Zigzags and circles
  [
    [challengeZigzag(0), challengeZigzag(1), challengeZigzag(2), challengeZigzag(3)],
    [challengeCircle(0, true), challengeCircle(1, true), challengeCircle(2, true)],
    [challengeZigzag(0), challengeZigzag(1), challengeZigzag(2), challengeZigzag(3)],
    [challengeCircle(0, false), challengeCircle(1, false), challengeCircle(2, false)],
    [challengeSwoopLR(0), challengeSwoopLR(1), challengeSwoopLR(2), challengeSwoopLR(3)],
    [challengeSwoopRL(0), challengeSwoopRL(1), challengeSwoopRL(2), challengeSwoopRL(3)],
    [challengeZigzag(0), challengeZigzag(1), challengeZigzag(2), challengeZigzag(3)],
    [challengeDiveLoop(0), challengeDiveLoop(1), challengeDiveLoop(2), challengeDiveLoop(3)],
  ],
  // Layout 5: Mixed spectacular
  [
    [challengeFigure8(0), challengeFigure8(1), challengeFigure8(2)],
    [challengeVFormation(0), challengeVFormation(1), challengeVFormation(2), challengeVFormation(3)],
    [challengeCircle(0, true), challengeCircle(1, true), challengeCircle(2, true)],
    [challengeSwoopLR(0), challengeSwoopLR(1), challengeSwoopLR(2), challengeSwoopLR(3)],
    [challengeArc(0, true), challengeArc(1, true), challengeArc(2, true)],
    [challengeDiveLoop(0), challengeDiveLoop(1), challengeDiveLoop(2), challengeDiveLoop(3)],
    [challengeCircle(0, false), challengeCircle(1, false), challengeCircle(2, false)],
    [challengeZigzag(0), challengeZigzag(1), challengeZigzag(2), challengeZigzag(3)],
  ],
];
