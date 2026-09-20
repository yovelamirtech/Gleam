import { BOARDS_X, BOARDS_Y, BOARD_CELLS_X, BOARD_CELLS_Y, CELL } from '../constants/board';
import type { Viewport } from './viewport';

/**
 * Wall-space geometry for the unified board-level canvas (HANDOFF.md item 8):
 * every board of a level laid out on one continuous pannable/zoomable canvas,
 * in the same cell-pixel units `BoardCanvas` already draws a single board in
 * (`CELL`), rather than a separate scale per screen the way the levels wall
 * (`src/ui/levelsWall.ts`) uses its own `LEVEL_TILE` unit. Sharing `CELL`
 * means a wall-space point is already in the units `BoardCanvas`,
 * `canvasToCell` and `resolveDropHead` expect - no extra conversion at the
 * placement step, just an offset by the active board's own top-left.
 */
export const BOARD_PX_X = BOARD_CELLS_X * CELL;
export const BOARD_PX_Y = BOARD_CELLS_Y * CELL;

export const WALL_PX_WIDTH = BOARDS_X * BOARD_PX_X;
export const WALL_PX_HEIGHT = BOARDS_Y * BOARD_PX_Y;

/**
 * Viewport scale at/above which a board tile is large enough on screen to
 * actually place stones on (roughly half of `BoardCanvas`'s own native cell
 * size, 12px/cell) - below it the wall shows every board's preview artwork
 * instead of live gameplay, the same "flatten instead of full-fidelity at
 * this scale" tradeoff `LevelCompleteCanvas` makes for the same reason.
 */
export const PLAYABLE_SCALE = 0.5;

export function isPlayableScale(scale: number): boolean {
  return scale >= PLAYABLE_SCALE;
}

/** Top-left corner of a board's tile, in wall-space units. */
export function boardTilePosition(boardId: number): { x: number; y: number } {
  const col = boardId % BOARDS_X;
  const row = Math.floor(boardId / BOARDS_X);
  return { x: col * BOARD_PX_X, y: row * BOARD_PX_Y };
}

/**
 * Which board tile a wall-space point falls in, or `null` off the wall
 * entirely - callers decide what an off-wall point means.
 */
export function boardAtPoint(x: number, y: number): number | null {
  if (x < 0 || y < 0 || x >= WALL_PX_WIDTH || y >= WALL_PX_HEIGHT) return null;
  const col = Math.floor(x / BOARD_PX_X);
  const row = Math.floor(y / BOARD_PX_Y);
  const boardId = row * BOARDS_X + col;
  return boardId >= 0 && boardId < BOARDS_X * BOARDS_Y ? boardId : null;
}

/**
 * The board tile currently sitting at the centre of the screen, or `null`
 * when the centre is off the wall. Driving "which board is the player
 * looking at" off the screen's own centre point, rather than off whichever
 * board a tap or drag lands on, is what makes the board that gameplay acts
 * against track panning continuously instead of only on a tap.
 */
export function centreBoardAt(
  viewport: Viewport,
  canvasWidth: number,
  canvasHeight: number
): number | null {
  const wallX = (canvasWidth / 2 - viewport.translateX) / viewport.scale;
  const wallY = (canvasHeight / 2 - viewport.translateY) / viewport.scale;
  return boardAtPoint(wallX, wallY);
}
