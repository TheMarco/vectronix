// PICO-8 Sound Engine — Pre-rendered AudioBuffer approach
// All SFX are rendered to buffers at init for reliable, glitch-free playback

const P8Sound = (() => {
  let audioCtx = null;
  const channels = [null, null, null, null];
  const sfxBuffers = []; // Pre-rendered AudioBuffers
  let musicNodes = [];

  // Waveforms: 0=sine 1=triangle 2=saw 3=square 4=pulse 5=organ 6=noise 7=phaser
  // Effects: 0=none 1=slide 2=vibrato 3=drop 4=fade_in 5=fade_out 6=arp_fast 7=arp_slow

  const SILENT = { pitch: 0, waveform: 0, volume: 0, effect: 0 };

  function parseRawSfxLine(raw) {
    const speed = parseInt(raw.substring(2, 4), 16);
    const loopStart = parseInt(raw.substring(4, 6), 16);
    const loopEnd = parseInt(raw.substring(6, 8), 16);
    const notes = [];
    for (let i = 0; i < 32; i++) {
      const off = 8 + i * 5;
      if (off + 5 > raw.length) { notes.push(SILENT); continue; }
      notes.push({
        pitch: parseInt(raw.substring(off, off + 2), 16),
        waveform: parseInt(raw[off + 2], 16),
        volume: parseInt(raw[off + 3], 16),
        effect: parseInt(raw[off + 4], 16)
      });
    }
    return { speed, loopStart, loopEnd, notes };
  }

  function sfxLine(speed, noteArr, loopStart = 0, loopEnd = 0) {
    const notes = [];
    for (let i = 0; i < 32; i++) {
      if (i < noteArr.length) {
        notes.push({ pitch: noteArr[i][0], waveform: noteArr[i][1], volume: noteArr[i][2], effect: noteArr[i][3] });
      } else {
        notes.push(SILENT);
      }
    }
    return { speed, loopStart, loopEnd, notes };
  }

  const sfxData = [
    parseRawSfxLine('4d0210201842418441184511844118431184311843118431184311843118431184311843118431184311843118421184211842118421184211842118421184211842118421184211842118421184211842118421'),
    parseRawSfxLine('050110200025400251002510023100231002210022100221001210012100121001210012100121001110011100011000110001100011000110001100011000110001100011000110001100011000110001100011'),
    parseRawSfxLine('000f18002485024850238502385021850218501f8501f8501c8501c8501a8501a8501885018850178501785015850158501385013850108501085015850158500140001400014000140001400014000140001400'),
    parseRawSfxLine('000f1800219502195021950219501c9501c9501c9501c9501d9501d9501d9501d950189501895018950189501f9501f9501f9501f950219502195021950219500140001400014000140001400014000140001400'),
    parseRawSfxLine('000f180018850188501c8501c8501f8501f850248502485021850218501f8501f8501c8501c8501a8501a8501c8501c8501f8501f8501d8501d85018850188500140001400014000140001400014000140001400'),
    sfxLine(2, [[48,3,5,0],[44,3,4,3],[36,3,2,5]]),
    sfxLine(4, [[24,6,7,0],[20,6,6,0],[16,6,5,0],[12,6,3,5],[8,6,2,5]]),
    sfxLine(5, [[46,7,5,2],[42,7,6,3],[38,4,7,1],[34,4,6,3],[30,2,6,3],[26,2,5,3],[22,6,5,0],[18,6,4,3],[14,6,3,5],[10,6,2,5]]),
    sfxLine(8, [[24,1,4,0],[28,1,5,1],[32,1,5,1],[36,1,6,0],[40,1,6,0],[44,1,5,5]]),
    sfxLine(4, [[36,1,5,0],[40,1,5,0],[43,1,6,0],[48,1,6,0],[48,1,4,5]]),
    sfxLine(8, [[36,1,5,0],[36,1,5,0],[40,1,6,0],[43,1,6,0],[48,1,7,0],[48,1,6,0],[48,1,4,5],[48,1,2,5]]),
    sfxLine(6, [[34,5,4,0],[32,5,4,1],[29,5,5,0],[25,5,5,1],[22,4,6,2],[18,4,5,3],[15,4,4,5]]),
    parseRawSfxLine('010400071204214052160521404212042140521605214042000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'),
    parseRawSfxLine('0105000716430194401d4401944014430184401b440184400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'),
    parseRawSfxLine('01070000185401f5501c461174531344500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'),
    parseRawSfxLine('010500001c1402015023160281602c1702f165000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'),
    parseRawSfxLine('010400071a7321e742227521e742187321c742207521c742000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'),
    parseRawSfxLine('010200002a76226762227621e7521a752167421273500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'),
    parseRawSfxLine('000f1800189501895018950189501f9501f9501f9501f950219502195021950219501f9501f9501f9501f9501d9501d9501d9501d9501f9501f95018950189500140001400014000140001400014000140001400'),
    parseRawSfxLine('000f1800158501585018850188501c8501c8501885018850158501585018850188501a8501a850188501885017850178501585015850138501385015850158500140001400014000140001400014000140001400'),
    parseRawSfxLine('000f180021950219502195021950219502195021950219501f9501f9501f9501f9501d9501d9501d9501d9501c9501c9501c9501c9501c9501c95021950219500140001400014000140001400014000140001400'),
    sfxLine(4, [[18,0,4,2],[20,0,5,2],[22,0,5,2],[20,0,4,2],[18,0,4,2],[20,0,5,2],[22,0,5,2],[20,0,4,2]], 0, 7),
    sfxLine(5, [[22,4,3,0],[25,4,4,0],[29,4,4,0],[25,4,4,0],[20,4,3,0],[24,4,4,0],[27,4,4,0],[24,4,4,0]], 0, 7),
    sfxLine(7, [[24,5,4,0],[31,5,5,0],[28,4,6,1],[23,4,5,3],[19,4,4,5]]),
    sfxLine(5, [[28,1,4,0],[32,1,5,0],[35,1,6,0],[40,1,6,0],[44,1,7,0],[47,1,6,5]]),
    sfxLine(4, [[26,7,3,2],[30,7,4,2],[34,7,5,2],[30,7,4,2],[24,7,3,2],[28,7,4,2],[32,7,5,2],[28,7,4,2]], 0, 7),
    sfxLine(2, [[42,7,6,2],[38,7,6,2],[34,7,6,2],[30,7,5,2],[26,7,5,2],[22,7,4,2],[18,7,3,5]]),
  ];

  const musicPatterns = [
    { channels: [0x04, 0x12, 0x40, 0x40] },
    { channels: [0x13, 0x14, 0x40, 0x40] },
    { channels: [0x02, 0x03, 0x40, 0x40] },
  ];

  // --- Waveform generation ---
  function pitchToFreq(pitch) {
    return 65.41 * Math.pow(2, pitch / 12);
  }

  function generateWave(waveform, phase) {
    // phase is 0..1
    switch (waveform) {
      case 0: return Math.sin(phase * Math.PI * 2); // sine
      case 1: return 1 - 4 * Math.abs(Math.round(phase) - phase); // triangle
      case 2: return 2 * (phase - Math.floor(phase + 0.5)); // saw
      case 3: return phase < 0.5 ? 1 : -1; // square
      case 4: return phase < 0.3333 ? 1 : -1; // pulse (33% duty)
      case 5: { // organ (triangle + overtone)
        const t = phase * Math.PI * 2;
        return 0.7 * Math.sin(t) + 0.3 * Math.sin(t * 2);
      }
      case 6: return Math.random() * 2 - 1; // noise
      case 7: { // phaser (saw with phase modulation)
        const t = phase * Math.PI * 2;
        return Math.sin(t + 0.5 * Math.sin(t * 3)) * 0.8;
      }
      default: return phase < 0.5 ? 1 : -1;
    }
  }

  // Render a single SFX definition to a Float32Array of samples
  function renderSfx(def, sampleRate, looping) {
    const noteLen = def.speed / 120; // seconds per note
    const noteSamples = Math.floor(noteLen * sampleRate);

    // Find last non-silent note
    let lastNote = 0;
    const noteCount = def.notes.length;
    for (let i = 0; i < noteCount; i++) {
      if (def.notes[i].volume > 0) lastNote = i;
    }
    const totalNotes = Math.min(noteCount, looping ? def.loopEnd + 1 : lastNote + 1);
    const totalSamples = totalNotes * noteSamples;
    const out = new Float32Array(totalSamples);

    let phase = 0;

    for (let ni = 0; ni < totalNotes; ni++) {
      const n = def.notes[ni];
      if (n.volume === 0) continue;

      const freq = pitchToFreq(n.pitch);
      let nextFreq = freq;
      if (n.effect === 1 && ni + 1 < totalNotes && ni + 1 < def.notes.length && def.notes[ni + 1].volume > 0) {
        nextFreq = pitchToFreq(def.notes[ni + 1].pitch);
      }

      const baseVol = n.volume / 7;
      const startSample = ni * noteSamples;

      for (let s = 0; s < noteSamples; s++) {
        const t = s / noteSamples; // 0..1 within this note
        const sampleIdx = startSample + s;
        if (sampleIdx >= totalSamples) break;

        // Frequency with effects
        let f = freq;
        switch (n.effect) {
          case 1: f = freq + (nextFreq - freq) * t; break; // slide
          case 2: f = freq * (1 + 0.03 * Math.sin(t * 12 * Math.PI)); break; // vibrato
          case 3: f = freq * Math.pow(0.25, t); break; // drop
        }

        // Volume envelope
        let vol = baseVol;
        switch (n.effect) {
          case 4: vol = baseVol * t; break; // fade in
          case 5: vol = baseVol * (1 - t); break; // fade out
        }

        // Advance phase
        phase += f / sampleRate;
        phase -= Math.floor(phase);

        out[sampleIdx] += generateWave(n.waveform, phase) * vol * 0.15;
      }
    }

    return { samples: out, duration: totalNotes * noteLen };
  }

  // --- Pre-render all SFX at init ---
  let rendered = false;

  function renderAllSfx() {
    if (rendered) return;
    rendered = true;
    const ctx = ensureAudioCtx();
    const sr = ctx.sampleRate;

    for (let i = 0; i < sfxData.length; i++) {
      const def = sfxData[i];
      const isLooping = def.loopEnd > def.loopStart;

      // For looping SFX, render enough for a few seconds of loop
      const { samples, duration } = renderSfx(def, sr, isLooping);

      let buf;
      if (isLooping && samples.length > 0) {
        // Render 4 repetitions for the loop buffer
        const reps = 8;
        const loopSamples = new Float32Array(samples.length * reps);
        for (let r = 0; r < reps; r++) {
          loopSamples.set(samples, r * samples.length);
        }
        buf = ctx.createBuffer(1, loopSamples.length, sr);
        buf.getChannelData(0).set(loopSamples);
        sfxBuffers[i] = { buffer: buf, looping: true, loopDuration: duration };
      } else if (samples.length > 0) {
        buf = ctx.createBuffer(1, samples.length, sr);
        buf.getChannelData(0).set(samples);
        sfxBuffers[i] = { buffer: buf, looping: false };
      } else {
        sfxBuffers[i] = null;
      }
    }
  }

  function ensureAudioCtx() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  // --- Playback ---
  function sfx(n, channel) {
    if (n < 0) {
      stopChannel(channel !== undefined ? channel : 0);
      return;
    }
    if (n >= sfxData.length) return;
    renderAllSfx();

    const entry = sfxBuffers[n];
    if (!entry) return;

    const ctx = ensureAudioCtx();
    const ch = channel !== undefined ? channel : 0;

    if (entry.looping) {
      // Looping: stop previous on this channel
      stopChannel(ch);
      const src = ctx.createBufferSource();
      src.buffer = entry.buffer;
      src.loop = true;
      src.loopEnd = entry.buffer.duration;
      const gain = ctx.createGain();
      gain.gain.value = 1;
      src.connect(gain);
      gain.connect(ctx.destination);
      src.start();
      channels[ch] = { src, gain, looping: true };
    } else {
      // One-shot: fire and forget, don't kill previous one-shots
      // Only stop if channel has a looping sound
      if (channels[ch] && channels[ch].looping) {
        stopChannel(ch);
      }
      const src = ctx.createBufferSource();
      src.buffer = entry.buffer;
      const gain = ctx.createGain();
      gain.gain.value = 1;
      src.connect(gain);
      gain.connect(ctx.destination);
      src.start();
      // Auto-cleanup
      src.onended = () => { try { gain.disconnect(); } catch(e) {} };
    }
  }

  function stopChannel(ch) {
    if (channels[ch]) {
      try {
        channels[ch].src.stop();
        channels[ch].gain.disconnect();
      } catch (e) {}
      channels[ch] = null;
    }
  }

  function music(n) {
    stopMusic();
    if (n < 0 || n >= musicPatterns.length) return;
    renderAllSfx();

    const ctx = ensureAudioCtx();
    const pat = musicPatterns[n];

    for (let ch = 0; ch < 2; ch++) {
      const sfxIdx = pat.channels[ch];
      if (sfxIdx >= 0x40 || sfxIdx >= sfxData.length) continue;
      const entry = sfxBuffers[sfxIdx];
      if (!entry) continue;
      const src = ctx.createBufferSource();
      src.buffer = entry.buffer;
      const gain = ctx.createGain();
      gain.gain.value = 1;
      src.connect(gain);
      gain.connect(ctx.destination);
      src.start();
      musicNodes.push({ src, gain });
    }
  }

  function stopMusic() {
    for (const r of musicNodes) {
      try { r.src.stop(); r.gain.disconnect(); } catch (e) {}
    }
    musicNodes = [];
  }

  function resume() {
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  }

  return { sfx, music, stopChannel, stopMusic, resume, ensureAudioCtx };
})();
