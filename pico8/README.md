# PICO-8 Port

This folder contains a standalone PICO-8 port of the game.

Files:
- `assets/spritesheet.png` is the editable 128x128 source-of-truth sprite sheet.
- `assets/sprite_layout.json` maps sprite names to tile positions on the sheet.
- `generated/gfx.txt` is generated from the PNG and copied into the cart `__gfx__` section.
- `src/*.lua` contains the modular PICO-8 source.
- `galaga_pico8.p8` is the generated cart.

Workflow:
1. Edit `assets/spritesheet.png`.
2. Run `npm run pico8:sync-sprites`.
3. Run `npm run pico8:build`.

Bootstrap:
1. Run `npm run pico8:init-sprites` once to seed the initial sprite sheet.
2. Run `npm run pico8:all` to build the cart from the seeded sheet.

Notes:
- The sprite pipeline assumes PICO-8 palette colors. Off-palette colors are mapped to the nearest PICO-8 color during sync.
- The current port prioritizes keeping the roster and core game loop. If cart size becomes a problem, the first cuts should be the least distinctive enemies or secondary systems, not the main Galaga loop.
