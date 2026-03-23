import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const srcDir = path.join(root, 'pico8', 'src');
const gfxPath = path.join(root, 'pico8', 'generated', 'gfx.txt');
const outPath = path.join(root, 'pico8', 'galaga_pico8.p8');

const files = fs.readdirSync(srcDir)
  .filter(name => name.endsWith('.lua'))
  .sort();

const lua = files
  .map(name => `-- ${name}\n${fs.readFileSync(path.join(srcDir, name), 'utf8').trim()}\n`)
  .join('\n');

let gfx = '';
if (fs.existsSync(gfxPath)) {
  gfx = fs.readFileSync(gfxPath, 'utf8').trim();
}

// --- SFX generation ---
// Each note: pitch (2 hex), waveform (1 hex), volume (1 hex), effect (1 hex)
// Waveforms: 0=sine 1=triangle 2=saw 3=square 4=pulse 5=organ 6=noise 7=phaser
// Effects: 0=none 1=slide 2=vibrato 3=drop 4=fade_in 5=fade_out 6=arp_fast 7=arp_slow

function note(pitch, waveform, volume, effect) {
  return pitch.toString(16).padStart(2, '0') +
    waveform.toString(16) +
    volume.toString(16) +
    effect.toString(16);
}

const SILENT = '00000';

function sfxLine(speed, notes, loopStart = 0, loopEnd = 0) {
  let line = '01' +
    speed.toString(16).padStart(2, '0') +
    loopStart.toString(16).padStart(2, '0') +
    loopEnd.toString(16).padStart(2, '0');
  for (let i = 0; i < 32; i++) {
    line += i < notes.length ? note(...notes[i]) : SILENT;
  }
  return line;
}

const sfxData = [
  // SFX 0: player shoot — quick high square blip
  sfxLine(2, [
    [48, 3, 5, 0], [44, 3, 4, 3], [36, 3, 2, 5],
  ]),

  // SFX 1: enemy explosion — noise burst descending
  sfxLine(4, [
    [24, 6, 7, 0], [20, 6, 6, 0], [16, 6, 5, 0],
    [12, 6, 3, 5], [8, 6, 2, 5],
  ]),

  // SFX 2: player death — long descending noise
  sfxLine(6, [
    [36, 6, 7, 0], [32, 6, 7, 3], [28, 6, 6, 3],
    [24, 6, 5, 3], [20, 6, 4, 3], [16, 6, 3, 3],
    [12, 6, 2, 5], [8, 6, 1, 5],
  ]),

  // SFX 3: wave start — ascending triangle fanfare
  sfxLine(8, [
    [24, 1, 4, 0], [28, 1, 5, 1], [32, 1, 5, 1],
    [36, 1, 6, 0], [40, 1, 6, 0], [44, 1, 5, 5],
  ]),

  // SFX 4: power-up collect — happy ascending arpeggio
  sfxLine(4, [
    [36, 1, 5, 0], [40, 1, 5, 0], [43, 1, 6, 0],
    [48, 1, 6, 0], [48, 1, 4, 5],
  ]),

  // SFX 5: extra life — triumphant melody
  sfxLine(8, [
    [36, 1, 5, 0], [36, 1, 5, 0], [40, 1, 6, 0],
    [43, 1, 6, 0], [48, 1, 7, 0], [48, 1, 6, 0],
    [48, 1, 4, 5], [48, 1, 2, 5],
  ]),

  // SFX 6: tractor dive — boss descending, ominous low tone
  sfxLine(8, [
    [36, 2, 4, 0], [34, 2, 4, 3], [32, 2, 4, 3],
    [30, 2, 5, 3], [28, 2, 5, 3], [26, 2, 5, 3],
    [24, 2, 5, 0], [22, 2, 4, 0], [20, 2, 4, 0],
    [18, 2, 3, 5],
  ]),

  // SFX 7: tractor beam — pulsing wobble (looped)
  sfxLine(4, [
    [18, 0, 4, 2], [20, 0, 5, 2], [22, 0, 5, 2], [20, 0, 4, 2],
    [18, 0, 4, 2], [20, 0, 5, 2], [22, 0, 5, 2], [20, 0, 4, 2],
  ], 0, 7),
];

const sfxSection = sfxData.join('\n');

const cart = [
  'pico-8 cartridge // http://www.pico-8.com',
  'version 41',
  '__lua__',
  lua.trimEnd(),
  '__gfx__',
  gfx,
  '__sfx__',
  sfxSection,
  '',
].join('\n');

fs.writeFileSync(outPath, cart);
console.log(`built ${path.relative(root, outPath)}`);
