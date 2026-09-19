import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { loadBoardProgress, saveBoardProgress } from '../game/persistence';
import { BoardSession } from '../game/session';
import type { BoardData } from '../game/types';

/** Milliseconds of quiet before progress is written back to AsyncStorage. */
const SAVE_DEBOUNCE_MS = 400;

export interface UseBoardSession {
  session: BoardSession;
  /** Increments on every mutation; pass it to memoised renderers. */
  revision: number;
  /** False until stored progress has been replayed into the session. */
  ready: boolean;
}

/**
 * Hold a BoardSession for the lifetime of a board, subscribe React to it, and
 * persist progress (placements and their order) as the player works.
 */
export function useBoardSession(board: BoardData): UseBoardSession {
  const sessionRef = useRef<BoardSession | null>(null);
  if (sessionRef.current === null || sessionRef.current.board.id !== board.id) {
    sessionRef.current = new BoardSession(board);
  }
  const session = sessionRef.current;

  const subscribe = useCallback((listener: () => void) => session.subscribe(listener), [session]);
  const revision = useSyncExternalStore(subscribe, session.getRevision, session.getRevision);

  const [ready, setReady] = useState(false);

  // Replay stored progress once per board, before the player can touch it.
  useEffect(() => {
    let cancelled = false;
    setReady(false);
    loadBoardProgress(board.id)
      .then((progress) => {
        if (cancelled) return;
        session.restoreProgress(progress);
      })
      .catch(() => {
        // No stored progress we can read: start the board clean.
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [board.id, session]);

  // Debounced write-back. Placement order is part of the payload, because the
  // level-complete replay redraws the board in the player's own order.
  useEffect(() => {
    if (!ready || revision === 0) return undefined;
    const timer = setTimeout(() => {
      saveBoardProgress(session.toProgress()).catch(() => {
        // A failed write just means this board resumes a little earlier next time.
      });
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [session, revision, ready]);

  return { session, revision, ready };
}
