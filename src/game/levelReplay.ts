import { BOARDS_X, BOARD_CELLS_X, BOARD_CELLS_Y, LEVEL_CELLS_X } from '../constants/board';
import { loadBoardProgress } from './persistence';
import type { Placement } from './types';

/** One board's own placements, keyed by its position (0-based) on the level's 8x6 wall. */
export interface LevelBoardPlacements {
  boardId: number;
  placements: readonly Placement[];
}

/**
 * A board's local cell index, placed at its position on the wall, becomes a
 * cell index into the whole level's `LEVEL_CELLS_X x LEVEL_CELLS_Y` grid.
 */
export function globalCellIndex(boardId: number, localCell: number): number {
  const boardCol = boardId % BOARDS_X;
  const boardRow = Math.floor(boardId / BOARDS_X);
  const localCol = localCell % BOARD_CELLS_X;
  const localRow = Math.floor(localCell / BOARD_CELLS_X);
  const globalCol = boardCol * BOARD_CELLS_X + localCol;
  const globalRow = boardRow * BOARD_CELLS_Y + localRow;
  return globalRow * LEVEL_CELLS_X + globalCol;
}

/**
 * Merge every board's own placement order into one order for the whole
 * level, for the level-complete replay (BUILD_PLAN.md). A board's `order` is
 * only local to it, but `at` is a real wall-clock timestamp shared across
 * every board, so sorting by `at` (falling back to the local order on a tie)
 * gives the level a single, real solving order. `cell` is remapped to the
 * whole level's grid so the result can be fed straight into
 * `replayForward`/`replayReverse`/`replaySlice` from `./replay`.
 */
export function mergeLevelPlacements(entries: readonly LevelBoardPlacements[]): Placement[] {
  const flat: Placement[] = [];
  for (const { boardId, placements } of entries) {
    for (const placement of placements) {
      flat.push({ ...placement, cell: globalCellIndex(boardId, placement.cell) });
    }
  }
  flat.sort((a, b) => a.at - b.at || a.order - b.order);
  return flat.map((placement, index) => ({ ...placement, order: index }));
}

/**
 * Reads every one of a level's 48 boards' saved progress and merges it into
 * one level-wide placement order. `boardIds` must be in wall order (index 0
 * is the top-left board, same as `BoardRoute`'s `boardId` route param) and
 * hold the same ids `game/persistence.ts` saved each board's progress under.
 */
export async function loadLevelPlacements(boardIds: readonly string[]): Promise<Placement[]> {
  const entries = await Promise.all(
    boardIds.map(async (boardId, index): Promise<LevelBoardPlacements> => {
      const progress = await loadBoardProgress(boardId);
      return { boardId: index, placements: progress?.placements ?? [] };
    })
  );
  return mergeLevelPlacements(entries);
}
