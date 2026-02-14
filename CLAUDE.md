# VECTRONIX

Vector-style Galaga clone built with Phaser 3.87 + Vite 6, WebGL renderer.

## Architecture
- Resolution: 768x672 (matches hexax for shader compatibility)
- 3-layer rendering pattern from hexax: bgGfx(ADD,depth=0) → maskGfx(NORMAL,depth=1) → gfx(ADD,depth=2)
- Painter's algorithm: sort far-to-near, masks first, then wireframes

## Display System (from hexax)
- `GlowRenderer.js` — 3-pass glow: width 11/5.5/2, alpha 0.07/0.2/1.0
- `shaderOverlay.js` — bloom, vector composite, phosphor persistence, CRT mode
- `ExplosionRenderer.js` — adapted from hexax (removed tunnel rotation dependency)

## Projection
- Flat playfield: `scale = 1/(1 + z * 0.006)`
- Z=0: gameplay plane (player), Z=12: formation depth, Z<0: close to camera (dive attacks)
- Screen center: (384, 336), vanishing point for perspective

## Key Files
- `src/game/config.js` — all game constants
- `src/game/rendering/Projection.js` — 3D→2D projection + model transform
- `src/game/rendering/Models.js` — 3D wireframe models (PLAYER_SHIP, GRUNT, ATTACKER, COMMANDER, etc.)
- `src/game/rendering/VectorFont.js` — stroke font for title/HUD vector text
- `src/game/scenes/GameScene.js` — main loop, input, render list build, 3-layer draw
- `src/game/scenes/TitleScene.js` — animated vector title screen with orbiting enemies
- `src/game/audio/SoundEngine.js` — Web Audio API procedural synthesis (fire, explosion, dive, wave start)
- `src/game/systems/Formation.js` — grid-based formation with sway and breathe
- `src/game/entities/DivePaths.js` — parametric dive curves (8 solo types + group formation dives + challenge flythrough paths)
- `src/game/systems/WaveSystem.js` — 9 wave templates + challenge stages, entrance queuing, dive triggering, group dive coordination

## Enemy Types
- grunt, attacker, commander, spinner, bomber, guardian, phantom, swarm, boss
- HP: 1 (grunt/swarm/attacker/spinner/phantom), 2 (bomber/commander/boss), 3 (guardian)

## Enemy States
- `queued` → `entering` → `holding` → `diving` → `returning` → `holding`
- Boss tractor states: `tractor_diving` → `tractor_beaming` → `tractor_capturing` → `tractor_returning`
- Enemies must be in `queued` until `startEntrance()` is called (prevents null path crash)

## Dive System
- 8 solo dive types: swoop, direct, zigzag, loop, spiral, banking S-curve, feint & strike, peel-off
- Group formation dives (wave 6+): 3-5 same-row enemies fly coordinated V/echelon/line formations
  - `createGroupDivePaths(enemies, playerX, formationType)` → array of path fns
  - Enemies blend from actual positions into formation offsets over t<0.3, then hold shape
  - Probability: 20% (w6-8), 30% (w9), 35% (w10+); bosses/commanders/guardians excluded
- Tractor beam dive for bosses (separate path type)
- Special cases: swarm pulls buddy, commander pulls escort (still independent paths)

## Wave Structure
- 9 normal wave templates + challenge stages every 5th wave (w5, w10, w15...)
- Speed escalation per cycle: `speedMultiplier = 1.0 + cycle * 0.15`
- Dive interval decreases per cycle: `max(1200, template.diveInterval - cycle * 300)`

## Controls
- Arrow keys: move left/right
- Space/Z: fire
- Enter: start game / restart after game over

## Dev Server
- `npm run dev` (port 8081)
