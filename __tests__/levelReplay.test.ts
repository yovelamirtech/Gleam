import { BOARD_CELLS_X, LEVEL_CELLS_X } from '../src/constants/board';
import {
  globalCellIndex,
  loadLevelPlacements,
  mergeLevelPlacements,
  type LevelBoardPlacements,
} from '../src/game/levelReplay';
import { saveBoardProgress } from '../src/game/persistence';
import type { Placement } from '../src/game/types';

function placement(cell: number, order: number, at: number): Placement {
  return { cell, color: 0, order, at };
}

describe('globalCellIndex', () => {
  it('keeps board 0 at the top-left of the level grid', () => {
    expect(globalCellIndex(0, 0)).toBe(0);
    expect(globalCellIndex(0, 1)).toBe(1);
    expect(globalCellIndex(0, BOARD_CELLS_X)).toBe(LEVEL_CELLS_X); // one row down
  });

  it('offsets a board by its column and row on the 8x6 wall', () => {
    // Board 1 is one column right of board 0.
    expect(globalCellIndex(1, 0)).toBe(BOARD_CELLS_X);
    // Board 8 (BOARDS_X=8) is one row below board 0.
    expect(globalCellIndex(8, 0)).toBe(LEVEL_CELLS_X * BOARD_CELLS_X);
  });
});

describe('mergeLevelPlacements', () => {
  it('orders placements from every board by real time, not by board', () => {
    const entries: LevelBoardPlacements[] = [
      { boardId: 0, placements: [placement(0, 0, 2000), placement(1, 1, 4000)] },
      { boardId: 1, placements: [placement(0, 0, 1000), placement(1, 1, 3000)] },
    ];
    const merged = mergeLevelPlacements(entries);
    // Chronological: board1/cell0@1000, board0/cell0@2000, board1/cell1@3000, board0/cell1@4000.
    expect(merged.map((p) => p.cell)).toEqual([
      globalCellIndex(1, 0),
      globalCellIndex(0, 0),
      globalCellIndex(1, 1),
      globalCellIndex(0, 1),
    ]);
  });

  it('reassigns a single gap-free order across the whole merge', () => {
    const entries: LevelBoardPlacements[] = [
      { boardId: 0, placements: [placement(0, 0, 500), placement(1, 1, 600)] },
      { boardId: 2, placements: [placement(0, 0, 700)] },
    ];
    expect(mergeLevelPlacements(entries).map((p) => p.order)).toEqual([0, 1, 2]);
  });

  it('breaks a timestamp tie with the local order', () => {
    const entries: LevelBoardPlacements[] = [
      { boardId: 0, placements: [placement(5, 1, 1000), placement(4, 0, 1000)] },
    ];
    expect(mergeLevelPlacements(entries).map((p) => p.cell)).toEqual([
      globalCellIndex(0, 4),
      globalCellIndex(0, 5),
    ]);
  });

  it('returns nothing for a level with no saved progress', () => {
    expect(mergeLevelPlacements([{ boardId: 0, placements: [] }])).toEqual([]);
  });
});

describe('loadLevelPlacements', () => {
  it('reads every board and merges them in wall order', async () => {
    await saveBoardProgress({
      version: 1,
      boardId: 'sample-lagoon/board-0',
      placements: [placement(0, 0, 2000)],
    });
    await saveBoardProgress({
      version: 1,
      boardId: 'sample-lagoon/board-1',
      placements: [placement(0, 0, 1000)],
    });

    const boardIds = ['sample-lagoon/board-0', 'sample-lagoon/board-1'];
    const merged = await loadLevelPlacements(boardIds);

    expect(merged).toHaveLength(2);
    expect(merged[0].cell).toBe(globalCellIndex(1, 0)); // board-1 placed first, at 1000
    expect(merged[1].cell).toBe(globalCellIndex(0, 0));
    expect(merged.map((p) => p.order)).toEqual([0, 1]);
  });

  it('treats a board with nothing saved as having placed nothing', async () => {
    const merged = await loadLevelPlacements(['no-such-board/board-9']);
    expect(merged).toEqual([]);
  });
});
