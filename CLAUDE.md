# VECTRONIX

Vector-style Galaga clone built with Phaser 3.87 + Vite 6, WebGL renderer.
Capacitor 8 for iOS native builds.

## Architecture
- Resolution: 768x672 (matches hexax for shader compatibility)
- 3-layer rendering pattern from hexax: bgGfx(ADD,depth=0) → maskGfx(NORMAL,depth=1) → gfx(ADD,depth=2)
- Painter's algorithm: sort far-to-near, masks first, then wireframes
- Entry point: `src/main.js` — Phaser init, audio bootstrap, mobile touch wiring, shader overlay setup

## Display System (from hexax)
- `GlowRenderer.js` — 3-pass glow: width 11/5.5/2, alpha 0.07/0.2/1.0
- `shaderOverlay.js` — bloom, vector composite, phosphor persistence, CRT mode (at `src/game/shaderOverlay.js`, not in rendering/)
- `ExplosionRenderer.js` — adapted from hexax (removed tunnel rotation dependency)
- `HoloGlitch.js` — holographic glitch corruption for damaged enemies (horizontal displacement bands, line skipping)

## Projection
- Flat playfield: `scale = 1/(1 + z * 0.006)`
- Z=0: gameplay plane (player), Z=12: formation depth, Z<0: close to camera (dive attacks)
- Screen center: (384, 336), vanishing point for perspective

## Key Files

### Entry & Config
- `src/main.js` — Phaser game init, audio bootstrap on first gesture, mobile cabinet touch controls, shader overlay wiring
- `src/game/config.js` — all game constants (dimensions, speeds, scoring, colors, power-up durations, etc.)

### Scenes
- `src/game/scenes/GameScene.js` — main loop, input, render list build, 3-layer draw
- `src/game/scenes/TitleScene.js` — animated vector title screen with orbiting enemies, attract mode demo
- `src/game/scenes/ShipViewerScene.js` — debug reference page showing all enemy types in visual states (access via `?ships` URL param)

### Entities
- `src/game/entities/Player.js` — player ship (movement, lives, respawn, invulnerability, dual fighter, shield)
- `src/game/entities/Enemy.js` — enemy class with state machine, HP table, hit flash, dive/return logic
- `src/game/entities/Bullet.js` — bullet entity + BulletManager (player and enemy bullets)
- `src/game/entities/CapturedShip.js` — player ship captured by boss tractor beam (capture animation, attached/release states)
- `src/game/entities/Ufo.js` — bonus UFO ship that flies across screen, drops power-ups when destroyed
- `src/game/entities/DivePaths.js` — parametric dive curves (8 solo types + group formation dives + challenge flythrough paths)
- `src/game/entities/Formation.js` — grid-based formation with sway and breathe

### Systems
- `src/game/systems/WaveSystem.js` — 9 wave templates + challenge stages, entrance queuing, dive triggering, group dive coordination
- `src/game/systems/CollisionSystem.js` — screen-space collision detection (bullets↔enemies, bullets↔player, body↔player, beam↔player, bullets↔UFO)

### Rendering
- `src/game/rendering/Projection.js` — 3D→2D projection + model transform
- `src/game/rendering/Models.js` — 3D wireframe models (PLAYER_SHIP, GRUNT, ATTACKER, COMMANDER, SPINNER, BOMBER, GUARDIAN, PHANTOM, SWARM, BOSS, UFO_SAUCER, etc.)
- `src/game/rendering/VectorFont.js` — stroke font for title/HUD vector text
- `src/game/rendering/GlowRenderer.js` — 3-pass glow line drawing
- `src/game/rendering/ExplosionRenderer.js` — explosion particle rendering
- `src/game/rendering/HoloGlitch.js` — holographic glitch damage effect (displacement bands per damage level)

### Audio
- `src/game/audio/SoundEngine.js` — Web Audio API procedural synthesis (fire, explosion, dive, wave start)

### AI
- `src/game/ai/DemoAI.js` — attract mode autopilot (dodge bullets → aim at diving enemies → idle drift)

### HUD
- `src/game/hud/HUD.js` — score, lives, wave number display; challenge stage results; game over stats; extra life notification

## Enemy Types
- grunt, attacker, commander, spinner, bomber, guardian, phantom, swarm, boss
- HP: 1 (grunt/swarm/attacker/spinner/phantom), 2 (bomber/commander/boss), 3 (guardian)

## Enemy States
- `queued` → `entering` → `holding` → `diving` → `returning` → `holding`
- `re-entering` — warped above screen, flying back to formation from top
- `dead` — destroyed
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

## Scoring
- Enemies score more when diving (e.g. grunt 50 formation / 100 diving)
- Boss with captured ship: 1600 pts; rescue bonus: 2000 pts
- Challenge stage: 100 per hit, 10000 perfect bonus
- UFO: 300 pts
- Extra lives at 15,000 and 50,000, then every 50,000

## UFO Power-ups
- UFO spawns randomly (20-30s interval), flies across screen
- Power-ups on destroy: rapid fire (12s), slowdown (15s, 0.5× enemy speed), magnet (10s, bullets curve toward enemies), time freeze (3.5s), shield (absorbs one hit)

## Dual Fighter
- Boss can capture player ship via tractor beam
- Kill boss holding captured ship → rescue → dual fighter mode
- Dual fighter: two ships side by side (±14px offset), double bullets (max 8), shared controls

## Damage Visualization
- HoloGlitch effect: enemies with >1 HP show holographic corruption when damaged
- Two damage levels with increasing displacement bands, line skipping, and frame jitter

## Controls
- Arrow keys: move left/right
- Space/Z: fire
- Enter: start game / restart after game over
- Escape: pause

## Mobile / iOS
- Touch controls: swipe zone for movement (1:1 position mapping), fire button (held state), display mode toggle, pause
- Cabinet-style layout on touch devices with `mobile-mode` class
- Capacitor 8 for iOS native builds: `npm run build:ios` (builds + syncs to iOS)
- App ID: `com.aidesign.vectronix`

## Dev Commands
- `npm run dev` — dev server (port 8081)
- `npm run build` — production build to `dist/`
- `npm run build:ios` — build + Capacitor sync for iOS
- Debug: add `?ships` to URL to open ShipViewerScene
