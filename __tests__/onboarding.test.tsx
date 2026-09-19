import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import React from 'react';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

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
jest.mock('../src/components/StoneIcon', () => {
  const { View } = require('react-native');
  return {
    StoneIcon: (props: { hex: string; size: number }) => <View testID="stone-icon" {...props} />,
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

  it('advances past step 0 on its own once the player picks a colour', async () => {
    await renderBoard();
    await waitFor(() => expect(screen.getByTestId('onboarding-overlay')).toBeTruthy(), { timeout: 5000 });
    expect(screen.getByTestId('onboarding-step-0')).toBeTruthy();

    fireEvent.press(screen.getByTestId('color-1'));

    await waitFor(() => expect(screen.getByTestId('onboarding-step-1')).toBeTruthy());
  });

  it('dismisses itself once the player lifts a strip out of the tray', async () => {
    await renderBoard();
    await waitFor(() => expect(screen.getByTestId('onboarding-overlay')).toBeTruthy(), { timeout: 5000 });
    // Selecting a colour is required before anything can be lifted, and also
    // (per the test above) carries the overlay to step 1 on its own.
    fireEvent.press(screen.getByTestId('color-1'));
    await waitFor(() => expect(screen.getByTestId('onboarding-step-1')).toBeTruthy());

    await act(async () => {
      fireGestureHandler(getByGestureTestId('tray-pan'), [
        { state: State.BEGAN, x: 55, y: 20, absoluteX: 55, absoluteY: 700, translationY: 0 },
        { state: State.ACTIVE, x: 55, y: 20, absoluteX: 55, absoluteY: 700, translationY: 0 },
        { state: State.ACTIVE, x: 55, y: -60, absoluteX: 55, absoluteY: 620, translationY: -80 },
      ]);
      // The lift triggers a chain of updates - the strip lifting, then this
      // overlay's own effect reacting to it - that needs a couple of extra
      // ticks to fully settle before the resulting unmount is queryable.
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.queryByTestId('onboarding-overlay')).toBeNull();
  });

  it('dismisses immediately on Skip', async () => {
    await renderBoard();
    await waitFor(() => expect(screen.getByTestId('onboarding-overlay')).toBeTruthy(), { timeout: 5000 });

    fireEvent.press(screen.getByLabelText('Skip onboarding'));
    expect(screen.queryByTestId('onboarding-overlay')).toBeNull();
  });

  // Two full board renders back to back, each already waiting out its own
  // loading state - slower than jest's 5000ms default under a busy full
  // suite run, so this one gets more room.
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
  }, 15000);
});
