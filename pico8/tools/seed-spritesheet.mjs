import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const assetsDir = path.join(root, 'pico8', 'assets');
const generatedDir = path.join(root, 'pico8', 'generated');
const sheetPath = path.join(assetsDir, 'spritesheet.png');
const layoutPath = path.join(assetsDir, 'sprite_layout.json');
const ppmPath = path.join(generatedDir, 'spritesheet.ppm');
const force = process.argv.includes('--force');

const palette = [
  [0x00, 0x00, 0x00],
  [0x1d, 0x2b, 0x53],
  [0x7e, 0x25, 0x53],
  [0x00, 0x87, 0x51],
  [0xab, 0x52, 0x36],
  [0x5f, 0x57, 0x4f],
  [0xc2, 0xc3, 0xc7],
  [0xff, 0xf1, 0xe8],
  [0xff, 0x00, 0x4d],
  [0xff, 0xa3, 0x00],
  [0xff, 0xec, 0x27],
  [0x00, 0xe4, 0x36],
  [0x29, 0xad, 0xff],
  [0x83, 0x76, 0x9c],
  [0xff, 0x77, 0xa8],
  [0xff, 0xcc, 0xaa],
];

const WIDTH = 128;
const HEIGHT = 128;
const sheet = Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(0));

const layout = JSON.parse(fs.readFileSync(layoutPath, 'utf8'));

function setPixel(x, y, c) {
  if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return;
  sheet[y][x] = c;
}

function row(ox, oy, y, c, ...ranges) {
  for (const [x1, x2] of ranges) {
    for (let x = x1; x <= x2; x++) setPixel(ox + x, oy + y, c);
  }
}

function symRow(ox, oy, w, y, c, ...ranges) {
  for (const [x1, x2] of ranges) {
    for (let x = x1; x <= x2; x++) {
      setPixel(ox + x, oy + y, c);
      setPixel(ox + (w - 1 - x), oy + y, c);
    }
  }
}

function symPoint(ox, oy, w, x, y, c) {
  setPixel(ox + x, oy + y, c);
  setPixel(ox + (w - 1 - x), oy + y, c);
}

function fillDiamond(ox, oy, cx, cy, r, c) {
  for (let y = -r; y <= r; y++) {
    const span = r - Math.abs(y);
    for (let x = -span; x <= span; x++) {
      setPixel(ox + cx + x, oy + cy + y, c);
    }
  }
}

function line(ox, oy, x0, y0, x1, y1, c) {
  let dx = Math.abs(x1 - x0);
  let sx = x0 < x1 ? 1 : -1;
  let dy = -Math.abs(y1 - y0);
  let sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  while (true) {
    setPixel(ox + x0, oy + y0, c);
    if (x0 === x1 && y0 === y1) break;
    const e2 = err * 2;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
}

// --- 8×8 sprite draw functions ---
// Every pixel matters at this size. Design principles:
// - Clear silhouette readable at 1:1
// - 2-3 colors max per sprite
// - Symmetric where possible
// - No single isolated pixels (noise)

function drawPlayer(ox, oy, variant) {
  //  ...XX...  0  nose
  //  ..XXXX..  1  canopy
  //  ..X..X..  2  cockpit windows (blue)
  //  .XXXXXX.  3  fuselage
  //  .XXXXXX.  4  fuselage
  //  XX.XX.XX  5  wings (variant: swept)
  //  X..XX..X  6  wing tips + body
  //  ...XX...  7  engine glow
  symRow(ox, oy, 8, 0, 7, [3, 3]);
  symRow(ox, oy, 8, 1, 7, [2, 3]);
  symRow(ox, oy, 8, 2, 12, [2, 2]);
  symRow(ox, oy, 8, 3, 7, [1, 3]);
  symRow(ox, oy, 8, 4, 7, [1, 3]);
  if (variant === 0) {
    symRow(ox, oy, 8, 5, 7, [0, 0], [2, 3]);
    symRow(ox, oy, 8, 6, 12, [0, 0]);
    symRow(ox, oy, 8, 6, 7, [3, 3]);
  } else {
    symRow(ox, oy, 8, 5, 7, [1, 1], [2, 3]);
    symRow(ox, oy, 8, 6, 12, [1, 1]);
    symRow(ox, oy, 8, 6, 7, [3, 3]);
  }
  symRow(ox, oy, 8, 7, 8, [3, 3]);
}

function drawGrunt(ox, oy, variant) {
  //  .X....X.  0  antennae
  //  ..XXXX..  1  head
  //  .X.XX.X.  2  eyes (green) + head
  //  .XXXXXX.  3  body
  //  XXXXXXXX  4  wings spread
  //  ..XXXX..  5  abdomen
  //  .X....X.  6  legs
  //  X......X  7  feet
  symPoint(ox, oy, 8, 1, 0, 11);
  symRow(ox, oy, 8, 1, 11, [2, 3]);
  symRow(ox, oy, 8, 2, 11, [1, 1], [3, 3]);
  symRow(ox, oy, 8, 2, 3, [2, 2]);
  symRow(ox, oy, 8, 3, 11, [1, 3]);
  if (variant === 0) {
    symRow(ox, oy, 8, 4, 11, [0, 3]);
  } else {
    symRow(ox, oy, 8, 4, 11, [1, 3]);
    symPoint(ox, oy, 8, 0, 3, 11);
  }
  symRow(ox, oy, 8, 5, 11, [2, 3]);
  symPoint(ox, oy, 8, 1, 6, 11);
  symPoint(ox, oy, 8, 0, 7, 11);
}

function drawAttacker(ox, oy, variant) {
  //  ...XX...  0  nose (red)
  //  ..XXXX..  1  head
  //  .XXXXXX.  2  body (orange)
  //  .X.XX.X.  3  cockpit detail (blue)
  //  XXXXXXXX  4  full wingspan
  //  ..XXXX..  5  tail
  //  .X....X.  6  fins
  //  .X....X.  7  engine
  symRow(ox, oy, 8, 0, 8, [3, 3]);
  symRow(ox, oy, 8, 1, 9, [2, 3]);
  symRow(ox, oy, 8, 2, 9, [1, 3]);
  symRow(ox, oy, 8, 3, 12, [1, 1]);
  symRow(ox, oy, 8, 3, 9, [2, 3]);
  if (variant === 0) {
    symRow(ox, oy, 8, 4, 9, [0, 3]);
  } else {
    symRow(ox, oy, 8, 4, 9, [1, 3]);
    symPoint(ox, oy, 8, 0, 3, 9);
  }
  symRow(ox, oy, 8, 5, 9, [2, 3]);
  symPoint(ox, oy, 8, 1, 6, 4);
  symPoint(ox, oy, 8, 1, 7, 9);
}

function drawCommander(ox, oy, variant) {
  if (variant === 2) {
    //  Damaged — asymmetric, sparks
    row(ox, oy, 0, 10, [1, 2], [5, 6]);
    row(ox, oy, 1, 10, [1, 5]);
    row(ox, oy, 2, 6, [0, 6]);
    row(ox, oy, 3, 8, [0, 0]);
    row(ox, oy, 3, 10, [1, 4]);
    row(ox, oy, 4, 6, [1, 5]);
    row(ox, oy, 5, 10, [2, 4]);
    row(ox, oy, 6, 6, [2, 3]);
    row(ox, oy, 7, 8, [1, 1], [5, 5]);
    return;
  }
  //  .X.XX.X.  0  crown points
  //  .XXXXXX.  1  crown
  //  ..XXXX..  2  face (grey)
  //  .XXXXXX.  3  body
  //  XX.XX.XX  4  arms/wings
  //  .XXXXXX.  5  body
  //  ..XXXX..  6  lower (grey)
  //  .X....X.  7  tail
  const pulse = variant === 0 ? 0 : 1;
  symRow(ox, oy, 8, 0, 10, [1, 1], [3, 3]);
  symRow(ox, oy, 8, 1, 10, [1, 3]);
  symRow(ox, oy, 8, 2, 6, [2, 3]);
  symRow(ox, oy, 8, 3, 10, [1, 3]);
  if (pulse) {
    symRow(ox, oy, 8, 4, 10, [0, 0], [2, 3]);
  } else {
    symRow(ox, oy, 8, 4, 10, [0, 0], [3, 3]);
    symRow(ox, oy, 8, 4, 6, [2, 2]);
  }
  symRow(ox, oy, 8, 5, 10, [1, 3]);
  symRow(ox, oy, 8, 6, 6, [2, 3]);
  symPoint(ox, oy, 8, 1, 7, 10);
}

function drawSpinner(ox, oy, variant) {
  //  Core diamond + 4 spokes that rotate across frames
  //  Frame 0: +  Frame 1: ×  Frame 2: half  Frame 3: converge
  fillDiamond(ox, oy, 3, 3, 1, 14);
  setPixel(ox + 3, oy + 3, 7);
  setPixel(ox + 4, oy + 3, 7);
  setPixel(ox + 3, oy + 4, 7);
  setPixel(ox + 4, oy + 4, 7);
  fillDiamond(ox, oy, 4, 4, 1, 14);
  if (variant === 0) {
    // + cross
    row(ox, oy, 0, 13, [3, 4]);
    row(ox, oy, 1, 13, [3, 4]);
    row(ox, oy, 6, 13, [3, 4]);
    row(ox, oy, 7, 13, [3, 4]);
    row(ox, oy, 3, 13, [0, 1]);
    row(ox, oy, 4, 13, [0, 1]);
    row(ox, oy, 3, 13, [6, 7]);
    row(ox, oy, 4, 13, [6, 7]);
  } else if (variant === 1) {
    // × diagonal
    setPixel(ox + 0, oy + 0, 13); setPixel(ox + 1, oy + 1, 13);
    setPixel(ox + 7, oy + 0, 13); setPixel(ox + 6, oy + 1, 13);
    setPixel(ox + 0, oy + 7, 13); setPixel(ox + 1, oy + 6, 13);
    setPixel(ox + 7, oy + 7, 13); setPixel(ox + 6, oy + 6, 13);
  } else if (variant === 2) {
    // tilted spokes
    setPixel(ox + 2, oy + 0, 13); setPixel(ox + 5, oy + 0, 13);
    setPixel(ox + 1, oy + 1, 13); setPixel(ox + 6, oy + 1, 13);
    setPixel(ox + 0, oy + 5, 13); setPixel(ox + 7, oy + 5, 13);
    setPixel(ox + 1, oy + 6, 13); setPixel(ox + 6, oy + 6, 13);
  } else {
    // Y-spokes converging
    setPixel(ox + 1, oy + 0, 13); setPixel(ox + 6, oy + 0, 13);
    setPixel(ox + 2, oy + 1, 13); setPixel(ox + 5, oy + 1, 13);
    setPixel(ox + 0, oy + 6, 13); setPixel(ox + 7, oy + 6, 13);
    setPixel(ox + 1, oy + 7, 13); setPixel(ox + 6, oy + 7, 13);
  }
}

function drawBomber(ox, oy, variant) {
  if (variant === 2) {
    //  Damaged bomber — asymmetric, broken
    row(ox, oy, 0, 9, [2, 4]);
    row(ox, oy, 1, 4, [1, 5]);
    row(ox, oy, 2, 9, [0, 6]);
    row(ox, oy, 3, 4, [0, 2], [5, 6]);
    row(ox, oy, 4, 9, [1, 5]);
    row(ox, oy, 5, 4, [2, 4]);
    row(ox, oy, 6, 8, [1, 1]);
    row(ox, oy, 6, 6, [3, 4]);
    row(ox, oy, 7, 9, [3, 3]);
    return;
  }
  //  ..X..X..  0  antennae
  //  ..XXXX..  1  head
  //  .XXXXXX.  2  body (orange)
  //  XXXXXXXX  3  bomb bay (brown) — open variant
  //  .XXXXXX.  4  body
  //  ..XXXX..  5  lower (brown)
  //  ..XXXX..  6  tail (grey)
  //  ..X..X..  7  engines
  symPoint(ox, oy, 8, 2, 0, 9);
  symRow(ox, oy, 8, 1, 9, [2, 3]);
  symRow(ox, oy, 8, 2, 9, [1, 3]);
  if (variant === 0) {
    symRow(ox, oy, 8, 3, 4, [0, 3]);
  } else {
    symRow(ox, oy, 8, 3, 4, [0, 1]);
    symRow(ox, oy, 8, 3, 9, [2, 3]);
  }
  symRow(ox, oy, 8, 4, 9, [1, 3]);
  symRow(ox, oy, 8, 5, 4, [2, 3]);
  symRow(ox, oy, 8, 6, 6, [2, 3]);
  symPoint(ox, oy, 8, 2, 7, 9);
}

function drawGuardian(ox, oy, variant) {
  //  ...XX...  0  top node
  //  ..XXXX..  1  top node
  //  .X.XX.X.  2  connectors
  //  XX.XX.XX  3  side nodes
  //  XX.XX.XX  4  side nodes
  //  .X.XX.X.  5  connectors
  //  ..XXXX..  6  bottom
  //  ...XX...  7  bottom
  const c = variant >= 2 ? (variant === 3 ? 8 : 12) : 12;
  const fill = variant > 1 ? 6 : 10;
  // top node
  symRow(ox, oy, 8, 0, c, [3, 3]);
  symRow(ox, oy, 8, 1, fill, [2, 2]);
  symRow(ox, oy, 8, 1, c, [3, 3]);
  // connectors
  symRow(ox, oy, 8, 2, 6, [1, 1], [3, 3]);
  // side nodes + center link
  symRow(ox, oy, 8, 3, c, [0, 0], [3, 3]);
  symRow(ox, oy, 8, 3, fill, [1, 1]);
  symRow(ox, oy, 8, 4, c, [0, 0], [3, 3]);
  symRow(ox, oy, 8, 4, fill, [1, 1]);
  // lower connectors
  symRow(ox, oy, 8, 5, 6, [1, 1], [3, 3]);
  // bottom
  symRow(ox, oy, 8, 6, c, [2, 3]);
  symRow(ox, oy, 8, 7, fill, [3, 3]);
  if (variant >= 2) {
    setPixel(ox + 2, oy + 2, 8);
    setPixel(ox + 5, oy + 2, 8);
  }
}

function drawPhantom(ox, oy, variant) {
  //  ..XXXX..  0  head
  //  .XXXXXX.  1  head
  //  .X.XX.X.  2  eyes
  //  .XXXXXX.  3  body
  //  .XXXXXX.  4  body
  //  .XXXXXX.  5  body
  //  .X.XX.X.  6  wavy bottom
  //  X......X  7  tendrils  (alt frames vary bottom)
  const ghost = variant >= 2;
  const body = ghost ? 13 : 6;
  const eyes = ghost ? 12 : 11;
  symRow(ox, oy, 8, 0, body, [2, 3]);
  symRow(ox, oy, 8, 1, body, [1, 3]);
  symRow(ox, oy, 8, 2, body, [1, 1], [3, 3]);
  symRow(ox, oy, 8, 2, eyes, [2, 2]);
  symRow(ox, oy, 8, 3, body, [1, 3]);
  symRow(ox, oy, 8, 4, body, [1, 3]);
  symRow(ox, oy, 8, 5, body, [1, 3]);
  if (variant === 0 || variant === 2) {
    symRow(ox, oy, 8, 6, body, [1, 1], [3, 3]);
    symPoint(ox, oy, 8, 0, 7, body);
  } else {
    symRow(ox, oy, 8, 6, body, [2, 2]);
    symPoint(ox, oy, 8, 1, 7, body);
  }
}

function drawSwarm(ox, oy, variant) {
  //  Small pulsing diamond/circle
  //  v0: smaller   v1: bigger
  //  ...XX...  0       ..XXXX..
  //  ..XXXX..  1       .XXXXXX.
  //  .XXXXXX.  2       XXXXXXXX
  //  .XX..XX.  3  eyes XXXX.XXX  (core)
  //  .XXXXXX.  4       XXXXXXXX
  //  ..XXXX..  5       .XXXXXX.
  //  ...XX...  6       ..XXXX..
  //  ..X..X..  7  ant  ...XX...
  if (variant === 0) {
    symRow(ox, oy, 8, 1, 11, [2, 3]);
    symRow(ox, oy, 8, 2, 11, [1, 3]);
    symRow(ox, oy, 8, 3, 14, [1, 1]);
    symRow(ox, oy, 8, 3, 11, [2, 3]);
    symRow(ox, oy, 8, 4, 11, [1, 3]);
    symRow(ox, oy, 8, 5, 11, [2, 3]);
    symPoint(ox, oy, 8, 2, 0, 10);
  } else {
    symRow(ox, oy, 8, 0, 11, [2, 3]);
    symRow(ox, oy, 8, 1, 11, [1, 3]);
    symRow(ox, oy, 8, 2, 11, [0, 3]);
    symRow(ox, oy, 8, 3, 14, [0, 0]);
    symRow(ox, oy, 8, 3, 11, [1, 3]);
    symRow(ox, oy, 8, 4, 11, [0, 3]);
    symRow(ox, oy, 8, 5, 11, [1, 3]);
    symRow(ox, oy, 8, 6, 11, [2, 3]);
    symPoint(ox, oy, 8, 2, 7, 10);
  }
}

function drawUfo(ox, oy, variant) {
  //  ...XX...  0  dome
  //  ..XXXX..  1  dome
  //  .XXXXXX.  2  dome glass
  //  XXXXXXXX  3  saucer rim
  //  .X.XX.X.  4  lights (variant color)
  //  ..XXXX..  5  bottom
  //  ...XX...  6  glow
  symRow(ox, oy, 8, 0, 13, [3, 3]);
  symRow(ox, oy, 8, 1, 13, [2, 3]);
  symRow(ox, oy, 8, 2, 13, [1, 3]);
  symRow(ox, oy, 8, 3, 6, [0, 3]);
  const lc = variant === 0 ? 10 : 12;
  symRow(ox, oy, 8, 4, lc, [1, 1]);
  symRow(ox, oy, 8, 4, 6, [2, 3]);
  symRow(ox, oy, 8, 5, 6, [2, 3]);
  symRow(ox, oy, 8, 6, 13, [3, 3]);
}

function drawBoss(ox, oy, variant) {
  //  8×8 boss — wide crowned ship
  //  .X.XX.X.  0  crown horns
  //  .XXXXXX.  1  crown
  //  XXXXXXXX  2  body full
  //  XX.XX.XX  3  detail gaps
  //  XXXXXXXX  4  body full
  //  .XXXXXX.  5  body
  //  ..XXXX..  6  lower
  //  ..X..X..  7  tail
  const phase = variant === 2;
  const beam = variant === 3;
  const body = phase ? 14 : 8;
  const crown = phase ? 10 : 12;
  symRow(ox, oy, 8, 0, crown, [1, 1], [3, 3]);
  symRow(ox, oy, 8, 1, crown, [1, 3]);
  symRow(ox, oy, 8, 2, body, [0, 3]);
  symRow(ox, oy, 8, 3, body, [0, 0], [2, 3]);
  symRow(ox, oy, 8, 3, 6, [1, 1]);
  symRow(ox, oy, 8, 4, body, [0, 3]);
  symRow(ox, oy, 8, 5, body, [1, 3]);
  symRow(ox, oy, 8, 6, body, [2, 3]);
  symPoint(ox, oy, 8, 2, 7, crown);
  if (beam) {
    symRow(ox, oy, 8, 6, 12, [3, 3]);
    symRow(ox, oy, 8, 7, 12, [2, 3]);
  }
}

function drawFx() {
  // Player bullet — tile 28 at (96, 8): thin vertical bolt
  setPixel(96 + 3, 8 + 0, 7);
  setPixel(96 + 4, 8 + 0, 7);
  setPixel(96 + 3, 8 + 1, 12);
  setPixel(96 + 4, 8 + 1, 12);
  setPixel(96 + 3, 8 + 2, 12);
  setPixel(96 + 4, 8 + 2, 12);
  setPixel(96 + 3, 8 + 3, 12);
  setPixel(96 + 4, 8 + 3, 12);
  setPixel(96 + 3, 8 + 4, 12);
  setPixel(96 + 4, 8 + 4, 12);
  setPixel(96 + 3, 8 + 5, 7);
  setPixel(96 + 4, 8 + 5, 7);

  // Enemy bullet — tile 29 at (104, 8): small red diamond
  setPixel(104 + 3, 8 + 2, 8);
  setPixel(104 + 4, 8 + 2, 8);
  setPixel(104 + 2, 8 + 3, 8);
  setPixel(104 + 3, 8 + 3, 10);
  setPixel(104 + 4, 8 + 3, 10);
  setPixel(104 + 5, 8 + 3, 8);
  setPixel(104 + 2, 8 + 4, 8);
  setPixel(104 + 3, 8 + 4, 10);
  setPixel(104 + 4, 8 + 4, 10);
  setPixel(104 + 5, 8 + 4, 8);
  setPixel(104 + 3, 8 + 5, 8);
  setPixel(104 + 4, 8 + 5, 8);

  // Burst 1 — tile 30 at (112, 8): small spark
  fillDiamond(112, 8, 3, 3, 1, 10);
  setPixel(112 + 3, 8 + 3, 7);
  setPixel(112 + 4, 8 + 3, 7);

  // Burst 2 — tile 31 at (120, 8): medium explosion
  fillDiamond(120, 8, 3, 3, 2, 9);
  fillDiamond(120, 8, 3, 3, 1, 10);
  setPixel(120 + 3, 8 + 3, 7);
  setPixel(120 + 4, 8 + 3, 7);
  setPixel(120 + 1, 8 + 1, 10);
  setPixel(120 + 6, 8 + 6, 10);

  // Burst 3 — tile 32 at (0, 16): large explosion
  fillDiamond(0, 16, 3, 3, 3, 9);
  fillDiamond(0, 16, 3, 3, 2, 10);
  fillDiamond(0, 16, 3, 3, 1, 7);
  setPixel(0 + 0, 16 + 0, 10);
  setPixel(0 + 7, 16 + 0, 10);
  setPixel(0 + 0, 16 + 7, 9);
  setPixel(0 + 7, 16 + 7, 9);

  // Rapid icon — tile 33 at (8, 16): double arrow
  setPixel(8 + 3, 16 + 0, 8); setPixel(8 + 4, 16 + 0, 8);
  row(8, 16, 1, 8, [2, 5]);
  row(8, 16, 2, 10, [1, 6]);
  setPixel(8 + 3, 16 + 3, 8); setPixel(8 + 4, 16 + 3, 8);
  row(8, 16, 4, 8, [2, 5]);
  row(8, 16, 5, 10, [1, 6]);
  setPixel(8 + 3, 16 + 6, 8); setPixel(8 + 4, 16 + 6, 8);

  // Shield icon — tile 34 at (16, 16): shield shape
  row(16, 16, 0, 12, [2, 5]);
  row(16, 16, 1, 12, [1, 6]);
  row(16, 16, 2, 12, [1, 6]);
  row(16, 16, 2, 7, [3, 4]);
  row(16, 16, 3, 12, [1, 6]);
  row(16, 16, 4, 12, [2, 5]);
  row(16, 16, 5, 12, [2, 5]);
  row(16, 16, 6, 12, [3, 4]);

  // Slow icon — tile 35 at (24, 16): clock/spiral
  row(24, 16, 0, 13, [2, 5]);
  row(24, 16, 1, 13, [1, 6]);
  row(24, 16, 1, 7, [3, 4]);
  row(24, 16, 2, 13, [1, 2], [5, 6]);
  row(24, 16, 2, 7, [3, 5]);
  row(24, 16, 3, 13, [1, 2], [5, 6]);
  row(24, 16, 3, 7, [4, 4]);
  row(24, 16, 4, 13, [1, 2], [5, 6]);
  row(24, 16, 5, 13, [1, 6]);
  row(24, 16, 6, 13, [2, 5]);

  // Magnet icon — tile 36 at (32, 16): U-shape magnet
  row(32, 16, 0, 12, [1, 2], [5, 6]);
  row(32, 16, 1, 12, [1, 2], [5, 6]);
  row(32, 16, 2, 8, [1, 2], [5, 6]);
  row(32, 16, 3, 8, [1, 2], [5, 6]);
  row(32, 16, 4, 12, [1, 2], [5, 6]);
  row(32, 16, 5, 12, [1, 6]);
  row(32, 16, 6, 12, [2, 5]);

  // Freeze icon — tile 37 at (40, 16): snowflake/star
  setPixel(40 + 3, 16 + 0, 11); setPixel(40 + 4, 16 + 0, 11);
  setPixel(40 + 1, 16 + 1, 7);  setPixel(40 + 6, 16 + 1, 7);
  setPixel(40 + 3, 16 + 1, 11); setPixel(40 + 4, 16 + 1, 11);
  row(40, 16, 2, 11, [2, 5]);
  row(40, 16, 3, 11, [0, 7]);
  row(40, 16, 4, 11, [0, 7]);
  row(40, 16, 5, 11, [2, 5]);
  setPixel(40 + 1, 16 + 6, 7);  setPixel(40 + 6, 16 + 6, 7);
  setPixel(40 + 3, 16 + 6, 11); setPixel(40 + 4, 16 + 6, 11);
  setPixel(40 + 3, 16 + 7, 11); setPixel(40 + 4, 16 + 7, 11);
}

function writePpm() {
  let out = `P3\n${WIDTH} ${HEIGHT}\n255\n`;
  for (let y = 0; y < HEIGHT; y++) {
    const parts = [];
    for (let x = 0; x < WIDTH; x++) {
      const [r, g, b] = palette[sheet[y][x]];
      parts.push(`${r} ${g} ${b}`);
    }
    out += `${parts.join(' ')}\n`;
  }
  fs.writeFileSync(ppmPath, out);
}

function seed() {
  // Row 0 (y=0): tiles 0-15
  drawPlayer(0, 0, 0);       // tile 0
  drawPlayer(8, 0, 1);       // tile 1
  drawGrunt(16, 0, 0);       // tile 2
  drawGrunt(24, 0, 1);       // tile 3
  drawAttacker(32, 0, 0);    // tile 4
  drawAttacker(40, 0, 1);    // tile 5
  drawCommander(48, 0, 0);   // tile 6
  drawCommander(56, 0, 1);   // tile 7
  drawCommander(64, 0, 2);   // tile 8 (damaged)
  drawSpinner(72, 0, 0);     // tile 9
  drawSpinner(80, 0, 1);     // tile 10
  drawSpinner(88, 0, 2);     // tile 11
  drawSpinner(96, 0, 3);     // tile 12
  drawBomber(104, 0, 0);     // tile 13
  drawBomber(112, 0, 1);     // tile 14
  drawBomber(120, 0, 2);     // tile 15 (damaged)

  // Row 1 (y=8): tiles 16-31
  drawGuardian(0, 8, 0);     // tile 16
  drawGuardian(8, 8, 1);     // tile 17
  drawGuardian(16, 8, 2);    // tile 18 (damaged)
  drawGuardian(24, 8, 3);    // tile 19 (critical)
  drawPhantom(32, 8, 0);     // tile 20
  drawPhantom(40, 8, 1);     // tile 21
  drawPhantom(48, 8, 2);     // tile 22 (ghost)
  drawPhantom(56, 8, 3);     // tile 23 (ghost alt)
  drawSwarm(64, 8, 0);       // tile 24
  drawSwarm(72, 8, 1);       // tile 25
  drawUfo(80, 8, 0);         // tile 26
  drawUfo(88, 8, 1);         // tile 27
  drawFx();                   // tiles 28-37

  // Row 2 (y=16): boss frames (1×1 tiles each)
  drawBoss(48, 16, 0);       // tile 38
  drawBoss(56, 16, 1);       // tile 39
  drawBoss(64, 16, 2);       // tile 40
  drawBoss(72, 16, 3);       // tile 41
}

fs.mkdirSync(assetsDir, { recursive: true });
fs.mkdirSync(generatedDir, { recursive: true });
fs.writeFileSync(layoutPath, `${JSON.stringify(layout, null, 2)}\n`);

if (fs.existsSync(sheetPath) && !force) {
  console.log('spritesheet.png already exists, leaving it untouched');
  process.exit(0);
}

seed();
writePpm();
execFileSync('magick', [ppmPath, sheetPath]);
fs.rmSync(ppmPath, { force: true });
console.log(`seeded ${path.relative(root, sheetPath)}`);
