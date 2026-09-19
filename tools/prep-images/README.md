# Image preparation

Turns an ordinary image into a Gleam level: one 320×240 grid of cells, cut into
48 boards of 40×40 that the app loads one at a time.

```bash
cd tools/prep-images
npm install

# one image
node prep-images.mjs ~/art/lagoon.png

# a whole folder, in one go
node prep-images.mjs ~/art/ --colors 28
```

Levels are written to `assets/levels/<level-id>/`. The level id comes from the
file name (`Koi Pond.jpg` → `koi-pond`), or from `--id`.

| Option | Default | What it does |
| --- | --- | --- |
| `--out <dir>` | `assets/levels` | Where levels are written |
| `--colors <n>` | `24` | Palette size, 2–64. The plan calls for 20–30 |
| `--fit cover\|contain` | `cover` | How a source image that is not 4:3 is fitted |
| `--id <slug>` | from the file name | Level id, single input only |
| `--name <text>` | from the id | Display name, single input only |
| `--no-preview` | — | Skip `preview.png` |
| `--preview-scale <n>` | `3` | Pixels per cell in `preview.png` |
| `--force` | — | Overwrite an existing level directory |

One unreadable image does not abandon a batch: it is reported on stderr and the
run carries on, exiting non-zero at the end.

## What the script does

1. **Resize** the source to exactly 320×240 cells (Lanczos, centred, cropped to
   4:3 by default). Any transparency is flattened onto white, because a diamond
   cannot be see-through.
2. **Quantize the whole image at once** to the requested number of colours —
   median cut for a starting palette, then weighted k-means to settle it. No
   dithering: a diamond painting is one flat colour per cell, and scattered
   dither pixels would be miserable to place.
3. **Sort the palette** darkest to lightest, so colour numbers run in a sensible
   order and stay stable when the tool is re-run on the same image.
4. **Cut** the grid into 48 boards and write one file per board, plus a
   manifest and a preview.

Step 2 is the part that matters most, and it is why the script exists at all.
Quantizing board by board would give each board its own 24 colours, and a shape
crossing a board seam would change colour number halfway across. Choosing the
palette once, over the whole image, is what makes the seams invisible — the test
suite measures this, and on the sample level the colour step across a seam is
slightly *smaller* than between two ordinary neighbouring columns.

## Output

```
assets/levels/sample-lagoon/
├── level.json          manifest: palette, board index, where to start
├── preview.png         the finished level as an image
└── boards/
    ├── 000.json        one file per board, loaded on demand
    ├── 001.json
    └── … 047.json
```

Board files are named by id, zero padded, so they sort in place. A board id is
`row * 8 + col`, counting from the top left, so board 0 is the top-left corner
and board 47 the bottom-right.

### `level.json`

Loaded once when a level is opened. Around 15 KB; it holds no cell data, so it
stays small no matter how big the level gets.

```jsonc
{
  "formatVersion": 1,
  "id": "sample-lagoon",
  "name": "Sample Lagoon",
  "source": { "file": "sample-lagoon.png", "width": 1280, "height": 960, "format": "png" },
  "generatedBy": "tools/prep-images",
  "grid": {
    "boardCols": 8, "boardRows": 6,          // 48 boards, laid out 8 wide by 6 tall
    "boardWidth": 40, "boardHeight": 40,     // cells per board
    "levelWidth": 320, "levelHeight": 240,   // cells in the whole level
    "boardCount": 48
  },
  "startBoardId": 19,                        // the central board, unlocked at the start
  "preview": "preview.png",
  "palette": [
    // Darkest first. `number` is what the player sees printed in a cell;
    // `index` is what the board files store. `count` is cells in the level.
    { "index": 0, "number": 1, "hex": "#2a2744", "rgb": [42, 39, 68], "count": 13403 }
    // … one entry per colour
  ],
  "boards": [
    // Enough to draw the level wall and run the unlock logic without opening
    // a single board file.
    { "id": 0, "col": 0, "row": 0, "file": "boards/000.json", "colors": [1, 2, 3, 5], "stoneCount": 1600 }
    // … 48 entries, in id order
  ]
}
```

### `boards/NNN.json`

Loaded when the player opens a board, or when one becomes a candidate to open
next. 5–7 KB each, so the plan's "current board plus its neighbours" is about
30 KB in memory, and a whole level on disk is roughly 300 KB.

```jsonc
{
  "formatVersion": 1,
  "levelId": "sample-lagoon",
  "id": 19, "col": 3, "row": 2,
  "width": 40, "height": 40,
  "neighbors": { "up": 11, "down": 27, "left": 18, "right": 20 },  // null at the level edge
  "stones": [
    { "color": 4, "count": 305 },   // 305 stones of palette index 4, and exactly 305 cells need it
    { "color": 6, "count": 11 }
    // … in colour order, only the colours this board uses
  ],
  "cells": [
    // 1600 palette indices, row-major, written 40 per line so the file reads
    // as the grid it is. cells[y * 40 + x] is the colour of the cell at (x, y).
    20, 20, 20, /* … 40 values … */ 20,
    // … 40 rows
  ]
}
```

A few things the app can rely on:

- **`neighbors`** is precomputed, so completing a board and unlocking what it
  touches is a lookup rather than arithmetic.
- **`stones` is the board's whole inventory, and it is exact.** The plan requires
  that a board hand the player precisely as many stones of a colour as it has
  cells needing that colour — never short, never left over. Counting the cells
  *is* the inventory here, so the two cannot drift apart. The verifier checks it
  anyway, per board and per colour.
- **`cells` holds palette indices, not colours.** The number a player sees is
  `index + 1`; the colour to draw is `level.palette[index].hex`. Indices mean the
  same thing in every board of the level.
- **Cells are plain integers**, so a board parses with `JSON.parse` and no decode
  pass, and `cells[y * 40 + x]` is ready for Skia to draw.

Nothing in a board file records what the player has done. Progress, placement
order for the level-complete replay, and lock state belong in AsyncStorage,
keyed by level and board id — the level data stays read-only.

## Checking a level

```bash
node verify-level.mjs ../../assets/levels/sample-lagoon
```

It reads a level the way the app would and reports anything that would break it:
missing or misnumbered boards, cells pointing outside the palette, neighbour
links that are not symmetric, palette counts that disagree with the boards, and
any board whose stone inventory does not match its cells exactly.

## Tests

```bash
npm test
```

Covers the quantizer (palette budget, ordering, determinism), the board split
(reassembly loses and duplicates nothing, seams line up), an end-to-end build
checked by the verifier, and the committed sample level.

## The sample level

`assets/levels/sample-lagoon/` is generated from
`assets/levels-src/sample-lagoon.png`, which is itself drawn by
`make-sample-source.mjs` so the sample is reproducible from the repo alone. Real
levels come from the artist's own images.

```bash
node make-sample-source.mjs
node prep-images.mjs ../../assets/levels-src/sample-lagoon.png \
  --id sample-lagoon --name "Sample Lagoon" --force
node verify-level.mjs ../../assets/levels/sample-lagoon
```
