import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import BoardScreen from '../src/screens/BoardScreen';

import { makeBoard } from './support/helpers';

// The Skia canvas needs a native surface, so the drawing layer is stubbed out.
// What is under test here is the HUD wiring: picking a colour, sizing the
// strip, rotating it. Placement itself is covered by the session tests.
jest.mock('../src/components/BoardCanvas', () => {
  const { View } = require('react-native');
  return {
    CELL: 24,
    BoardCanvas: (props: { width: number; height: number }) => (
      <View testID="board-canvas" {...props} />
    ),
  };
});

// 0 0 0 0 0 0
// 1 1 1 1 1 1
const board = makeBoard(['000000', '111111'], 'level-1/board-test');

/** Render and wait for stored progress to finish loading, as the screen does. */
async function renderBoard(onExit: () => void = jest.fn()) {
  const utils = render(<BoardScreen board={board} onExit={onExit} />);
  await waitFor(() => expect(screen.queryByTestId('board-loading')).toBeNull());
  return utils;
}

describe('BoardScreen', () => {
  it('shows a swatch per unfinished colour with what the board still owes', async () => {
    await renderBoard();
    expect(screen.getByLabelText('Colour 1, 6 stones left')).toBeTruthy();
    expect(screen.getByLabelText('Colour 2, 6 stones left')).toBeTruthy();
  });

  it('starts with an empty tray', async () => {
    await renderBoard();
    expect(screen.getByTestId('tray-label')).toHaveTextContent('Pick a colour');
  });

  it('fills the tray from board supply when a colour is picked', async () => {
    await renderBoard();
    fireEvent.press(screen.getByTestId('color-1'));
    expect(screen.getByTestId('tray-label')).toHaveTextContent('Colour 1');
    expect(screen.getByText(/5 stones · horizontal · 6 left/)).toBeTruthy();
  });

  it('trims the strip to the tapped tray slot', async () => {
    await renderBoard();
    fireEvent.press(screen.getByTestId('color-1'));
    fireEvent.press(screen.getByTestId('tray-slot-2'));
    expect(screen.getByText(/2 stones · horizontal/)).toBeTruthy();
  });

  it('takes a single stone from the first slot', async () => {
    await renderBoard();
    fireEvent.press(screen.getByTestId('color-1'));
    fireEvent.press(screen.getByTestId('tray-slot-1'));
    expect(screen.getByText(/1 stone · horizontal/)).toBeTruthy();
  });

  it('swaps the tray over when another colour is picked', async () => {
    await renderBoard();
    fireEvent.press(screen.getByTestId('color-1'));
    fireEvent.press(screen.getByTestId('color-2'));
    expect(screen.getByTestId('tray-label')).toHaveTextContent('Colour 2');
  });

  it('counts progress against the whole board', async () => {
    await renderBoard();
    expect(screen.getByTestId('board-progress')).toHaveTextContent('0 / 12');
  });

  it('offers a way back out of the board mid-game', async () => {
    const onExit = jest.fn();
    await renderBoard(onExit);
    fireEvent.press(screen.getByTestId('exit-board'));
    expect(onExit).toHaveBeenCalled();
  });
});
