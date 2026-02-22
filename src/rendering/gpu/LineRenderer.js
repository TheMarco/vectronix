/**
 * GPU instanced line renderer using Three.js TSL (Three Shading Language).
 *
 * Renders RenderPacket data as screen-space quads with analytic 3-Gaussian
 * glow, mask circles as antialiased SDF discs, and starfield background lines.
 *
 * Draw order (controlled via Mesh.renderOrder):
 *   0 — Background lines  (additive blend)
 *   1 — Mask circles       (normal blend, solid black)
 *   2 — Main glow lines    (additive blend)
 *
 * The vertex shader expands a 4-vertex quad template per instance into an
 * oriented, padded rectangle around each line segment. The fragment shader
 * computes an analytic distance-to-segment and evaluates a 3-Gaussian glow
 * profile matching the visual of the original 3-pass GlowRenderer strokes.
 */

import {
  OrthographicCamera, Scene, Mesh,
  NodeMaterial, InstancedBufferGeometry, InstancedBufferAttribute,
  BufferAttribute,
  AdditiveBlending, NormalBlending,
} from 'three/webgpu';

import {
  Fn, uniform, attribute, varying, positionLocal,
  vec2, vec3, vec4, float as tslFloat,
  dot, mix, smoothstep, clamp, max,
  exp, length,
} from 'three/tsl';

// ═══════════════════════════════════════════════════════════════════
// Constants — must match RenderPacket limits
// ═══════════════════════════════════════════════════════════════════

const MAX_LINES = 4096;
const MAX_MASKS = 512;
const MAX_BG    = 256;

/** How far past halfWidth the quad extends for glow falloff.
 *  At 2.5× hw the outer Gaussian (σ = 0.5·hw) is at 5σ → ≈ 0. */
const GLOW_PAD = 2.5;

/** Antialiased SDF padding for mask circles (pixels). */
const MASK_AA_PAD = 1.5;

// ─── Shared quad template (2 triangles) ─────────────────────────
//   x: 0 = P0 end,  1 = P1 end
//   y: -1 = left side, +1 = right side
const QUAD_POS = new Float32Array([
  0, -1, 0,
  0,  1, 0,
  1, -1, 0,
  1,  1, 0,
]);
const QUAD_IDX = new Uint16Array([0, 2, 1, 1, 2, 3]);

// ─── Mask quad template (unit square, centered) ─────────────────
const MASK_QUAD_POS = new Float32Array([
  -1, -1, 0,
  -1,  1, 0,
   1, -1, 0,
   1,  1, 0,
]);

// ═══════════════════════════════════════════════════════════════════
// LineRenderer
// ═══════════════════════════════════════════════════════════════════

export class LineRenderer {
  constructor() {
    // Pixel-space camera: (0,0) top-left, (768,672) bottom-right
    this.camera = new OrthographicCamera(0, 768, 0, 672, -1, 1);
    this.camera.updateProjectionMatrix();

    this.scene = new Scene();

    // Shared shake uniforms (applied in vertex shader only)
    this._uShakeX = uniform(0);
    this._uShakeY = uniform(0);

    // Build materials (line material is shared between bg and main)
    this._lineMaterial = this._buildLineMaterial();
    this._maskMaterial = this._buildMaskMaterial();

    // Create geometries and meshes
    this._initBgLines();
    this._initMasks();
    this._initMainLines();
  }

  // ═════════════════════════════════════════════════════════════════
  // Geometry + mesh init
  // ═════════════════════════════════════════════════════════════════

  /** Create an InstancedBufferGeometry with the line quad template
   *  and pre-allocated per-instance attribute buffers. */
  _createLineGeometry(maxInstances) {
    const geom = new InstancedBufferGeometry();
    geom.setAttribute('position', new BufferAttribute(QUAD_POS.slice(), 3));
    geom.setIndex(new BufferAttribute(QUAD_IDX.slice(), 1));

    const p0  = new InstancedBufferAttribute(new Float32Array(maxInstances * 2), 2);
    const p1  = new InstancedBufferAttribute(new Float32Array(maxInstances * 2), 2);
    const col = new InstancedBufferAttribute(new Float32Array(maxInstances * 3), 3);
    const prm = new InstancedBufferAttribute(new Float32Array(maxInstances * 2), 2);

    geom.setAttribute('aP0', p0);
    geom.setAttribute('aP1', p1);
    geom.setAttribute('aColor', col);
    geom.setAttribute('aParams', prm);
    geom.instanceCount = 0;

    return { geom, p0, p1, col, prm };
  }

  _initBgLines() {
    const slot = this._createLineGeometry(MAX_BG);
    this._bg = slot;

    const mesh = new Mesh(slot.geom, this._lineMaterial);
    mesh.frustumCulled = false;
    mesh.renderOrder = 0;
    mesh.visible = false;
    this._bgMesh = mesh;
    this.scene.add(mesh);
  }

  _initMasks() {
    const geom = new InstancedBufferGeometry();
    geom.setAttribute('position', new BufferAttribute(MASK_QUAD_POS.slice(), 3));
    geom.setIndex(new BufferAttribute(QUAD_IDX.slice(), 1));

    const center = new InstancedBufferAttribute(new Float32Array(MAX_MASKS * 2), 2);
    const radius = new InstancedBufferAttribute(new Float32Array(MAX_MASKS), 1);

    geom.setAttribute('aCenter', center);
    geom.setAttribute('aRadius', radius);
    geom.instanceCount = 0;

    this._mask = { geom, center, radius };

    const mesh = new Mesh(geom, this._maskMaterial);
    mesh.frustumCulled = false;
    mesh.renderOrder = 1;
    mesh.visible = false;
    this._maskMesh = mesh;
    this.scene.add(mesh);
  }

  _initMainLines() {
    const slot = this._createLineGeometry(MAX_LINES);
    this._main = slot;

    const mesh = new Mesh(slot.geom, this._lineMaterial);
    mesh.frustumCulled = false;
    mesh.renderOrder = 2;
    mesh.visible = false;
    this._mainMesh = mesh;
    this.scene.add(mesh);
  }

  // ═════════════════════════════════════════════════════════════════
  // TSL material builders
  // ═════════════════════════════════════════════════════════════════

  /**
   * Additive-blend line material with analytic 3-Gaussian glow.
   *
   * Vertex:  expand 4-vert quad into oriented rectangle around P0→P1.
   * Fragment: distance-to-segment → 3-Gaussian profile.
   *
   * The glow profile matches the original GlowRenderer's 3-pass strokes:
   *   Pass 1 (outer):  width 11,  alpha 0.07  →  σ = hw × 0.50
   *   Pass 2 (mid):    width 5.5, alpha 0.20  →  σ = hw × 0.26
   *   Pass 3 (core):   width 2,   alpha 1.00  →  σ = hw × 0.10
   */
  _buildLineMaterial() {
    const mat = new NodeMaterial();
    mat.transparent = true;
    mat.blending = AdditiveBlending;
    mat.depthTest = false;
    mat.depthWrite = false;

    // ── Per-instance attributes ──
    const aP0     = attribute('aP0');     // vec2 — segment start
    const aP1     = attribute('aP1');     // vec2 — segment end
    const aColor  = attribute('aColor');  // vec3 — rgb (0–1)
    const aParams = attribute('aParams'); // vec2 — (intensity, halfWidth)

    // ── Vertex: quad expansion ──
    const endpointT = positionLocal.x;   // 0 or 1 (which endpoint)
    const side      = positionLocal.y;   // -1 or +1 (which side of line)

    const hw  = aParams.y;
    const pad = hw.mul(GLOW_PAD);

    const dx      = aP1.sub(aP0);
    const len     = length(dx);
    const safeLen = max(len, tslFloat(0.001));
    const tangent = dx.div(safeLen);
    const normal  = vec2(tangent.y.negate(), tangent.x);

    // Lerp between endpoints, extend past ends for round caps, expand perpendicular for glow
    const base     = mix(aP0, aP1, endpointT);
    const worldPos = base
      .add(tangent.mul(endpointT.mul(2).sub(1)).mul(pad))
      .add(normal.mul(side).mul(pad));

    // Varyings — pre-shake world position and instance data for fragment
    const vWorldPos  = varying(worldPos,  'v_worldPos');
    const vP0        = varying(aP0,       'v_p0');
    const vP1        = varying(aP1,       'v_p1');
    const vColor     = varying(aColor,    'v_color');
    const vIntensity = varying(aParams.x, 'v_intensity');
    const vHalfWidth = varying(aParams.y, 'v_halfWidth');

    // Final position with shake offset
    const finalXY = worldPos.add(vec2(this._uShakeX, this._uShakeY));
    mat.positionNode = vec3(finalXY.x, finalXY.y, 0);

    // ── Fragment: analytic glow ──
    mat.fragmentNode = Fn(() => {
      // Distance from fragment to line segment
      const ab     = vP1.sub(vP0);
      const ap     = vWorldPos.sub(vP0);
      const abLen2 = dot(ab, ab);
      const t      = clamp(dot(ap, ab).div(max(abLen2, tslFloat(0.0001))), 0, 1);
      const closest = vP0.add(ab.mul(t));
      const d      = length(vWorldPos.sub(closest));

      // 3-Gaussian profile — sigmas scale with halfWidth
      const hwf = vHalfWidth;
      const s1  = hwf.mul(0.50);   // outer
      const s2  = hwf.mul(0.26);   // mid
      const s3  = hwf.mul(0.10);   // core

      const d2neg = d.mul(d).mul(-0.5);
      const eps   = tslFloat(0.00001);
      const g1 = exp(d2neg.div(max(s1.mul(s1), eps))).mul(0.07);
      const g2 = exp(d2neg.div(max(s2.mul(s2), eps))).mul(0.20);
      const g3 = exp(d2neg.div(max(s3.mul(s3), eps))).mul(1.00);

      const glow = g1.add(g2).add(g3);

      return vec4(vColor.mul(glow).mul(vIntensity), 1.0);
    })();

    return mat;
  }

  /**
   * Mask material — antialiased SDF circles, normal blend (solid black).
   *
   * Vertex:  expand unit quad to circle bounding box + AA padding.
   * Fragment: SDF circle → smooth alpha edge.
   */
  _buildMaskMaterial() {
    const mat = new NodeMaterial();
    mat.transparent = true;
    mat.blending = NormalBlending;
    mat.depthTest = false;
    mat.depthWrite = false;

    const aCenter = attribute('aCenter'); // vec2
    const aRadius = attribute('aRadius'); // float

    // Expand unit quad to circle bounds with AA padding
    const localXY = vec2(positionLocal.x, positionLocal.y);
    const padR    = aRadius.add(MASK_AA_PAD);
    const worldPos = aCenter.add(localXY.mul(padR));

    const vWorldPos = varying(worldPos, 'v_mWorldPos');
    const vCenter   = varying(aCenter,  'v_mCenter');
    const vRadius   = varying(aRadius,  'v_mRadius');

    const finalXY = worldPos.add(vec2(this._uShakeX, this._uShakeY));
    mat.positionNode = vec3(finalXY.x, finalXY.y, 0);

    mat.fragmentNode = Fn(() => {
      const d = length(vWorldPos.sub(vCenter));
      const alpha = tslFloat(1).sub(smoothstep(vRadius.sub(1), vRadius, d));
      return vec4(0, 0, 0, alpha);
    })();

    return mat;
  }

  // ═════════════════════════════════════════════════════════════════
  // Upload + render
  // ═════════════════════════════════════════════════════════════════

  /**
   * Upload RenderPacket data and draw all layers to the given target.
   *
   * @param {import('../RenderPacket.js').RenderPacket} packet
   * @param {import('three/webgpu').WebGPURenderer} renderer
   * @param {import('three/webgpu').RenderTarget|null} target — null for screen
   */
  render(packet, renderer, target = null, clear = true) {
    // Shake
    this._uShakeX.value = packet.shakeX;
    this._uShakeY.value = packet.shakeY;

    // Background lines
    this._uploadLineData(
      this._bg,
      packet.bgP0, packet.bgP1, packet.bgColor, packet.bgParams,
      packet.bgCount,
    );
    this._bgMesh.visible = packet.bgCount > 0;

    // Mask circles
    this._uploadMaskData(packet);
    this._maskMesh.visible = packet.maskCount > 0;

    // Main glow lines
    this._uploadLineData(
      this._main,
      packet.lineP0, packet.lineP1, packet.lineColor, packet.lineParams,
      packet.lineCount,
    );
    this._mainMesh.visible = packet.lineCount > 0;

    // Draw all layers (sorted by renderOrder: bg 0 → masks 1 → lines 2)
    renderer.setRenderTarget(target);
    if (clear) renderer.clear();
    renderer.render(this.scene, this.camera);
  }

  /** Copy packet arrays into attribute buffers and flag for upload. */
  _uploadLineData(slot, p0, p1, color, params, count) {
    if (count > 0) {
      slot.p0.array.set(p0.subarray(0, count * 2));
      slot.p1.array.set(p1.subarray(0, count * 2));
      slot.col.array.set(color.subarray(0, count * 3));
      slot.prm.array.set(params.subarray(0, count * 2));
    }
    slot.p0.needsUpdate = true;
    slot.p1.needsUpdate = true;
    slot.col.needsUpdate = true;
    slot.prm.needsUpdate = true;
    slot.geom.instanceCount = count;
  }

  _uploadMaskData(packet) {
    const count = packet.maskCount;
    if (count > 0) {
      this._mask.center.array.set(packet.maskCenter.subarray(0, count * 2));
      this._mask.radius.array.set(packet.maskRadius.subarray(0, count));
    }
    this._mask.center.needsUpdate = true;
    this._mask.radius.needsUpdate = true;
    this._mask.geom.instanceCount = count;
  }

  dispose() {
    this._bg.geom.dispose();
    this._mask.geom.dispose();
    this._main.geom.dispose();
    this._lineMaterial.dispose();
    this._maskMaterial.dispose();
  }
}
