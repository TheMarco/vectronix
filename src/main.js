import Phaser from 'phaser';
import { CONFIG } from './game/config.js';
import { TitleScene } from './game/scenes/TitleScene.js';
import { GameScene } from './game/scenes/GameScene.js';
import { SoundEngine } from './game/audio/SoundEngine.js';
import { createShaderOverlay } from './game/shaderOverlay.js';

const soundEngine = new SoundEngine();

const game = new Phaser.Game({
  type: Phaser.WEBGL,
  parent: 'game-container',
  width: CONFIG.WIDTH,
  height: CONFIG.HEIGHT,
  backgroundColor: CONFIG.COLORS.BG,
  scene: [TitleScene, GameScene],
  render: {
    pixelArt: false,
    antialias: true,
  },
});

game.registry.set('soundEngine', soundEngine);

// Initialize audio on first user gesture
const initAudio = () => {
  soundEngine.init();
  document.removeEventListener('click', initAudio);
  document.removeEventListener('keydown', initAudio);
};
document.addEventListener('click', initAudio);
document.addEventListener('keydown', initAudio);

// Apply shader overlay after canvas is ready
setTimeout(() => {
  const shaderOverlay = createShaderOverlay(game.canvas);
  game.registry.set('shaderOverlay', shaderOverlay);

  const currentName = shaderOverlay.getShaderName();
  document.querySelectorAll('#shader-toggle button').forEach(btn => {
    if (btn.dataset.shader === currentName) btn.classList.add('active');
    btn.addEventListener('click', () => {
      document.querySelector('#shader-toggle .active')?.classList.remove('active');
      btn.classList.add('active');
      shaderOverlay.setShader(btn.dataset.shader);
    });
  });
}, 100);
