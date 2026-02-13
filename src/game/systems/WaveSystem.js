import { CONFIG } from '../config.js';
import { Enemy } from '../entities/Enemy.js';
import {
  ENTRANCE_PATHS,
  DIVE_PATHS,
  CHALLENGE_LAYOUTS,
  createTractorBeamDive,
} from '../entities/DivePaths.js';
import { CapturedShip } from '../entities/CapturedShip.js';

/**
 * Wave definitions and progression.
 * Each wave defines enemy layout and attack cadence.
 * Later waves reuse patterns with higher speed and density.
 * Every 3rd wave is a CHALLENGE STAGE.
 */

// Wave templates: which rows/cols are populated
const WAVE_TEMPLATES = [
  // Wave 1: Grunts + attackers + 2 BOSSES
  {
    enemies: [
      [4, 1, 'grunt'], [4, 2, 'grunt'], [4, 3, 'grunt'], [4, 4, 'grunt'], [4, 5, 'grunt'], [4, 6, 'grunt'], [4, 7, 'grunt'], [4, 8, 'grunt'],
      [3, 2, 'grunt'], [3, 3, 'grunt'], [3, 4, 'grunt'], [3, 5, 'grunt'], [3, 6, 'grunt'], [3, 7, 'grunt'],
      [2, 4, 'attacker'], [2, 5, 'attacker'],
      [0, 4, 'boss'], [0, 5, 'boss'],
    ],
    diveInterval: 4000,
    entranceSpeed: 0.38,
  },
  // Wave 2: Full grunt rows + attackers + 2 BOSSES
  {
    enemies: [
      [4, 0, 'grunt'], [4, 1, 'grunt'], [4, 2, 'grunt'], [4, 3, 'grunt'], [4, 4, 'grunt'], [4, 5, 'grunt'], [4, 6, 'grunt'], [4, 7, 'grunt'], [4, 8, 'grunt'], [4, 9, 'grunt'],
      [3, 1, 'grunt'], [3, 2, 'grunt'], [3, 3, 'grunt'], [3, 4, 'grunt'], [3, 5, 'grunt'], [3, 6, 'grunt'], [3, 7, 'grunt'], [3, 8, 'grunt'],
      [2, 3, 'attacker'], [2, 4, 'attacker'], [2, 5, 'attacker'], [2, 6, 'attacker'],
      [1, 4, 'attacker'], [1, 5, 'attacker'],
      [0, 3, 'boss'], [0, 4, 'commander'], [0, 5, 'commander'], [0, 6, 'boss'],
    ],
    diveInterval: 3800,
    entranceSpeed: 0.40,
  },
  // Wave 3: Commanders + spinners + 2 BOSSES
  {
    enemies: [
      [4, 0, 'grunt'], [4, 1, 'grunt'], [4, 2, 'grunt'], [4, 3, 'grunt'], [4, 4, 'grunt'], [4, 5, 'grunt'], [4, 6, 'grunt'], [4, 7, 'grunt'], [4, 8, 'grunt'], [4, 9, 'grunt'],
      [3, 1, 'grunt'], [3, 2, 'grunt'], [3, 3, 'grunt'], [3, 4, 'grunt'], [3, 5, 'grunt'], [3, 6, 'grunt'], [3, 7, 'grunt'], [3, 8, 'grunt'],
      [2, 2, 'attacker'], [2, 3, 'attacker'], [2, 4, 'spinner'], [2, 5, 'spinner'], [2, 6, 'attacker'], [2, 7, 'attacker'],
      [1, 3, 'attacker'], [1, 4, 'attacker'], [1, 5, 'attacker'], [1, 6, 'attacker'],
      [0, 3, 'boss'], [0, 4, 'commander'], [0, 5, 'commander'], [0, 6, 'boss'],
    ],
    diveInterval: 3500,
    entranceSpeed: 0.40,
  },
  // Wave 4: Full formation + 4 BOSSES
  {
    enemies: [
      [4, 0, 'grunt'], [4, 1, 'grunt'], [4, 2, 'grunt'], [4, 3, 'grunt'], [4, 4, 'grunt'], [4, 5, 'grunt'], [4, 6, 'grunt'], [4, 7, 'grunt'], [4, 8, 'grunt'], [4, 9, 'grunt'],
      [3, 0, 'grunt'], [3, 1, 'grunt'], [3, 2, 'grunt'], [3, 3, 'grunt'], [3, 4, 'grunt'], [3, 5, 'grunt'], [3, 6, 'grunt'], [3, 7, 'grunt'], [3, 8, 'grunt'], [3, 9, 'grunt'],
      [2, 1, 'attacker'], [2, 2, 'attacker'], [2, 3, 'spinner'], [2, 4, 'attacker'], [2, 5, 'attacker'], [2, 6, 'spinner'], [2, 7, 'attacker'], [2, 8, 'attacker'],
      [1, 3, 'attacker'], [1, 4, 'attacker'], [1, 5, 'attacker'], [1, 6, 'attacker'],
      [0, 3, 'boss'], [0, 4, 'boss'], [0, 5, 'boss'], [0, 6, 'boss'],
    ],
    diveInterval: 3200,
    entranceSpeed: 0.42,
  },
  // Wave 5 (replaced by challenge stage)
  null,
  // Wave 6: Bombers + phantoms + 4 BOSSES
  {
    enemies: [
      [4, 0, 'swarm'], [4, 1, 'grunt'], [4, 2, 'grunt'], [4, 3, 'grunt'], [4, 4, 'grunt'], [4, 5, 'grunt'], [4, 6, 'grunt'], [4, 7, 'grunt'], [4, 8, 'grunt'], [4, 9, 'swarm'],
      [3, 0, 'grunt'], [3, 1, 'grunt'], [3, 2, 'grunt'], [3, 3, 'grunt'], [3, 4, 'grunt'], [3, 5, 'grunt'], [3, 6, 'grunt'], [3, 7, 'grunt'], [3, 8, 'grunt'], [3, 9, 'grunt'],
      [2, 1, 'phantom'], [2, 2, 'attacker'], [2, 3, 'attacker'], [2, 4, 'bomber'], [2, 5, 'bomber'], [2, 6, 'attacker'], [2, 7, 'attacker'], [2, 8, 'phantom'],
      [1, 2, 'spinner'], [1, 3, 'attacker'], [1, 4, 'attacker'], [1, 5, 'attacker'], [1, 6, 'attacker'], [1, 7, 'spinner'],
      [0, 3, 'boss'], [0, 4, 'boss'], [0, 5, 'boss'], [0, 6, 'boss'],
    ],
    diveInterval: 3000,
    entranceSpeed: 0.42,
  },
  // Wave 7: Guardians + full roster + 4 BOSSES
  {
    enemies: [
      [4, 0, 'swarm'], [4, 1, 'swarm'], [4, 2, 'grunt'], [4, 3, 'grunt'], [4, 4, 'grunt'], [4, 5, 'grunt'], [4, 6, 'grunt'], [4, 7, 'grunt'], [4, 8, 'swarm'], [4, 9, 'swarm'],
      [3, 0, 'grunt'], [3, 1, 'grunt'], [3, 2, 'spinner'], [3, 3, 'grunt'], [3, 4, 'grunt'], [3, 5, 'grunt'], [3, 6, 'grunt'], [3, 7, 'spinner'], [3, 8, 'grunt'], [3, 9, 'grunt'],
      [2, 0, 'phantom'], [2, 1, 'attacker'], [2, 2, 'attacker'], [2, 3, 'bomber'], [2, 4, 'attacker'], [2, 5, 'attacker'], [2, 6, 'bomber'], [2, 7, 'attacker'], [2, 8, 'attacker'], [2, 9, 'phantom'],
      [1, 2, 'guardian'], [1, 3, 'attacker'], [1, 4, 'spinner'], [1, 5, 'spinner'], [1, 6, 'attacker'], [1, 7, 'guardian'],
      [0, 2, 'boss'], [0, 3, 'boss'], [0, 4, 'commander'], [0, 5, 'commander'], [0, 6, 'boss'], [0, 7, 'boss'],
    ],
    diveInterval: 2800,
    entranceSpeed: 0.44,
  },
  // Wave 8: Heavy — packed rows + 4 BOSSES
  {
    enemies: [
      [4, 0, 'grunt'], [4, 1, 'grunt'], [4, 2, 'grunt'], [4, 3, 'grunt'], [4, 4, 'grunt'], [4, 5, 'grunt'], [4, 6, 'grunt'], [4, 7, 'grunt'], [4, 8, 'grunt'], [4, 9, 'grunt'],
      [3, 0, 'swarm'], [3, 1, 'spinner'], [3, 2, 'grunt'], [3, 3, 'grunt'], [3, 4, 'phantom'], [3, 5, 'phantom'], [3, 6, 'grunt'], [3, 7, 'grunt'], [3, 8, 'spinner'], [3, 9, 'swarm'],
      [2, 0, 'bomber'], [2, 1, 'attacker'], [2, 2, 'attacker'], [2, 3, 'guardian'], [2, 4, 'attacker'], [2, 5, 'attacker'], [2, 6, 'guardian'], [2, 7, 'attacker'], [2, 8, 'attacker'], [2, 9, 'bomber'],
      [1, 1, 'spinner'], [1, 2, 'phantom'], [1, 3, 'attacker'], [1, 4, 'attacker'], [1, 5, 'attacker'], [1, 6, 'attacker'], [1, 7, 'phantom'], [1, 8, 'spinner'],
      [0, 2, 'boss'], [0, 3, 'boss'], [0, 4, 'commander'], [0, 5, 'commander'], [0, 6, 'boss'], [0, 7, 'boss'],
    ],
    diveInterval: 2500,
    entranceSpeed: 0.46,
  },
  // Wave 9: Everything maxed + 4 BOSSES
  {
    enemies: [
      [4, 0, 'grunt'], [4, 1, 'grunt'], [4, 2, 'grunt'], [4, 3, 'grunt'], [4, 4, 'grunt'], [4, 5, 'grunt'], [4, 6, 'grunt'], [4, 7, 'grunt'], [4, 8, 'grunt'], [4, 9, 'grunt'],
      [3, 0, 'spinner'], [3, 1, 'grunt'], [3, 2, 'grunt'], [3, 3, 'phantom'], [3, 4, 'grunt'], [3, 5, 'grunt'], [3, 6, 'phantom'], [3, 7, 'grunt'], [3, 8, 'grunt'], [3, 9, 'spinner'],
      [2, 0, 'guardian'], [2, 1, 'bomber'], [2, 2, 'attacker'], [2, 3, 'attacker'], [2, 4, 'bomber'], [2, 5, 'bomber'], [2, 6, 'attacker'], [2, 7, 'attacker'], [2, 8, 'bomber'], [2, 9, 'guardian'],
      [1, 1, 'phantom'], [1, 2, 'attacker'], [1, 3, 'spinner'], [1, 4, 'attacker'], [1, 5, 'attacker'], [1, 6, 'spinner'], [1, 7, 'attacker'], [1, 8, 'phantom'],
      [0, 2, 'boss'], [0, 3, 'boss'], [0, 4, 'boss'], [0, 5, 'boss'], [0, 6, 'boss'], [0, 7, 'boss'],
    ],
    diveInterval: 2200,
    entranceSpeed: 0.48,
  },
  // Wave 10 (replaced by challenge stage)
  null,
];

// Enemy types used in challenge stages, cycling through
const CHALLENGE_ENEMY_TYPES = ['grunt', 'attacker', 'spinner', 'phantom', 'swarm', 'bomber', 'guardian'];

export class WaveSystem {
  constructor() {
    this.waveNumber = 0;
    this.enemies = [];
    this.entranceQueue = [];  // enemies waiting to enter
    this.entranceTimer = 0;
    this.entranceDelay = 600; // ms between entrance groups
    this.diveTimer = 0;
    this.diveInterval = 4000;
    this.waveComplete = false;
    this.waveTransitionTimer = 0;
    this.speedMultiplier = 1.0;
    this.onDive = null;
    this.onEnemyFire = null;
    this.onTractorBeam = null;
    this.onCapture = null;
    this.onRescue = null;

    // Captured ships
    this.capturedShips = [];

    // Challenge stage state
    this.isChallenge = false;
    this.challengeHits = 0;
    this.challengeTotal = 0;
    this.challengeResultTimer = 0;
    this.challengeResultShown = false;
    this.onChallengeStart = null;
    this.onChallengeResult = null;
    this.onChallengePerfect = null;
  }

  get allEnemiesDead() {
    return this.enemies.every(e => !e.alive) && this.entranceQueue.length === 0;
  }

  get allEnemiesGone() {
    // For challenge stages: all enemies are done (dead or offscreen/path complete)
    return this.enemies.every(e => !e.alive || e.state === 'dead' || e.state === 'exited') &&
           this.entranceQueue.length === 0;
  }

  get holdingEnemies() {
    return this.enemies.filter(e => e.alive && e.state === 'holding');
  }

  _isChallengeWave(waveNum) {
    // Every 5th wave (wave 5, 10, 15, 20...) is a challenge stage
    return waveNum > 0 && waveNum % 5 === 0;
  }

  startWave(formation) {
    this.waveNumber++;
    this.waveComplete = false;
    this.enemies = [];
    this.entranceQueue = [];
    this.capturedShips = [];
    this.challengeResultShown = false;
    this.challengeResultTimer = 0;

    if (this._isChallengeWave(this.waveNumber)) {
      this._startChallengeStage();
      return;
    }

    this.isChallenge = false;
    this._startNormalWave(formation);
  }

  _startNormalWave(formation) {
    // Find the right template — skip null (challenge) slots
    const normalTemplates = WAVE_TEMPLATES.filter(t => t !== null);
    const templateIndex = (this.waveNumber - 1) % normalTemplates.length;
    const template = normalTemplates[templateIndex];

    // Speed escalation per cycle
    const cycle = Math.floor((this.waveNumber - 1) / normalTemplates.length);
    this.speedMultiplier = 1.0 + cycle * 0.15;
    this.diveInterval = Math.max(1200, template.diveInterval - cycle * 300);

    for (let i = 0; i < template.enemies.length; i++) {
      const [row, col, type] = template.enemies[i];
      const enemy = new Enemy(type, row, col);
      this.enemies.push(enemy);

      const slot = formation.getSlotPosition(row, col);
      const entranceGroup = Math.floor(i / 4);
      const pathIndex = (entranceGroup + this.waveNumber) % ENTRANCE_PATHS.length;
      const pathFn = ENTRANCE_PATHS[pathIndex];

      this.entranceQueue.push({
        enemy,
        path: pathFn(slot.x, slot.y, entranceGroup * 0.5),
        speed: template.entranceSpeed * this.speedMultiplier,
        delay: entranceGroup * this.entranceDelay,
      });
    }

    this.entranceTimer = 0;
    this.diveTimer = 0;
  }

  _startChallengeStage() {
    this.isChallenge = true;
    this.challengeHits = 0;

    // Pick a layout
    const layoutIndex = Math.floor((this.waveNumber / 5 - 1)) % CHALLENGE_LAYOUTS.length;
    const layout = CHALLENGE_LAYOUTS[layoutIndex];

    // Pick enemy type for this challenge — cycle through types
    const typeIndex = Math.floor(this.waveNumber / 5 - 1) % CHALLENGE_ENEMY_TYPES.length;
    const enemyType = CHALLENGE_ENEMY_TYPES[typeIndex];

    // Build enemies from layout groups
    // Each group is sent with a 2-second gap between groups
    const GROUP_DELAY_MS = 2200;
    let totalEnemies = 0;

    for (let g = 0; g < layout.length; g++) {
      const group = layout[g];
      const groupDelayMs = g * GROUP_DELAY_MS;

      for (let p = 0; p < group.length; p++) {
        const path = group[p];
        const enemy = new Enemy(enemyType, 0, totalEnemies);
        enemy.isChallengeEnemy = true;
        this.enemies.push(enemy);

        // Slight stagger within group (150ms between each enemy in group)
        this.entranceQueue.push({
          enemy,
          path,
          speed: 0.14, // slow — full path takes ~7 seconds
          delay: groupDelayMs + p * 150,
        });
        totalEnemies++;
      }
    }

    this.challengeTotal = totalEnemies;
    this.entranceTimer = 0;
    this.diveTimer = 0;
    if (this.onChallengeStart) this.onChallengeStart();
  }

  update(dt, formation, playerX, playerY, bulletManager, playerDual = false) {
    const dtMs = dt * 1000;

    // Process entrance queue
    this.entranceTimer += dtMs;
    for (let i = this.entranceQueue.length - 1; i >= 0; i--) {
      const entry = this.entranceQueue[i];
      if (this.entranceTimer >= entry.delay) {
        entry.enemy.startEntrance(entry.path, entry.speed);
        this.entranceQueue.splice(i, 1);
      }
    }

    // Update formation compression (reuse array to avoid per-frame allocation)
    if (!this.isChallenge) {
      if (!this._aliveSlots) this._aliveSlots = [];
      const slots = this._aliveSlots;
      let count = 0;
      for (let i = 0; i < this.enemies.length; i++) {
        const e = this.enemies[i];
        if (e.alive && (e.state === 'holding' || e.state === 'returning' || e.state === 're-entering')) {
          if (count < slots.length) {
            slots[count].row = e.row;
            slots[count].col = e.col;
          } else {
            slots.push({ row: e.row, col: e.col });
          }
          count++;
        }
      }
      slots.length = count;
      formation.setAliveSlots(slots, this.enemies.length);
    }

    // Update all enemies
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      if (this.isChallenge) {
        // Challenge enemies just follow their entrance path, then exit
        enemy.update(dt, 0, 0, 0);
        // Mark as exited when entrance path is complete
        if (enemy.state === 'holding') {
          enemy.alive = false;
          enemy.state = 'exited';
        }
      } else {
        const slot = formation.getSlotPosition(enemy.row, enemy.col);
        enemy.update(dt, slot.x, slot.y, slot.z);

        // Enemy fires during dive — type-specific shot counts and patterns
        if (enemy.state === 'diving') {
          const waveShots = Math.min(6, 2 + Math.floor((this.waveNumber - 1) / 2));
          let maxShots;
          switch (enemy.type) {
            case 'grunt':    maxShots = waveShots; break;
            case 'swarm':    maxShots = Math.max(1, waveShots - 1); break;
            case 'attacker': maxShots = waveShots + 1; break;
            case 'bomber':   maxShots = waveShots + 2; break;
            case 'spinner':  maxShots = waveShots; break;
            case 'phantom':  maxShots = waveShots; break;
            case 'guardian': maxShots = 0; break;  // pure tank, never fires
            case 'boss':     maxShots = waveShots + 1; break;
            case 'commander': maxShots = waveShots; break;
            default:         maxShots = waveShots; break;
          }
          if (maxShots > 0 && enemy.diveShots < maxShots) {
            const fireAt = 0.2 + (enemy.diveShots / maxShots) * 0.6;
            if (enemy.diveT >= fireAt) {
              // Type-specific shot patterns
              switch (enemy.type) {
                case 'attacker':
                case 'boss':
                  bulletManager.fireEnemyAimed(enemy.x, enemy.y, enemy.z, playerX, playerY);
                  break;
                case 'bomber':
                  bulletManager.fireEnemyBomb(enemy.x, enemy.y, enemy.z);
                  break;
                case 'commander':
                  bulletManager.fireEnemySpread(enemy.x, enemy.y, enemy.z, 3, 0.4);
                  break;
                default:
                  // Grunt, swarm, spinner, phantom: straight down
                  bulletManager.fireEnemy(enemy.x, enemy.y, enemy.z);
                  break;
              }
              enemy.diveShots++;
              if (this.onEnemyFire) this.onEnemyFire();
            }
          }
        }
      }
    }

    // Update captured ships
    for (const cs of this.capturedShips) {
      if (cs.alive) cs.update(dt, playerX, playerY);
    }
    this.capturedShips = this.capturedShips.filter(cs => cs.alive);

    // Trigger dive attacks (normal waves only)
    if (!this.isChallenge) {
      this.diveTimer += dtMs;
      if (this.diveTimer >= this.diveInterval) {
        this.diveTimer -= this.diveInterval;
        this._triggerDive(playerX, playerDual);
      }
    }

    // Check wave completion
    if (!this.waveComplete) {
      if (this.isChallenge) {
        // Challenge complete when all enemies are gone
        if (this.allEnemiesGone) {
          this.waveComplete = true;
          this.challengeResultTimer = 4000; // 4 seconds to show results
          if (this.onChallengeResult) {
            const isPerfect = this.challengeHits >= this.challengeTotal;
            this.onChallengeResult(this.challengeHits, this.challengeTotal, isPerfect);
            if (isPerfect && this.onChallengePerfect) this.onChallengePerfect();
          }
        }
      } else if (this.allEnemiesDead) {
        this.waveComplete = true;
        this.waveTransitionTimer = 2000;
      }
    }

    if (this.waveComplete) {
      if (this.isChallenge) {
        this.challengeResultTimer -= dtMs;
        if (this.challengeResultTimer <= 0) {
          this.waveTransitionTimer = 0; // Signal ready for next wave
        } else {
          this.waveTransitionTimer = 1; // Keep positive to prevent transition
        }
      } else {
        this.waveTransitionTimer -= dtMs;
      }
    }
  }

  _triggerDive(playerX, playerDual = false) {
    const holding = this.holdingEnemies;
    if (holding.length === 0) return;

    // When player is dual, exclude bosses from diving entirely (no tractor beams)
    if (playerDual) {
      const nonBoss = holding.filter(e => !e.isBoss);
      holding.length = 0;
      holding.push(...nonBoss);
    }
    if (holding.length === 0) return;

    // Prioritize bosses — if a boss is holding, always include it first
    if (!playerDual) {
      const bossIdx = holding.findIndex(e => e.isBoss && !e.capturedShip);
      if (bossIdx !== -1 && Math.random() < 0.35) {
        const [boss] = holding.splice(bossIdx, 1);
        holding.unshift(boss);
      }
    }

    // Pick 1-3 enemies to dive — more at higher waves
    const maxDivers = this.waveNumber >= 6 ? 3 : (this.waveNumber >= 3 ? 2 : 1);
    const count = Math.min(holding.length, Math.random() < 0.3 ? maxDivers : Math.max(1, maxDivers - 1));
    for (let i = 0; i < count; i++) {
      if (holding.length === 0) break;
      const idx = Math.floor(Math.random() * holding.length);
      const enemy = holding.splice(idx, 1)[0];
      if (!enemy) break;

      // Boss: tractor beam dive if no captured ship, player isn't dual,
      // no abduction already in progress, and no ship already captured
      if (enemy.isBoss && !enemy.capturedShip && enemy.damageLevel === 0 && !playerDual &&
          this.capturedShips.length === 0 &&
          !this.enemies.some(e => e.alive && (
            e.state === 'tractor_diving' ||
            e.state === 'tractor_beaming' ||
            e.state === 'tractor_capturing'
          ))) {
        const path = createTractorBeamDive(enemy.x, enemy.y, playerX);
        enemy.startTractorDive(path);
        if (this.onTractorBeam) this.onTractorBeam();
        continue;
      }

      // Swarm: pull a buddy to dive with them
      if (enemy.type === 'swarm' && holding.length > 0) {
        const buddyIdx = Math.floor(Math.random() * holding.length);
        const buddy = holding[buddyIdx];
        holding.splice(buddyIdx, 1);
        const buddyPath = DIVE_PATHS[1](buddy.x, buddy.y, playerX); // direct dive
        buddy.startDive(buddyPath, 0.28 * this.speedMultiplier);
        if (this.onDive) this.onDive();
      }

      // Commander: pull 1 escort to dive alongside
      if (enemy.type === 'commander' && holding.length > 0) {
        const escortIdx = Math.floor(Math.random() * holding.length);
        const escort = holding[escortIdx];
        holding.splice(escortIdx, 1);
        const escortPath = DIVE_PATHS[1](escort.x, escort.y, playerX);
        escort.startDive(escortPath, 0.22 * this.speedMultiplier);
        if (this.onDive) this.onDive();
      }

      // Type-specific dive speed and path preference (8 paths: 0-7)
      let diveSpeed;
      let pathIdx;
      switch (enemy.type) {
        case 'grunt':
          diveSpeed = 0.18 + this.speedMultiplier * 0.05;
          pathIdx = (enemy.row + enemy.col + this.waveNumber) % DIVE_PATHS.length;
          break;
        case 'swarm':
          diveSpeed = 0.26 + this.speedMultiplier * 0.06; // fast
          pathIdx = (this.waveNumber + enemy.col) % 2 === 0 ? 1 : 7; // direct or peel-off
          break;
        case 'attacker':
          diveSpeed = 0.22 + this.speedMultiplier * 0.06; // aggressive, fast
          pathIdx = [0, 1, 6, 7][(enemy.col + this.waveNumber) % 4]; // swoop, direct, feint, peel-off
          break;
        case 'bomber':
          diveSpeed = 0.13 + this.speedMultiplier * 0.04; // slow, heavy
          pathIdx = (this.waveNumber + enemy.col) % 2 === 0 ? 0 : 5; // swoop or banking s-curve
          break;
        case 'spinner':
          diveSpeed = 0.24 + this.speedMultiplier * 0.06; // fast
          pathIdx = (this.waveNumber + enemy.col) % 2 === 0 ? 3 : 4; // loop or spiral
          break;
        case 'phantom':
          diveSpeed = 0.20 + this.speedMultiplier * 0.05;
          pathIdx = (this.waveNumber + enemy.col) % 2 === 0 ? 2 : 6; // zigzag or feint
          break;
        case 'guardian':
          diveSpeed = 0.14 + this.speedMultiplier * 0.04; // slow, deliberate
          pathIdx = (this.waveNumber + enemy.col) % 2 === 0 ? 3 : 5; // loop or s-curve
          break;
        case 'commander':
          diveSpeed = 0.20 + this.speedMultiplier * 0.05;
          pathIdx = (enemy.row + enemy.col + this.waveNumber) % DIVE_PATHS.length;
          break;
        case 'boss':
          diveSpeed = 0.16 + this.speedMultiplier * 0.04; // menacing, slow
          pathIdx = (this.waveNumber + enemy.col) % 2 === 0 ? 0 : 7; // swoop or peel-off
          break;
        default:
          diveSpeed = 0.18 + this.speedMultiplier * 0.05;
          pathIdx = (enemy.row + enemy.col + this.waveNumber) % DIVE_PATHS.length;
      }

      const pathFn = DIVE_PATHS[pathIdx];
      const path = pathFn(enemy.x, enemy.y, playerX);
      enemy.startDive(path, diveSpeed);
      if (this.onDive) this.onDive();
    }
  }

  /** Called when a boss successfully captures the player */
  capturePlayer(boss, playerX, playerY) {
    const captured = new CapturedShip(playerX, playerY, boss);
    boss.capturedShip = captured;
    boss.state = 'tractor_capturing';
    boss.beamTimer = 3500; // wait for capture animation (~2.5s rise + buffer)
    this.capturedShips.push(captured);
    if (this.onCapture) this.onCapture();
  }

  /** Called when a boss with a captured ship is killed */
  releaseCapturedShip(boss) {
    if (!boss.capturedShip) return;
    boss.capturedShip.release();
    if (this.onRescue) this.onRescue();
  }
}
