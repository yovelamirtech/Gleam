# Gleam

A diamond painting game for mobile (Expo / React Native). Each level is one
image, cut into 48 boards of 40x40 numbered cells that unlock as their
neighbours are completed.

[`BUILD_PLAN.md`](BUILD_PLAN.md) holds the full plan and the decisions already
settled.

## Getting started

```bash
npm install
npm start          # then open in Expo Go, or press a / i
npm test           # jest
npm run typecheck  # tsc --noEmit
```

## Layout

```
App.tsx                  navigation stack: Levels -> Boards -> Board
src/constants/board.ts   grid sizes from the build plan (8x6 boards, 40x40 cells)
src/theme/colors.ts      light UI palette
src/storage/progress.ts  AsyncStorage progress for the levels and boards screens
src/screens/             Levels, Boards and Board screens
tools/prep-images/       turns source images into level grids
assets/levels/           generated levels, one directory each
assets/levels-src/       the source images levels are generated from
```

## Preparing levels

```bash
cd tools/prep-images
npm install
node prep-images.mjs ~/art/            # a whole folder at once
```

The palette is chosen once over the whole image before it is cut into boards,
so colours line up across board seams. See the tool's
[README](tools/prep-images/README.md) for the data format the app reads.
