# Gleam

A mobile diamond-painting game built with Expo and React Native. Every level is
one image split into 48 boards; every board is a 40x40 grid of numbered cells
you fill with coloured stones. See [BUILD_PLAN.md](BUILD_PLAN.md) for the full
plan.

## What is built so far

The board painting screen — the core mechanic — and the game model underneath
it. The levels screen, the image prep script, sound, ads and settings are not
built yet.

```
src/
  game/          pure game logic, no React and no native modules
    types.ts           board, palette, placement and strip types
    geometry.ts        board size, strip shapes, edge clamping
    session.ts         BoardSession: supply, tray, placement, placement order
    drop.ts            where a drag on screen would drop a strip
    palette.ts         level palette (stand-in for the prep script's output)
    placeholderBoard.ts generated board data until the prep script exists
    persistence.ts     AsyncStorage save/load of board progress
    replay.ts          ordering for the level-complete redraw
  ui/            drawing and layout helpers
    drawStone.ts       faux-3D stone: gradient, facet, highlight, shadow
    viewport.ts        pan/zoom maths, canvas <-> cell conversion
    colors.ts, theme.ts, font.ts
  components/    BoardCanvas (Skia), HudTray, ColorPicker
  screens/       BoardScreen
  hooks/         useBoardSession
```

### How the board plays

- Each cell shows a **number only**. The colour it needs is never shown.
- Picking a colour fills the five-slot tray from that board's supply. Tapping
  tray slot *n* takes *n* stones instead of five; tapping the tray rotates the
  strip between horizontal and vertical.
- Dragging the tray carries the strip over the board and shows a preview of
  where it will land, green when the drop is legal and red when it is not.
- One finger on the board pans it, two fingers pinch to zoom. A drag that
  starts on the tray always places stones, so placing never fights with moving.
- **The supply of each colour equals exactly the cells needing it.** A strip is
  placed all-or-nothing: if any cell it covers is filled or wants another
  colour, the whole strip stays in the tray and nothing is spent. That is what
  makes it impossible to run out of stones with cells still empty.
- Every stone records the order it went down in, not just where it landed, so
  the level-complete animation can redraw the board in the player's own solving
  order. Progress is stored as that list of placements and replayed on reopen.

### Board data

`createPlaceholderBoard(index)` generates board data in the shape the image prep
script will eventually emit: a shared level palette plus one colour index per
cell. It uses smooth overlapping waves so colours form contiguous regions, which
is what makes strips of two to five stones placeable.

## Running it

```bash
npm install
npm start          # Expo dev server
npm test           # Jest
npm run typecheck  # tsc --noEmit
```

## Tests

`npm test` covers the game model end to end: strip geometry and edge clamping,
the stone economy (including a full 40x40 board played to completion without
getting stuck), placement rules and rejection, placement order, save/load
round-trips and corrupt-save handling, replay ordering, pan/zoom maths, drag-to-
cell resolution, and the HUD wiring on the board screen. The Skia drawing layer
itself is not unit-tested — it needs a native surface — and is stubbed out in
the screen test.
