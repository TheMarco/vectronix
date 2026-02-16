import { CONFIG } from '../config.js';

/**
 * Enemy states:
 *   'entering'          — flying along entrance path toward formation slot
 *   'holding'           — in formation, following formation sway
 *   'diving'            — broke from formation, following dive path
 *   'returning'         — dive finished, flying back to formation slot
 *   're-entering'       — warped above screen, flying back to formation from top
 *   'tractor_diving'    — boss diving down to deploy beam
 *   'tractor_beaming'   — boss hovering, beam active
 *   'tractor_capturing' — beam got player, pulling ship up
 *   'tractor_returning' — beam done, boss returning to formation
 *   'dead'              — destroyed
 */
export class Enemy {
  // HP by enemy type
  static HP_TABLE = {
    grunt: 1, swarm: 1, attacker: 1, spinner: 1, phantom: 1,
    bomber: 2, commander: 2, boss: 2,
    guardian: 3,
  };

  constructor(type, row, col) {
    this.type = type;       // 'grunt' | 'attacker' | 'commander'
    this.row = row;
    this.col = col;
    this.state = 'queued';
    this.alive = true;
    this.entranceGroup = -1; // set by WaveSystem

    // HP system
    this.maxHp = Enemy.HP_TABLE[type] || 1;
    this.hp = this.maxHp;
    this.hitFlashTimer = 0;

    // Current world position
    this.x = 0;
    this.y = 0;
    this.z = 0;

    // Entrance path
    this.entrancePath = null;
    this.entranceT = 0;
    this.entranceSpeed = 1.0;

    // Dive state
    this.divePath = null;
    this.diveT = 0;
    this.diveSpeed = 1.0;
    this.diveShots = 0;

    // Spinner rotation (per-enemy, used for deflection check)
    this.spinAngle = 0;

    // Phantom flicker
    this.phantomTimer = Math.random() * Math.PI * 2; // randomize phase

    // Boss-specific
    this.isBoss = type === 'boss';
    this.capturedShip = null;     // reference to CapturedShip if holding one
    this.beamTimer = 0;           // ms remaining for beam
    this.beamActive = false;
    this.tractorPath = null;
    this.tractorT = 0;

    // Return to formation
    this.returnStartX = 0;
    this.returnStartY = 0;
    this.returnStartZ = 0;
    this.returnT = 0;

    // Boss phase shift
    this.bossPhase = 1;
    // Boss behavior type (0=standard, 1=aggressor, 2=commander, 3=hunter)
    this.behaviorType = 0;

    // Score
    this.scoreValue = this._getScore(false);
    this.scoreDiving = this._getScore(true);
  }

  _getScore(diving) {
    const key = this.type.toUpperCase();
    const base = CONFIG[`SCORE_${key}`] || 50;
    const divingScore = CONFIG[`SCORE_${key}_DIVING`] || base * 2;
    return diving ? divingScore : base;
  }

  get damageLevel() {
    return this.maxHp - this.hp;
  }

  get color() {
    if (this.hitFlashTimer > 0) return 0xffffff;
    const key = this.type.toUpperCase();
    const base = CONFIG.COLORS[key] || 0xffffff;
    if (this.isBoss && this.bossPhase === 2) return this._shiftPhase2(base);
    if (this.damageLevel === 0) return base;
    return this._shiftDamage(base);
  }

  get color2() {
    if (this.hitFlashTimer > 0) return 0xffffff;
    const key = this.type.toUpperCase();
    const base = CONFIG.COLORS_2[key] || CONFIG.COLORS[key] || 0xffffff;
    if (this.isBoss && this.bossPhase === 2) return this._shiftPhase2(base);
    if (this.damageLevel === 0) return base;
    return this._shiftDamage(base);
  }

  _shiftPhase2(base) {
    const r = (base >> 16) & 0xff;
    const g = (base >> 8) & 0xff;
    const b = base & 0xff;
    return ((Math.min(255, r + 60) << 16) | (Math.min(255, g + 30) << 8) | (Math.min(255, b + 40))) >>> 0;
  }

  _shiftDamage(base) {
    // Shift toward red/white when damaged
    const r = (base >> 16) & 0xff;
    const g = (base >> 8) & 0xff;
    const b = base & 0xff;
    if (this.damageLevel >= 2) {
      // Critical: shift heavily toward white-red
      return ((Math.min(255, r + 140) << 16) | (Math.max(0, g - 80) << 8) | Math.max(0, b - 80)) >>> 0;
    }
    // Damaged: shift toward red
    return ((Math.min(255, r + 80) << 16) | (Math.max(0, g - 40) << 8) | Math.max(0, b - 40)) >>> 0;
  }

  get isPreDive() {
    return this.state === 'pre_dive';
  }

  get isDiving() {
    return this.state === 'diving' || this.state === 'tractor_diving' ||
           this.state === 'tractor_beaming' || this.state === 'tractor_capturing';
  }

  get isBeaming() {
    return this.state === 'tractor_beaming';
  }

  get isTargetable() {
    if (this.type === 'phantom') {
      return Math.sin(this.phantomTimer * 2.5) >= -0.3;
    }
    return true;
  }

  get phantomAlpha() {
    if (this.type !== 'phantom') return 1;
    const s = Math.sin(this.phantomTimer * 2.5);
    // Smooth transition: fully visible when s >= 0.3, ghostly when s < -0.3
    if (s >= 0.3) return 1;
    if (s <= -0.3) return 0.15;
    // Transition zone: map [-0.3, 0.3] → [0.15, 1]
    return 0.15 + (s + 0.3) / 0.6 * 0.85;
  }

  /** Returns true if enemy survived the hit */
  hit() {
    this.hp--;
    // Boss phase shift on first hit
    if (this.isBoss && this.hp === 1 && this.bossPhase === 1) {
      this.bossPhase = 2;
    }
    if (this.hp <= 0) {
      this.kill();
      return false; // dead
    }
    this.hitFlashTimer = 0.15;
    return true; // survived
  }

  kill() {
    this.killedInState = this.state;
    this.alive = false;
    this.state = 'dead';
  }

  /** Called each frame from formation system */
  setFormationPos(fx, fy, fz) {
    if (this.state === 'holding') {
      this.x = fx;
      this.y = fy;
      this.z = fz;
    }
  }

  startEntrance(path, speed) {
    this.entrancePath = path;
    this.entranceT = 0;
    this.entranceSpeed = speed;
    this.state = 'entering';
    const p = path(0);
    this.x = p.x;
    this.y = p.y;
    this.z = p.z || 0;
  }

  startDive(path, speed) {
    this.divePath = path;
    this.diveT = 0;
    this.diveSpeed = speed;
    this.diveShots = 0;

    // Pre-dive visual tell
    this.state = 'pre_dive';
    this.preDiveTimer = 0;
    this.preDiveDuration = 300 + Math.random() * 150; // 300-450ms
    this._preDiveStartZ = this.z;
  }

  startTractorDive(path) {
    this.tractorPath = path;
    this.tractorT = 0;
    this.state = 'tractor_diving';
    this.beamActive = false;
    this.beamTimer = CONFIG.BEAM_DURATION;
  }

  update(dt, formationX, formationY, formationZ) {
    if (!this.alive) return;

    // Hit flash decay
    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= dt;
      if (this.hitFlashTimer < 0) this.hitFlashTimer = 0;
    }

    // Spinner rotation
    if (this.type === 'spinner') {
      this.spinAngle -= dt * 3.0;
    }

    // Phantom flicker timer
    if (this.type === 'phantom') {
      this.phantomTimer += dt;
    }

    switch (this.state) {
      case 'queued':
        // Waiting in entrance queue — do nothing
        return;

      case 'entering': {
        this.entranceT += dt * this.entranceSpeed;
        if (this.entranceT >= 1) {
          this.state = 'holding';
          this.x = formationX;
          this.y = formationY;
          this.z = formationZ;
        } else {
          const p = this.entrancePath(this.entranceT);
          // Blend toward live formation position in last 15% to avoid snap
          if (this.entranceT > 0.85 && formationX != null) {
            const blend = (this.entranceT - 0.85) / 0.15;
            const ease = blend * blend * (3 - 2 * blend);
            this.x = p.x + (formationX - p.x) * ease;
            this.y = p.y + (formationY - p.y) * ease;
            this.z = (p.z || 0) + (formationZ - (p.z || 0)) * ease;
          } else {
            this.x = p.x;
            this.y = p.y;
            this.z = p.z || 0;
          }
        }
        break;
      }

      case 'holding': {
        this.x = formationX;
        this.y = formationY;
        this.z = formationZ;
        break;
      }

      case 'pre_dive': {
        this.preDiveTimer += dt * 1000;
        const t = Math.min(1, this.preDiveTimer / this.preDiveDuration);

        // Lerp z from formation depth (12) toward 9
        this.z = this._preDiveStartZ + (9 - this._preDiveStartZ) * t;
        // Stay at formation x/y with small horizontal jitter
        this.x = formationX + (Math.random() - 0.5) * 6;
        this.y = formationY;

        if (this.preDiveTimer >= this.preDiveDuration) {
          this.state = 'diving';
          this.z = formationZ; // reset z before dive path takes over
        }
        break;
      }

      case 'diving': {
        this.diveT += dt * this.diveSpeed;
        if (this.diveT >= 1) {
          // Check if endpoint is off-screen → re-enter from top
          const endP = this.divePath(1);
          const isOffScreen = endP.y > CONFIG.HEIGHT + 20 || endP.y < -20 ||
                              endP.x < -20 || endP.x > CONFIG.WIDTH + 20;
          if (isOffScreen) {
            // Warp above screen and re-enter toward formation
            this.state = 're-entering';
            // Pick a re-entry point above screen, offset toward formation slot
            this.returnStartX = formationX + (Math.random() - 0.5) * 120;
            this.returnStartY = -50;
            this.returnStartZ = 30;
            this.x = this.returnStartX;
            this.y = this.returnStartY;
            this.z = this.returnStartZ;
            this.returnT = 0;
          } else {
            // Legacy: smooth return for paths that end on-screen
            this.state = 'returning';
            this.returnStartX = this.x;
            this.returnStartY = this.y;
            this.returnStartZ = this.z;
            this.returnT = 0;
          }
        } else {
          const p = this.divePath(this.diveT);
          this.x = p.x;
          this.y = p.y;
          this.z = p.z || 0;
        }
        break;
      }

      case 'returning': {
        this.returnT += dt * 1.2;
        if (this.returnT >= 1) {
          this.state = 'holding';
          this.x = formationX;
          this.y = formationY;
          this.z = formationZ;
        } else {
          const t = this.returnT;
          const ease = t * t * (3 - 2 * t); // smoothstep
          this.x = this.returnStartX + (formationX - this.returnStartX) * ease;
          this.y = this.returnStartY + (formationY - this.returnStartY) * ease;
          this.z = this.returnStartZ + (formationZ - this.returnStartZ) * ease;
        }
        break;
      }

      case 're-entering': {
        // Fly from above screen back to formation slot — smooth curve
        this.returnT += dt * 0.7;
        if (this.returnT >= 1) {
          this.state = 'holding';
          this.x = formationX;
          this.y = formationY;
          this.z = formationZ;
        } else {
          const t = this.returnT;
          const ease = t * t * (3 - 2 * t);
          // Bezier-like curve: arc in from top
          const midX = (this.returnStartX + formationX) * 0.5;
          const midY = CONFIG.FIELD_TOP + 30;
          const u = 1 - ease;
          this.x = u * u * this.returnStartX + 2 * u * ease * midX + ease * ease * formationX;
          this.y = u * u * this.returnStartY + 2 * u * ease * midY + ease * ease * formationY;
          this.z = this.returnStartZ + (formationZ - this.returnStartZ) * ease;
        }
        break;
      }

      case 'tractor_diving': {
        // Follow dive path down to hover position (t 0→0.3 of tractor path)
        this.tractorT += dt * 0.18;
        if (this.tractorT >= 0.3) {
          this.tractorT = 0.3;
          this.state = 'tractor_beaming';
          this.beamActive = true;
        }
        const p = this.tractorPath(this.tractorT);
        this.x = p.x;
        this.y = p.y;
        this.z = p.z || 0;
        break;
      }

      case 'tractor_beaming': {
        // Hover in place, beam active
        this.beamTimer -= dt * 1000;
        // Slight sway while beaming
        const swayT = (CONFIG.BEAM_DURATION - this.beamTimer) / CONFIG.BEAM_DURATION;
        const p2 = this.tractorPath(0.3 + swayT * 0.5);
        this.x = p2.x;
        this.y = p2.y;
        this.z = p2.z || 0;

        if (this.beamTimer <= 0) {
          // Beam expired without capture
          this.beamActive = false;
          this.state = 'tractor_returning';
          this.returnStartX = this.x;
          this.returnStartY = this.y;
          this.returnStartZ = this.z;
          this.returnT = 0;
        }
        break;
      }

      case 'tractor_capturing': {
        // Wait for captured ship animation, then return
        // The capture animation is handled by CapturedShip entity
        // Boss stays in place briefly, then returns
        this.beamTimer -= dt * 1000;
        if (this.beamTimer <= 0) {
          this.beamActive = false;
          this.state = 'tractor_returning';
          this.returnStartX = this.x;
          this.returnStartY = this.y;
          this.returnStartZ = this.z;
          this.returnT = 0;
        }
        break;
      }

      case 'tractor_returning': {
        this.returnT += dt * 0.5;
        if (this.returnT >= 1) {
          this.state = 'holding';
          this.x = formationX;
          this.y = formationY;
          this.z = formationZ;
        } else {
          const t = this.returnT;
          const ease = t * t * (3 - 2 * t);
          this.x = this.returnStartX + (formationX - this.returnStartX) * ease;
          this.y = this.returnStartY + (formationY - this.returnStartY) * ease;
          this.z = this.returnStartZ + (formationZ - this.returnStartZ) * ease;
        }
        break;
      }
    }
  }
}
