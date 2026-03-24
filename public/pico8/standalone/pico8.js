// PICO-8 API Shim — Canvas-based runtime for standalone deployment
// Implements the subset of PICO-8 API used by Pocket Swarm

// eslint-disable-next-line no-var
var P8 = (() => {
  // PICO-8 16-color palette
  const PALETTE = [
    '#000000', '#1D2B53', '#7E2553', '#008751',
    '#AB5236', '#5F574F', '#C2C3C7', '#FFF1E8',
    '#FF004D', '#FFA300', '#FFEC27', '#00E436',
    '#29ADFF', '#83769C', '#FF77A8', '#FFCCAA'
  ];
  const PALETTE_RGB = PALETTE.map(hex => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
  });

  let canvas, ctx, imageData, pixels;
  let spriteSheet = null; // ImageData of the 128x128 spritesheet
  let spritePixels = null; // Uint8Array of palette indices (128x128)
  let _drawColor = 7;
  let _cameraX = 0, _cameraY = 0;

  // Input state
  const btnState = [false, false, false, false, false, false];
  const btnPrev = [false, false, false, false, false, false];

  // PICO-8 button mapping: 0=left 1=right 2=up 3=down 4=z/n/c 5=x/m/v
  const keyMap = {
    'ArrowLeft': 0, 'ArrowRight': 1, 'ArrowUp': 2, 'ArrowDown': 3,
    'a': 0, 'A': 0, 'd': 1, 'D': 1,
    ' ': 4, 'Enter': 5
  };
  // Space triggers both btn 4 and 5 so btnp(4)||btnp(5) works for start+fire
  const dualBtnKeys = { ' ': [4, 5] };

  // Persistence (localStorage-based dget/dset)
  let cartId = '';
  const persistData = new Float64Array(64);

  // ---- Font (PICO-8 built-in 4x6 font approximation) ----
  // Each char is 4 pixels wide, stored as array of 5 rows of 4-bit patterns
  const FONT = {};
  function defineFont() {
    const chars = {
      '0': [0x6,0x9,0x9,0x9,0x6], '1': [0x2,0x6,0x2,0x2,0x7], '2': [0x6,0x9,0x2,0x4,0xf],
      '3': [0x6,0x9,0x2,0x9,0x6], '4': [0x9,0x9,0xf,0x1,0x1], '5': [0xf,0x8,0xe,0x1,0xe],
      '6': [0x6,0x8,0xe,0x9,0x6], '7': [0xf,0x1,0x2,0x4,0x4], '8': [0x6,0x9,0x6,0x9,0x6],
      '9': [0x6,0x9,0x7,0x1,0x6],
      'a': [0x6,0x9,0xf,0x9,0x9], 'b': [0xe,0x9,0xe,0x9,0xe], 'c': [0x7,0x8,0x8,0x8,0x7],
      'd': [0xe,0x9,0x9,0x9,0xe], 'e': [0xf,0x8,0xe,0x8,0xf], 'f': [0xf,0x8,0xe,0x8,0x8],
      'g': [0x7,0x8,0xb,0x9,0x6], 'h': [0x9,0x9,0xf,0x9,0x9], 'i': [0x7,0x2,0x2,0x2,0x7],
      'j': [0x1,0x1,0x1,0x9,0x6], 'k': [0x9,0xa,0xc,0xa,0x9], 'l': [0x8,0x8,0x8,0x8,0xf],
      'm': [0x9,0xf,0xf,0x9,0x9], 'n': [0x9,0xd,0xf,0xb,0x9], 'o': [0x6,0x9,0x9,0x9,0x6],
      'p': [0xe,0x9,0xe,0x8,0x8], 'q': [0x6,0x9,0x9,0xb,0x7], 'r': [0xe,0x9,0xe,0xa,0x9],
      's': [0x7,0x8,0x6,0x1,0xe], 't': [0x7,0x2,0x2,0x2,0x2], 'u': [0x9,0x9,0x9,0x9,0x6],
      'v': [0x9,0x9,0x9,0x6,0x6], 'w': [0x9,0x9,0xf,0xf,0x9], 'x': [0x9,0x9,0x6,0x9,0x9],
      'y': [0x9,0x9,0x7,0x1,0x6], 'z': [0xf,0x1,0x6,0x8,0xf],
      ' ': [0,0,0,0,0], '.': [0,0,0,0,0x2], ',': [0,0,0,0x2,0x4], ':': [0,0x2,0,0x2,0],
      '!': [0x2,0x2,0x2,0,0x2], '?': [0x6,0x1,0x2,0,0x2], '-': [0,0,0xf,0,0],
      '+': [0,0x2,0x7,0x2,0], '/': [0x1,0x2,0x4,0x8,0], '(': [0x2,0x4,0x4,0x4,0x2],
      ')': [0x4,0x2,0x2,0x2,0x4], '"': [0x5,0x5,0,0,0], '\'': [0x2,0x2,0,0,0],
      '#': [0xa,0xf,0xa,0xf,0xa], '*': [0,0x5,0x2,0x5,0],
    };
    // Map uppercase too
    for (const [k, v] of Object.entries(chars)) {
      FONT[k] = v;
      if (k >= 'a' && k <= 'z') FONT[k.toUpperCase()] = v;
    }
    // PICO-8 special chars used in the game
    // \139 = left arrow, \145 = right arrow, \142 = Z button, \151 = X button
    FONT['\u008b'] = [0x4,0x8,0xf,0x8,0x4]; // left arrow ←
    FONT['\u0091'] = [0x2,0x1,0xf,0x1,0x2]; // right arrow →
    FONT['\u008e'] = [0x9,0x9,0x6,0x9,0x9]; // Z glyph (show as X pattern)
    FONT['\u0097'] = [0x9,0x6,0x6,0x6,0x9]; // X glyph
  }

  function init(parentEl, scale = 4) {
    defineFont();
    canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    canvas.style.width = (128 * scale) + 'px';
    canvas.style.height = (128 * scale) + 'px';
    canvas.style.imageRendering = 'pixelated';
    canvas.style.background = '#000';
    ctx = canvas.getContext('2d', { willReadFrequently: true });
    imageData = ctx.createImageData(128, 128);
    pixels = imageData.data;
    parentEl.appendChild(canvas);

    window.addEventListener('keydown', e => {
      if (e.key in dualBtnKeys) {
        for (const b of dualBtnKeys[e.key]) btnState[b] = true;
        e.preventDefault();
      } else if (e.key in keyMap) {
        btnState[keyMap[e.key]] = true; e.preventDefault();
      }
    });
    window.addEventListener('keyup', e => {
      if (e.key in dualBtnKeys) {
        for (const b of dualBtnKeys[e.key]) btnState[b] = false;
        e.preventDefault();
      } else if (e.key in keyMap) {
        btnState[keyMap[e.key]] = false; e.preventDefault();
      }
    });

    return canvas;
  }

  function loadSpriteSheet(gfxText) {
    // gfxText is the PICO-8 __gfx__ section: 128 rows of 128 hex nibbles
    // Each nibble is a palette index. Note: PICO-8 stores pixels in nibble pairs
    // where each hex char = one pixel, left nibble = left pixel
    const lines = gfxText.trim().split('\n');
    spritePixels = new Uint8Array(128 * 128);
    for (let y = 0; y < 128 && y < lines.length; y++) {
      const row = lines[y];
      for (let x = 0; x < 128 && x < row.length; x++) {
        spritePixels[y * 128 + x] = parseInt(row[x], 16);
      }
    }
  }

  // ---- Drawing primitives ----
  function _setPixel(x, y, c) {
    x = Math.floor(x - _cameraX);
    y = Math.floor(y - _cameraY);
    if (x < 0 || x > 127 || y < 0 || y > 127) return;
    const idx = (y * 128 + x) * 4;
    const rgb = PALETTE_RGB[c & 0xf];
    pixels[idx] = rgb[0];
    pixels[idx + 1] = rgb[1];
    pixels[idx + 2] = rgb[2];
    pixels[idx + 3] = 255;
  }

  function cls(c = 0) {
    const rgb = PALETTE_RGB[c & 0xf];
    for (let i = 0; i < 128 * 128; i++) {
      const idx = i * 4;
      pixels[idx] = rgb[0];
      pixels[idx + 1] = rgb[1];
      pixels[idx + 2] = rgb[2];
      pixels[idx + 3] = 255;
    }
  }

  function pset(x, y, c) {
    if (c === undefined) c = _drawColor;
    _setPixel(x, y, c);
  }

  function line(x0, y0, x1, y1, c) {
    if (c === undefined) c = _drawColor;
    x0 = Math.floor(x0); y0 = Math.floor(y0);
    x1 = Math.floor(x1); y1 = Math.floor(y1);
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    while (true) {
      _setPixel(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = err * 2;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx) { err += dx; y0 += sy; }
    }
  }

  function circ(cx, cy, r, c) {
    if (c === undefined) c = _drawColor;
    cx = Math.floor(cx); cy = Math.floor(cy); r = Math.floor(r);
    let x = r, y = 0, d = 1 - r;
    while (x >= y) {
      _setPixel(cx + x, cy + y, c); _setPixel(cx - x, cy + y, c);
      _setPixel(cx + x, cy - y, c); _setPixel(cx - x, cy - y, c);
      _setPixel(cx + y, cy + x, c); _setPixel(cx - y, cy + x, c);
      _setPixel(cx + y, cy - x, c); _setPixel(cx - y, cy - x, c);
      y++;
      if (d < 0) { d += 2 * y + 1; }
      else { x--; d += 2 * (y - x) + 1; }
    }
  }

  function rectfill(x0, y0, x1, y1, c) {
    if (c === undefined) c = _drawColor;
    x0 = Math.floor(x0); y0 = Math.floor(y0);
    x1 = Math.floor(x1); y1 = Math.floor(y1);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        _setPixel(x, y, c);
      }
    }
  }

  function print(str, x, y, c) {
    if (c === undefined) c = _drawColor;
    str = String(str);
    x = Math.floor(x);
    y = Math.floor(y);
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      const glyph = FONT[ch];
      if (glyph) {
        for (let row = 0; row < 5; row++) {
          const bits = glyph[row];
          for (let col = 0; col < 4; col++) {
            if (bits & (8 >> col)) {
              _setPixel(x + col, y + row, c);
            }
          }
        }
      }
      x += 5;
    }
  }

  function spr(n, x, y, w = 1, h = 1, flipX = false, flipY = false) {
    if (!spritePixels) return;
    n = Math.floor(n);
    x = Math.floor(x); y = Math.floor(y);
    const sx0 = (n % 16) * 8;
    const sy0 = Math.floor(n / 16) * 8;
    const pw = w * 8, ph = h * 8;
    for (let py = 0; py < ph; py++) {
      for (let px = 0; px < pw; px++) {
        const srcX = flipX ? (pw - 1 - px) : px;
        const srcY = flipY ? (ph - 1 - py) : py;
        const si = (sy0 + srcY) * 128 + (sx0 + srcX);
        const c = spritePixels[si];
        if (c !== 0) { // color 0 = transparent
          _setPixel(x + px, y + py, c);
        }
      }
    }
  }

  function sspr(sx, sy, sw, sh, dx, dy, dw, dh, flipX, flipY) {
    if (!spritePixels) return;
    if (dw === undefined) dw = sw;
    if (dh === undefined) dh = sh;
    sx = Math.floor(sx); sy = Math.floor(sy);
    dx = Math.floor(dx); dy = Math.floor(dy);
    for (let py = 0; py < dh; py++) {
      for (let px = 0; px < dw; px++) {
        const srcX = Math.floor((flipX ? (dw - 1 - px) : px) * sw / dw);
        const srcY = Math.floor((flipY ? (dh - 1 - py) : py) * sh / dh);
        const si = (sy + srcY) * 128 + (sx + srcX);
        const c = spritePixels[si];
        if (c !== 0) {
          _setPixel(dx + px, dy + py, c);
        }
      }
    }
  }

  function flip() {
    ctx.putImageData(imageData, 0, 0);
  }

  // ---- Input ----
  function btn(n) { return btnState[n]; }
  function btnp(n) { return btnState[n] && !btnPrev[n]; }
  function updateInput() {
    for (let i = 0; i < 6; i++) btnPrev[i] = btnState[i];
  }

  // ---- Math (PICO-8 uses 0..1 range for sin/cos, and sin is inverted) ----
  function p8sin(x) { return -Math.sin(x * Math.PI * 2); }
  function p8cos(x) { return Math.cos(x * Math.PI * 2); }
  function rnd(x) { return Math.random() * (x || 1); }
  function flr(x) { return Math.floor(x); }
  function p8max(a, b) { return Math.max(a, b); }
  function p8min(a, b) { return Math.min(a, b); }
  function p8abs(x) { return Math.abs(x); }
  function p8sqrt(x) { return Math.sqrt(x); }
  function tostr(x) { return String(x); }
  function sub(s, i, j) { return s.substring(i - 1, j); } // 1-based
  function tonum(x) { return Number(x); }

  // ---- Table functions ----
  function add(t, v) { t.push(v); return v; }
  function del(t, v) {
    const i = t.indexOf(v);
    if (i >= 0) t.splice(i, 1);
  }
  function* allIter(t) {
    // Iterate over a copy to allow safe deletion during iteration
    const copy = t.slice();
    for (const v of copy) yield v;
  }

  // ---- Persistence ----
  function cartdata(id) {
    cartId = id;
    try {
      const saved = localStorage.getItem('p8_' + id);
      if (saved) {
        const arr = JSON.parse(saved);
        for (let i = 0; i < 64 && i < arr.length; i++) persistData[i] = arr[i];
      }
    } catch (e) {}
  }
  function dget(n) { return persistData[n] || 0; }
  function dset(n, v) {
    persistData[n] = v;
    try {
      localStorage.setItem('p8_' + cartId, JSON.stringify(Array.from(persistData)));
    } catch (e) {}
  }

  // ---- Camera ----
  function camera(x, y) {
    _cameraX = x || 0;
    _cameraY = y || 0;
  }

  return {
    PALETTE, PALETTE_RGB,
    init, loadSpriteSheet, flip,
    cls, pset, line, circ, rectfill, print, spr, sspr,
    btn, btnp, updateInput,
    sin: p8sin, cos: p8cos, rnd, flr, max: p8max, min: p8min, abs: p8abs, sqrt: p8sqrt,
    tostr, sub, tonum,
    add, del, all: allIter,
    cartdata, dget, dset,
    camera,
    get canvas() { return canvas; }
  };
})();
