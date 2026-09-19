import { clampStripHead } from './geometry';
import type { BoardData, HeldStrip } from './types';
import type { Viewport } from '../ui/viewport';
import { canvasToCell } from '../ui/viewport';

export interface DropContext {
  board: Pick<BoardData, 'width' | 'height'>;
  strip: HeldStrip | null;
  /** Where the board canvas sits on screen. */
  canvasOrigin: { x: number; y: number };
  canvasSize: { width: number; height: number };
  viewport: Viewport;
  cellSize: number;
  /**
   * Cells to lift the strip head above the finger, so the stones are not hidden
   * under it while dragging.
   */
  fingerOffsetCells?: number;
}

/**
 * Where a drag at a screen point would put the head of the held strip.
 *
 * Returns null when nothing is held or the point is off the canvas — releasing
 * there leaves the strip in the tray. A point inside the canvas but near an
 * edge is pulled back until the whole strip fits, so an almost-good drop lands
 * instead of being refused.
 */
export function resolveDropHead(
  screenX: number,
  screenY: number,
  context: DropContext
): { row: number; col: number } | null {
  const { board, strip, canvasOrigin, canvasSize, viewport, cellSize } = context;
  if (!strip) return null;

  const x = screenX - canvasOrigin.x;
  const y = screenY - canvasOrigin.y;
  if (x < 0 || y < 0 || x > canvasSize.width || y > canvasSize.height) return null;

  const offset = (context.fingerOffsetCells ?? 1) * cellSize * viewport.scale;
  const { row, col } = canvasToCell(x, y - offset, viewport, cellSize);

  // A drop that lands well outside the grid is a miss, not something to clamp
  // across half the board.
  const slack = 2;
  if (row < -slack || col < -slack || row > board.height + slack || col > board.width + slack) {
    return null;
  }
  return clampStripHead(row, col, strip.count, strip.orientation, board);
}
