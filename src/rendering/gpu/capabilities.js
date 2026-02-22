/**
 * WebGPU feature detection with fallback.
 *
 * Used by the shader overlay to decide whether to create a WebGPU canvas
 * or fall back to the existing WebGL pipeline.
 */

/**
 * Returns true when the browser exposes navigator.gpu AND a valid adapter
 * can be obtained. The adapter request is cached — subsequent calls are free.
 */
let _result = null;

export async function hasWebGPU() {
  if (_result !== null) return _result;

  if (typeof navigator === 'undefined' || !navigator.gpu) {
    _result = false;
    return false;
  }

  try {
    const adapter = await navigator.gpu.requestAdapter();
    _result = adapter !== null;
  } catch {
    _result = false;
  }

  return _result;
}

/**
 * Synchronous check — returns the cached result from a previous `hasWebGPU()`
 * call, or `false` if detection hasn't run yet.
 */
export function webGPUAvailable() {
  return _result === true;
}
