import AsyncStorage from '@react-native-async-storage/async-storage';

import { BOARDS_PER_LEVEL, LEVEL_COUNT } from '../constants/board';

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

/** Level 1 open, everything else locked until a neighbour is completed. */
export function initialProgress(): Progress {
  const levels: Record<number, LevelProgress> = {};
  for (let i = 0; i < LEVEL_COUNT; i += 1) {
    levels[i] = emptyLevel(i === 0 ? 'unlocked' : 'locked');
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

export function centreBoardId(): number {
  return Math.floor(BOARDS_PER_LEVEL / 2);
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

export async function resetProgress(): Promise<Progress> {
  const fresh = initialProgress();
  await saveProgress(fresh);
  return fresh;
}
