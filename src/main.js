import Phaser from 'phaser';
import { CONFIG } from './game/config.js';
import { TitleScene } from './game/scenes/TitleScene.js';
import { GameScene } from './game/scenes/GameScene.js';
import { ShipViewerScene } from './game/scenes/ShipViewerScene.js';
import { SoundEngine } from './game/audio/SoundEngine.js';
import { createShaderOverlay } from './game/shaderOverlay.js';

const isTauri = !!window.__TAURI_INTERNALS__;

// Wait for fonts (Hyperspace) to load before starting the game
document.fonts.ready.then(() => {
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // On mobile, activate cabinet layout before creating the game
  if (isTouchDevice) {
    document.body.classList.add('mobile-mode');
    document.getElementById('mobile-cabinet').style.display = 'block';
    document.getElementById('game-container').style.display = 'none';
    document.getElementById('shader-toggle').style.display = 'none';
  }

  // Desktop web: show website elements (logo, download, instructions)
  if (!isTouchDevice && !isTauri) {
    document.body.classList.add('web-mode');
  }

  // Create game — on mobile, parent it inside the cabinet screen area
  const containerId = isTouchDevice ? 'cabinet-screen' : 'game-container';

  const game = new Phaser.Game({
    type: Phaser.WEBGL,
    parent: containerId,
    width: CONFIG.WIDTH,
    height: CONFIG.HEIGHT,
    backgroundColor: CONFIG.COLORS.BG,
    scene: window.location.search.includes('ships')
      ? [ShipViewerScene, TitleScene, GameScene]
      : [TitleScene, GameScene, ShipViewerScene],
    render: {
      pixelArt: false,
      antialias: true,
    },
  });

  // Initialize audio on first user gesture (required by iOS)
  const soundEngine = new SoundEngine();
  game.registry.set('soundEngine', soundEngine);
  const initAudio = () => {
    soundEngine.init();
    document.removeEventListener('touchstart', initAudio);
    document.removeEventListener('touchend', initAudio);
    document.removeEventListener('click', initAudio);
    document.removeEventListener('keydown', initAudio);
  };
  document.addEventListener('touchstart', initAudio);
  document.addEventListener('touchend', initAudio);
  document.addEventListener('click', initAudio);
  document.addEventListener('keydown', initAudio);

  // Apply shader overlay after canvas is ready
  setTimeout(async () => {
    const shaderOverlay = createShaderOverlay(game.canvas);
    game.registry.set('shaderOverlay', shaderOverlay);

    // Desktop: wire up shader toggle buttons and set initial active state
    if (!isTouchDevice) {
      const currentName = shaderOverlay.getShaderName();
      document.querySelectorAll('#shader-toggle button').forEach(btn => {
        if (btn.dataset.shader === currentName) btn.classList.add('active');
        btn.addEventListener('click', () => {
          document.querySelector('#shader-toggle .active')?.classList.remove('active');
          btn.classList.add('active');
          shaderOverlay.setShader(btn.dataset.shader);
        });
      });
    }

    // Tauri: native menu for display mode + fullscreen
    if (isTauri) {
      const { listen } = await import('@tauri-apps/api/event');
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const { invoke } = await import('@tauri-apps/api/core');
      const appWindow = getCurrentWindow();

      // Hide HTML shader buttons — native View menu replaces them
      document.getElementById('shader-toggle').style.display = 'none';

      // Sync initial display mode to menu (respects localStorage persistence)
      invoke('sync_display_mode', { mode: shaderOverlay.getShaderName() });

      // Listen for display mode menu events
      listen('menu-event', (event) => {
        switch (event.payload) {
          case 'display_vector':
            shaderOverlay.setShader('vector');
            break;
          case 'display_crt':
            shaderOverlay.setShader('crt');
            break;
        }
      });

      // --- Fullscreen handling ---
      const canvas = game.canvas;
      const gameAspect = CONFIG.WIDTH / CONFIG.HEIGHT;
      const fsHint = document.getElementById('fs-hint');
      let isFullscreen = false;
      let fsHintTimer = null;

      const applyFullscreenLayout = (fs) => {
        if (fs) {
          // Scale canvas to max height, maintain aspect ratio
          const screenW = window.innerWidth;
          const screenH = window.innerHeight;
          let w, h;
          if (screenW / screenH > gameAspect) {
            h = screenH;
            w = Math.round(h * gameAspect);
          } else {
            w = screenW;
            h = Math.round(w / gameAspect);
          }
          canvas.style.width = w + 'px';
          canvas.style.height = h + 'px';
          document.body.classList.add('fullscreen-mode');
        } else {
          canvas.style.width = '';
          canvas.style.height = '';
          document.body.classList.remove('fullscreen-mode');
        }
      };

      const showFsHint = () => {
        clearTimeout(fsHintTimer);
        fsHint.classList.remove('fade-out');
        fsHint.classList.add('visible');
        fsHintTimer = setTimeout(() => {
          fsHint.classList.add('fade-out');
          setTimeout(() => fsHint.classList.remove('visible', 'fade-out'), 400);
        }, 2500);
      };

      const hideFsHint = () => {
        clearTimeout(fsHintTimer);
        fsHint.classList.remove('visible', 'fade-out');
      };

      // Detect fullscreen changes (native menu, green button, Cmd+Ctrl+F)
      appWindow.onResized(async () => {
        const fs = await appWindow.isFullscreen();
        if (fs !== isFullscreen) {
          isFullscreen = fs;
          applyFullscreenLayout(fs);
          if (fs) showFsHint(); else hideFsHint();
        }
      });

      // ESC exits fullscreen — synchronous check, capture phase
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isFullscreen) {
          e.stopImmediatePropagation();
          e.preventDefault();
          appWindow.setFullscreen(false);
        }
      }, true);
    }

    // Browser fullscreen (desktop web, not Tauri)
    if (!isTauri && !isTouchDevice) {
      const canvas = game.canvas;
      const gameAspect = CONFIG.WIDTH / CONFIG.HEIGHT;
      const fsHint = document.getElementById('fs-hint');
      let isFullscreen = false;
      let fsHintTimer = null;

      const applyFullscreenLayout = (fs) => {
        if (fs) {
          const screenW = window.innerWidth;
          const screenH = window.innerHeight;
          let w, h;
          if (screenW / screenH > gameAspect) {
            h = screenH;
            w = Math.round(h * gameAspect);
          } else {
            w = screenW;
            h = Math.round(w / gameAspect);
          }
          canvas.style.width = w + 'px';
          canvas.style.height = h + 'px';
          document.body.classList.add('fullscreen-mode');
        } else {
          canvas.style.width = '';
          canvas.style.height = '';
          document.body.classList.remove('fullscreen-mode');
        }
      };

      const showFsHint = () => {
        clearTimeout(fsHintTimer);
        fsHint.classList.remove('fade-out');
        fsHint.classList.add('visible');
        fsHintTimer = setTimeout(() => {
          fsHint.classList.add('fade-out');
          setTimeout(() => fsHint.classList.remove('visible', 'fade-out'), 400);
        }, 2500);
      };

      const hideFsHint = () => {
        clearTimeout(fsHintTimer);
        fsHint.classList.remove('visible', 'fade-out');
      };

      document.addEventListener('fullscreenchange', () => {
        const fs = !!document.fullscreenElement;
        if (fs !== isFullscreen) {
          isFullscreen = fs;
          applyFullscreenLayout(fs);
          if (fs) showFsHint(); else hideFsHint();
        }
      });

      document.getElementById('fullscreen-btn').addEventListener('click', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen();
        } else {
          document.exitFullscreen();
        }
      });

      // ESC exits fullscreen — capture phase, intercepts before game pause
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isFullscreen) {
          e.stopImmediatePropagation();
          e.preventDefault();
          document.exitFullscreen();
        }
      }, true);
    }

    // Mobile: wire up cabinet touch zones with proper held-state + multi-touch
    if (isTouchDevice) {
      const keyDown = (keyCode, code, key) => {
        window.dispatchEvent(new KeyboardEvent('keydown', { keyCode, code, key, bubbles: true }));
      };
      const keyUp = (keyCode, code, key) => {
        window.dispatchEvent(new KeyboardEvent('keyup', { keyCode, code, key, bubbles: true }));
      };

      // Button flash effect
      const flashButton = (el) => {
        el.classList.add('flash');
        setTimeout(() => el.classList.remove('flash'), 150);
      };

      // ── FIRE BUTTON (held) ──
      {
        const fireEl = document.getElementById('touch-fire');
        const fireTouches = new Set();

        fireEl.addEventListener('touchstart', (e) => {
          e.preventDefault();
          for (const t of e.changedTouches) fireTouches.add(t.identifier);
          flashButton(fireEl);
          fireEl.classList.add('held');
          keyDown(32, 'Space', ' ');
        });

        fireEl.addEventListener('touchend', (e) => {
          e.preventDefault();
          for (const t of e.changedTouches) fireTouches.delete(t.identifier);
          if (fireTouches.size === 0) {
            fireEl.classList.remove('held');
            keyUp(32, 'Space', ' ');
          }
        });

        fireEl.addEventListener('touchcancel', (e) => {
          for (const t of e.changedTouches) fireTouches.delete(t.identifier);
          if (fireTouches.size === 0) {
            fireEl.classList.remove('held');
            keyUp(32, 'Space', ' ');
          }
        });
      }

      // ── SWIPE ZONE (1:1 position mapping) ──
      // Touch position within the zone maps directly to ship X in game coordinates.
      {
        const swipeEl = document.getElementById('touch-swipe');
        const MIN_X = CONFIG.FIELD_LEFT + 16;
        const MAX_X = CONFIG.FIELD_RIGHT - 16;

        const updateTouchX = (touch) => {
          const rect = swipeEl.getBoundingClientRect();
          const t = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
          game.registry.set('touchX', MIN_X + t * (MAX_X - MIN_X));
        };

        swipeEl.addEventListener('touchstart', (e) => {
          e.preventDefault();
          updateTouchX(e.changedTouches[e.changedTouches.length - 1]);
          swipeEl.classList.add('held');
        });

        swipeEl.addEventListener('touchmove', (e) => {
          e.preventDefault();
          updateTouchX(e.changedTouches[e.changedTouches.length - 1]);
        });

        const onTouchEnd = (e) => {
          e.preventDefault();
          // Only clear if no touches remain on the swipe zone
          if (e.touches.length === 0 ||
              !Array.from(e.touches).some(t => {
                const r = swipeEl.getBoundingClientRect();
                return t.clientX >= r.left && t.clientX <= r.right &&
                       t.clientY >= r.top && t.clientY <= r.bottom;
              })) {
            game.registry.set('touchX', null);
            swipeEl.classList.remove('held');
          }
        };

        swipeEl.addEventListener('touchend', onTouchEnd);
        swipeEl.addEventListener('touchcancel', onTouchEnd);
      }

      // Display mode: toggle CRT / Vector (tap only)
      let currentShader = shaderOverlay.getShaderName();
      document.getElementById('touch-display').addEventListener('touchstart', (e) => {
        e.preventDefault();
        flashButton(e.currentTarget);
        currentShader = currentShader === 'crt' ? 'vector' : 'crt';
        shaderOverlay.setShader(currentShader);
      });

      // Pause: send Escape key (tap only)
      document.getElementById('touch-pause').addEventListener('touchstart', (e) => {
        e.preventDefault();
        flashButton(e.currentTarget);
        keyDown(27, 'Escape', 'Escape');
      });
    }
  }, 100);
});
