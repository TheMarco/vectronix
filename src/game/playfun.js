/**
 * Play.fun SDK integration — only active when the game is iframed (embedded on play.fun).
 * When running standalone, all methods are silent no-ops.
 */

const GAME_ID = 'e9784e13-3c81-40cf-8464-3806fdf3703a';

let sdk = null;
let active = false;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

export async function init() {
  if (!GAME_ID || window === window.top) return;

  try {
    await loadScript('https://sdk.play.fun');
    sdk = new window.OpenGameSDK({ ui: { usePointsWidget: true } });
    await sdk.init({ gameId: GAME_ID });
    active = true;
  } catch (e) {
    console.warn('[PlayFun] SDK init failed:', e);
  }
}

export function addPoints(points) {
  if (active) sdk.addPoints(points);
}

export async function endGame() {
  if (!active) return;
  try {
    await sdk.endGame();
  } catch (e) {
    console.warn('[PlayFun] endGame failed:', e);
  }
}
