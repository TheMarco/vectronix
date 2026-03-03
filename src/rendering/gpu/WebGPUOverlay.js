/**
 * WebGPU overlay — Three.js TSL post-processing pipeline.
 * Drop-in replacement for the WebGL shaderOverlay when WebGPU is available.
 *
 * Both modes: 5-pass shared pipeline
 *   Passes 1-3: bloom downsample → H blur → V blur (shared)
 *   Pass 4: mode-specific composite (vector or CRT-Lottes) with phosphor persistence
 *   Pass 5: passthrough blit to screen
 */

import {
  WebGPURenderer, NodeMaterial, QuadMesh,
  CanvasTexture, RenderTarget,
  HalfFloatType, LinearFilter, NearestFilter, ClampToEdgeWrapping,
  Vector2,
} from 'three/webgpu';

import {
  Fn, texture, uv, uniform,
  vec2, vec3, vec4, float as tslFloat,
  dot, mix, smoothstep, step, clamp, max, min, abs,
  floor, fract, pow, exp, sqrt, sin, cos, mod,
  length, normalize, If, select,
} from 'three/tsl';

// LineRenderer + RenderPacket: disabled — Three.js WebGPU renderer.render()
// doesn't reliably render custom instanced geometry via scene/mesh path.
// GPU line rendering would need a fullscreen-quad fragment shader approach.
// import { LineRenderer } from './LineRenderer.js';
// import { RenderPacket } from '../RenderPacket.js';

// ═══════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════

const CURVATURE = 0.04;
const CORNER_RADIUS = 0.14;
const V_RES_X = 256, V_RES_Y = 224;
const V_TEXEL_X = 1 / V_RES_X, V_TEXEL_Y = 1 / V_RES_Y;
const FULL_TEXEL_X = 1 / 768, FULL_TEXEL_Y = 1 / 672;

// ═══════════════════════════════════════════════════════════════════
// TSL helper functions
// ═══════════════════════════════════════════════════════════════════

const tslLuma = Fn(([c]) => dot(c, vec3(0.299, 0.587, 0.114)));

const tslHash = Fn(([co, t]) =>
  fract(sin(dot(co.add(t), vec2(12.9898, 78.233))).mul(43758.5453))
);

const tslHash2 = Fn(([co]) =>
  fract(sin(dot(co, vec2(127.1, 311.7))).mul(43758.5453))
);

const tslNoise3 = Fn(([co, t]) => {
  const r = fract(sin(dot(co.add(t), vec2(12.9898, 78.233))).mul(43758.5453));
  const g = fract(sin(dot(co.add(t), vec2(93.9898, 67.345))).mul(43758.5453));
  const b = fract(sin(dot(co.add(t), vec2(41.9898, 29.876))).mul(43758.5453));
  return vec3(r, g, b).mul(2.0).sub(1.0);
});

// Barrel distortion
const tslCurveUV = Fn(([uvIn]) => {
  const c = uvIn.mul(2.0).sub(1.0);
  const curved = c.mul(dot(c, c).mul(CURVATURE).add(1.0));
  return curved.mul(0.5).add(0.5);
});

// Rounded rectangle SDF
const tslRoundedRectSDF = Fn(([uvIn, s, r]) => {
  const d = abs(uvIn.sub(0.5)).mul(2.0).sub(s).add(r);
  return min(max(d.x, d.y), tslFloat(0)).add(length(max(d, vec2(0)))).sub(r);
});

// sRGB linearization (piecewise, per-channel)
const tslLinearize = Fn(([x]) => {
  const lo = x.div(12.92);
  const hi = pow(max(x.add(0.055).div(1.055), tslFloat(0.0001)), tslFloat(2.4));
  return mix(lo, hi, step(tslFloat(0.04045), x));
});

// sRGB gamma encoding (piecewise, per-channel)
const tslGammaEnc = Fn(([x]) => {
  const lo = x.mul(12.92);
  const hi = pow(max(x, tslFloat(0.0001)), tslFloat(1.0 / 2.4)).mul(1.055).sub(0.055);
  return mix(lo, hi, step(tslFloat(0.0031308), x));
});

const tslToLinearSRGB = Fn(([c]) => vec3(tslLinearize(c.x), tslLinearize(c.y), tslLinearize(c.z)));
const tslToGammaSRGB = Fn(([c]) => vec3(tslGammaEnc(c.x), tslGammaEnc(c.y), tslGammaEnc(c.z)));

// exp2(x) via exp — TSL lacks native exp2
const tslExp2 = Fn(([x]) => exp(x.mul(0.693147)));

// CRT-Lottes generalized Gaussian: exp2(scale * pos^2)
const tslCrtGaus = Fn(([pos, scale]) => tslExp2(pos.mul(pos).mul(scale)));

// RGB → HSV
const tslRgb2Hsv = Fn(([c]) => {
  const K = vec4(0.0, tslFloat(-1).div(3), tslFloat(2).div(3), -1.0);
  const p = mix(vec4(c.b, c.g, K.w, K.z), vec4(c.g, c.b, K.x, K.y), step(c.b, c.g));
  const q = mix(vec4(p.x, p.y, p.w, c.r), vec4(c.r, p.y, p.z, p.x), step(p.x, c.r));
  const d = q.x.sub(min(q.w, q.y));
  const e = tslFloat(1e-10);
  return vec3(
    abs(q.z.add(q.w.sub(q.y).div(d.mul(6).add(e)))),
    d.div(q.x.add(e)),
    q.x,
  );
});

// ═══════════════════════════════════════════════════════════════════
// Vector color grading (blue phosphor aesthetic)
// ═══════════════════════════════════════════════════════════════════

const tslVectorColorGrade = Fn(([src]) => {
  const l = tslLuma(src);
  const result = vec3(0).toVar();

  If(l.greaterThanEqual(0.01), () => {
    const hsv = tslRgb2Hsv(src);
    const sat = hsv.y;

    If(sat.lessThan(0.12), () => {
      // Unsaturated → blue phosphor, fading to white at high brightness
      const e = pow(l, tslFloat(1.1));
      const r = e.mul(0.3).toVar();
      const g = e.mul(0.85).toVar();
      const b = e.mul(1.0);
      const hotness = smoothstep(0.4, 1.0, e);
      r.assign(mix(r, e, hotness));
      g.assign(mix(g, e, hotness));
      result.assign(vec3(r, g, b));
    }).Else(() => {
      const greenDom = src.g.greaterThan(src.r.mul(1.15)).and(src.g.greaterThan(src.b));

      If(greenDom, () => {
        // Green-dominant → blue phosphor
        const e = pow(l, tslFloat(1.1));
        const r = e.mul(0.3).toVar();
        const g = e.mul(0.85).toVar();
        const b = e.mul(1.0);
        const hot = max(e.sub(0.8), tslFloat(0)).div(0.2);
        r.assign(r.add(hot.mul(0.5)));
        g.assign(g.add(hot.mul(0.1)));
        result.assign(vec3(r, g, b));
      }).Else(() => {
        const isCyan = src.g.greaterThan(src.r.mul(1.5))
          .and(src.b.greaterThan(src.r.mul(1.5)))
          .and(src.b.div(src.g.add(0.001)).greaterThan(0.78));

        If(isCyan, () => {
          // Cyan — slight blue tint, mostly preserve
          const tR = src.r.mul(0.85);
          const tG = src.g;
          const tB = mix(src.b, src.b.mul(1.1), tslFloat(0.3));
          result.assign(vec3(tR, tG, tB).mul(1.1));
        }).Else(() => {
          // Everything else: preserve with subtle blue tint
          const blueTinted = src.mul(vec3(0.85, 0.9, 1.15));
          const blended = mix(src, blueTinted, tslFloat(0.12));
          const gray = tslLuma(blended);
          result.assign(mix(vec3(gray, gray, gray), blended, tslFloat(1.15)));
        });
      });
    });
  });

  return result;
});

// ═══════════════════════════════════════════════════════════════════
// Pass node builders — each returns a vec4 node for material.fragmentNode
// ═══════════════════════════════════════════════════════════════════

// --- Bloom downsample (half-res, soft-knee threshold) ---
function buildBloomDownsampleNode(sourceTex, resolutionU) {
  const uvCoord = uv();
  const texelSize = vec2(1).div(resolutionU);
  const ht = texelSize.mul(0.5);

  const a = texture(sourceTex,uvCoord.add(vec2(ht.x.negate(), ht.y.negate()))).rgb;
  const b = texture(sourceTex,uvCoord.add(vec2(ht.x, ht.y.negate()))).rgb;
  const c = texture(sourceTex,uvCoord.add(vec2(ht.x.negate(), ht.y))).rgb;
  const d = texture(sourceTex,uvCoord.add(vec2(ht.x, ht.y))).rgb;
  const color = a.add(b).add(c).add(d).mul(0.25);

  const lum = dot(color, vec3(0.299, 0.587, 0.114));
  const knee = tslFloat(0.25);
  const threshold = tslFloat(0.15);
  const soft = clamp(lum.sub(threshold).add(knee).div(knee.mul(2)), 0, 1);
  const contribution = max(soft.mul(soft), step(threshold.add(knee), lum));

  return vec4(color.mul(contribution), 1.0);
}

// --- 9-tap separable Gaussian blur ---
function buildBlurNode(inputTex, directionU, resolutionU) {
  const uvCoord = uv();
  const texelSize = directionU.div(resolutionU);

  // Kernel weights (sigma ~2.5)
  const w = [0.0162, 0.0540, 0.1216, 0.1945, 0.2270, 0.1945, 0.1216, 0.0540, 0.0162];
  let result = texture(inputTex, uvCoord).rgb.mul(w[4]);
  for (let i = 1; i <= 4; i++) {
    const off = texelSize.mul(i);
    result = result
      .add(texture(inputTex, uvCoord.sub(off)).rgb.mul(w[4 - i]))
      .add(texture(inputTex, uvCoord.add(off)).rgb.mul(w[4 + i]));
  }

  return vec4(result, 1.0);
}

// --- Vector composite (the big one) ---
function buildVectorCompositeNode(
  sourceTex, bloomTex, prevFrameTexNode,
  resolutionU, timeU, phosphorDecayU,
) {
  return Fn(() => {
  const uvCoord = uv();
  const texel = vec2(FULL_TEXEL_X, FULL_TEXEL_Y);

  // ── CRT tube boundary — rounded rectangle SDF (matches WebGL) ──
  const cornerDist = tslRoundedRectSDF(uvCoord, vec2(0.96, 0.96), tslFloat(CORNER_RADIUS));
  const cornerMask = tslFloat(1).sub(smoothstep(tslFloat(-0.003), tslFloat(0.005), cornerDist));

  // ── Barrel distortion (content) ──
  const curved = tslCurveUV(uvCoord);

  // ── Edge beam defocus (9-tap, stronger at edges) ──
  const fromCenter = curved.sub(0.5);
  const edgeDist = dot(fromCenter, fromCenter).mul(2.0);
  // Beam spot size variation — bright content widens the defocus
  const centerBright = tslLuma(texture(sourceTex,curved).rgb);
  const defocusR = edgeDist.mul(1.5).add(centerBright.mul(1.5));

  const clampUV = (v) => clamp(v, 0.0, 1.0);

  // Sharp sample for center, blurred for edges
  const sharp = texture(sourceTex,curved).rgb;
  const blurred = texture(sourceTex,curved).rgb.mul(0.40)
    .add(texture(sourceTex,clampUV(curved.add(vec2(texel.x.mul(defocusR).negate(), 0)))).rgb.mul(0.10))
    .add(texture(sourceTex,clampUV(curved.add(vec2(texel.x.mul(defocusR), 0)))).rgb.mul(0.10))
    .add(texture(sourceTex,clampUV(curved.add(vec2(0, texel.y.mul(defocusR).negate())))).rgb.mul(0.10))
    .add(texture(sourceTex,clampUV(curved.add(vec2(0, texel.y.mul(defocusR))))).rgb.mul(0.10))
    .add(texture(sourceTex,clampUV(curved.add(vec2(texel.x.mul(defocusR).negate(), texel.y.mul(defocusR).negate()).mul(0.7)))).rgb.mul(0.05))
    .add(texture(sourceTex,clampUV(curved.add(vec2(texel.x.mul(defocusR), texel.y.mul(defocusR).negate()).mul(0.7)))).rgb.mul(0.05))
    .add(texture(sourceTex,clampUV(curved.add(vec2(texel.x.mul(defocusR).negate(), texel.y.mul(defocusR)).mul(0.7)))).rgb.mul(0.05))
    .add(texture(sourceTex,clampUV(curved.add(vec2(texel.x.mul(defocusR), texel.y.mul(defocusR)).mul(0.7)))).rgb.mul(0.05));

  // Only defocus when radius is significant (center stays sharp)
  const core = select(defocusR.lessThan(0.3), sharp, blurred);

  // ── Color grade + saturation boost ──
  const graded = tslVectorColorGrade(core);
  const gray = tslLuma(graded);
  const color = mix(vec3(gray, gray, gray), graded, tslFloat(1.9)).toVar();

  // ── Deflection brightness boost — beam brightens at screen edges ──
  const deflectionBoost = dot(fromCenter, fromCenter).mul(0.15).add(1.0);
  color.assign(color.mul(deflectionBoost));

  // ── Bloom (color-graded, slightly less than WebGL baseline) ──
  const bloomUV = curved;
  const bloomSample = texture(bloomTex, bloomUV).rgb;
  const bloomGraded = tslVectorColorGrade(bloomSample);
  // Dynamic bloom: estimate screen load from bloom texture
  const loadSampleV = texture(bloomTex, vec2(0.25, 0.75)).rgb
    .add(texture(bloomTex, vec2(0.75, 0.75)).rgb)
    .add(texture(bloomTex, vec2(0.25, 0.25)).rgb)
    .add(texture(bloomTex, vec2(0.75, 0.25)).rgb);
  const screenLoadV = tslLuma(loadSampleV.mul(0.25));
  const dynBloomV = screenLoadV.mul(0.3).add(1.0).mul(0.08);
  color.assign(color.add(bloomGraded.mul(dynBloomV)));

  // ── Chromatic aberration ──
  const caStrength = dot(fromCenter, fromCenter).mul(0.008);
  const caOffset = fromCenter.mul(caStrength);
  const rShiftLuma = tslLuma(tslVectorColorGrade(texture(sourceTex,clampUV(curved.add(caOffset))).rgb));
  const bShiftLuma = tslLuma(tslVectorColorGrade(texture(sourceTex,clampUV(curved.sub(caOffset))).rgb));
  const colorLuma = tslLuma(color);
  const newR = mix(color.r, color.r.mul(rShiftLuma.sub(colorLuma).mul(0.3).add(1.0)), tslFloat(0.5));
  const newB = mix(color.b, color.b.mul(bShiftLuma.sub(colorLuma).mul(0.3).add(1.0)), tslFloat(0.5));
  color.assign(vec3(newR, color.g, newB));

  // ── Phosphor grain ──
  const fragCoord = uvCoord.mul(resolutionU);
  const grain = tslHash2(fragCoord).mul(0.08).sub(0.04);
  const grainAmt = smoothstep(0.08, 0.6, tslLuma(color));
  color.assign(color.add(grain.mul(grainAmt)));

  // ── Glass surface reflection (static, not drifting) ──
  const glassCoord = curved.mul(2).sub(1);
  const glassHL = max(tslFloat(1).sub(dot(glassCoord, glassCoord).mul(0.5)), tslFloat(0));
  color.assign(color.add(vec3(0.002, 0.003, 0.006).mul(glassHL)));

  // ── Blue phosphor tint (subtle — only where content exists) ──
  const blueVar = sin(timeU.mul(0.4).add(curved.y.mul(4)).add(curved.x.mul(2.5))).mul(0.3).add(0.7);
  const blueNoise = tslHash2(floor(fragCoord.mul(0.5))).mul(0.15);
  const blueTint = vec3(0.006, 0.009, 0.022).mul(blueVar.add(blueNoise));
  const blueGate = smoothstep(0.08, 0.6, tslLuma(color));
  color.assign(color.add(blueTint.mul(blueGate)));

  // ── Analog noise ──
  const noise = tslHash(fragCoord, timeU).sub(0.5).mul(0.01);
  color.assign(color.add(noise));

  // ── Beam flicker ──
  const flicker = sin(timeU.mul(8.3)).mul(0.008).add(sin(timeU.mul(17.1)).mul(0.004));
  color.assign(color.mul(flicker.add(1)));

  // ── Phosphor persistence (per-channel, max blend) ──
  const jitter = vec2(
    tslHash(fragCoord, timeU).sub(0.5),
    tslHash(vec2(fragCoord.y, fragCoord.x), timeU.add(17)).sub(0.5),
  ).mul(0.0004);
  const prevUV = uvCoord.add(jitter);
  const prevFull = prevFrameTexNode.sample(prevUV);
  const prev = prevFull.rgb;
  color.assign(max(color, prev.mul(phosphorDecayU)));

  // ── Beam dwell glow — bright spots emit extra blue phosphor light ──
  const dwellAmt = pow(tslLuma(color), tslFloat(2.0)).mul(0.08);
  color.assign(color.add(vec3(0.3, 0.6, 1.0).mul(dwellAmt)));

  // ── Phosphor burn-in via alpha channel ──
  const burnInPrev = prevFull.a;
  const newBurnIn = max(burnInPrev.mul(0.998), tslLuma(color).mul(0.015));
  color.assign(color.add(vec3(0.2, 0.4, 1.0).mul(newBurnIn).mul(0.05)));

  // ── Apply corner mask & output ──
  color.assign(color.mul(cornerMask));
  return vec4(clamp(color, 0, 1), newBurnIn);
  })();
}

// --- CRT raster composite (multi-pass with CRT-Lottes scanlines + phosphor persistence) ---
function buildCrtCompositeNode(sourceTex, bloomTex, prevFrameTexNode, resolutionU, timeU, phosphorDecayU) {
  // CRT-Lottes constants (tunable)
  const HARD_SCAN = -14.0;  // scanline beam sharpness (more negative = tighter gap)
  const HARD_PIX  = -5.0;   // pixel sharpness (more negative = sharper edges)
  const BLOOM_AMOUNT = 0.07;

  return Fn(() => {
  const uvCoord = uv();
  const vRes = vec2(V_RES_X, V_RES_Y);
  const vTexel = vec2(V_TEXEL_X, V_TEXEL_Y);

  // ── CRT tube boundary — rounded rectangle SDF (matches WebGL) ──
  const cornerDist = tslRoundedRectSDF(uvCoord, vec2(0.96, 0.96), tslFloat(CORNER_RADIUS));
  const cornerMask = tslFloat(1).sub(smoothstep(tslFloat(-0.003), tslFloat(0.005), cornerDist));

  // ── Barrel distortion (content) ──
  const curved = tslCurveUV(uvCoord).toVar();

  // ── Per-scanline H-jitter (minimal — arcade monitors were maintained) ──
  const jitterLine = floor(curved.y.mul(V_RES_Y));
  const hJitter = fract(sin(jitterLine.mul(54.37).add(floor(timeU.mul(12)).mul(7.13))).mul(43758.5)).sub(0.5);
  curved.assign(vec2(curved.x.add(hJitter.mul(0.001)), curved.y));
  curved.assign(clamp(curved, 0.0, 1.0));

  // Display pitch (physical pixels per virtual pixel)
  const pitch = resolutionU.y.div(V_RES_Y);

  // ── CRT-Lottes scanline compositor ──
  const vPos = curved.mul(vRes);
  const fp = fract(vPos).sub(0.5);     // fractional pos in pixel, [-0.5, 0.5]
  const basePx = floor(vPos);           // integer virtual pixel

  // Fetch virtual pixel at integer offset (dx, dy) → linear sRGB
  const fetchPx = (dx, dy) => {
    const fetchUV = basePx.add(vec2(dx, dy)).add(0.5).div(vRes);
    return tslToLinearSRGB(texture(sourceTex,clamp(fetchUV, 0.0, 1.0)).rgb);
  };

  // Center pixel: 5-tap max-brightness (catches thin vector lines between pixels)
  const centerUV = basePx.add(0.5).div(vRes);
  const vOff = vec2(0, vTexel.y.mul(0.4));
  const hOff = vec2(vTexel.x.mul(0.4), 0);
  const ms0 = tslToLinearSRGB(texture(sourceTex,centerUV).rgb);
  const ms1 = tslToLinearSRGB(texture(sourceTex,clamp(centerUV.sub(vOff), 0.0, 1.0)).rgb);
  const ms2 = tslToLinearSRGB(texture(sourceTex,clamp(centerUV.add(vOff), 0.0, 1.0)).rgb);
  const ms3 = tslToLinearSRGB(texture(sourceTex,clamp(centerUV.sub(hOff), 0.0, 1.0)).rgb);
  const ms4 = tslToLinearSRGB(texture(sourceTex,clamp(centerUV.add(hOff), 0.0, 1.0)).rgb);
  const centerMax = max(max(max(ms0, ms1), max(ms2, ms3)), ms4);

  // Pixel weights (horizontal Gaussian)
  const hpx = tslFloat(HARD_PIX);
  const wp_n2 = tslCrtGaus(fp.x.add(2.0), hpx);
  const wp_n1 = tslCrtGaus(fp.x.add(1.0), hpx);
  const wp_0  = tslCrtGaus(fp.x, hpx);
  const wp_p1 = tslCrtGaus(fp.x.sub(1.0), hpx);
  const wp_p2 = tslCrtGaus(fp.x.sub(2.0), hpx);

  // Center scanline: 5-tap horizontal
  const c_n2 = fetchPx(-2, 0);
  const c_n1 = fetchPx(-1, 0);
  const c_p1 = fetchPx(1, 0);
  const c_p2 = fetchPx(2, 0);
  const wSumC = wp_n2.add(wp_n1).add(wp_0).add(wp_p1).add(wp_p2);
  const horzC = c_n2.mul(wp_n2).add(c_n1.mul(wp_n1)).add(centerMax.mul(wp_0))
    .add(c_p1.mul(wp_p1)).add(c_p2.mul(wp_p2)).div(wSumC);

  // Above scanline: 3-tap horizontal
  const a_n1 = fetchPx(-1, -1);
  const a_0  = fetchPx(0, -1);
  const a_p1 = fetchPx(1, -1);
  const wSumA = wp_n1.add(wp_0).add(wp_p1);
  const horzA = a_n1.mul(wp_n1).add(a_0.mul(wp_0)).add(a_p1.mul(wp_p1)).div(wSumA);

  // Below scanline: 3-tap horizontal
  const b_n1 = fetchPx(-1, 1);
  const b_0  = fetchPx(0, 1);
  const b_p1 = fetchPx(1, 1);
  const horzB = b_n1.mul(wp_n1).add(b_0.mul(wp_0)).add(b_p1.mul(wp_p1)).div(wSumA);

  // Scanline weights with brightness-dependent beam widening
  const bright = max(max(horzC.r, horzC.g), horzC.b);
  const scanH = mix(tslFloat(HARD_SCAN), tslFloat(HARD_SCAN * 0.7), bright);
  const ws_above  = tslCrtGaus(fp.y.add(1.0), scanH);
  const ws_center = tslCrtGaus(fp.y, scanH);
  const ws_below  = tslCrtGaus(fp.y.sub(1.0), scanH);

  const color = horzA.mul(ws_above).add(horzC.mul(ws_center)).add(horzB.mul(ws_below)).toVar();

  // Pitch-adaptive: fade scanlines at low pitch to prevent moire
  color.assign(mix(horzC, color, smoothstep(1.0, 2.0, pitch)));

  // ── Beam overshoot / ringing at sharp luminance transitions ──
  const centerLuma = tslLuma(centerMax);
  const leftLuma = tslLuma(c_n1);
  const rightLuma = tslLuma(c_p1);
  const edgeDet = abs(centerLuma.sub(leftLuma)).add(abs(centerLuma.sub(rightLuma)));
  const overshoot = centerMax.sub(c_n1.add(c_p1).mul(0.5)).mul(edgeDet).mul(0.15);
  color.assign(color.add(overshoot));

  // ── Bloom / halation from pre-blurred bloom texture (dynamic) ──
  const loadSampleC = texture(bloomTex, vec2(0.25, 0.75)).rgb
    .add(texture(bloomTex, vec2(0.75, 0.75)).rgb)
    .add(texture(bloomTex, vec2(0.25, 0.25)).rgb)
    .add(texture(bloomTex, vec2(0.75, 0.25)).rgb);
  const screenLoadC = tslLuma(loadSampleC.mul(0.25));
  const dynBloomC = screenLoadC.mul(0.3).add(1.0).mul(BLOOM_AMOUNT);
  const bloomSample = tslToLinearSRGB(texture(bloomTex, curved).rgb);
  color.assign(color.add(bloomSample.mul(dynBloomC)));

  // ── Aperture grille (Trinitron-style vertical RGB stripes, fixed 3px) ──
  const fragCoord = uvCoord.mul(resolutionU);
  const mx = mod(fragCoord.x, tslFloat(3));
  const MASK_STR = 0.12;
  const maskR = select(mx.lessThan(1), tslFloat(1 + MASK_STR), tslFloat(1 - MASK_STR * 0.5));
  const maskG = select(mx.greaterThanEqual(1).and(mx.lessThan(2)), tslFloat(1 + MASK_STR), tslFloat(1 - MASK_STR * 0.5));
  const maskB = select(mx.greaterThanEqual(2), tslFloat(1 + MASK_STR), tslFloat(1 - MASK_STR * 0.5));
  const grilleSep = smoothstep(0.0, 0.5, mx).mul(smoothstep(3.0, 2.5, mx));
  const grilleMask = vec3(maskR, maskG, maskB).mul(mix(tslFloat(0.88), tslFloat(1), grilleSep));
  color.assign(color.mul(mix(vec3(1), grilleMask, smoothstep(1.0, 2.0, pitch))));

  // ── Moire shimmer — subtle interference between aperture grille and scanlines ──
  const moirePhase = sin(curved.y.mul(V_RES_Y).mul(Math.PI).add(mx.mul(Math.PI * 0.667)).add(timeU.mul(2.0)));
  color.assign(color.mul(moirePhase.mul(0.008).add(1.0)));

  // ── RGB convergence error at screen edges ──
  const convergeDist = length(curved.sub(0.5));
  const convergeAmt = convergeDist.mul(convergeDist).mul(0.008);
  const convergeDir = normalize(curved.sub(0.5).add(0.001));
  const rUV = clamp(curved.add(convergeDir.mul(convergeAmt)), 0.0, 1.0);
  const bUV = clamp(curved.sub(convergeDir.mul(convergeAmt)), 0.0, 1.0);
  const convergR = mix(color.r, tslToLinearSRGB(texture(sourceTex,rUV).rgb).x, tslFloat(0.6));
  const convergB = mix(color.b, tslToLinearSRGB(texture(sourceTex,bUV).rgb).z, tslFloat(0.6));
  color.assign(vec3(convergR, color.g, convergB));

  // ── Warm color temperature ──
  color.assign(color.mul(vec3(0.96, 0.93, 0.88)));

  // ── Saturation boost ──
  const satGray = dot(color, vec3(0.299, 0.587, 0.114));
  color.assign(mix(vec3(satGray, satGray, satGray), color, tslFloat(1.08)));

  // ── Interlace flicker ──
  const virtualY = curved.y.mul(V_RES_Y);
  const fieldPhase = mod(floor(timeU.mul(30)), tslFloat(2));
  const scanIdx = floor(virtualY);
  const interlace = mod(scanIdx.add(fieldPhase), tslFloat(2));
  color.assign(color.mul(tslFloat(1).sub(interlace.mul(0.015).mul(smoothstep(1.5, 2.5, pitch)))));

  // ── Vignette ──
  const ctr = curved.mul(2).sub(1);
  color.assign(color.mul(tslFloat(1).sub(dot(ctr, ctr).mul(0.12))));

  // ── Rolling scan band ──
  const bandPos = fract(curved.y.mul(0.5).sub(timeU.mul(0.08)));
  const band = smoothstep(0.0, 0.15, bandPos).mul(smoothstep(0.45, 0.15, bandPos));
  color.assign(color.mul(band.mul(0.12).add(1)));

  // ── Power supply flicker ──
  const psFlicker = sin(timeU.mul(13.7)).mul(0.5).add(sin(timeU.mul(7.3)).mul(0.3)).add(sin(timeU.mul(23.1)).mul(0.2));
  const cb = max(max(color.r, color.g), color.b);
  color.assign(color.mul(psFlicker.mul(0.08).mul(cb.mul(0.5).add(1)).add(1)));

  // ── CRT phosphor persistence (P22 — short 2-3 frame trails) ──
  const prevCrt = tslToLinearSRGB(prevFrameTexNode.sample(uvCoord).rgb);
  color.assign(max(color, prevCrt.mul(phosphorDecayU)));

  // ── Proper sRGB gamma encoding ──
  color.assign(tslToGammaSRGB(clamp(color, 0, 1)));

  // ── Analog RGB noise at virtual pixel resolution, quantized to 30fps ──
  const noiseTime = floor(timeU.mul(30)).div(30);
  color.assign(color.add(tslNoise3(floor(vPos), noiseTime).mul(0.003)));

  // ── Corner mask ──
  color.assign(color.mul(cornerMask));

  return vec4(clamp(color, 0, 1), 0.0);
  })();
}

// --- Passthrough blit (FBO → screen) ---
function buildPassthroughNode(inputTexNode) {
  return vec4(inputTexNode.sample(uv()).rgb, 1.0);
}

// ═══════════════════════════════════════════════════════════════════
// Factory — creates the WebGPU overlay (drop-in for createShaderOverlay)
// ═══════════════════════════════════════════════════════════════════

export async function createWebGPUOverlay(gameCanvas) {
  // ── Canvas setup (same DOM pattern as WebGL overlay) ──
  const overlay = document.createElement('canvas');
  overlay.style.position = 'absolute';
  overlay.style.pointerEvents = 'none';
  overlay.style.zIndex = '1000';
  overlay.id = 'scanline-overlay';

  const updateOverlayPosition = () => {
    const rect = gameCanvas.getBoundingClientRect();
    overlay.style.left = rect.left + 'px';
    overlay.style.top = rect.top + 'px';
    overlay.width = rect.width;
    overlay.height = rect.height;
    overlay.style.width = rect.width + 'px';
    overlay.style.height = rect.height + 'px';
  };

  document.body.appendChild(overlay);
  setTimeout(updateOverlayPosition, 0);
  window.addEventListener('resize', updateOverlayPosition);
  window.addEventListener('scroll', updateOverlayPosition);

  // ── WebGPU renderer ──
  const renderer = new WebGPURenderer({ canvas: overlay, antialias: false });
  try {
    await renderer.init();
  } catch (err) {
    console.warn('[WebGPUOverlay] Renderer init failed, falling back to WebGL:', err);
    overlay.remove();
    window.removeEventListener('resize', updateOverlayPosition);
    window.removeEventListener('scroll', updateOverlayPosition);
    return null;
  }
  renderer.autoClear = false;
  renderer.setClearColor(0x000000, 0);

  console.log('[WebGPUOverlay] WebGPU renderer initialized');

  // ── Source texture from Phaser canvas ──
  const sourceTexture = new CanvasTexture(gameCanvas);
  sourceTexture.flipY = false; // WebGPU: canvas is already Y=0 at top
  sourceTexture.minFilter = LinearFilter;
  sourceTexture.magFilter = LinearFilter;
  sourceTexture.wrapS = ClampToEdgeWrapping;
  sourceTexture.wrapT = ClampToEdgeWrapping;
  sourceTexture.generateMipmaps = false;

  // ── Render targets ──
  const makeTarget = (w, h) => new RenderTarget(w, h, {
    type: HalfFloatType,
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    wrapS: ClampToEdgeWrapping,
    wrapT: ClampToEdgeWrapping,
    generateMipmaps: false,
    depthBuffer: false,
    stencilBuffer: false,
  });

  const bloomTargetA = makeTarget(1, 1);
  const bloomTargetB = makeTarget(1, 1);
  const persistTargetA = makeTarget(1, 1);
  const persistTargetB = makeTarget(1, 1);
  let fullW = 0, fullH = 0, bloomW = 0, bloomH = 0;

  function ensureTargets(w, h) {
    if (fullW === w && fullH === h) return;
    const bw = Math.max(1, Math.floor(w / 2));
    const bh = Math.max(1, Math.floor(h / 2));
    bloomTargetA.setSize(bw, bh);
    bloomTargetB.setSize(bw, bh);
    persistTargetA.setSize(w, h);
    persistTargetB.setSize(w, h);
    fullW = w; fullH = h;
    bloomW = bw; bloomH = bh;
  }

  // ── Uniforms ──
  const uTime = uniform(0);
  const uResolution = uniform(new Vector2(768, 672));
  const uSourceResolution = uniform(new Vector2(768, 672));
  const uBloomResolution = uniform(new Vector2(384, 336));
  const uPhosphorDecay = uniform(0.68);

  // ── Texture nodes for swappable targets ──
  // prevFrame: composite reads from the OTHER persist target (ping-pong)
  const prevFrameTexNode = texture(persistTargetB.texture);
  // passthrough output: reads from the JUST-WRITTEN persist target
  const passthroughTexNode = texture(persistTargetA.texture);

  // ── Build materials ──
  const quad = new QuadMesh();

  // Post-processing reads directly from sourceTexture (Phaser canvas).
  // GPU lines are rendered as an additive overlay after post-processing.

  // Bloom downsample
  const bloomDownsampleMat = new NodeMaterial();
  bloomDownsampleMat.fragmentNode = buildBloomDownsampleNode(sourceTexture, uSourceResolution);

  // Blur H: bloomA → bloomB
  const blurHDirection = uniform(new Vector2(1, 0));
  const blurHMat = new NodeMaterial();
  blurHMat.fragmentNode = buildBlurNode(bloomTargetA.texture, blurHDirection, uBloomResolution);

  // Blur V: bloomB → bloomA
  const blurVDirection = uniform(new Vector2(0, 1));
  const blurVMat = new NodeMaterial();
  blurVMat.fragmentNode = buildBlurNode(bloomTargetB.texture, blurVDirection, uBloomResolution);

  // Vector composite
  const vectorCompositeMat = new NodeMaterial();
  vectorCompositeMat.fragmentNode = buildVectorCompositeNode(
    sourceTexture, bloomTargetA.texture, prevFrameTexNode,
    uResolution, uTime, uPhosphorDecay,
  );

  // Passthrough blit
  const passthroughMat = new NodeMaterial();
  passthroughMat.fragmentNode = buildPassthroughNode(passthroughTexNode);

  // CRT composite (multi-pass with CRT-Lottes scanlines + phosphor persistence)
  const crtCompositeMat = new NodeMaterial();
  crtCompositeMat.fragmentNode = buildCrtCompositeNode(
    sourceTexture, bloomTargetA.texture, prevFrameTexNode,
    uResolution, uTime, uPhosphorDecay,
  );

  // ── State ──
  let savedShader = 'vector';
  try { savedShader = localStorage.getItem('vectronix-display-mode') || 'vector'; } catch (e) { /* noop */ }
  let activeShaderName = (savedShader === 'crt') ? 'crt' : 'vector';
  let currentPhosphorDecay = 0.35;
  let pingPong = 0;
  let lastRenderTime = 0;

  // ── Render loop ──
  function render() {
    updateOverlayPosition();
    if (overlay.width <= 0 || overlay.height <= 0 ||
        !gameCanvas || gameCanvas.width <= 0 || gameCanvas.height <= 0) {
      requestAnimationFrame(render);
      return;
    }

    const now = performance.now() / 1000;
    const dt = lastRenderTime > 0 ? Math.min(now - lastRenderTime, 0.1) : 1 / 60;
    lastRenderTime = now;

    // Update uniforms
    uTime.value = now;
    uResolution.value.set(overlay.width, overlay.height);
    ensureTargets(overlay.width, overlay.height);
    uBloomResolution.value.set(bloomW, bloomH);
    uSourceResolution.value.set(gameCanvas.width, gameCanvas.height);

    // Upload Phaser canvas (needed for HUD overlay or fallback blit)
    sourceTexture.needsUpdate = true;

    // Adjust source texture filtering per mode
    sourceTexture.minFilter = activeShaderName === 'crt' ? NearestFilter : LinearFilter;
    sourceTexture.magFilter = activeShaderName === 'crt' ? NearestFilter : LinearFilter;

    // ── Post-processing (5-pass pipeline, both modes) ──

    // Framerate-independent phosphor decay (both modes, different base values)
    const decayBase = activeShaderName === 'vector' ? currentPhosphorDecay : 0.15;
    uPhosphorDecay.value = Math.pow(decayBase, dt * 60.0);

    // Passes 1-3: Bloom downsample → H blur → V blur (shared)
    quad.material = bloomDownsampleMat;
    renderer.setRenderTarget(bloomTargetA);
    renderer.setSize(bloomW, bloomH, false);
    quad.render(renderer);

    quad.material = blurHMat;
    renderer.setRenderTarget(bloomTargetB);
    quad.render(renderer);

    quad.material = blurVMat;
    renderer.setRenderTarget(bloomTargetA);
    quad.render(renderer);

    // Pass 4: Composite (mode-specific material)
    // Both modes write to persist target (ping-pong for phosphor persistence)
    const writeTarget = pingPong === 0 ? persistTargetA : persistTargetB;
    const readTarget = pingPong === 0 ? persistTargetB : persistTargetA;
    prevFrameTexNode.value = readTarget.texture;

    quad.material = activeShaderName === 'vector' ? vectorCompositeMat : crtCompositeMat;
    renderer.setRenderTarget(writeTarget);
    renderer.setSize(fullW, fullH, false);
    quad.render(renderer);

    // Pass 5: Passthrough blit → screen
    passthroughTexNode.value = writeTarget.texture;
    quad.material = passthroughMat;
    renderer.setRenderTarget(null);
    renderer.setSize(overlay.width, overlay.height, false);
    quad.render(renderer);

    // Advance ping-pong for both modes (both now use phosphor persistence)
    pingPong = 1 - pingPong;

    requestAnimationFrame(render);
  }

  setTimeout(render, 50);

  // ── Public API (same contract as WebGL overlay + GPU line renderer) ──
  return {
    overlay,
    setShader(name) {
      if (name === 'crt' || name === 'vector') {
        activeShaderName = name;
        // Clear persist targets to prevent ghost artifacts from other mode
        renderer.setRenderTarget(persistTargetA);
        renderer.clear();
        renderer.setRenderTarget(persistTargetB);
        renderer.clear();
        renderer.setRenderTarget(null);
        try { localStorage.setItem('vectronix-display-mode', name); } catch (e) { /* noop */ }
      }
    },
    setPhosphorDecay(value) {
      currentPhosphorDecay = value;
    },
    getShaderName() {
      return activeShaderName;
    },
    /** GPU line rendering disabled — Three.js WebGPU doesn't support
     *  renderer.render() with custom instanced geometry reliably. */
    gpuLinesReady: false,
  };
}
