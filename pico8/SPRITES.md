# Sprite Atlas

The editable atlas is [spritesheet.png](/Users/marcovhv/projects/GIT/galaga/pico8/assets/spritesheet.png). It is a `128x128` PICO-8 palette PNG laid out on an `8x8` tile grid.

Conventions:
- All ships are `8x8` (1×1 PICO-8 sprite).
- Boss frames are `16x8` (2×1 PICO-8 sprites).
- Bullets, explosions, and power-up icons are `8x8`.
- `sprite_layout.json` is the machine-readable source for IDs and tile positions.

Atlas layout by tile coordinate:

Row 0 (y=0):
- `(0,0)` player frame 1
- `(1,0)` player frame 2
- `(2,0)` grunt frame 1
- `(3,0)` grunt frame 2
- `(4,0)` attacker frame 1
- `(5,0)` attacker frame 2
- `(6,0)` commander frame 1
- `(7,0)` commander frame 2
- `(8,0)` commander damaged
- `(9,0)` spinner frame 1
- `(10,0)` spinner frame 2
- `(11,0)` spinner frame 3
- `(12,0)` spinner frame 4
- `(13,0)` bomber frame 1
- `(14,0)` bomber frame 2
- `(15,0)` bomber damaged

Row 1 (y=1):
- `(0,1)` guardian frame 1
- `(1,1)` guardian frame 2
- `(2,1)` guardian damaged
- `(3,1)` guardian critical
- `(4,1)` phantom frame 1
- `(5,1)` phantom frame 2
- `(6,1)` phantom ghost 1
- `(7,1)` phantom ghost 2
- `(8,1)` swarm frame 1
- `(9,1)` swarm frame 2
- `(10,1)` ufo frame 1
- `(11,1)` ufo frame 2
- `(12,1)` player bullet
- `(13,1)` enemy bullet
- `(14,1)` explosion 1
- `(15,1)` explosion 2

Row 2 (y=2):
- `(0,2)` explosion 3
- `(1,2)` rapid icon
- `(2,2)` shield icon
- `(3,2)` slow icon
- `(4,2)` magnet icon
- `(5,2)` freeze icon
- `(6,2)-(7,2)` boss frame 1 (2×1)
- `(8,2)-(9,2)` boss frame 2 (2×1)
- `(10,2)-(11,2)` boss phase 2 (2×1)
- `(12,2)-(13,2)` boss beam (2×1)

Reserved space:
- Tiles from row 3 downward are open for revisions, new effects, or larger variants.

Editing workflow:
1. Edit [spritesheet.png](/Users/marcovhv/projects/GIT/galaga/pico8/assets/spritesheet.png).
2. Keep art snapped to the existing `8x8` grid and frame slots above.
3. Run `npm run pico8:sync-sprites`.
4. Run `npm run pico8:build`.
