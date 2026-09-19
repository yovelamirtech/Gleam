/**
 * Cutting a quantized level image into the 48 boards the app loads lazily.
 */
import {
  BOARD_CELLS,
  BOARD_COLS,
  BOARD_COUNT,
  BOARD_HEIGHT,
  BOARD_ROWS,
  BOARD_WIDTH,
  LEVEL_HEIGHT,
  LEVEL_WIDTH,
} from './constants.mjs';

export const boardId = (col, row) => row * BOARD_COLS + col;

/** The four neighbours a completed board unlocks, `null` at the level edge. */
export function neighborsOf(col, row) {
  return {
    up: row > 0 ? boardId(col, row - 1) : null,
    down: row < BOARD_ROWS - 1 ? boardId(col, row + 1) : null,
    left: col > 0 ? boardId(col - 1, row) : null,
    right: col < BOARD_COLS - 1 ? boardId(col + 1, row) : null,
  };
}

/**
 * Stone inventory for one board.
 *
 * The plan is strict about this: a board hands the player exactly as many
 * stones of a colour as it has cells needing that colour, so running out mid
 * board is impossible. Counting the cells *is* the inventory — there is no
 * second source of truth to drift from.
 *
 * @param {Uint8Array} cells Palette index per cell.
 * @returns {Array<{color: number, count: number}>} Sorted by colour number.
 */
export function stoneCounts(cells) {
  const tally = new Map();
  for (const cell of cells) tally.set(cell, (tally.get(cell) ?? 0) + 1);
  return [...tally.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([color, count]) => ({ color, count }));
}

/**
 * Cuts the level's palette indices into 48 boards, in id order (left to right,
 * top to bottom).
 *
 * @param {Uint8Array} indices One palette index per level cell, row-major,
 *   LEVEL_WIDTH * LEVEL_HEIGHT long.
 * @returns {Array<{id: number, col: number, row: number, cells: Uint8Array,
 *   stones: Array<{color: number, count: number}>, neighbors: object}>}
 */
export function splitIntoBoards(indices) {
  if (indices.length !== LEVEL_WIDTH * LEVEL_HEIGHT) {
    throw new Error(
      `expected ${LEVEL_WIDTH * LEVEL_HEIGHT} cells for a level, got ${indices.length}`,
    );
  }

  const boards = [];
  for (let row = 0; row < BOARD_ROWS; row += 1) {
    for (let col = 0; col < BOARD_COLS; col += 1) {
      const cells = new Uint8Array(BOARD_CELLS);
      for (let y = 0; y < BOARD_HEIGHT; y += 1) {
        const sourceStart = (row * BOARD_HEIGHT + y) * LEVEL_WIDTH + col * BOARD_WIDTH;
        cells.set(indices.subarray(sourceStart, sourceStart + BOARD_WIDTH), y * BOARD_WIDTH);
      }
      boards.push({
        id: boardId(col, row),
        col,
        row,
        cells,
        stones: stoneCounts(cells),
        neighbors: neighborsOf(col, row),
      });
    }
  }

  if (boards.length !== BOARD_COUNT) {
    throw new Error(`built ${boards.length} boards, expected ${BOARD_COUNT}`);
  }
  return boards;
}
