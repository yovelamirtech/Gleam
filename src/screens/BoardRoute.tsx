import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useMemo } from 'react';

import { preparedLevelFor } from '../game/levels';
import { createPlaceholderBoard } from '../game/placeholderBoard';
import type { RootStackParamList } from '../navigation/types';
import { loadProgress, markBoardCompleted, saveProgress } from '../storage/progress';
import BoardScreen from './BoardScreen';

type Props = NativeStackScreenProps<RootStackParamList, 'Board'>;

/**
 * Adapter between the navigation stack and the board screen.
 *
 * The board screen takes board data, not route params, so that it stays
 * testable without a navigator. This turns the route into that data, and
 * turns a finished board into the unlock of its neighbours.
 */
export default function BoardRoute({ navigation, route }: Props) {
  const { levelId, boardId } = route.params;
  const board = useMemo(() => {
    const prepared = preparedLevelFor(levelId);
    return prepared
      ? prepared.getBoard(boardId)
      : createPlaceholderBoard(boardId, { levelId: `level-${levelId + 1}` });
  }, [levelId, boardId]);

  const handleComplete = useCallback(() => {
    loadProgress()
      .then((progress) => saveProgress(markBoardCompleted(progress, levelId, boardId)))
      .catch(() => {
        // A failed write just means the unlock is re-derived next time progress loads.
      });
  }, [levelId, boardId]);

  return (
    <BoardScreen board={board} onExit={() => navigation.goBack()} onComplete={handleComplete} />
  );
}
