import { Skia, type SkCanvas } from '@shopify/react-native-skia';

import { CELL } from '../constants/board';
import type { BoardData } from '../game/types';
import { strokePaint } from './drawStone';
import { numberFont } from './font';
import { lastGridDrawStats } from './gridDrawStats';
import { theme } from './theme';

/**
 * One board's empty grid - the cell backgrounds, borders and the numbers that
 * tell a player what belongs where - drawn at a given offset in the canvas's
 * own space. Shared by `BoardCanvas` (one board, offset 0,0) and the levels
 * wall's grid overlay (every board of a level, offset by its own tile
 * position), so both draw the exact same thing players already read on the
 * live board screen instead of a second, different-looking preview.
 */
export function drawBoardGrid(canvas: SkCanvas, board: BoardData, originX: number, originY: number): void {
  const background = Skia.Paint();
  background.setColor(Skia.Color(theme.boardBackground));
  canvas.drawRect(Skia.XYWHRect(originX, originY, board.width * CELL, board.height * CELL), background);

  const cell = Skia.Paint();
  cell.setColor(Skia.Color(theme.cellEmpty));
  const grid = strokePaint(theme.cellGrid, 1, 1);
  const label = Skia.Paint();
  label.setAntiAlias(true);
  label.setColor(Skia.Color(theme.cellNumber));
  const font = numberFont(CELL * 0.5);
  lastGridDrawStats.fontMissing = !font;
  lastGridDrawStats.drawTextError = null;

  for (let row = 0; row < board.height; row += 1) {
    for (let col = 0; col < board.width; col += 1) {
      const x = originX + col * CELL;
      const y = originY + row * CELL;
      const rect = Skia.XYWHRect(x + 1, y + 1, CELL - 2, CELL - 2);
      canvas.drawRect(rect, cell);
      canvas.drawRect(rect, grid);
      if (!font) continue;
      // A cell shows its number only, never its colour.
      const text = String(board.palette[board.cells[row * board.width + col]].number);
      try {
        const textWidth = font.getTextWidth(text);
        canvas.drawText(text, x + (CELL - textWidth) / 2, y + CELL * 0.68, label, font);
      } catch (error) {
        // Keep drawing the rest of the grid even if one cell's number fails -
        // and remember the first failure so it can be reported on screen.
        if (!lastGridDrawStats.drawTextError) {
          lastGridDrawStats.drawTextError = error instanceof Error ? error.message : String(error);
        }
      }
    }
  }
}
