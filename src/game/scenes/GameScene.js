import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import { Player } from '../entities/Player.js';
import { BulletManager } from '../entities/Bullet.js';
import { Formation } from '../entities/Formation.js';
import { WaveSystem } from '../systems/WaveSystem.js';
import { CollisionSystem } from '../systems/CollisionSystem.js';
import { ExplosionRenderer } from '../rendering/ExplosionRenderer.js';
import { HUD } from '../hud/HUD.js';
import { projectPoint, projectModel, projectModelFlat, getScale } from '../rendering/Projection.js';
import { PLAYER_SHIP, ENEMY_MODELS, ENEMY_MODELS_DAMAGED, PLAYER_BULLET, ENEMY_BULLET } from '../rendering/Models.js';
import {
  drawGlowLine,
  drawGlowPolygon,
  drawGlowDiamond,
  drawGlowCircle,
  fillMaskCircle,
} from '../rendering/GlowRenderer.js';
import { DemoAI } from '../ai/DemoAI.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  preload() {
    this.load.audio('intro', 'music/intro.mp3');
  }

  init(data) {
    this._demoMode = !!(data && data.demo);
    this._demoTimer = 0;
    this._demoMaxTime = 30; // seconds
  }

  create() {
    this.soundEngine = this.game.registry.get('soundEngine');

    // Game state
    this.player = new Player();
    this.bulletManager = new BulletManager();
    this.formation = new Formation();
    const overlay = this.game.registry.get('shaderOverlay');
    this.formation.crtMode = overlay && overlay.getShaderName() === 'crt';
    this.waveSystem = new WaveSystem();
    this.collisionSystem = new CollisionSystem();
    this.explosionRenderer = new ExplosionRenderer();
    this.score = 0;
    this._prevScore = 0;
    this._nextExtraLifeIndex = 0;
    this.gameOver = false;
    this.gameOverTimer = 0;

    // Death freeze (hitstop)
    this._freezeTimer = 0;
    this._freezePendingExplosion = null;

    // Screen shake
    this._shakeAmount = 0;
    this._shakeOffsetX = 0;
    this._shakeOffsetY = 0;

    // Stats tracking
    this._stats = {
      shotsFired: 0,
      shotsHit: 0,
      enemiesKilledByType: {},
      wavesCleared: 0,
    };

    // Demo AI
    if (this._demoMode) {
      this._demoAI = new DemoAI();
    }

    // Wire up collision callbacks
    this.collisionSystem.onEnemyKilled = (enemy) => {
      // Boss with captured ship: extra score + release ship
      if (enemy.isBoss && enemy.capturedShip) {
        this.score += CONFIG.SCORE_BOSS_WITH_CAPTURE;
        this.waveSystem.releaseCapturedShip(enemy);
      } else {
        const points = enemy.isDiving ? enemy.scoreDiving : enemy.scoreValue;
        this.score += points;
      }
      this.explosionRenderer.spawn(enemy.x, enemy.y, enemy.color);
      this.soundEngine.playExplosion();

      // Boss killed during beam (before capture) → beam vanishes
      if (enemy.isBoss) {
        enemy.beamActive = false;
      }

      // Track challenge stage hits
      if (this.waveSystem.isChallenge) {
        this.waveSystem.challengeHits++;
      }

      // Stats
      this._stats.shotsHit++;
      const t = enemy.type;
      this._stats.enemiesKilledByType[t] = (this._stats.enemiesKilledByType[t] || 0) + 1;
    };
    this.collisionSystem.onEnemyHit = (enemy) => {
      this.soundEngine.playEnemyHit();
      this.explosionRenderer.spawn(enemy.x, enemy.y, 0xffffff, 4);
    };
    this.collisionSystem.onPlayerHit = () => {
      // No player damage during challenge stages
      if (this.waveSystem.isChallenge) return;

      // Death freeze: spawn explosion but freeze everything for 200ms
      this._freezeTimer = 0.2;
      this._freezePendingExplosion = { x: this.player.x, y: this.player.y };
      this.soundEngine.playPlayerDeath();
      if (this.player.isGameOver) {
        this.gameOver = true;
        // Save high score
        try {
          const prev = parseInt(localStorage.getItem('vectronix-highscore') || '0', 10);
          if (this.score > prev) {
            localStorage.setItem('vectronix-highscore', String(this.score));
          }
        } catch (e) {}
      }
    };
    this.collisionSystem.onDualHit = () => {
      this.explosionRenderer.spawn(
        this.player.x + CONFIG.DUAL_OFFSET_X, this.player.y,
        CONFIG.COLORS.PLAYER, 12
      );
      this.soundEngine.playExplosion();
      this._shakeAmount = 6;
    };
    this.collisionSystem.onBeamCapture = (boss) => {
      // Dual fighter in beam → lose one ship, capture fails
      if (this.player.dualFighter) {
        this.player.loseDualShip();
        boss.beamActive = false;
        boss.state = 'tractor_returning';
        boss.returnStartX = boss.x;
        boss.returnStartY = boss.y;
        boss.returnStartZ = boss.z;
        boss.returnT = 0;
        this.collisionSystem.onDualHit();
        return;
      }
      // Normal capture
      if (this.player.capture()) {
        this.waveSystem.capturePlayer(boss, this.player.x, this.player.y);
        this.soundEngine.playCapture();
        this._shakeAmount = 8;
        if (this.player.isGameOver) {
          this.gameOver = true;
          try {
            const prev = parseInt(localStorage.getItem('vectronix-highscore') || '0', 10);
            if (this.score > prev) {
              localStorage.setItem('vectronix-highscore', String(this.score));
            }
          } catch (e) {}
        }
      }
    };
    this.collisionSystem.onCapturedShipHit = (cs) => {
      this.explosionRenderer.spawn(cs.x, cs.y, CONFIG.COLORS.CAPTURED_SHIP, 10);
      this.soundEngine.playExplosion();
    };
    this.collisionSystem.onBulletDeflected = (enemy) => {
      this.explosionRenderer.spawn(enemy.x, enemy.y - 8, 0xffffff, 3);
      this.soundEngine.playDeflect();
    };

    // Wire up dive sound
    this.waveSystem.onDive = () => {
      this.soundEngine.playDive();
    };
    this.waveSystem.onEnemyFire = () => {
      this.soundEngine.playEnemyFire();
    };

    // Wire up tractor beam callbacks
    this.waveSystem.onTractorBeam = () => {
      this.soundEngine.playTractorBeam();
    };
    this.waveSystem.onCapture = () => {
      // Sound already played in beam capture handler
    };
    this.waveSystem.onRescue = () => {
      this.soundEngine.playRescue();
    };

    // Wire up challenge stage callbacks
    this.waveSystem.onChallengeStart = () => {
      this.hud.showChallengeStart();
      this.soundEngine.playChallengeStart();
    };
    this.waveSystem.onChallengeResult = (hits, total, isPerfect) => {
      const bonus = hits * CONFIG.CHALLENGE_BONUS_PER_HIT +
        (isPerfect ? CONFIG.CHALLENGE_PERFECT_BONUS : 0);
      this.score += bonus;
      this.hud.showChallengeResults(hits, total, bonus, isPerfect);
      this.soundEngine.playChallengeResult();
    };
    this.waveSystem.onChallengePerfect = () => {
      this.soundEngine.playChallengePerfect();
      // Perfect challenge stage awards an extra life
      this.player.lives++;
    };

    // HUD
    this.hud = new HUD(this);

    // Graphics layers — same 3-layer pattern as hexax
    this.bgGfx = this.add.graphics();
    this.bgGfx.setBlendMode(Phaser.BlendModes.ADD);
    this.bgGfx.setDepth(0);

    this.maskGfx = this.add.graphics();
    this.maskGfx.setBlendMode(Phaser.BlendModes.NORMAL);
    this.maskGfx.setDepth(1);

    this.gfx = this.add.graphics();
    this.gfx.setBlendMode(Phaser.BlendModes.ADD);
    this.gfx.setDepth(2);

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.fireKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.fireKey2 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
    this.restartKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);

    // Pause state
    this._paused = false;
    this.input.keyboard.on('keydown-ESC', () => {
      if (this.gameOver) return;
      this._paused = !this._paused;
    });

    // Parallax scrolling starfield (3 layers)
    this._stars = [];
    const starLayers = [
      { count: 40, speed: 22, brightnessMin: 0.25, brightnessMax: 0.45, sizeMin: 0.5, sizeMax: 0.8 },
      { count: 30, speed: 48, brightnessMin: 0.40, brightnessMax: 0.65, sizeMin: 0.7, sizeMax: 1.1 },
      { count: 15, speed: 85, brightnessMin: 0.55, brightnessMax: 0.85, sizeMin: 1.0, sizeMax: 1.5 },
    ];
    for (const layer of starLayers) {
      for (let i = 0; i < layer.count; i++) {
        this._stars.push({
          x: CONFIG.FIELD_LEFT + Math.random() * (CONFIG.FIELD_RIGHT - CONFIG.FIELD_LEFT),
          y: CONFIG.FIELD_TOP + Math.random() * (CONFIG.FIELD_BOTTOM - CONFIG.FIELD_TOP),
          speed: layer.speed,
          brightness: layer.brightnessMin + Math.random() * (layer.brightnessMax - layer.brightnessMin),
          size: layer.sizeMin + Math.random() * (layer.sizeMax - layer.sizeMin),
        });
      }
    }

    // Intro music (real games only, not demo/attract)
    if (!this._demoMode) {
      this._introMusic = this.sound.add('intro');
      this._introMusic.play();
    }

    // Stop intro music when scene shuts down
    this.events.on('shutdown', () => {
      if (this._introMusic) {
        this._introMusic.stop();
        this._introMusic.destroy();
        this._introMusic = null;
      }
    });

    // Start first wave
    this.waveSystem.startWave(this.formation);
    this.hud.showMessage(`WAVE ${this.waveSystem.waveNumber}`, 2000);
    this.soundEngine.playWaveStart();
  }

  update(time, delta) {
    const dt = delta / 1000;
    if (dt > 0.1) return;

    // Demo mode: any key returns to title (use isDown to avoid consuming JustDown state)
    if (this._demoMode) {
      this._demoTimer += dt;
      const anyKeyDown = this.input.keyboard.keys.some(k => k && k.isDown);
      if (anyKeyDown || this._demoTimer >= this._demoMaxTime ||
          (this.gameOver && this.gameOverTimer > 2)) {
        this.scene.start('TitleScene');
        return;
      }
    }

    // Pause — skip all game logic, just keep rendering (not in demo mode)
    if (this._paused && !this._demoMode) {
      this.hud.showPause(true);
      return;
    }
    this.hud.showPause(false);

    // Scroll starfield (always, even during freeze)
    for (const star of this._stars) {
      star.y += star.speed * dt;
      if (star.y > CONFIG.FIELD_BOTTOM) {
        star.y = CONFIG.FIELD_TOP;
        star.x = CONFIG.FIELD_LEFT + Math.random() * (CONFIG.FIELD_RIGHT - CONFIG.FIELD_LEFT);
      }
    }

    // Death freeze: skip all game logic but still render
    if (this._freezeTimer > 0) {
      this._freezeTimer -= dt;
      if (this._freezeTimer <= 0) {
        // Freeze ended — now spawn explosion and start shake
        if (this._freezePendingExplosion) {
          this.explosionRenderer.spawn(
            this._freezePendingExplosion.x,
            this._freezePendingExplosion.y,
            CONFIG.COLORS.PLAYER, 20
          );
          this._freezePendingExplosion = null;
        }
        this._shakeAmount = 12;
        this._freezeTimer = 0;
      }
      // During freeze: still render but skip update logic
      this._renderFrame();
      return;
    }

    // Screen shake decay
    if (this._shakeAmount > 0) {
      this._shakeAmount *= 0.88;
      this._shakeOffsetX = (Math.random() - 0.5) * this._shakeAmount * 2;
      this._shakeOffsetY = (Math.random() - 0.5) * this._shakeAmount * 2;
      if (this._shakeAmount < 0.3) {
        this._shakeAmount = 0;
        this._shakeOffsetX = 0;
        this._shakeOffsetY = 0;
      }
    }

    // ─── INPUT ───
    let inputDir = 0;
    let firePressed = false;

    if (this._demoMode) {
      // AI input
      const aiResult = this._demoAI.update(dt, this.player, this.waveSystem.enemies, this.bulletManager.bullets);
      inputDir = aiResult.inputDir;
      firePressed = aiResult.shouldFire;
    } else {
      const touchX = this.game.registry.get('touchX');
      if (touchX == null) {
        if (this.cursors.left.isDown) inputDir = -1;
        else if (this.cursors.right.isDown) inputDir = 1;
      }
      firePressed = Phaser.Input.Keyboard.JustDown(this.fireKey) || Phaser.Input.Keyboard.JustDown(this.fireKey2);
    }

    // ─── UPDATE ───
    if (!this.gameOver) {
      this.player.update(dt, inputDir);

      // Touch: 1:1 position mapping overrides velocity-based movement
      if (!this._demoMode) {
        const touchX = this.game.registry.get('touchX');
        if (touchX != null && this.player.alive) {
          const margin = this.player.dualFighter ? 16 + CONFIG.DUAL_OFFSET_X : 16;
          this.player.x = Math.max(CONFIG.FIELD_LEFT + margin, Math.min(CONFIG.FIELD_RIGHT - margin, touchX));
        }
      }

      if (firePressed && this.player.alive && !this.player.invulnerable) {
        if (this.player.dualFighter) {
          const x1 = this.player.x - CONFIG.DUAL_OFFSET_X;
          const x2 = this.player.x + CONFIG.DUAL_OFFSET_X;
          if (this.bulletManager.fireDual(x1, this.player.y, x2, this.player.y)) {
            this.soundEngine.playFire();
            this._stats.shotsFired += 2;
          }
        } else {
          if (this.bulletManager.firePlayer(this.player.x, this.player.y)) {
            this.soundEngine.playFire();
            this._stats.shotsFired++;
          }
        }
      }

      this.bulletManager.update(dt);
      const ov = this.game.registry.get('shaderOverlay');
      this.formation.crtMode = ov && ov.getShaderName() === 'crt';
      this.formation.update(dt);
      this.waveSystem.update(dt, this.formation, this.player.x, this.player.y, this.bulletManager, this.player.dualFighter);

      // Check for rescued captured ships → enter dual fighter
      for (const cs of this.waveSystem.capturedShips) {
        if (cs.state === 'rescued' && cs.alive) {
          cs.alive = false;
          if (!this.player.dualFighter) {
            this.player.enterDualFighter();
            this.soundEngine.playDualFighter();
          } else {
            // Already dual — bonus points
            this.score += CONFIG.SCORE_RESCUE_BONUS;
          }
        }
      }

      // Clear captured flag once abduction is fully complete (boss returned to formation)
      if (this.player.captured && !this.waveSystem.enemies.some(e => e.alive && (
        e.state === 'tractor_diving' || e.state === 'tractor_beaming' ||
        e.state === 'tractor_capturing' || e.state === 'tractor_returning'
      ))) {
        this.player.captured = false;
      }

      // In challenge stages, only check bullet→enemy collisions (no player damage)
      if (this.waveSystem.isChallenge) {
        this.collisionSystem.updateChallengeMode(this.waveSystem.enemies, this.bulletManager);
      } else {
        this.collisionSystem.update(this.player, this.waveSystem.enemies, this.bulletManager, this.waveSystem.capturedShips);
      }

      // Extra life check
      this._checkExtraLife();

      // Wave transition
      if (this.waveSystem.waveComplete && this.waveSystem.waveTransitionTimer <= 0) {
        this._stats.wavesCleared++;
        this.waveSystem.startWave(this.formation);
        if (!this.waveSystem.isChallenge) {
          this.hud.showMessage(`WAVE ${this.waveSystem.waveNumber}`, 2000);
          this.soundEngine.playWaveStart();
        }
      }
    } else {
      this.gameOverTimer += dt;
      if (this._demoMode) {
        // Demo mode: auto-return after brief delay
      } else if (this.gameOverTimer > 3.5 && (Phaser.Input.Keyboard.JustDown(this.restartKey) || Phaser.Input.Keyboard.JustDown(this.fireKey) || Phaser.Input.Keyboard.JustDown(this.fireKey2))) {
        this.scene.start('TitleScene');
        return;
      }
    }

    this.explosionRenderer.update(delta);

    this._renderFrame();
  }

  _renderFrame() {
    const dt = this.game.loop.delta / 1000;

    // ─── RENDER ───
    this.bgGfx.clear();
    this.maskGfx.clear();
    this.gfx.clear();

    // Apply shake offset to all graphics layers
    const sx = this._shakeOffsetX;
    const sy = this._shakeOffsetY;
    this.bgGfx.setPosition(sx, sy);
    this.maskGfx.setPosition(sx, sy);
    this.gfx.setPosition(sx, sy);

    this._drawStarfield();

    if (!this.gameOver || this.gameOverTimer < 3) {
      const renderList = this._buildRenderList();
      renderList.sort((a, b) => b.depth - a.depth);

      for (const item of renderList) {
        this._drawMask(item);
      }
      for (const item of renderList) {
        this._drawWireframe(item);
      }
    }

    this.explosionRenderer.draw(this.gfx);

    // Demo mode label
    if (this._demoMode) {
      this.hud.showDemoLabel(true);
    }

    this.hud.update(
      dt, this.score, this.player.lives, this.waveSystem.waveNumber,
      this.gameOver, this._demoMode, this._stats
    );
  }

  _buildRenderList() {
    const list = [];

    if (this.player.isVisible) {
      if (this.player.dualFighter) {
        // Two ships side by side
        const x1 = this.player.x - CONFIG.DUAL_OFFSET_X;
        const x2 = this.player.x + CONFIG.DUAL_OFFSET_X;
        const pp1 = projectPoint(x1, this.player.y, this.player.z);
        const pp2 = projectPoint(x2, this.player.y, this.player.z);
        list.push({
          type: 'player',
          x: x1, y: this.player.y, z: this.player.z,
          screenX: pp1.x, screenY: pp1.y, scale: pp1.scale, depth: this.player.z,
        });
        list.push({
          type: 'player',
          x: x2, y: this.player.y, z: this.player.z,
          screenX: pp2.x, screenY: pp2.y, scale: pp2.scale, depth: this.player.z,
        });
      } else {
        const pp = projectPoint(this.player.x, this.player.y, this.player.z);
        list.push({
          type: 'player',
          x: this.player.x, y: this.player.y, z: this.player.z,
          screenX: pp.x, screenY: pp.y, scale: pp.scale, depth: this.player.z,
        });
      }
    }

    for (const enemy of this.waveSystem.enemies) {
      if (!enemy.alive || enemy.state === 'queued') continue;
      const ep = projectPoint(enemy.x, enemy.y, enemy.z);
      // Skip enemies that would visually overlap the HUD area
      // Models extend ~25px above center; top formation row projects to ~96
      if (ep.y < 75) continue;
      list.push({
        type: 'enemy', enemy,
        x: enemy.x, y: enemy.y, z: enemy.z,
        screenX: ep.x, screenY: ep.y, scale: ep.scale, depth: enemy.z,
      });
    }

    // Captured ships
    for (const cs of this.waveSystem.capturedShips) {
      if (!cs.alive) continue;
      const cp = projectPoint(cs.x, cs.y, cs.z);
      list.push({
        type: 'capturedShip', capturedShip: cs,
        x: cs.x, y: cs.y, z: cs.z,
        screenX: cp.x, screenY: cp.y, scale: cp.scale, depth: cs.z,
      });
    }

    for (const bullet of this.bulletManager.bullets) {
      if (!bullet.alive) continue;
      const bp = projectPoint(bullet.x, bullet.y, bullet.z);
      list.push({
        type: bullet.isPlayer ? 'playerBullet' : 'enemyBullet',
        x: bullet.x, y: bullet.y, z: bullet.z,
        screenX: bp.x, screenY: bp.y, scale: bp.scale, depth: bullet.z,
      });
    }

    return list;
  }

  _drawMask(item) {
    switch (item.type) {
      case 'player': {
        const size = CONFIG.PLAYER_SIZE * item.scale;
        fillMaskCircle(this.maskGfx, item.screenX, item.screenY, size * 0.8);
        break;
      }
      case 'enemy': {
        let maskScale = item.scale;
        const ov = this.game.registry.get('shaderOverlay');
        if (ov && ov.getShaderName() === 'crt') {
          if (maskScale < 0.90) maskScale = 0.85;
          else if (maskScale < 0.97) maskScale = 0.93;
          else maskScale = 1.0;
        }
        const size = 16 * maskScale;
        fillMaskCircle(this.maskGfx, item.screenX, item.screenY, size);
        break;
      }
      case 'capturedShip': {
        const size = CONFIG.PLAYER_SIZE * item.scale * 0.7;
        fillMaskCircle(this.maskGfx, item.screenX, item.screenY, size);
        break;
      }
    }
  }

  _drawWireframe(item) {
    switch (item.type) {
      case 'player': this._drawPlayerShip(item); break;
      case 'enemy':
        this._drawEnemy(item);
        if (item.enemy.beamActive) this._drawTractorBeam(item);
        break;
      case 'capturedShip': this._drawCapturedShip(item); break;
      case 'playerBullet': this._drawPlayerBullet(item); break;
      case 'enemyBullet': this._drawEnemyBullet(item); break;
    }
  }

  _drawPlayerShip(item) {
    const lines = projectModel(PLAYER_SHIP, item.x, item.y, item.z, item.scale * 1.3);
    for (const line of lines) {
      drawGlowLine(this.gfx, line.x1, line.y1, line.x2, line.y2, CONFIG.COLORS.PLAYER);
    }

    const flicker = Math.sin(performance.now() * 0.02) * 0.3 + 0.7;
    const thrustLen = 6 * item.scale * flicker;
    const engineY = item.screenY + 9 * item.scale;
    drawGlowLine(this.gfx,
      item.screenX - 2 * item.scale, engineY,
      item.screenX, engineY + thrustLen,
      CONFIG.COLORS.PLAYER_THRUST);
    drawGlowLine(this.gfx,
      item.screenX + 2 * item.scale, engineY,
      item.screenX, engineY + thrustLen,
      CONFIG.COLORS.PLAYER_THRUST);
  }

  _drawEnemy(item) {
    const { enemy } = item;

    // Select model: use damaged variant if available
    let model = ENEMY_MODELS[enemy.type];
    if (enemy.damageLevel > 0) {
      const damaged = ENEMY_MODELS_DAMAGED[enemy.type];
      if (damaged) {
        const idx = Math.min(enemy.damageLevel - 1, damaged.length - 1);
        model = damaged[idx];
      }
    }
    if (!model) return;

    const overlay = this.game.registry.get('shaderOverlay');
    const isCRT = overlay && overlay.getShaderName() === 'crt';

    let rotation = 0;
    if (enemy.type === 'spinner') {
      if (isCRT) {
        // Snap to 8 discrete angles (every 45°)
        rotation = Math.round(enemy.spinAngle / (Math.PI / 4)) * (Math.PI / 4);
      } else {
        rotation = enemy.spinAngle;
      }
    } else if (enemy.state === 'diving' || enemy.state === 'entering') {
      const smooth = Math.sin((enemy.diveT || enemy.entranceT || 0) * Math.PI * 2) * 0.3;
      if (isCRT) {
        // Snap to 3 sprite-like states (left / center / right)
        rotation = smooth > 0.1 ? 0.3 : smooth < -0.1 ? -0.3 : 0;
      } else {
        rotation = smooth;
      }
    }

    // CRT mode: quantize scale to 3 discrete sizes (far / normal / close)
    let drawScale = item.scale;
    if (isCRT) {
      if (drawScale < 0.90) drawScale = 0.85;       // far (entering)
      else if (drawScale < 0.97) drawScale = 0.93;   // normal (formation)
      else drawScale = 1.0;                           // close (diving)
    }

    // Boss model has larger coordinates (±16) vs normal enemies (±10), scale down to match
    const typeScale = enemy.isBoss ? 1.2 : 1.8;
    const finalScale = drawScale * typeScale;

    // CRT mode: flat 2D projection (uniform scale, no per-vertex perspective)
    // Vector mode: full 3D per-vertex perspective
    const lines = isCRT
      ? projectModelFlat(model, item.screenX, item.screenY, finalScale, rotation)
      : projectModel(model, item.x, item.y, item.z, finalScale, rotation);

    // Phantom: ghostly low-alpha glow when flickering out
    const alpha = enemy.phantomAlpha;
    if (alpha < 1) {
      const phantomPasses = [
        { width: 11, alpha: 0.07 * alpha },
        { width: 5.5, alpha: 0.2 * alpha },
        { width: 2, alpha: alpha },
      ];
      for (const line of lines) {
        const col = line.c ? enemy.color2 : enemy.color;
        drawGlowLine(this.gfx, line.x1, line.y1, line.x2, line.y2, col, false, phantomPasses);
      }
    } else {
      for (const line of lines) {
        const col = line.c ? enemy.color2 : enemy.color;
        drawGlowLine(this.gfx, line.x1, line.y1, line.x2, line.y2, col);
      }
    }
  }

  _drawPlayerBullet(item) {
    const len = 8 * item.scale;
    drawGlowLine(this.gfx,
      item.screenX, item.screenY - len,
      item.screenX, item.screenY + len,
      CONFIG.COLORS.BULLET_PLAYER);
  }

  _drawEnemyBullet(item) {
    const size = 3 * item.scale;
    drawGlowDiamond(this.gfx, item.screenX, item.screenY, size, CONFIG.COLORS.BULLET_ENEMY);
  }

  _drawTractorBeam(item) {
    const bossX = item.screenX;
    const bossY = item.screenY + 12 * item.scale;
    const beamBottom = CONFIG.PLAYER_Y;
    const beamHeight = beamBottom - bossY;
    const time = performance.now() * 0.004;
    const topWidth = 10;
    const bottomWidth = CONFIG.BEAM_CAPTURE_RANGE;
    const cyan = 0x44ddff;
    const blue = 0x2244ff;

    // Scrolling concave-up arcs that widen toward the bottom
    const arcCount = 12;
    const arcSpacing = 1.0 / arcCount;
    const segments = 10; // smoothness per arc

    for (let i = 0; i < arcCount; i++) {
      const t = ((i * arcSpacing + time) % 1);
      const arcY = bossY + t * beamHeight;
      const halfW = topWidth + (bottomWidth - topWidth) * t;
      // Arc sag — deeper arcs further down the beam
      const sag = 8 + t * 18;
      const color = i % 2 === 0 ? cyan : blue;

      // Draw arc as connected line segments
      for (let s = 0; s < segments; s++) {
        const a0 = s / segments;
        const a1 = (s + 1) / segments;
        // Map [0,1] to [-1,1] for symmetric arc
        const u0 = a0 * 2 - 1;
        const u1 = a1 * 2 - 1;
        const x0 = bossX + u0 * halfW;
        const x1 = bossX + u1 * halfW;
        // Parabolic sag: deepest at center (u=0), zero at edges (u=±1)
        const y0 = arcY + sag * (1 - u0 * u0);
        const y1 = arcY + sag * (1 - u1 * u1);
        drawGlowLine(this.gfx, x0, y0, x1, y1, color);
      }
    }
  }

  _drawCapturedShip(item) {
    const cs = item.capturedShip;
    const rotation = cs ? cs.rotation : 0;
    // During capture: pulse between beam color and ship color for dramatic effect
    let color = CONFIG.COLORS.CAPTURED_SHIP;
    if (cs && cs.state === 'capturing') {
      const pulse = Math.sin(performance.now() * 0.012) * 0.5 + 0.5;
      color = pulse > 0.5 ? CONFIG.COLORS.TRACTOR_BEAM : CONFIG.COLORS.CAPTURED_SHIP;
    }
    const lines = projectModel(PLAYER_SHIP, item.x, item.y, item.z, item.scale * 1.1, rotation);
    for (const line of lines) {
      drawGlowLine(this.gfx, line.x1, line.y1, line.x2, line.y2, color);
    }
  }

  _checkExtraLife() {
    const thresholds = CONFIG.EXTRA_LIFE_THRESHOLDS;
    const repeat = CONFIG.EXTRA_LIFE_REPEAT;

    // Determine the next threshold
    let nextThreshold;
    if (this._nextExtraLifeIndex < thresholds.length) {
      nextThreshold = thresholds[this._nextExtraLifeIndex];
    } else {
      const extra = this._nextExtraLifeIndex - thresholds.length;
      nextThreshold = thresholds[thresholds.length - 1] + repeat * (extra + 1);
    }

    if (this.score >= nextThreshold && this._prevScore < nextThreshold) {
      this.player.lives++;
      this._nextExtraLifeIndex++;
      this.soundEngine.playExtraLife();
      this.hud.showExtraLife();
    }
    this._prevScore = this.score;
  }

  _drawStarfield() {
    for (const star of this._stars) {
      const streakLen = star.speed * 0.08;
      this.bgGfx.lineStyle(star.size, CONFIG.COLORS.STARFIELD, star.brightness);
      this.bgGfx.beginPath();
      this.bgGfx.moveTo(star.x, star.y);
      this.bgGfx.lineTo(star.x, star.y + streakLen);
      this.bgGfx.strokePath();
    }
  }
}
