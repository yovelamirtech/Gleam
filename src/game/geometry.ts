import type { BoardData, Orientation } from './types';

/** Cells across a board, per BUILD_PLAN.md. */
export const BOARD_SIZE = 40;
/** Boards per level, laid out 8 wide by 6 tall. */
export const BOARDS_PER_LEVEL_X = 8;
export const BOARDS_PER_LEVEL_Y = 6;
/** Stone slots in the HUD tray, so a strip is never longer than 5. */
export const TRAY_SLOTS = 5;

export interface CellRef {
  row: number;
  col: number;
}

export function cellIndex(row: number, col: number, width: number): number {
  return row * width + col;
}

export function cellRow(index: number, width: number): number {
  return Math.floor(index / width);
}

export function cellCol(index: number, width: number): number {
  return index % width;
}

export function inBounds(row: number, col: number, board: Pick<BoardData, 'width' | 'height'>): boolean {
  return row >= 0 && col >= 0 && row < board.height && col < board.width;
}

/**
 * The cells a strip covers when its head sits on (row, col).
 *
 * The head is the first stone of the strip: a horizontal strip grows to the
 * right, a vertical strip grows downward. Returns `null` when any part of the
 * strip would leave the board, so callers never have to bounds-check pieces.
 */
export function stripCells(
  row: number,
  col: number,
  count: number,
  orientation: Orientation,
  board: Pick<BoardData, 'width' | 'height'>
): number[] | null {
  if (count < 1) return null;
  const cells: number[] = [];
  for (let i = 0; i < count; i += 1) {
    const r = orientation === 'vertical' ? row + i : row;
    const c = orientation === 'horizontal' ? col + i : col;
    if (!inBounds(r, c, board)) return null;
    cells.push(cellIndex(r, c, board.width));
  }
  return cells;
}

/**
 * Nudge a strip head back onto the board so a drag that runs off an edge still
 * has somewhere legal to land instead of simply refusing.
 */
export function clampStripHead(
  row: number,
  col: number,
  count: number,
  orientation: Orientation,
  board: Pick<BoardData, 'width' | 'height'>
): CellRef {
  const maxRow = orientation === 'vertical' ? board.height - count : board.height - 1;
  const maxCol = orientation === 'horizontal' ? board.width - count : board.width - 1;
  return {
    row: Math.min(Math.max(row, 0), Math.max(maxRow, 0)),
    col: Math.min(Math.max(col, 0), Math.max(maxCol, 0)),
  };
}

export function otherOrientation(orientation: Orientation): Orientation {
  return orientation === 'horizontal' ? 'vertical' : 'horizontal';
}
