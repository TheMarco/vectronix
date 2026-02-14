/**
 * Procedural sound engine using Web Audio API.
 * All sounds synthesized — no external files.
 * Retro arcade aesthetic: square/saw waves, noise bursts, pitch sweeps.
 */
export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.4;
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio not available');
    }
  }

  _ensureCtx() {
    if (!this.initialized) this.init();
    if (!this.ctx) return false;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return true;
  }

  // ─── PLAYER FIRE ───
  // Sharp laser zap: high pitch sweep down
  playFire() {
    if (!this._ensureCtx()) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.08);
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.connect(gain).connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  // ─── ENEMY HIT (non-lethal) ───
  // Short metallic ping — distinct from explosion
  playEnemyHit() {
    if (!this._ensureCtx()) return;
    const t = this.ctx.currentTime;

    // Metallic ping
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1800, t);
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.06);
    gain.gain.setValueAtTime(0.14, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(gain).connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.08);

    // Clank harmonic
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(2400, t);
    osc2.frequency.exponentialRampToValueAtTime(800, t + 0.05);
    gain2.gain.setValueAtTime(0.08, t);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    osc2.connect(gain2).connect(this.masterGain);
    osc2.start(t);
    osc2.stop(t + 0.06);
  }

  // ─── ENEMY EXPLOSION ───
  // 8-bit style: short white noise burst + fast descending square wave
  playExplosion() {
    if (!this._ensureCtx()) return;
    const t = this.ctx.currentTime;

    // Raw white noise burst — no filtering, just hard cutoff
    const bufLen = this.ctx.sampleRate * 0.12;
    const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.22, t);
    noiseGain.gain.linearRampToValueAtTime(0.0, t + 0.12);
    noise.connect(noiseGain).connect(this.masterGain);
    noise.start(t);
    noise.stop(t + 0.12);

    // Fast descending square wave — the classic 8-bit "pop"
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.1);
    oscGain.gain.setValueAtTime(0.18, t);
    oscGain.gain.linearRampToValueAtTime(0.0, t + 0.1);
    osc.connect(oscGain).connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  // ─── PLAYER DEATH ───
  // Big 8-bit explosion: two staggered noise bursts + deep square sweep
  playPlayerDeath() {
    if (!this._ensureCtx()) return;
    const t = this.ctx.currentTime;

    // First noise burst — immediate hit
    const bufLen = this.ctx.sampleRate * 0.2;
    const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise1 = this.ctx.createBufferSource();
    noise1.buffer = buf;
    const ng1 = this.ctx.createGain();
    ng1.gain.setValueAtTime(0.3, t);
    ng1.gain.linearRampToValueAtTime(0.0, t + 0.2);
    noise1.connect(ng1).connect(this.masterGain);
    noise1.start(t);
    noise1.stop(t + 0.2);

    // Second noise burst — staggered for 8-bit "crunch"
    const noise2 = this.ctx.createBufferSource();
    noise2.buffer = buf;
    const ng2 = this.ctx.createGain();
    ng2.gain.setValueAtTime(0.25, t + 0.08);
    ng2.gain.linearRampToValueAtTime(0.0, t + 0.3);
    noise2.connect(ng2).connect(this.masterGain);
    noise2.start(t + 0.08);
    noise2.stop(t + 0.3);

    // Deep descending square wave
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.3);
    oscGain.gain.setValueAtTime(0.25, t);
    oscGain.gain.linearRampToValueAtTime(0.0, t + 0.3);
    osc.connect(oscGain).connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.3);

    // Second square hit — slightly delayed, lower
    const osc2 = this.ctx.createOscillator();
    const og2 = this.ctx.createGain();
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(200, t + 0.1);
    osc2.frequency.exponentialRampToValueAtTime(20, t + 0.35);
    og2.gain.setValueAtTime(0.2, t + 0.1);
    og2.gain.linearRampToValueAtTime(0.0, t + 0.35);
    osc2.connect(og2).connect(this.masterGain);
    osc2.start(t + 0.1);
    osc2.stop(t + 0.35);
  }

  // ─── ENEMY BULLET ───
  // Short blip
  playEnemyFire() {
    if (!this._ensureCtx()) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.exponentialRampToValueAtTime(150, t + 0.06);
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    osc.connect(gain).connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  // ─── WAVE START ───
  // Rising arpeggio fanfare
  playWaveStart() {
    if (!this._ensureCtx()) return;
    const t = this.ctx.currentTime;
    const notes = [330, 440, 550, 660, 880];

    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      const noteT = t + i * 0.08;
      osc.frequency.setValueAtTime(freq, noteT);
      gain.gain.setValueAtTime(0, noteT);
      gain.gain.linearRampToValueAtTime(0.15, noteT + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, noteT + 0.15);
      osc.connect(gain).connect(this.masterGain);
      osc.start(noteT);
      osc.stop(noteT + 0.15);
    });
  }

  // ─── DIVE ATTACK ───
  // Descending whoosh
  playDive() {
    if (!this._ensureCtx()) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.35);
    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.connect(gain).connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.35);
  }

  // ─── MENU SELECT ───
  // Clean blip
  playSelect() {
    if (!this._ensureCtx()) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(660, t);
    osc.frequency.setValueAtTime(880, t + 0.05);
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain).connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  // ─── CHALLENGE STAGE FANFARE ───
  // Dramatic ascending arpeggio with harmonics
  playChallengeStart() {
    if (!this._ensureCtx()) return;
    const t = this.ctx.currentTime;
    const notes = [220, 330, 440, 550, 660, 880, 1100];

    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      const noteT = t + i * 0.1;
      osc.frequency.setValueAtTime(freq, noteT);
      osc.frequency.setValueAtTime(freq * 1.01, noteT + 0.05); // slight detune shimmer
      gain.gain.setValueAtTime(0, noteT);
      gain.gain.linearRampToValueAtTime(0.14, noteT + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, noteT + 0.25);
      osc.connect(gain).connect(this.masterGain);
      osc.start(noteT);
      osc.stop(noteT + 0.25);
    });

    // Sub bass thump
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(55, t);
    subGain.gain.setValueAtTime(0.3, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
    sub.connect(subGain).connect(this.masterGain);
    sub.start(t);
    sub.stop(t + 0.8);
  }

  // ─── CHALLENGE PERFECT ───
  // Triumphant chord burst
  playChallengePerfect() {
    if (!this._ensureCtx()) return;
    const t = this.ctx.currentTime;
    const chord = [440, 554, 659, 880]; // A major chord with octave

    chord.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = i < 2 ? 'square' : 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
      osc.connect(gain).connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.8);
    });

    // Rising sweep over the top
    const sweep = this.ctx.createOscillator();
    const sweepGain = this.ctx.createGain();
    sweep.type = 'sawtooth';
    sweep.frequency.setValueAtTime(880, t + 0.2);
    sweep.frequency.exponentialRampToValueAtTime(3000, t + 0.7);
    sweepGain.gain.setValueAtTime(0, t + 0.2);
    sweepGain.gain.linearRampToValueAtTime(0.06, t + 0.3);
    sweepGain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
    sweep.connect(sweepGain).connect(this.masterGain);
    sweep.start(t + 0.2);
    sweep.stop(t + 0.8);
  }

  // ─── CHALLENGE RESULT ───
  // Quick score tally blip
  playChallengeResult() {
    if (!this._ensureCtx()) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(550, t);
    osc.frequency.setValueAtTime(770, t + 0.06);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(gain).connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  // ─── TRACTOR BEAM ───
  // Dramatic warning melody — descending ominous fanfare
  playTractorBeam() {
    if (!this._ensureCtx()) return;
    const t = this.ctx.currentTime;

    // Warning melody: dramatic descending notes (D5 C5 Bb4 A4 G4 F4 E4 D4)
    const notes = [587, 523, 466, 440, 392, 349, 330, 294];
    const noteLen = 0.18;
    for (let i = 0; i < notes.length; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(notes[i], t + i * noteLen);
      gain.gain.setValueAtTime(0, t);
      gain.gain.setValueAtTime(0.15, t + i * noteLen);
      gain.gain.setValueAtTime(0.12, t + i * noteLen + noteLen * 0.7);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * noteLen + noteLen);
      osc.connect(gain).connect(this.masterGain);
      osc.start(t + i * noteLen);
      osc.stop(t + i * noteLen + noteLen);
    }

    // Sustained warble underneath the melody (~2s)
    for (let i = 0; i < 2; i++) {
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sawtooth';
      const baseFreq = 140 + i * 5;
      osc2.frequency.setValueAtTime(baseFreq, t);
      osc2.frequency.linearRampToValueAtTime(baseFreq * 0.8, t + 2.0);
      gain2.gain.setValueAtTime(0.04, t);
      gain2.gain.setValueAtTime(0.08, t + 0.5);
      gain2.gain.setValueAtTime(0.08, t + 1.2);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 2.0);
      osc2.connect(gain2).connect(this.masterGain);
      osc2.start(t);
      osc2.stop(t + 2.0);
    }
  }

  // ─── CAPTURE ───
  // Descending scale — player caught
  playCapture() {
    if (!this._ensureCtx()) return;
    const t = this.ctx.currentTime;
    const notes = [880, 660, 440, 330, 220];

    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      const noteT = t + i * 0.1;
      osc.frequency.setValueAtTime(freq, noteT);
      gain.gain.setValueAtTime(0.14, noteT);
      gain.gain.exponentialRampToValueAtTime(0.001, noteT + 0.15);
      osc.connect(gain).connect(this.masterGain);
      osc.start(noteT);
      osc.stop(noteT + 0.15);
    });
  }

  // ─── RESCUE ───
  // Rising arpeggio — ship rescued
  playRescue() {
    if (!this._ensureCtx()) return;
    const t = this.ctx.currentTime;
    const notes = [330, 440, 550, 660, 880, 1100];

    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      const noteT = t + i * 0.07;
      osc.frequency.setValueAtTime(freq, noteT);
      gain.gain.setValueAtTime(0.12, noteT);
      gain.gain.exponentialRampToValueAtTime(0.001, noteT + 0.18);
      osc.connect(gain).connect(this.masterGain);
      osc.start(noteT);
      osc.stop(noteT + 0.18);
    });
  }

  // ─── DUAL FIGHTER ───
  // Power-up chord — dual mode activated
  playDualFighter() {
    if (!this._ensureCtx()) return;
    const t = this.ctx.currentTime;
    const chord = [330, 415, 494, 660]; // E major chord

    chord.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = i < 2 ? 'square' : 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.linearRampToValueAtTime(0.1, t + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      osc.connect(gain).connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.6);
    });
  }

  // ─── DEFLECT ───
  // Short metallic ring — spinner spoke deflects bullet
  playDeflect() {
    if (!this._ensureCtx()) return;
    const t = this.ctx.currentTime;

    // High metallic ping
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(3200, t);
    osc.frequency.exponentialRampToValueAtTime(1200, t + 0.08);
    gain.gain.setValueAtTime(0.16, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.connect(gain).connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.1);

    // Ring harmonic
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(4800, t);
    osc2.frequency.exponentialRampToValueAtTime(2000, t + 0.12);
    gain2.gain.setValueAtTime(0.06, t);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc2.connect(gain2).connect(this.masterGain);
    osc2.start(t);
    osc2.stop(t + 0.12);
  }

  // ─── EXTRA LIFE ───
  // Bright ascending arpeggio — 1UP!
  playExtraLife() {
    if (!this._ensureCtx()) return;
    const t = this.ctx.currentTime;
    const notes = [523, 659, 784, 1047, 1319, 1568];

    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = i < 3 ? 'square' : 'sawtooth';
      const noteT = t + i * 0.06;
      osc.frequency.setValueAtTime(freq, noteT);
      gain.gain.setValueAtTime(0, noteT);
      gain.gain.linearRampToValueAtTime(0.14, noteT + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, noteT + 0.2);
      osc.connect(gain).connect(this.masterGain);
      osc.start(noteT);
      osc.stop(noteT + 0.2);
    });

    // Shimmer chord at peak
    const chord = [1047, 1319];
    chord.forEach((freq) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t + 0.3);
      gain.gain.setValueAtTime(0.08, t + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
      osc.connect(gain).connect(this.masterGain);
      osc.start(t + 0.3);
      osc.stop(t + 0.7);
    });
  }

  // ─── STAT TALLY BLIP ───
  // Short click for stat reveal
  playTallyBlip() {
    if (!this._ensureCtx()) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.setValueAtTime(1100, t + 0.02);
    gain.gain.setValueAtTime(0.10, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    osc.connect(gain).connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  // ─── UFO FLYING ───
  // Continuous warble: two detuned sines creating 6Hz beat frequency
  // Returns { stop() } handle to kill the sound
  playUfoFlying() {
    if (!this._ensureCtx()) return { stop() {} };
    const t = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc1.type = 'sine';
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(300, t);
    osc2.frequency.setValueAtTime(306, t);
    gain.gain.setValueAtTime(0.06, t);
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);
    osc1.start(t);
    osc2.start(t);

    return {
      stop: () => {
        try {
          const now = this.ctx.currentTime;
          gain.gain.setValueAtTime(gain.gain.value, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
          osc1.stop(now + 0.1);
          osc2.stop(now + 0.1);
        } catch (e) {}
      }
    };
  }

  // ─── UFO KILL ───
  // Descending square sweep + noise pop
  playUfoKill() {
    if (!this._ensureCtx()) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1800, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.15);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(gain).connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.2);

    // Noise pop
    const bufLen = this.ctx.sampleRate * 0.1;
    const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.18, t);
    ng.gain.linearRampToValueAtTime(0.0, t + 0.1);
    noise.connect(ng).connect(this.masterGain);
    noise.start(t);
    noise.stop(t + 0.1);
  }

  // ─── TIME FREEZE ───
  // Deep bass thud + high crystalline shimmer
  playTimeFreeze() {
    if (!this._ensureCtx()) return;
    const t = this.ctx.currentTime;

    // Deep bass thud
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(40, t);
    sub.frequency.exponentialRampToValueAtTime(20, t + 0.4);
    subGain.gain.setValueAtTime(0.35, t);
    subGain.gain.linearRampToValueAtTime(0.0, t + 0.4);
    sub.connect(subGain).connect(this.masterGain);
    sub.start(t);
    sub.stop(t + 0.4);

    // High crystalline shimmer
    const freqs = [2400, 3200, 4000];
    freqs.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.6, t + 0.5);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.06, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.connect(gain).connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.5);
    });

    // Noise burst for impact
    const bufLen = this.ctx.sampleRate * 0.08;
    const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.15, t);
    ng.gain.linearRampToValueAtTime(0.0, t + 0.08);
    noise.connect(ng).connect(this.masterGain);
    noise.start(t);
    noise.stop(t + 0.08);
  }

  // ─── POWER UP ───
  // Quick ascending arpeggio
  playPowerUp() {
    if (!this._ensureCtx()) return;
    const t = this.ctx.currentTime;
    const notes = [600, 800, 1000, 1200];

    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      const noteT = t + i * 0.05;
      osc.frequency.setValueAtTime(freq, noteT);
      gain.gain.setValueAtTime(0.14, noteT);
      gain.gain.exponentialRampToValueAtTime(0.001, noteT + 0.12);
      osc.connect(gain).connect(this.masterGain);
      osc.start(noteT);
      osc.stop(noteT + 0.12);
    });
  }

  // ─── TITLE MUSIC ───
  // Simple looping bass pulse
  playTitlePulse() {
    if (!this._ensureCtx()) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(55, t);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.linearRampToValueAtTime(0.2, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.connect(gain).connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.3);
  }
}
