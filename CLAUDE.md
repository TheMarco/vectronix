# VECTRONIX

Vector-style Galaga clone built with Phaser 3.87 + Vite 6, WebGL renderer.
Capacitor 8 for iOS native builds.

## Architecture
- Resolution: 768x672 (matches hexax for shader compatibility)
- 3-layer rendering pattern from hexax: bgGfx(ADD,depth=0) → maskGfx(NORMAL,depth=1) → gfx(ADD,depth=2)
- Painter's algorithm: sort far-to-near, masks first, then wireframes
- Entry point: `src/main.js` — Phaser init, audio bootstrap, mobile touch wiring, shader overlay setup

## Display Modes
Two shader modes toggled at runtime, both in `src/game/shaderOverlay.js`:

### Vector Mode (default)
5-pass pipeline: bloom downsample → H blur → V blur → vector composite → passthrough blit.
- Color grading: `vectorColorGrade()` maps game colors to blue phosphor aesthetic
- Edge beam defocus: blurs at screen edges
- Chromatic aberration: RGB split proportional to edge distance
- Phosphor persistence: per-channel colored trails via ping-pong FBOs
  - Base decay: `0.68` (was 0.78)
  - **Framerate-independent**: `adjustedDecay = Math.pow(baseDecay, dt * 60.0)` — consistent trails at 30fps and 60fps
- Bloom: half-res downsample + 9-tap Gaussian blur, added in composite
- Phosphor grain, glass surface reflection, blue phosphor tint, analog noise, beam flicker

### CRT Mode
Single-pass NTSC simulation at 256x224 virtual resolution:
- **Barrel distortion**: `CURVATURE_STRENGTH 0.04`
- **Rounded corners**: `CORNER_RADIUS 0.14`, rect size `0.96×0.96`, smooth antialiased edge
- **NTSC horizontal blend**: sub-pixel position blends toward neighbors, adapts to display pitch
- **Bloom + halation**: `BLOOM_STRENGTH 0.65`, `HALATION_STRENGTH 0.35` — tight 1px bloom + wide 3px glass glow
- **Gaussian beam scanlines**: `baseSigma 0.28–0.55` (adapts to pitch), brightness-dependent beam widening `+0.08`
- **Aperture grille**: Trinitron RGB stripe mask `MASK_STRENGTH 0.12`, dark separators between triads
- **RGB convergence error**: R/B channels shift apart at screen edges, offset `0.02`, blend `0.6`
- **Warm color temperature**: `vec3(1.04, 1.01, 0.95)` — NTSC consumer TV warmth
- **Per-scanline H-jitter**: analog H-sync wobble, amplitude `0.0025`
- **Interlace flicker**: even/odd scanline brightness alternation, strength `0.015`
- **Rolling scan band**: bright horizontal band scrolling down, width `0.15–0.45`, strength `0.12`, speed `0.08`
- **Coarse analog noise**: RGB noise in 3x3 pixel clumps, `NOISE_STRENGTH 0.006`
- **Power supply flicker**: whole-screen brightness wobble, `FLICKER_STRENGTH 0.08`, 3 sine frequencies
- **Vignette**: edge darkening, strength `0.12`

### CRT-specific Game Behaviors
- **Discrete explosions**: 3-frame symmetric sprite-like bursts (4-way mirrored, 12 particles, `CRT_LIFE_MS 250`, `CRT_SPEED 95`), snapped to discrete radii with stepped alpha
- **Quantized formation breathe**: snaps to 3 discrete steps (`0.96/1.0/1.04`) instead of smooth sine

## Hexax Display System Reuse
- `GlowRenderer.js` — 3-pass glow: width 11/5.5/2, alpha 0.07/0.2/1.0
- `ExplosionRenderer.js` — adapted from hexax; vector mode: random organic bursts; CRT mode: symmetric sprite-like bursts
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
- `src/game/scenes/GameScene.js` — main loop, input, render list build, 3-layer draw, tractor beam rendering
- `src/game/scenes/TitleScene.js` — animated vector title screen with orbiting enemies, attract mode demo
- `src/game/scenes/ShipViewerScene.js` — debug reference page showing all enemy types in visual states (access via `?ships` URL param)

### Entities
- `src/game/entities/Player.js` — player ship (movement, lives, respawn, invulnerability, dual fighter, shield)
- `src/game/entities/Enemy.js` — enemy class with state machine, HP table, hit flash, dive/return logic; `killedInState` tracks state at time of death
- `src/game/entities/Bullet.js` — bullet entity + BulletManager (player and enemy bullets)
- `src/game/entities/CapturedShip.js` — player ship captured by boss tractor beam (capture animation, attached with sway during dives, release/destroy states)
- `src/game/entities/Ufo.js` — bonus UFO ship that flies across screen, drops power-ups when destroyed
- `src/game/entities/DivePaths.js` — parametric dive curves (8 solo types + group formation dives + challenge flythrough paths)
- `src/game/entities/Formation.js` — grid-based formation with sway and breathe; compression when <60% alive (min spacing: col 48, row 46)

### Systems
- `src/game/systems/WaveSystem.js` — 9 wave templates + challenge stages, entrance queuing, dive triggering, group dive coordination, tractor beam logic
- `src/game/systems/CollisionSystem.js` — screen-space collision detection (bullets↔enemies, bullets↔player, body↔player, beam↔player, bullets↔captured ships, bullets↔UFO); dual fighter checks both ship positions

### Rendering
- `src/game/rendering/Projection.js` — 3D→2D projection + model transform
- `src/game/rendering/Models.js` — 3D wireframe models (PLAYER_SHIP, GRUNT, ATTACKER, COMMANDER, SPINNER, BOMBER, GUARDIAN, PHANTOM, SWARM, BOSS, UFO_SAUCER, etc.)
- `src/game/rendering/VectorFont.js` — stroke font for title/HUD vector text
- `src/game/rendering/GlowRenderer.js` — 3-pass glow line drawing
- `src/game/rendering/ExplosionRenderer.js` — explosion rendering; `crtMode` flag switches between vector (organic random) and CRT (symmetric 3-frame sprite-like)
- `src/game/rendering/HoloGlitch.js` — holographic glitch damage effect (displacement bands per damage level)
- `src/game/shaderOverlay.js` — shader overlay system: CRT shader, vector composite pipeline (bloom downsample, Gaussian blur, vector composite with phosphor persistence, passthrough blit)

### Audio
- `src/game/audio/SoundEngine.js` — Web Audio API procedural synthesis (fire, explosion, player death, dive, wave start, rescue, extra life, tractor beam)

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
- `dead` — destroyed; `killedInState` preserves previous state for rescue logic
- Boss tractor states: `tractor_diving` → `tractor_beaming` → `tractor_capturing` → `tractor_returning`
- Enemies must be in `queued` until `startEntrance()` is called (prevents null path crash)

## Dive System
- 8 solo dive types: swoop, direct, zigzag, loop, spiral, banking S-curve, feint & strike, peel-off
- Group formation dives (wave 6+): 3-5 same-row enemies fly coordinated V/echelon/line formations
  - `createGroupDivePaths(enemies, playerX, formationType)` → array of path fns
  - Enemies blend from actual positions into formation offsets over t<0.3, then hold shape
  - Probability: 20% (w6-8), 30% (w9), 35% (w10+); bosses/commanders/guardians excluded
- Tractor beam dive for bosses (separate path type); 4 scrolling arcs (upward direction)
- Special cases: swarm pulls buddy, commander pulls escort (still independent paths)

## Tractor Beam
- Bosses only attempt tractor beam when: no captured ship exists, player is not dual, player has >1 life, no abduction in progress
- **Never triggers on last life** — prevents frustrating game-ending captures
- Beam animation: 4 concave-up arcs scrolling upward, with shimmer and sag
- Captured ship sways behind boss during dives (opposite to boss movement direction)
- **Rescue only when boss is diving**: killing boss in formation destroys the captured ship; killing boss while diving/returning/re-entering releases it for rescue
- Captured ship is shootable in `attached` state — can accidentally destroy own ship

## Wave Structure
- 9 normal wave templates + challenge stages every 5th wave (w5, w10, w15...)
- Speed escalation per cycle: `speedMultiplier = 1.0 + cycle * 0.15`
- Dive interval decreases per cycle: `max(1200, template.diveInterval - cycle * 300)`

## Formation
- Grid: 10 columns × 5 rows, spacing: 54px col / 50px row
- Sway: speed 0.4, amount 18px
- Breathe: speed 0.6, amount ±0.04 (CRT mode: quantized to 3 discrete steps)
- Compression when <60% alive: col min 48px, row min 46px (gentle, `0.75–0.9` factor)

## Scoring
- Enemies score more when diving (e.g. grunt 50 formation / 100 diving)
- Boss with captured ship: 1600 pts; rescue bonus: 2000 pts
- Challenge stage: 100 per hit, 10000 perfect bonus
- UFO: 300 pts

## Lives & Extra Lives
- Start: 3 lives (1 active + 2 spare)
- 1 extra life earned at 20,000 points — **no more after that**
- Max lives capped at `START_LIVES` (3)

## UFO Power-ups
- UFO spawns randomly (20-30s interval), flies across screen
- Power-ups on destroy: rapid fire (12s), slowdown (15s, 0.5× enemy speed), magnet (10s, bullets curve toward enemies), time freeze (3.5s), shield (absorbs one hit)

## Dual Fighter
- Boss can capture player ship via tractor beam (only when player has >1 life)
- Kill boss holding captured ship **while it's diving** → rescue → dual fighter mode
- Kill boss in formation → captured ship destroyed
- Dual fighter: two ships side by side (±13px offset), double bullets (max 8), shared controls
- Collision detection checks both ship positions independently
- Losing a ship in dual mode plays the full player death sound

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
