import AsyncStorage from '@react-native-async-storage/async-storage';

import type { BoardProgress, Placement } from './types';

const KEY_PREFIX = 'gleam:board:';

export function progressKey(boardId: string): string {
  return `${KEY_PREFIX}${boardId}`;
}

function isPlacement(value: unknown): value is Placement {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    Number.isInteger(candidate.cell) &&
    Number.isInteger(candidate.color) &&
    Number.isInteger(candidate.order) &&
    typeof candidate.at === 'number'
  );
}

/** Parse a stored payload, returning null for anything we do not recognise. */
export function parseProgress(raw: string | null, boardId: string): BoardProgress | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const candidate = parsed as Record<string, unknown>;
  if (candidate.version !== 1) return null;
  if (candidate.boardId !== boardId) return null;
  if (!Array.isArray(candidate.placements)) return null;
  const placements = candidate.placements.filter(isPlacement);
  return { version: 1, boardId, placements: placements.sort((a, b) => a.order - b.order) };
}

export async function loadBoardProgress(boardId: string): Promise<BoardProgress | null> {
  try {
    return parseProgress(await AsyncStorage.getItem(progressKey(boardId)), boardId);
  } catch {
    return null;
  }
}

export async function saveBoardProgress(progress: BoardProgress): Promise<void> {
  await AsyncStorage.setItem(progressKey(progress.boardId), JSON.stringify(progress));
}

export async function clearBoardProgress(boardId: string): Promise<void> {
  await AsyncStorage.removeItem(progressKey(boardId));
}
