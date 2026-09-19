import { BOARDS_PER_LEVEL_X, BOARD_SIZE } from './geometry';
import { DEFAULT_PALETTE_SIZE, generatePalette } from './palette';
import type { BoardData } from './types';

/**
 * Stand-in board data until the image prep script exists.
 *
 * The prep script will quantize a whole level image and emit one JSON file per
 * board; this produces the same shape from a seed instead. It uses smooth
 * overlapping waves rather than noise so colours form contiguous regions — a
 * board of random cells would make strips of 2-5 stones almost unplaceable and
 * would not tell us anything about how the real thing feels.
 */
export function createPlaceholderBoard(
  boardIndex: number = 0,
  options: { levelId?: string; size?: number; paletteSize?: number } = {}
): BoardData {
  const { levelId = 'level-1', size = BOARD_SIZE, paletteSize = DEFAULT_PALETTE_SIZE } = options;
  const palette = generatePalette(paletteSize);

  // Where this board sits inside the level, so neighbouring boards continue
  // the same field instead of each restarting the pattern.
  const boardCol = boardIndex % BOARDS_PER_LEVEL_X;
  const boardRow = Math.floor(boardIndex / BOARDS_PER_LEVEL_X);
  const originX = boardCol * size;
  const originY = boardRow * size;

  const cells: number[] = new Array(size * size);
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const x = (originX + col) / size;
      const y = (originY + row) / size;
      const wave =
        Math.sin(x * 1.7 + y * 0.9) +
        Math.sin(x * 0.6 - y * 2.1) * 0.8 +
        Math.sin((x + y) * 2.6) * 0.5;
      const radial = Math.hypot(x - 3.5, y - 2.5) * 0.45;
      const value = (wave + radial) * 0.5;
      // Fold into 0..1 then band into palette indices.
      const folded = value - Math.floor(value);
      cells[row * size + col] = Math.min(paletteSize - 1, Math.floor(folded * paletteSize));
    }
  }

  return {
    id: `${levelId}/board-${boardIndex}`,
    width: size,
    height: size,
    palette,
    cells,
  };
}
