import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import BoardScreen from '../src/screens/BoardScreen';

import { makeBoard } from './support/helpers';

// The Skia canvas needs a native surface, so the drawing layer is stubbed out.
// What is under test here is the HUD wiring. The swipe-and-pull maths lives in
// src/ui/trayGesture.ts and placement in the session, both tested directly.
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

/**
 * Render, give the board surface a size (nothing lays out on its own in the
 * test renderer), and wait for stored progress to load as the screen does.
 */
async function renderBoard(onExit: () => void = jest.fn()) {
  const utils = render(<BoardScreen board={board} onExit={onExit} />);
  fireEvent(screen.getByTestId('board-surface'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 600 } },
  });
  await waitFor(() => expect(screen.queryByTestId('board-loading')).toBeNull(), {
    timeout: 5000,
  });
  return utils;
}

describe('BoardScreen', () => {
  it('shows a swatch per unfinished colour with what the board still owes', async () => {
    await renderBoard();
    expect(screen.getByLabelText('Colour 1, 6 stones left')).toBeTruthy();
    expect(screen.getByLabelText('Colour 2, 6 stones left')).toBeTruthy();
  });

  it('starts with an empty tray and nothing in the air', async () => {
    await renderBoard();
    expect(screen.getByTestId('tray-label')).toHaveTextContent(/Pick a colour/);
    expect(screen.queryByTestId('airborne-strip')).toBeNull();
  });

  it('takes one stone by default when a colour is picked', async () => {
    await renderBoard();
    fireEvent.press(screen.getByTestId('color-1'));
    expect(screen.getByTestId('tray-label')).toHaveTextContent(/Colour 1/);
    expect(screen.getByTestId('tray-detail')).toHaveTextContent(/Taking 1 of 5/);
  });

  it('keeps the tray full rather than emptying it as stones are taken', async () => {
    await renderBoard();
    fireEvent.press(screen.getByTestId('color-1'));
    // All five stones stay drawn; the fill behind them is what shows the count.
    expect(screen.getByTestId('tray-stone-5')).toBeTruthy();
    expect(screen.getByTestId('tray-fill')).toBeTruthy();
  });

  it('swaps the tray over when another colour is picked', async () => {
    await renderBoard();
    fireEvent.press(screen.getByTestId('color-1'));
    fireEvent.press(screen.getByTestId('color-2'));
    expect(screen.getByTestId('tray-label')).toHaveTextContent(/Colour 2/);
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

  it('hands the board every pixel the surface has', async () => {
    await renderBoard();
    // The canvas takes the measured surface whole; the exit button and the
    // progress count float over it instead of taking a bar of their own.
    const canvas = screen.getByTestId('board-canvas');
    expect(canvas.props.width).toBe(390);
    expect(canvas.props.height).toBe(600);
    expect(screen.getByTestId('exit-board')).toBeTruthy();
  });
});
