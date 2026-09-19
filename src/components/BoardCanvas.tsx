import { Canvas, Group, Picture, Skia, createPicture } from '@shopify/react-native-skia';
import React, { useMemo } from 'react';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { cellCol, cellRow, stripCells } from '../game/geometry';
import type { BoardSession } from '../game/session';
import type { Orientation } from '../game/types';
import { drawStone, strokePaint } from '../ui/drawStone';
import { numberFont } from '../ui/font';
import { theme } from '../ui/theme';

/** One cell in board space. Screen size comes from the viewport transform. */
export const CELL = 24;

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
}

/**
 * The 40x40 grid.
 *
 * Three layers, each baked into a Skia picture rather than thousands of React
 * elements: the empty cells with their numbers (rebuilt only when the board
 * changes), the placed stones (rebuilt on every placement), and the drop
 * preview under the dragged strip.
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
}: Props) {
  const board = session.board;

  const gridPicture = useMemo(
    () =>
      createPicture((canvas) => {
        const background = Skia.Paint();
        background.setColor(Skia.Color(theme.boardBackground));
        canvas.drawRect(Skia.XYWHRect(0, 0, board.width * CELL, board.height * CELL), background);

        const cell = Skia.Paint();
        cell.setColor(Skia.Color(theme.cellEmpty));
        const grid = strokePaint(theme.cellGrid, 1, 1);
        const label = Skia.Paint();
        label.setAntiAlias(true);
        label.setColor(Skia.Color(theme.cellNumber));
        const font = numberFont(CELL * 0.5);

        for (let row = 0; row < board.height; row += 1) {
          for (let col = 0; col < board.width; col += 1) {
            const x = col * CELL;
            const y = row * CELL;
            const rect = Skia.XYWHRect(x + 1, y + 1, CELL - 2, CELL - 2);
            canvas.drawRect(rect, cell);
            canvas.drawRect(rect, grid);
            if (!font) continue;
            // A cell shows its number only, never its colour.
            const text = String(board.palette[board.cells[row * board.width + col]].number);
            const textWidth = font.getTextWidth(text);
            canvas.drawText(text, x + (CELL - textWidth) / 2, y + CELL * 0.68, label, font);
          }
        }
      }, Skia.XYWHRect(0, 0, board.width * CELL, board.height * CELL)),
    [board]
  );

  // Keyed on the stone count, not the session revision: sizing a strip in the
  // tray bumps the revision many times a second, and redrawing every stone on
  // the board for that is work nobody asked for.
  const stonesPicture = useMemo(
    () =>
      createPicture((canvas) => {
        for (const placement of session.placements) {
          const row = cellRow(placement.cell, board.width);
          const col = cellCol(placement.cell, board.width);
          drawStone(canvas, col * CELL, row * CELL, CELL, board.palette[placement.color].hex);
        }
      }, Skia.XYWHRect(0, 0, board.width * CELL, board.height * CELL)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session, board, session.stonesPlaced]
  );

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
        <Picture picture={stonesPicture} />
        {previewPicture ? <Picture picture={previewPicture} /> : null}
      </Group>
    </Canvas>
  );
}
