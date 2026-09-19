# Gleam

A diamond painting game for mobile (Expo / React Native). Each level is one
image, cut into 48 boards of 40x40 numbered cells that unlock as their
neighbours are completed.

[`BUILD_PLAN.md`](BUILD_PLAN.md) holds the full plan and the decisions already
settled.

## Getting started

```bash
npm install --ignore-scripts   # see "Installing on Windows" below
npx expo start                 # then open in Expo Go, or press a / i
```

Everything the app uses (Skia, Reanimated 4 + Worklets, Gesture Handler,
Safe Area Context, Async Storage) ships inside Expo Go for SDK 57, so no
development build is needed to play.

```bash
npm test           # jest
npm run typecheck  # tsc --noEmit
```

`npm run web` does not work yet: Skia's CanvasKit wasm has not been set up.

### Installing on Windows

Use `npm install --ignore-scripts`. `@shopify/react-native-skia`'s postinstall
copies prebuilt native libraries and fails with `EIO, Access is denied` on some
Windows setups. It is the only install script in the whole dependency tree, and
those binaries are only used when compiling a native app, so skipping it costs
nothing while you run in Expo Go. Before a real native build, run it by hand:

```bash
node node_modules/@shopify/react-native-skia/scripts/install-libs.js
```

## Layout

```
App.tsx                  navigation stack: Levels -> Boards -> Board
src/
  game/                  pure game logic, no React and no native modules
    types.ts               board, palette, placement and strip types
    geometry.ts            board size, strip shapes, edge clamping
    session.ts             BoardSession: supply, tray, airborne strip, order
    drop.ts                where a drag on screen would drop a strip
    palette.ts             level palette
    placeholderBoard.ts    generated board data, until levels are loaded
    persistence.ts         AsyncStorage save/load of one board's progress
    replay.ts              ordering for the level-complete redraw
    levels/                one module per prepared level, read out of assets/levels/,
                            plus index.ts, the levelId -> level registry
  ui/                    drawing and layout helpers
    drawStone.ts           faux-3D stone: gradient, facet, highlight, shadow
    viewport.ts            pan/zoom maths, canvas <-> cell conversion
    trayGesture.ts         the tray swipe: stone under the finger, pull-to-lift
    colors.ts, theme.ts, font.ts
  components/            BoardCanvas (Skia), HudTray, AirborneStrip, ColorPicker,
                            SettingsButton/Section/Row, Toggle
  screens/               LevelsScreen, BoardsScreen, BoardScreen, BoardRoute,
                            SettingsScreen
  storage/progress.ts    AsyncStorage progress for the levels and boards screens
  storage/settings.ts    AsyncStorage sound/music preferences
  constants/board.ts     grid sizes from the build plan
  navigation/types.ts    route params
tools/prep-images/       turns source images into level grids
assets/levels/           generated levels, one directory each
assets/levels-src/       the source images levels are generated from
__tests__/               jest suites for the game model and the board screen
```

## What is built

The board painting screen is the finished part: the tray swipe that lifts a
strip of one to five stones, stones that stay in the air until they land
somewhere legal, tap to rotate, pan and pinch, exact stone supply, and the
placement order kept for the level-complete replay.

The levels screen and the 8x6 board grid around it now show real artwork for
every level that has been prepared: the level's `preview.png` on its tile, and
the matching crop of it on each of its boards. A level past the end of
`src/game/levels/index.ts`'s registry still falls back to a plain numbered
tile, since it has no source image yet.

The two seams where the three strands meet are closed for the levels that
have prepared art:

- `src/screens/BoardRoute.tsx` looks up `levelId` in `src/game/levels/index.ts`;
  a level with no entry there still falls back to a generated placeholder
  board until its own source image is prepared.
- Finishing a board calls `markBoardCompleted` in `src/storage/progress.ts`,
  which unlocks the boards touching it, and unlocks the neighbouring levels
  once every board in a level is done.

The settings screen (gear icon on the levels and boards walls) has a
sound/music toggle pair, an about row and a reset-progress button; the two
toggles just persist a preference for now; there is no sound or music engine
yet to read them. The board screen does not have its own gear icon yet, since
it is already dense with the exit button and the progress counter — reachable
through the levels/boards wall behind it in the meantime.

## Preparing levels

```bash
cd tools/prep-images
npm install
node prep-images.mjs ~/art/            # a whole folder at once
```

The palette is chosen once over the whole image before it is cut into boards,
so colours line up across board seams. See the tool's
[README](tools/prep-images/README.md) for the data format the app reads.
