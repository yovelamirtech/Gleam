import { BOARDS_X, BOARDS_PER_LEVEL, LEVEL_COUNT, LEVELS_X } from '../src/constants/board';
import {
  boardStatus,
  centreBoardId,
  initialProgress,
  markBoardCompleted,
  unlockAll,
} from '../src/storage/progress';

describe('markBoardCompleted', () => {
  it('completes the board and unlocks its four neighbours', () => {
    // Row 2, col 4 of the 8x6 wall: interior, so all four neighbours exist.
    const interior = 2 * BOARDS_X + 4;
    const progress = markBoardCompleted(initialProgress(), 0, interior);

    expect(boardStatus(progress, 0, interior)).toBe('completed');
    expect(boardStatus(progress, 0, interior - BOARDS_X)).toBe('unlocked'); // up
    expect(boardStatus(progress, 0, interior + BOARDS_X)).toBe('unlocked'); // down
    expect(boardStatus(progress, 0, interior - 1)).toBe('unlocked'); // left
    expect(boardStatus(progress, 0, interior + 1)).toBe('unlocked'); // right
  });

  it('never unlocks past the edge of the board wall', () => {
    const progress = markBoardCompleted(initialProgress(), 0, 0);
    // Board 0 is the top-left corner: only right (1) and down (BOARDS_X) exist.
    expect(boardStatus(progress, 0, 1)).toBe('unlocked');
    expect(boardStatus(progress, 0, BOARDS_X)).toBe('unlocked');
  });

  it('does not relock an already-completed neighbour', () => {
    let progress = markBoardCompleted(initialProgress(), 0, 0);
    progress = markBoardCompleted(progress, 0, 1);
    expect(boardStatus(progress, 0, 0)).toBe('completed');
    expect(boardStatus(progress, 0, 1)).toBe('completed');
  });

  it('is a no-op when the board is already completed', () => {
    const once = markBoardCompleted(initialProgress(), 0, centreBoardId());
    const twice = markBoardCompleted(once, 0, centreBoardId());
    expect(twice).toEqual(once);
  });

  it('completes the level and unlocks neighbouring levels once every board is done', () => {
    let progress = initialProgress();
    for (let boardId = 0; boardId < BOARDS_PER_LEVEL; boardId += 1) {
      progress = markBoardCompleted(progress, 0, boardId);
    }

    expect(progress.levels[0].status).toBe('completed');
    expect(progress.levels[1]?.status).toBe('unlocked'); // right neighbour
    expect(progress.levels[LEVELS_X]?.status).toBe('unlocked'); // below neighbour
  });

  it('leaves the level unlocked, not completed, while any board is unfinished', () => {
    let progress = initialProgress();
    for (let boardId = 0; boardId < BOARDS_PER_LEVEL - 1; boardId += 1) {
      progress = markBoardCompleted(progress, 0, boardId);
    }
    expect(progress.levels[0].status).not.toBe('completed');
  });
});

describe('unlockAll (dev tool)', () => {
  it('unlocks every level and every board from a fresh start', () => {
    const unlocked = unlockAll(initialProgress());

    for (let levelId = 0; levelId < LEVEL_COUNT; levelId += 1) {
      expect(unlocked.levels[levelId].status).toBe('unlocked');
      for (let boardId = 0; boardId < BOARDS_PER_LEVEL; boardId += 1) {
        expect(boardStatus(unlocked, levelId, boardId)).toBe('unlocked');
      }
    }
  });

  it('leaves completed levels and boards completed, not merely unlocked', () => {
    let progress = initialProgress();
    for (let boardId = 0; boardId < BOARDS_PER_LEVEL; boardId += 1) {
      progress = markBoardCompleted(progress, 0, boardId);
    }

    const unlocked = unlockAll(progress);

    expect(unlocked.levels[0].status).toBe('completed');
    expect(boardStatus(unlocked, 0, 0)).toBe('completed');
  });
});
