import { CONFIG } from '../config.js';

/**
 * Heads-up display: score, lives, wave number.
 * Uses Phaser text objects positioned at screen edges.
 * Handles challenge stage results display, game over stats, extra life notification.
 */
export class HUD {
  constructor(scene) {
    this._scene = scene;
    const style = {
      fontFamily: 'Hyperspace',
      fontSize: '36px',
      color: CONFIG.COLORS.HUD,
    };

    this.scoreText = scene.add.text(20, 8, 'SCORE 0', style).setDepth(10);
    this.livesText = scene.add.text(CONFIG.WIDTH - 20, 8, '', style).setDepth(10).setOrigin(1, 0);
    this.waveText = scene.add.text(CONFIG.CENTER_X, 8, '', { ...style, fontSize: '30px' }).setDepth(10).setOrigin(0.5, 0);

    this.centerMsg = scene.add.text(CONFIG.CENTER_X, CONFIG.CENTER_Y - 70, '', {
      ...style,
      fontSize: '56px',
    }).setDepth(10).setOrigin(0.5, 0.5);

    this.subMsg = scene.add.text(CONFIG.CENTER_X, CONFIG.CENTER_Y - 20, '', {
      ...style,
      fontSize: '30px',
    }).setDepth(10).setOrigin(0.5, 0.5);

    // Challenge stage results
    this.challengeHitsText = scene.add.text(CONFIG.CENTER_X, CONFIG.CENTER_Y + 20, '', {
      ...style,
      fontSize: '40px',
      color: '#ffee77',
    }).setDepth(10).setOrigin(0.5, 0.5);

    this.challengeBonusText = scene.add.text(CONFIG.CENTER_X, CONFIG.CENTER_Y + 70, '', {
      ...style,
      fontSize: '36px',
      color: '#77ff99',
    }).setDepth(10).setOrigin(0.5, 0.5);

    this.perfectText = scene.add.text(CONFIG.CENTER_X, CONFIG.CENTER_Y + 120, '', {
      ...style,
      fontSize: '60px',
      color: '#ff88ff',
    }).setDepth(10).setOrigin(0.5, 0.5);

    this.pauseText = scene.add.text(CONFIG.CENTER_X, CONFIG.CENTER_Y - 48, '', {
      ...style,
      fontSize: '48px',
      stroke: CONFIG.COLORS.HUD,
      strokeThickness: 1,
    }).setDepth(12).setOrigin(0.5);

    // Extra life notification
    this.extraLifeText = scene.add.text(CONFIG.CENTER_X, CONFIG.CENTER_Y + 60, '', {
      ...style,
      fontSize: '42px',
      color: '#ffdd44',
    }).setDepth(11).setOrigin(0.5, 0.5);
    this._extraLifeTimer = 0;

    // Power-up notification (below top HUD row)
    this.powerUpText = scene.add.text(CONFIG.CENTER_X, 52, '', {
      ...style,
      fontSize: '24px',
      color: '#ff88ff',
    }).setDepth(11).setOrigin(0.5, 0);
    this._powerUpTimer = 0;

    // Demo label
    this.demoText = scene.add.text(CONFIG.WIDTH - 15, CONFIG.HEIGHT - 15, '', {
      ...style,
      fontSize: '24px',
      color: '#667799',
    }).setDepth(10).setOrigin(1, 1);
    this._showDemo = false;

    // Stats lines for game over
    this._statTexts = [];
    const statY = CONFIG.CENTER_Y + 20;
    for (let i = 0; i < 5; i++) {
      const st = scene.add.text(CONFIG.CENTER_X, statY + i * 38, '', {
        ...style,
        fontSize: '28px',
        color: '#aaddff',
      }).setDepth(10).setOrigin(0.5, 0.5);
      st.setAlpha(0);
      this._statTexts.push(st);
    }

    this.centerMsgTimer = 0;
    this._gameOverShown = false;
    this._challengeActive = false;
    this._gameOverStatsPhase = 0;
    this._gameOverStatsTimer = 0;
    this._statsRevealed = 0;
  }

  update(dt, score, lives, waveNumber, gameOver, demoMode = false, stats = null) {
    this.scoreText.setText(`SCORE ${score}`);
    this.livesText.setText('SHIPS ' + '\u25C6'.repeat(Math.max(0, lives - 1)));
    this.waveText.setText(`WAVE ${waveNumber}`);

    if (this.centerMsgTimer > 0) {
      this.centerMsgTimer -= dt * 1000;
      if (this.centerMsgTimer <= 0) {
        this.centerMsg.setText('');
        this.subMsg.setText('');
        this.challengeHitsText.setText('');
        this.challengeBonusText.setText('');
        this.perfectText.setText('');
      }
    }

    // Power-up notification countdown
    if (this._powerUpTimer > 0) {
      this._powerUpTimer -= dt;
      const pulse = Math.sin(this._powerUpTimer * 10) * 0.3 + 0.7;
      this.powerUpText.setAlpha(pulse);
      if (this._powerUpTimer <= 0) {
        this.powerUpText.setText('');
        this.powerUpText.setAlpha(1);
      }
    }

    // Extra life notification countdown
    if (this._extraLifeTimer > 0) {
      this._extraLifeTimer -= dt;
      const flash = Math.sin(this._extraLifeTimer * 8) > 0;
      this.extraLifeText.setAlpha(flash ? 1 : 0.5);
      if (this._extraLifeTimer <= 0) {
        this.extraLifeText.setText('');
        this.extraLifeText.setAlpha(1);
      }
    }

    // Demo label blink
    if (this._showDemo) {
      const blink = Math.sin(performance.now() * 0.004) > -0.3;
      this.demoText.setText(blink ? 'DEMO' : '');
    }

    if (gameOver && !this._gameOverShown) {
      this.centerMsg.setText('GAME OVER');
      this.subMsg.setText('');
      this.challengeHitsText.setText('');
      this.challengeBonusText.setText('');
      this.perfectText.setText('');
      this.centerMsgTimer = 999999;
      this._gameOverShown = true;
      this._gameOverStatsPhase = 1;
      this._gameOverStatsTimer = 0;
      this._statsRevealed = 0;

      // Prepare stat lines
      if (stats && !demoMode) {
        const totalKilled = Object.values(stats.enemiesKilledByType).reduce((a, b) => a + b, 0);
        const accuracy = stats.shotsFired > 0 ? Math.round((stats.shotsHit / stats.shotsFired) * 100) : 0;
        this._statLines = [
          `WAVES CLEARED      ${stats.wavesCleared}`,
          `ENEMIES DESTROYED   ${totalKilled}`,
          `ACCURACY            ${accuracy}%`,
          `SHOTS FIRED         ${stats.shotsFired}`,
          demoMode ? '' : 'PRESS FIRE',
        ];
      } else {
        this._statLines = [];
        if (!demoMode) {
          this.subMsg.setText('PRESS FIRE');
        }
      }
    }

    // Stat reveal animation during game over
    if (this._gameOverStatsPhase === 1 && this._statLines && this._statLines.length > 0) {
      this._gameOverStatsTimer += dt;
      // Start revealing after 1.5s
      if (this._gameOverStatsTimer > 1.5) {
        const revealTime = this._gameOverStatsTimer - 1.5;
        const lineIdx = Math.floor(revealTime / 0.25);
        while (this._statsRevealed < lineIdx && this._statsRevealed < this._statLines.length) {
          const i = this._statsRevealed;
          if (i < this._statTexts.length && this._statLines[i]) {
            this._statTexts[i].setText(this._statLines[i]);
            this._statTexts[i].setAlpha(1);
            // Play tally blip
            const soundEngine = this._scene.game.registry.get('soundEngine');
            if (soundEngine && i < this._statLines.length - 1) {
              soundEngine.playTallyBlip();
            }
          }
          this._statsRevealed++;
        }
      }
    }
  }

  showMessage(text, durationMs = 2000) {
    this.centerMsg.setText(text);
    this.subMsg.setText('');
    this.challengeHitsText.setText('');
    this.challengeBonusText.setText('');
    this.perfectText.setText('');
    this.centerMsgTimer = durationMs;
  }

  showChallengeStart() {
    this._challengeActive = true;
    this.centerMsg.setText('CHALLENGING STAGE');
    this.subMsg.setText('');
    this.challengeHitsText.setText('');
    this.challengeBonusText.setText('');
    this.perfectText.setText('');
    this.centerMsgTimer = 3000;
  }

  showPause(paused) {
    this.pauseText.setText(paused ? 'PAUSED' : '');
  }

  showChallengeResults(hits, total, bonus, isPerfect) {
    this._challengeActive = false;
    this.centerMsg.setText('RESULTS');
    this.subMsg.setText('');
    this.challengeHitsText.setText(`HITS  ${hits} / ${total}`);
    this.challengeBonusText.setText(`BONUS  ${bonus}`);
    this.perfectText.setText(isPerfect ? 'PERFECT!' : '');
    this.centerMsgTimer = 3500;
  }

  showExtraLife() {
    this.extraLifeText.setText('EXTRA SHIP');
    this._extraLifeTimer = 1.5;
  }

  showPowerUp(text) {
    this.powerUpText.setText(text);
    this._powerUpTimer = 2;
  }

  showDemoLabel(show) {
    this._showDemo = show;
  }
}
