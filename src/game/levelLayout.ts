import { LEVELS_X, LEVELS_Y, LEVEL_COUNT } from '../constants/board';

export interface GridPosition {
  row: number;
  col: number;
}

const CENTRE_ROW = Math.floor(LEVELS_Y / 2);
const CENTRE_COL = Math.floor(LEVELS_X / 2);

/**
 * Level ids in wall-grid order, closest to the centre first: level 0 sits at
 * the wall's centre (the only level unlocked at the start, same as
 * `centreBoardId` for boards), level 1 upward starts filling the ring right
 * around it, so "level 2, 3, ..." are always the levels physically next to
 * where the player is - not scattered across the wall the way a plain
 * row-major numbering (id = row * LEVELS_X + col) would put them. Ties within
 * a ring break by row then column, purely for a deterministic order.
 */
function buildLevelPositions(): GridPosition[] {
  const cells: GridPosition[] = [];
  for (let row = 0; row < LEVELS_Y; row += 1) {
    for (let col = 0; col < LEVELS_X; col += 1) {
      cells.push({ row, col });
    }
  }
  cells.sort((a, b) => {
    const distanceA = Math.max(Math.abs(a.row - CENTRE_ROW), Math.abs(a.col - CENTRE_COL));
    const distanceB = Math.max(Math.abs(b.row - CENTRE_ROW), Math.abs(b.col - CENTRE_COL));
    if (distanceA !== distanceB) return distanceA - distanceB;
    if (a.row !== b.row) return a.row - b.row;
    return a.col - b.col;
  });
  return cells;
}

export const LEVEL_POSITIONS: readonly GridPosition[] = buildLevelPositions();

/** Plain array, not a Map - `levelIdAt` runs inside a gesture worklet (see `levelsWall.ts`), and a captured Map doesn't cross that boundary the way a captured array/object does. */
const LEVEL_ID_AT_POSITION: number[] = new Array(LEVEL_COUNT);
LEVEL_POSITIONS.forEach((position, levelId) => {
  LEVEL_ID_AT_POSITION[position.row * LEVELS_X + position.col] = levelId;
});

export function levelPosition(levelId: number): GridPosition {
  'worklet';
  return LEVEL_POSITIONS[levelId];
}

/** The level at a grid cell, or `null` off the wall or on a cell with no level (shouldn't happen at `LEVEL_COUNT` cells for `LEVELS_X x LEVELS_Y`, but callers may still pass an out-of-range row/col). */
export function levelIdAt(row: number, col: number): number | null {
  'worklet';
  if (row < 0 || row >= LEVELS_Y || col < 0 || col >= LEVELS_X) return null;
  const levelId = LEVEL_ID_AT_POSITION[row * LEVELS_X + col];
  return levelId ?? null;
}
