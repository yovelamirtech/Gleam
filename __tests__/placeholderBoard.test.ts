import { BOARD_SIZE } from '../src/game/geometry';
import { DEFAULT_PALETTE_SIZE } from '../src/game/palette';
import { createPlaceholderBoard } from '../src/game/placeholderBoard';
import { BoardSession } from '../src/game/session';

describe('createPlaceholderBoard', () => {
  it('produces a 40x40 board with a full palette', () => {
    const board = createPlaceholderBoard(0);
    expect(board.width).toBe(BOARD_SIZE);
    expect(board.height).toBe(BOARD_SIZE);
    expect(board.cells).toHaveLength(BOARD_SIZE * BOARD_SIZE);
    expect(board.palette).toHaveLength(DEFAULT_PALETTE_SIZE);
  });

  it('names boards by level and index, the way the prep script will', () => {
    expect(createPlaceholderBoard(27).id).toBe('level-1/board-27');
    expect(createPlaceholderBoard(3, { levelId: 'level-4' }).id).toBe('level-4/board-3');
  });

  it('is deterministic, so a board looks the same every time it is opened', () => {
    expect(createPlaceholderBoard(5).cells).toEqual(createPlaceholderBoard(5).cells);
  });

  it('gives neighbouring boards different content', () => {
    expect(createPlaceholderBoard(0).cells).not.toEqual(createPlaceholderBoard(1).cells);
  });

  it('keeps every cell inside the palette', () => {
    const board = createPlaceholderBoard(11);
    for (const color of board.cells) {
      expect(color).toBeGreaterThanOrEqual(0);
      expect(color).toBeLessThan(board.palette.length);
    }
  });

  it('draws contiguous regions, not noise, so strips of stones are placeable', () => {
    const board = createPlaceholderBoard(0);
    let runsOfAtLeastFive = 0;
    for (let row = 0; row < board.height; row += 1) {
      let run = 1;
      for (let col = 1; col < board.width; col += 1) {
        const same = board.cells[row * board.width + col] === board.cells[row * board.width + col - 1];
        run = same ? run + 1 : 1;
        if (run === 5) runsOfAtLeastFive += 1;
      }
    }
    expect(runsOfAtLeastFive).toBeGreaterThan(10);
  });

  it('builds a session whose supply is exactly the board', () => {
    const board = createPlaceholderBoard(0);
    const session = new BoardSession(board);
    const total = board.palette.reduce((sum, entry) => sum + session.requiredFor(entry.index), 0);
    expect(total).toBe(board.cells.length);
  });
});
