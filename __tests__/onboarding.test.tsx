import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import React from 'react';

import BoardScreen from '../src/screens/BoardScreen';

import { makeBoard } from './support/helpers';

// Same reasoning as BoardScreen.test.tsx: the Skia canvas needs a native
// surface, so only the screen's own wiring is under test here.
jest.mock('../src/components/BoardCanvas', () => {
  const { View } = require('react-native');
  return {
    CELL: 24,
    BoardCanvas: (props: { width: number; height: number }) => (
      <View testID="board-canvas" {...props} />
    ),
  };
});

const board = makeBoard(['000000', '111111'], 'level-1/board-onboarding');

/**
 * Render and give every row the overlay measures a layout, since nothing
 * lays out on its own in the test renderer - `BoardScreen`'s onboarding
 * steps stay null (and the overlay never mounts) until both rows have one.
 */
async function renderBoard() {
  const utils = render(<BoardScreen board={board} />);
  fireEvent(screen.getByTestId('board-surface'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 500 } },
  });
  fireEvent(screen.getByTestId('color-picker-row'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 500, width: 390, height: 52 } },
  });
  fireEvent(screen.getByTestId('hud-tray-row'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 552, width: 390, height: 66 } },
  });
  await waitFor(() => expect(screen.queryByTestId('board-loading')).toBeNull(), { timeout: 5000 });
  return utils;
}

describe('onboarding overlay', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('shows the colour-picker step first, on a first-ever visit', async () => {
    await renderBoard();
    await waitFor(() => expect(screen.getByTestId('onboarding-overlay')).toBeTruthy(), { timeout: 5000 });
    const step = screen.getByTestId('onboarding-step-0');
    expect(within(step).getByText('Pick a colour')).toBeTruthy();
  });

  it('walks to the tray step on Next, then dismisses on Got it', async () => {
    await renderBoard();
    await waitFor(() => expect(screen.getByTestId('onboarding-overlay')).toBeTruthy(), { timeout: 5000 });

    fireEvent.press(screen.getByLabelText('Next'));
    const step = screen.getByTestId('onboarding-step-1');
    expect(within(step).getByText('Place the stones')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Got it'));
    expect(screen.queryByTestId('onboarding-overlay')).toBeNull();
  });

  it('dismisses immediately on Skip', async () => {
    await renderBoard();
    await waitFor(() => expect(screen.getByTestId('onboarding-overlay')).toBeTruthy(), { timeout: 5000 });

    fireEvent.press(screen.getByLabelText('Skip onboarding'));
    expect(screen.queryByTestId('onboarding-overlay')).toBeNull();
  });

  it('remembers a dismissal so it never shows again', async () => {
    const first = await renderBoard();
    await waitFor(() => expect(screen.getByTestId('onboarding-overlay')).toBeTruthy(), { timeout: 5000 });
    fireEvent.press(screen.getByLabelText('Skip onboarding'));

    expect(await AsyncStorage.getItem('gleam:onboarding:v1')).toBe('true');
    first.unmount();

    // renderBoard() already waits out the board's own loading state; give the
    // onboarding storage check the same beat before asserting it stayed off.
    await renderBoard();
    expect(screen.queryByTestId('onboarding-overlay')).toBeNull();
  });
});
