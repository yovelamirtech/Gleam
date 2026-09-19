import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo } from 'react';

import { createPlaceholderBoard } from '../game/placeholderBoard';
import type { RootStackParamList } from '../navigation/types';
import BoardScreen from './BoardScreen';

type Props = NativeStackScreenProps<RootStackParamList, 'Board'>;

/**
 * Adapter between the navigation stack and the board screen.
 *
 * The board screen takes board data, not route params, so that it stays
 * testable without a navigator. This turns the route into that data. The board
 * is still generated rather than read from `assets/levels/`; loading the real
 * level JSON is the next step.
 */
export default function BoardRoute({ navigation, route }: Props) {
  const { levelId, boardId } = route.params;
  const board = useMemo(
    () => createPlaceholderBoard(boardId, { levelId: `level-${levelId + 1}` }),
    [levelId, boardId]
  );

  return <BoardScreen board={board} onExit={() => navigation.goBack()} />;
}
