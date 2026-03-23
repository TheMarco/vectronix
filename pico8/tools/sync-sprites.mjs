import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const sheetPath = path.join(root, 'pico8', 'assets', 'spritesheet.png');
const gfxPath = path.join(root, 'pico8', 'generated', 'gfx.txt');

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

function nearestIndex(r, g, b) {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < palette.length; i++) {
    const [pr, pg, pb] = palette[i];
    const dist = (pr - r) ** 2 + (pg - g) ** 2 + (pb - b) ** 2;
    if (dist < bestDist) {
      best = i;
      bestDist = dist;
    }
  }
  return best;
}

if (!fs.existsSync(sheetPath)) {
  throw new Error(`missing ${sheetPath}`);
}

const txt = execFileSync('magick', [sheetPath, 'txt:-'], { encoding: 'utf8' });
const rows = Array.from({ length: 128 }, () => Array(128).fill('0'));
const lines = txt.trim().split('\n').slice(1);

for (const line of lines) {
  const match = line.match(/^(\d+),(\d+):\s+\((\d+),(\d+),(\d+)/);
  if (!match) continue;
  const x = Number(match[1]);
  const y = Number(match[2]);
  const r = Number(match[3]);
  const g = Number(match[4]);
  const b = Number(match[5]);
  if (x < 128 && y < 128) {
    rows[y][x] = nearestIndex(r, g, b).toString(16);
  }
}

fs.mkdirSync(path.dirname(gfxPath), { recursive: true });
fs.writeFileSync(gfxPath, `${rows.map(row => row.join('')).join('\n')}\n`);
console.log(`synced ${path.relative(root, gfxPath)}`);
