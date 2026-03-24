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
const musicData = [
  '04 04124040',
  '04 13144040',
  '04 02034040',
];
const gffData = Array.from({ length: 2 }, () => '0'.repeat(256));
const mapData = Array.from({ length: 32 }, () => '0'.repeat(256));

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

function rawSfxLine(line) {
  return line.slice(0, 168).padEnd(168, '0');
}

const sfxData = [
  rawSfxLine('4d0210201842418441184511844118431184311843118431184311843118431184311843118431184311843118421184211842118421184211842118421184211842118421184211842118421184211842118421'),
  rawSfxLine('050110200025400251002510023100231002210022100221001210012100121001210012100121001110011100011000110001100011000110001100011000110001100011000110001100011000110001100011'),
  rawSfxLine('000f18002485024850238502385021850218501f8501f8501c8501c8501a8501a8501885018850178501785015850158501385013850108501085015850158500140001400014000140001400014000140001400'),
  rawSfxLine('000f1800219502195021950219501c9501c9501c9501c9501d9501d9501d9501d950189501895018950189501f9501f9501f9501f950219502195021950219500140001400014000140001400014000140001400'),
  rawSfxLine('000f180018850188501c8501c8501f8501f850248502485021850218501f8501f8501c8501c8501a8501a8501c8501c8501f8501f8501d8501d85018850188500140001400014000140001400014000140001400'),

  // SFX 5: player shoot — quick high square blip
  sfxLine(2, [
    [48, 3, 5, 0], [44, 3, 4, 3], [36, 3, 2, 5],
  ]),

  // SFX 6: enemy explosion — noise burst descending
  sfxLine(4, [
    [24, 6, 7, 0], [20, 6, 6, 0], [16, 6, 5, 0],
    [12, 6, 3, 5], [8, 6, 2, 5],
  ]),

  // SFX 7: player death — phasing dive that breaks into noise
  sfxLine(5, [
    [46, 7, 5, 2], [42, 7, 6, 3], [38, 4, 7, 1],
    [34, 4, 6, 3], [30, 2, 6, 3], [26, 2, 5, 3],
    [22, 6, 5, 0], [18, 6, 4, 3], [14, 6, 3, 5],
    [10, 6, 2, 5],
  ]),

  // SFX 8: wave start — ascending triangle fanfare
  sfxLine(8, [
    [24, 1, 4, 0], [28, 1, 5, 1], [32, 1, 5, 1],
    [36, 1, 6, 0], [40, 1, 6, 0], [44, 1, 5, 5],
  ]),

  // SFX 9: power-up collect — happy ascending arpeggio
  sfxLine(4, [
    [36, 1, 5, 0], [40, 1, 5, 0], [43, 1, 6, 0],
    [48, 1, 6, 0], [48, 1, 4, 5],
  ]),

  // SFX 10: extra life — triumphant melody
  sfxLine(8, [
    [36, 1, 5, 0], [36, 1, 5, 0], [40, 1, 6, 0],
    [43, 1, 6, 0], [48, 1, 7, 0], [48, 1, 6, 0],
    [48, 1, 4, 5], [48, 1, 2, 5],
  ]),

  // SFX 11: capturer dive — ominous descending hook
  sfxLine(6, [
    [34, 5, 4, 0], [32, 5, 4, 1], [29, 5, 5, 0],
    [25, 5, 5, 1], [22, 4, 6, 2], [18, 4, 5, 3],
    [15, 4, 4, 5],
  ]),

  // SFX 12-20: preserved from authored cart for music patterns
  rawSfxLine('010400071204214052160521404212042140521605214042000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'),
  rawSfxLine('0105000716430194401d4401944014430184401b440184400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'),
  rawSfxLine('01070000185401f5501c461174531344500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'),
  rawSfxLine('010500001c1402015023160281602c1702f165000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'),
  rawSfxLine('010400071a7321e742227521e742187321c742207521c742000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'),
  rawSfxLine('010200002a76226762227621e7521a752167421273500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'),
  rawSfxLine('000f1800189501895018950189501f9501f9501f9501f950219502195021950219501f9501f9501f9501f9501d9501d9501d9501d9501f9501f95018950189500140001400014000140001400014000140001400'),
  rawSfxLine('000f1800158501585018850188501c8501c8501885018850158501585018850188501a8501a850188501885017850178501585015850138501385015850158500140001400014000140001400014000140001400'),
  rawSfxLine('000f180021950219502195021950219502195021950219501f9501f9501f9501f9501d9501d9501d9501d9501c9501c9501c9501c9501c9501c95021950219500140001400014000140001400014000140001400'),

  // SFX 21: tractor beam — pulsing wobble (looped)
  sfxLine(4, [
    [18, 0, 4, 2], [20, 0, 5, 2], [22, 0, 5, 2], [20, 0, 4, 2],
    [18, 0, 4, 2], [20, 0, 5, 2], [22, 0, 5, 2], [20, 0, 4, 2],
  ], 0, 7),

  // SFX 22: ship being captured — eerie looping minor pulse
  sfxLine(5, [
    [22, 4, 3, 0], [25, 4, 4, 0], [29, 4, 4, 0], [25, 4, 4, 0],
    [20, 4, 3, 0], [24, 4, 4, 0], [27, 4, 4, 0], [24, 4, 4, 0],
  ], 0, 7),

  // SFX 23: ship captured — dark little sting
  sfxLine(7, [
    [24, 5, 4, 0], [31, 5, 5, 0], [28, 4, 6, 1], [23, 4, 5, 3],
    [19, 4, 4, 5],
  ]),

  // SFX 24: ship rescued — bright return fanfare
  sfxLine(5, [
    [28, 1, 4, 0], [32, 1, 5, 0], [35, 1, 6, 0],
    [40, 1, 6, 0], [44, 1, 7, 0], [47, 1, 6, 5],
  ]),

  // SFX 25: ufo flyover — warbling phaser loop
  sfxLine(4, [
    [26, 7, 3, 2], [30, 7, 4, 2], [34, 7, 5, 2], [30, 7, 4, 2],
    [24, 7, 3, 2], [28, 7, 4, 2], [32, 7, 5, 2], [28, 7, 4, 2],
  ], 0, 7),

  // SFX 26: enemy dive — arcade-style descending warble
  sfxLine(2, [
    [42, 7, 6, 2], [38, 7, 6, 2], [34, 7, 6, 2], [30, 7, 5, 2],
    [26, 7, 5, 2], [22, 7, 4, 2], [18, 7, 3, 5],
  ]),
];

while (sfxData.length < 64) {
  sfxData.push(sfxLine(1, []));
}

while (musicData.length < 64) {
  musicData.push('00 40404040');
}

const sfxSection = sfxData.join('\n');

const cart = [
  'pico-8 cartridge // http://www.pico-8.com',
  'version 43',
  '__lua__',
  lua.trimEnd(),
  '__gfx__',
  gfx,
  '__gff__',
  gffData.join('\n'),
  '__map__',
  mapData.join('\n'),
  '__sfx__',
  sfxSection,
  '__music__',
  musicData.join('\n'),
  '',
].join('\n');

fs.writeFileSync(outPath, cart);
console.log(`built ${path.relative(root, outPath)}`);
