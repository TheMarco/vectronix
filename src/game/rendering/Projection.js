/**
 * 3D → 2D perspective projection for a flat playfield.
 *
 * World space:
 *   X = left/right (screen-aligned)
 *   Y = up/down (screen-aligned)
 *   Z = depth into screen (positive = farther, negative = closer)
 *
 * Camera looks straight down at the playfield with subtle perspective.
 * Objects at Z>0 appear smaller (farther). Objects at Z<0 appear larger (closer).
 * Perspective is applied relative to screen center (vanishing point).
 *
 * Reuses the same projection concept as hexax's TunnelGeometry:
 *   scale = f(depth), screen = center + offset * scale
 */
import { CONFIG } from '../config.js';

const CX = CONFIG.CENTER_X;
const CY = CONFIG.CENTER_Y;
const PERSP = CONFIG.PERSPECTIVE;

export function projectPoint(worldX, worldY, worldZ) {
  const scale = 1.0 / (1.0 + worldZ * PERSP);
  return {
    x: CX + (worldX - CX) * scale,
    y: CY + (worldY - CY) * scale,
    scale,
  };
}

export function getScale(worldZ) {
  return 1.0 / (1.0 + worldZ * PERSP);
}

/**
 * Project a 3D wireframe model to screen space.
 * Model lines are in local coordinates; worldX/Y/Z is the model center.
 * modelScale controls the base size of the model.
 *
 * Returns an array of projected line segments:
 *   [{ x1, y1, x2, y2, depth }]
 *
 * Lines with back-facing normals (if provided) are culled.
 */
/**
 * Flat 2D sprite-like projection for CRT mode.
 * No per-vertex perspective — uniform scale + 2D screen-plane rotation.
 * screenX/screenY is the pre-projected center position.
 */
export function projectModelFlat(lines, screenX, screenY, modelScale, rotation = 0) {
  const cosR = Math.cos(rotation);
  const sinR = Math.sin(rotation);
  const result = [];

  for (const line of lines) {
    let ax = line.from[0], ay = line.from[1];
    let bx = line.to[0], by = line.to[1];

    if (rotation !== 0) {
      const rax = ax * cosR - ay * sinR;
      const ray = ax * sinR + ay * cosR;
      ax = rax; ay = ray;
      const rbx = bx * cosR - by * sinR;
      const rby = bx * sinR + by * cosR;
      bx = rbx; by = rby;
    }

    result.push({
      x1: screenX + ax * modelScale,
      y1: screenY + ay * modelScale,
      x2: screenX + bx * modelScale,
      y2: screenY + by * modelScale,
      c: line.c || 0,
    });
  }

  return result;
}

export function projectModel(lines, worldX, worldY, worldZ, modelScale, rotation = 0) {
  const cosR = Math.cos(rotation);
  const sinR = Math.sin(rotation);
  const result = [];

  for (const line of lines) {
    // Rotate local coords around Y axis (top-down rotation)
    let ax = line.from[0], ay = line.from[1], az = line.from[2] || 0;
    let bx = line.to[0], by = line.to[1], bz = line.to[2] || 0;

    if (rotation !== 0) {
      const rax = ax * cosR - az * sinR;
      const raz = ax * sinR + az * cosR;
      ax = rax; az = raz;
      const rbx = bx * cosR - bz * sinR;
      const rbz = bx * sinR + bz * cosR;
      bx = rbx; bz = rbz;
    }

    // Scale and translate to world
    const wax = worldX + ax * modelScale;
    const way = worldY + ay * modelScale;
    const waz = worldZ + az * modelScale;
    const wbx = worldX + bx * modelScale;
    const wby = worldY + by * modelScale;
    const wbz = worldZ + bz * modelScale;

    // Project to screen
    const pa = projectPoint(wax, way, waz);
    const pb = projectPoint(wbx, wby, wbz);

    // Average depth for sorting
    const depth = (waz + wbz) * 0.5;

    result.push({
      x1: pa.x, y1: pa.y,
      x2: pb.x, y2: pb.y,
      depth,
      scale: (pa.scale + pb.scale) * 0.5,
      c: line.c || 0,
    });
  }

  return result;
}
