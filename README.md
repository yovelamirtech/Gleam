# Gleam

A diamond painting game for mobile (Expo / React Native). Each level is one
image, cut into 48 boards of 40×40 numbered cells that unlock as their
neighbours are completed.

[`BUILD_PLAN.md`](BUILD_PLAN.md) holds the full plan and the decisions already
settled.

## Repository

| Path | What is there |
| --- | --- |
| `tools/prep-images/` | Turns source images into level grids. See its [README](tools/prep-images/README.md) for the data format the app reads. |
| `assets/levels/` | Generated levels, one directory each. `sample-lagoon` is a worked example. |
| `assets/levels-src/` | The source images levels are generated from. |

## Preparing levels

```bash
cd tools/prep-images
npm install
node prep-images.mjs ~/art/            # a whole folder at once
```

The palette is chosen once over the whole image before it is cut into boards,
so colours line up across board seams.
