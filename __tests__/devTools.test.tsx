import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import BoardScreen from '../src/screens/BoardScreen';

import { makeBoard } from './support/helpers';

// Same reasoning as BoardScreen.test.tsx: the Skia canvas needs a native
// surface, so the drawing layer is stubbed out here too.
jest.mock('../src/components/BoardCanvas', () => {
  const { View } = require('react-native');
  return {
    CELL: 24,
    BoardCanvas: (props: { width: number; height: number; showSolution?: boolean }) => (
      <View testID="board-canvas" {...props} />
    ),
  };
});

// 0 0
// 1 1
const board = makeBoard(['00', '11'], 'level-1/board-devtools');

async function renderBoard() {
  const utils = render(<BoardScreen board={board} />);
  fireEvent(screen.getByTestId('board-surface'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 600 } },
  });
  await waitFor(() => expect(screen.queryByTestId('board-loading')).toBeNull(), { timeout: 5000 });
  return utils;
}

describe('dev tools panel on the board screen', () => {
  it('is collapsed until the toggle is pressed', async () => {
    await renderBoard();
    expect(screen.queryByTestId('dev-panel')).toBeNull();

    fireEvent.press(screen.getByTestId('dev-panel-toggle'));
    expect(screen.getByTestId('dev-panel')).toBeTruthy();

    fireEvent.press(screen.getByTestId('dev-panel-toggle'));
    expect(screen.queryByTestId('dev-panel')).toBeNull();
  });

  it('fills the whole board at once from instant complete', async () => {
    await renderBoard();
    fireEvent.press(screen.getByTestId('dev-panel-toggle'));

    fireEvent.press(screen.getByTestId('dev-instant-complete'));

    expect(screen.getByTestId('board-progress')).toHaveTextContent('4 / 4');
    expect(screen.getByTestId('board-complete')).toBeTruthy();
  });

  it('toggles the solution overlay and its own label', async () => {
    await renderBoard();
    fireEvent.press(screen.getByTestId('dev-panel-toggle'));

    expect(screen.getByTestId('board-canvas').props.showSolution).toBe(false);
    expect(screen.getByText('Show solution')).toBeTruthy();

    fireEvent.press(screen.getByTestId('dev-show-solution'));

    expect(screen.getByTestId('board-canvas').props.showSolution).toBe(true);
    expect(screen.getByText('Hide solution')).toBeTruthy();
  });
});
