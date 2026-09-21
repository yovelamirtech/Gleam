import {
  Canvas,
  Group,
  Picture,
  Skia,
  createPicture,
  type SkCanvas,
  type SkPicture,
} from '@shopify/react-native-skia';
import React, { useMemo, useRef } from 'react';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { CELL } from '../constants/board';
import { cellCol, cellRow, stripCells } from '../game/geometry';
import type { BoardSession } from '../game/session';
import type { Orientation, Placement } from '../game/types';
import { drawBoardGrid } from '../ui/boardGrid';
import { drawStone, strokePaint } from '../ui/drawStone';
import { bakeBoundary } from '../ui/stoneBaking';
import { theme } from '../ui/theme';

export { CELL };

export interface DropPreview {
  row: number;
  col: number;
  count: number;
  orientation: Orientation;
  color: number;
  hex: string;
  valid: boolean;
}

interface Props {
  session: BoardSession;
  /** Changes whenever the session mutates, so the board re-renders with it. */
  revision: number;
  preview: DropPreview | null;
  width: number;
  height: number;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  scale: SharedValue<number>;
  /** Dev tool: a small swatch of the true colour in every still-empty cell. */
  showSolution?: boolean;
}

/**
 * The 40x40 grid.
 *
 * Three layers, each baked into a Skia picture rather than thousands of React
 * elements: the empty cells with their numbers (rebuilt only when the board
 * changes), the placed stones (rebuilt incrementally as stones are placed -
 * see the `bakedRef`/`bakeBoundary` comment below), and the drop preview
 * under the dragged strip.
 */
export function BoardCanvas({
  session,
  revision,
  preview,
  width,
  height,
  translateX,
  translateY,
  scale,
  showSolution = false,
}: Props) {
  const board = session.board;

  const gridPicture = useMemo(
    () =>
      createPicture(
        (canvas) => drawBoardGrid(canvas, board, 0, 0),
        Skia.XYWHRect(0, 0, board.width * CELL, board.height * CELL)
      ),
    [board]
  );

  // A board fully rebuilding its stones picture on every single placement
  // costs O(n) work at the n-th placement, so filling a board this way costs
  // O(n^2) draw-call work in total (see src/ui/stoneBaking.ts). Instead a
  // "baked" picture is kept per session, advanced one batch at a time by
  // drawing the *previous* baked picture (one drawPicture call, not a replay
  // of every stone in it) plus that batch's own stones; only the placements
  // since the last batch boundary are replayed with drawStone on every
  // placement, bounded to at most BAKE_BATCH_SIZE - 1 of them.
  const bakedRef = useRef<{ session: BoardSession | null; count: number; picture: SkPicture | null }>({
    session: null,
    count: 0,
    picture: null,
  });

  // Keyed on the stone count, not the session revision: sizing a strip in the
  // tray bumps the revision many times a second, and redrawing every stone on
  // the board for that is work nobody asked for.
  const stonesPicture = useMemo(() => {
    if (bakedRef.current.session !== session) {
      bakedRef.current = { session, count: 0, picture: null };
    }
    const baked = bakedRef.current;

    const drawPlacement = (canvas: SkCanvas, placement: Placement) => {
      const row = cellRow(placement.cell, board.width);
      const col = cellCol(placement.cell, board.width);
      drawStone(canvas, col * CELL, row * CELL, CELL, board.palette[placement.color].hex);
    };

    const placements = session.placements;
    const boundary = bakeBoundary(placements.length);
    if (boundary > baked.count) {
      const previousPicture = baked.picture;
      const batch = placements.slice(baked.count, boundary);
      const nextPicture = createPicture((canvas) => {
        if (previousPicture) canvas.drawPicture(previousPicture);
        for (const placement of batch) drawPlacement(canvas, placement);
      }, Skia.XYWHRect(0, 0, board.width * CELL, board.height * CELL));
      bakedRef.current = { session, count: boundary, picture: nextPicture };
    }

    const tail = placements.slice(bakedRef.current.count, placements.length);
    return createPicture((canvas) => {
      if (bakedRef.current.picture) canvas.drawPicture(bakedRef.current.picture);
      for (const placement of tail) drawPlacement(canvas, placement);
    }, Skia.XYWHRect(0, 0, board.width * CELL, board.height * CELL));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, board, session.stonesPlaced]);

  // Dev tool only: a corner swatch of each still-empty cell's true colour, so
  // a source image can be checked against the level it produced without
  // solving the board. Rebuilt with the stones, since which cells are still
  // empty changes with every placement.
  const solutionPicture = useMemo(() => {
    if (!showSolution) return null;
    return createPicture((canvas) => {
      const swatch = Skia.Paint();
      swatch.setAntiAlias(true);
      const swatchSize = CELL * 0.32;
      for (let index = 0; index < board.cells.length; index += 1) {
        if (!session.isEmptyAt(index)) continue;
        const x = cellCol(index, board.width) * CELL;
        const y = cellRow(index, board.width) * CELL;
        swatch.setColor(Skia.Color(board.palette[board.cells[index]].hex));
        canvas.drawRect(Skia.XYWHRect(x + 2, y + 2, swatchSize, swatchSize), swatch);
      }
    }, Skia.XYWHRect(0, 0, board.width * CELL, board.height * CELL));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSolution, session, board, session.stonesPlaced]);

  const previewPicture = useMemo(() => {
    if (!preview) return null;
    const cells = stripCells(preview.row, preview.col, preview.count, preview.orientation, board);
    if (!cells) return null;
    return createPicture((canvas) => {
      const outline = strokePaint(preview.valid ? theme.positive : theme.negative, 2.5, 1);
      for (const index of cells) {
        const x = cellCol(index, board.width) * CELL;
        const y = cellRow(index, board.width) * CELL;
        drawStone(canvas, x, y, CELL, preview.hex, preview.valid ? 0.6 : 0.3);
        canvas.drawRect(Skia.XYWHRect(x + 1, y + 1, CELL - 2, CELL - 2), outline);
      }
    }, Skia.XYWHRect(0, 0, board.width * CELL, board.height * CELL));
  }, [preview, board]);

  const transform = useDerivedValue(() => [
    { translateX: translateX.value },
    { translateY: translateY.value },
    { scale: scale.value },
  ]);

  return (
    <Canvas style={{ width, height }}>
      <Group transform={transform}>
        <Picture picture={gridPicture} />
        {solutionPicture ? <Picture picture={solutionPicture} /> : null}
        <Picture picture={stonesPicture} />
        {previewPicture ? <Picture picture={previewPicture} /> : null}
      </Group>
    </Canvas>
  );
}
