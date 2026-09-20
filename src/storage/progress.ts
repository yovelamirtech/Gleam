import AsyncStorage from '@react-native-async-storage/async-storage';

import { BOARDS_PER_LEVEL, BOARDS_X, BOARDS_Y, LEVELS_X, LEVELS_Y, LEVEL_COUNT } from '../constants/board';

const STORAGE_KEY = 'gleam:progress:v1';

export type BoardStatus = 'locked' | 'unlocked' | 'completed';

/**
 * One stone the player placed. BUILD_PLAN.md needs the placement order kept,
 * not just the final picture, so the level-complete replay can redraw the
 * board in the order the player actually solved it.
 */
export type Placement = {
  cell: number;
  colorIndex: number;
  order: number;
};

export type BoardProgress = {
  status: BoardStatus;
  placements: Placement[];
};

export type LevelProgress = {
  status: BoardStatus;
  boards: Record<number, BoardProgress>;
};

export type Progress = {
  levels: Record<number, LevelProgress>;
  onboardingSeen: boolean;
};

function emptyLevel(status: BoardStatus): LevelProgress {
  return { status, boards: {} };
}

/** The wall's centre level starts open; everything else unlocks by neighbour. */
export function initialProgress(): Progress {
  const levels: Record<number, LevelProgress> = {};
  for (let i = 0; i < LEVEL_COUNT; i += 1) {
    levels[i] = emptyLevel(i === centreLevelId() ? 'unlocked' : 'locked');
  }
  return { levels, onboardingSeen: false };
}

export function boardStatus(progress: Progress, levelId: number, boardId: number): BoardStatus {
  const level = progress.levels[levelId];
  const stored = level?.boards[boardId]?.status;
  if (stored) return stored;
  // A level starts with its centre board open; neighbours unlock on completion.
  return boardId === centreBoardId() ? 'unlocked' : 'locked';
}

/**
 * The board wall's actual centre tile, by row and column - not
 * `floor(BOARDS_PER_LEVEL / 2)`, which for an 8-wide wall lands on the left
 * edge of the middle row (id 24 = row 3, col 0) rather than anywhere near
 * the middle column.
 */
export function centreBoardId(): number {
  const col = Math.floor(BOARDS_X / 2);
  const row = Math.floor(BOARDS_Y / 2);
  return row * BOARDS_X + col;
}

/** The levels wall's actual centre tile, same row/col math as `centreBoardId`. */
export function centreLevelId(): number {
  const col = Math.floor(LEVELS_X / 2);
  const row = Math.floor(LEVELS_Y / 2);
  return row * LEVELS_X + col;
}

export async function loadProgress(): Promise<Progress> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return initialProgress();
    return JSON.parse(raw) as Progress;
  } catch {
    return initialProgress();
  }
}

export async function saveProgress(progress: Progress): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

function statusOf(boards: Record<number, BoardProgress>, boardId: number): BoardStatus {
  return boards[boardId]?.status ?? (boardId === centreBoardId() ? 'unlocked' : 'locked');
}

function boardNeighbors(boardId: number): number[] {
  const col = boardId % BOARDS_X;
  const row = Math.floor(boardId / BOARDS_X);
  const neighbors: number[] = [];
  if (row > 0) neighbors.push(boardId - BOARDS_X);
  if (row < BOARDS_Y - 1) neighbors.push(boardId + BOARDS_X);
  if (col > 0) neighbors.push(boardId - 1);
  if (col < BOARDS_X - 1) neighbors.push(boardId + 1);
  return neighbors;
}

function levelNeighbors(levelId: number): number[] {
  const col = levelId % LEVELS_X;
  const row = Math.floor(levelId / LEVELS_X);
  const neighbors: number[] = [];
  if (row > 0) neighbors.push(levelId - LEVELS_X);
  if (row < LEVELS_Y - 1) neighbors.push(levelId + LEVELS_X);
  if (col > 0) neighbors.push(levelId - 1);
  if (col < LEVELS_X - 1) neighbors.push(levelId + 1);
  return neighbors;
}

/**
 * Finishing a board unlocks the boards touching it, and finishing the last
 * board of a level unlocks the levels touching that.
 */
export function markBoardCompleted(progress: Progress, levelId: number, boardId: number): Progress {
  const level = progress.levels[levelId] ?? emptyLevel('locked');
  if (statusOf(level.boards, boardId) === 'completed') return progress;

  const boards: Record<number, BoardProgress> = { ...level.boards };
  boards[boardId] = { status: 'completed', placements: boards[boardId]?.placements ?? [] };
  for (const neighbor of boardNeighbors(boardId)) {
    if (statusOf(boards, neighbor) === 'locked') {
      boards[neighbor] = { status: 'unlocked', placements: [] };
    }
  }

  const allBoardsDone = Array.from({ length: BOARDS_PER_LEVEL }, (_, id) => id).every(
    (id) => statusOf(boards, id) === 'completed'
  );
  const levelStatus: BoardStatus = allBoardsDone ? 'completed' : level.status;

  const levels: Record<number, LevelProgress> = {
    ...progress.levels,
    [levelId]: { status: levelStatus, boards },
  };

  if (allBoardsDone) {
    for (const neighbor of levelNeighbors(levelId)) {
      const neighborLevel = levels[neighbor] ?? emptyLevel('locked');
      if (neighborLevel.status === 'locked') {
        levels[neighbor] = { ...neighborLevel, status: 'unlocked' };
      }
    }
  }

  return { ...progress, levels };
}

/**
 * Dev tool: unlock every level and every board so any of them can be opened
 * and played, without touching anything already `completed` (that status,
 * and whatever placements back it, stays exactly as it was).
 */
export function unlockAll(progress: Progress): Progress {
  const levels: Record<number, LevelProgress> = {};
  for (let levelId = 0; levelId < LEVEL_COUNT; levelId += 1) {
    const level = progress.levels[levelId] ?? emptyLevel('locked');
    const boards: Record<number, BoardProgress> = { ...level.boards };
    for (let boardId = 0; boardId < BOARDS_PER_LEVEL; boardId += 1) {
      if (statusOf(boards, boardId) === 'locked') {
        boards[boardId] = { status: 'unlocked', placements: [] };
      }
    }
    levels[levelId] = {
      status: level.status === 'locked' ? 'unlocked' : level.status,
      boards,
    };
  }
  return { ...progress, levels };
}

export async function resetProgress(): Promise<Progress> {
  const fresh = initialProgress();
  await saveProgress(fresh);
  return fresh;
}
