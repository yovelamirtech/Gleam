# Gleam

A mobile diamond-painting game built with Expo and React Native. See
[BUILD_PLAN.md](BUILD_PLAN.md) for the full design.

## Getting started

```bash
npm install
npm start          # then open in Expo Go, or press a / i
```

The native modules here (Skia, Reanimated, Gesture Handler) need a development
build rather than a stock Expo Go client on some platforms; `npx expo run:android`
or `npx expo run:ios` will produce one.

```bash
npm run typecheck  # tsc --noEmit
```

## Layout

```
App.tsx                  navigation stack: Levels -> Boards -> Board
src/constants/board.ts   grid sizes from the build plan (8x6 boards, 40x40 cells)
src/theme/colors.ts      light UI palette
src/storage/progress.ts  AsyncStorage progress, including stone placement order
src/screens/             Levels, Boards and Board screens
```

## Status

Scaffolding only. The three screens render and navigate, and the board screen
draws its grid and a demo strip of faux-3D stones through Skia, but no game
mechanics are implemented yet.
