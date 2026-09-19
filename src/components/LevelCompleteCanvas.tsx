import { Canvas, Picture, Skia, createPicture } from '@shopify/react-native-skia';
import { useMemo } from 'react';

import { LEVEL_CELLS_X, LEVEL_CELLS_Y } from '../constants/board';
import type { PaletteEntry } from '../game/types';

interface Props {
  width: number;
  height: number;
  /** Colour index per cell of the whole level grid, row-major, `LEVEL_CELLS_X * LEVEL_CELLS_Y` long. */
  levelCells: Uint16Array;
  palette: readonly PaletteEntry[];
  /** This cell's place in the level's solving order, or -1 if it was never placed. Same length as `levelCells`. */
  orderByCell: Int32Array;
  /** Cells with `orderByCell < revealThreshold` are drawn; the rest are left as bare background. */
  revealThreshold: number;
  /** 0..1 across the diagonal, or null to skip the one-off celebratory shimmer. */
  sparkle?: number | null;
}

/**
 * The whole level, zoomed out to fit the screen — the level-complete replay's
 * canvas (BUILD_PLAN.md). Cells are flat colour, not the board's faux-3D
 * stones: at this scale (up to 320x240 cells on one screen) a cell is only a
 * couple of pixels wide, too small for a gradient or a highlight to read, and
 * it matches how `tools/prep-images`' own preview.png draws a level.
 */
export function LevelCompleteCanvas({
  width,
  height,
  levelCells,
  palette,
  orderByCell,
  revealThreshold,
  sparkle,
}: Props) {
  const cellPx = width / LEVEL_CELLS_X;

  const paints = useMemo(() => {
    return palette.map((entry) => {
      const paint = Skia.Paint();
      paint.setColor(Skia.Color(entry.hex));
      return paint;
    });
  }, [palette]);

  const picture = useMemo(
    () =>
      createPicture((canvas) => {
        for (let row = 0; row < LEVEL_CELLS_Y; row += 1) {
          for (let col = 0; col < LEVEL_CELLS_X; col += 1) {
            const index = row * LEVEL_CELLS_X + col;
            if (orderByCell[index] < 0 || orderByCell[index] >= revealThreshold) continue;
            const paint = paints[levelCells[index]];
            if (!paint) continue;
            canvas.drawRect(Skia.XYWHRect(col * cellPx, row * cellPx, cellPx + 0.5, cellPx + 0.5), paint);
          }
        }
      }, Skia.XYWHRect(0, 0, width, height)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [levelCells, orderByCell, paints, revealThreshold, cellPx, width, height]
  );

  const sparklePicture = useMemo(() => {
    if (sparkle === null || sparkle === undefined) return null;
    return createPicture((canvas) => {
      const bandWidth = width * 0.22;
      // Sweeps the whole diagonal, band centre going from off the top-left
      // corner to off the bottom-right one.
      const travel = width + height + bandWidth;
      const centre = -bandWidth / 2 + sparkle * travel;
      const paint = Skia.Paint();
      paint.setAntiAlias(true);
      paint.setShader(
        Skia.Shader.MakeLinearGradient(
          { x: centre - bandWidth / 2, y: 0 },
          { x: centre + bandWidth / 2, y: 0 },
          [Skia.Color('#ffffff00'), Skia.Color('#ffffffcc'), Skia.Color('#ffffff00')],
          [0, 0.5, 1],
          0
        )
      );
      canvas.save();
      canvas.rotate(35, width / 2, height / 2);
      canvas.drawRect(Skia.XYWHRect(centre - width, -height, width * 3, height * 3), paint);
      canvas.restore();
    }, Skia.XYWHRect(0, 0, width, height));
  }, [sparkle, width, height]);

  return (
    <Canvas style={{ width, height }}>
      <Picture picture={picture} />
      {sparklePicture ? <Picture picture={sparklePicture} /> : null}
    </Canvas>
  );
}
