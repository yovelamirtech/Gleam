import { BOARD_CELLS_X, BOARD_CELLS_Y, BOARDS_PER_LEVEL, CELLS_PER_BOARD } from '../src/constants/board';
import { PREPARED_LEVELS, preparedLevelFor } from '../src/game/levels';

describe('PREPARED_LEVELS', () => {
  it.each(PREPARED_LEVELS.map((level) => [level.id, level] as const))(
    '%s: every board reads at full size with a shared palette',
    (_id, level) => {
      const first = level.getBoard(0);
      expect(first.width).toBe(BOARD_CELLS_X);
      expect(first.height).toBe(BOARD_CELLS_Y);
      expect(first.cells).toHaveLength(CELLS_PER_BOARD);
      expect(first.palette.length).toBeGreaterThan(0);

      const ids = new Set(
        Array.from({ length: BOARDS_PER_LEVEL }, (_, boardId) => level.getBoard(boardId).id)
      );
      expect(ids.size).toBe(BOARDS_PER_LEVEL);

      for (const cell of first.cells) {
        expect(cell).toBeGreaterThanOrEqual(0);
        expect(cell).toBeLessThan(first.palette.length);
      }
    }
  );

  it('gives every prepared level a distinct id', () => {
    const ids = new Set(PREPARED_LEVELS.map((level) => level.id));
    expect(ids.size).toBe(PREPARED_LEVELS.length);
  });

  it('preparedLevelFor looks levels up by their position on the wall', () => {
    expect(preparedLevelFor(0)?.id).toBe('sample-lagoon');
    expect(preparedLevelFor(PREPARED_LEVELS.length - 1)?.id).toBe(
      PREPARED_LEVELS[PREPARED_LEVELS.length - 1].id
    );
  });

  it('falls back to undefined past the prepared levels', () => {
    expect(preparedLevelFor(PREPARED_LEVELS.length)).toBeUndefined();
  });
});
