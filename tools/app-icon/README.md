# App icon

Generates `assets/icon.png`, `assets/favicon.png` and the three Android
adaptive-icon variants (`android-icon-foreground.png`,
`android-icon-background.png`, `android-icon-monochrome.png`) from an SVG
built in code, so the icon is a small colourful cluster of the same faux-3D
gem the board draws (`src/ui/drawStone.ts`), in the same palette
(`src/theme/colors.ts`).

```bash
cd tools/app-icon
npm install
npm run build
```

Re-run it after changing the accent palette or the gem's proportions, so the
icon stays in sync with the in-game stones instead of drifting from a
one-off export.
