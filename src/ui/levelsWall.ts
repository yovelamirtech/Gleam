import { LEVELS_X, LEVELS_Y, LEVEL_COUNT } from '../constants/board';

/** One tile's edge length in wall-space units (board-space, not screen pixels). */
export const LEVEL_TILE = 200;

export const WALL_WIDTH = LEVELS_X * LEVEL_TILE;
export const WALL_HEIGHT = LEVELS_Y * LEVEL_TILE;

/** Top-left corner of a level's tile, in wall-space units. */
export function levelTilePosition(levelId: number): { x: number; y: number } {
  const col = levelId % LEVELS_X;
  const row = Math.floor(levelId / LEVELS_X);
  return { x: col * LEVEL_TILE, y: row * LEVEL_TILE };
}

/**
 * Which level tile a wall-space point falls in, or `null` off the wall
 * entirely - callers decide what an off-wall tap means (nothing, here).
 */
export function levelAtPoint(x: number, y: number): number | null {
  if (x < 0 || y < 0 || x >= WALL_WIDTH || y >= WALL_HEIGHT) return null;
  const col = Math.floor(x / LEVEL_TILE);
  const row = Math.floor(y / LEVEL_TILE);
  const levelId = row * LEVELS_X + col;
  return levelId >= 0 && levelId < LEVEL_COUNT ? levelId : null;
}
