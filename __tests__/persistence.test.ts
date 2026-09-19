import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  clearBoardProgress,
  loadBoardProgress,
  parseProgress,
  progressKey,
  saveBoardProgress,
} from '../src/game/persistence';
import { BoardSession } from '../src/game/session';

import { makeBoard, take } from './support/helpers';

const board = makeBoard(['0011', '0011'], 'level-1/board-0');

function played(): BoardSession {
  const session = new BoardSession(board);
  take(session, 0, 2, 'vertical');
  session.place(0, 1, 111);
  take(session, 1, 2);
  session.place(0, 2, 222);
  return session;
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('storage keys', () => {
  it('namespaces a board under its id', () => {
    expect(progressKey('level-1/board-0')).toBe('gleam:board:level-1/board-0');
  });
});

describe('round trip', () => {
  it('saves and reloads the placements with their order intact', async () => {
    const session = played();
    await saveBoardProgress(session.toProgress());

    const loaded = await loadBoardProgress(board.id);
    expect(loaded?.placements.map((p) => [p.cell, p.order, p.at])).toEqual([
      [1, 0, 111],
      [5, 1, 111],
      [2, 2, 222],
      [3, 3, 222],
    ]);
  });

  it('rebuilds a session that matches the one that was saved', async () => {
    const session = played();
    await saveBoardProgress(session.toProgress());

    const restored = BoardSession.fromProgress(board, await loadBoardProgress(board.id));
    expect(restored.stonesPlaced).toBe(session.stonesPlaced);
    expect(restored.placements).toEqual(session.placements);
    expect(restored.remainingFor(0)).toBe(session.remainingFor(0));
    expect(restored.cellAt(0, 1).order).toBe(0);
  });

  it('returns null for a board that was never played', async () => {
    expect(await loadBoardProgress('level-9/board-9')).toBeNull();
  });

  it('forgets a board when its progress is cleared', async () => {
    await saveBoardProgress(played().toProgress());
    await clearBoardProgress(board.id);
    expect(await loadBoardProgress(board.id)).toBeNull();
  });
});

describe('parseProgress', () => {
  it('rejects junk rather than throwing', () => {
    expect(parseProgress(null, board.id)).toBeNull();
    expect(parseProgress('not json', board.id)).toBeNull();
    expect(parseProgress('[]', board.id)).toBeNull();
    expect(parseProgress('{"version":2,"boardId":"level-1/board-0","placements":[]}', board.id)).toBeNull();
  });

  it('rejects a payload saved for a different board', () => {
    const raw = JSON.stringify({ version: 1, boardId: 'level-2/board-5', placements: [] });
    expect(parseProgress(raw, board.id)).toBeNull();
  });

  it('drops malformed placements and keeps the rest in order', () => {
    const raw = JSON.stringify({
      version: 1,
      boardId: board.id,
      placements: [
        { cell: 5, color: 0, order: 1, at: 2 },
        { cell: 'nope', color: 0, order: 0, at: 1 },
        { cell: 1, color: 0, order: 0, at: 1 },
      ],
    });
    expect(parseProgress(raw, board.id)?.placements.map((p) => p.cell)).toEqual([1, 5]);
  });
});

describe('restoring into a session', () => {
  it('skips placements that no longer match the board', () => {
    const session = new BoardSession(board);
    const restored = session.restoreProgress({
      version: 1,
      boardId: board.id,
      placements: [
        { cell: 0, color: 0, order: 0, at: 1 }, // fine
        { cell: 0, color: 0, order: 1, at: 2 }, // duplicate cell
        { cell: 2, color: 0, order: 2, at: 3 }, // cell 2 wants colour 1
        { cell: 99, color: 0, order: 3, at: 4 }, // off the board
      ],
    });
    expect(restored).toBe(1);
    expect(session.stonesPlaced).toBe(1);
    expect(session.remainingFor(0)).toBe(3);
  });

  it('renumbers restored stones so the order stays gap-free', () => {
    const session = new BoardSession(board);
    session.restoreProgress({
      version: 1,
      boardId: board.id,
      placements: [
        { cell: 4, color: 0, order: 40, at: 1 },
        { cell: 0, color: 0, order: 10, at: 2 },
      ],
    });
    // Sorted by stored order: cell 0 went down first.
    expect(session.placements.map((p) => [p.cell, p.order])).toEqual([
      [0, 0],
      [4, 1],
    ]);
  });

  it('ignores progress belonging to another board', () => {
    const session = new BoardSession(board);
    expect(
      session.restoreProgress({ version: 1, boardId: 'other', placements: [{ cell: 0, color: 0, order: 0, at: 1 }] })
    ).toBe(0);
    expect(session.restoreProgress(null)).toBe(0);
  });
});
