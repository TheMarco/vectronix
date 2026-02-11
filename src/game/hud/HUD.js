import { CONFIG } from '../config.js';

/**
 * Heads-up display: score, lives, wave number.
 * Uses Phaser text objects positioned at screen edges.
 * Handles challenge stage results display.
 */
export class HUD {
  constructor(scene) {
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
      color: '#ffdd44',
    }).setDepth(10).setOrigin(0.5, 0.5);

    this.challengeBonusText = scene.add.text(CONFIG.CENTER_X, CONFIG.CENTER_Y + 70, '', {
      ...style,
      fontSize: '36px',
      color: '#44ff66',
    }).setDepth(10).setOrigin(0.5, 0.5);

    this.perfectText = scene.add.text(CONFIG.CENTER_X, CONFIG.CENTER_Y + 120, '', {
      ...style,
      fontSize: '60px',
      color: '#ff44ff',
    }).setDepth(10).setOrigin(0.5, 0.5);

    this.centerMsgTimer = 0;
    this._gameOverShown = false;
    this._challengeActive = false;
  }

  update(dt, score, lives, waveNumber, gameOver) {
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

    if (gameOver && !this._gameOverShown) {
      this.centerMsg.setText('GAME OVER');
      this.subMsg.setText('PRESS ENTER');
      this.challengeHitsText.setText('');
      this.challengeBonusText.setText('');
      this.perfectText.setText('');
      this.centerMsgTimer = 999999;
      this._gameOverShown = true;
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

  showChallengeResults(hits, total, bonus, isPerfect) {
    this._challengeActive = false;
    this.centerMsg.setText('RESULTS');
    this.subMsg.setText('');
    this.challengeHitsText.setText(`HITS  ${hits} / ${total}`);
    this.challengeBonusText.setText(`BONUS  ${bonus}`);
    this.perfectText.setText(isPerfect ? 'PERFECT!' : '');
    this.centerMsgTimer = 3500;
  }
}
