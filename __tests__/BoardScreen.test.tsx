import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

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

// StoneIcon (the tray/airborne stone's own tiny Skia canvas) needs the same
// native surface BoardCanvas does, for the same reason.
jest.mock('../src/components/StoneIcon', () => {
  const { View } = require('react-native');
  return {
    StoneIcon: (props: { hex: string; size: number }) => <View testID="stone-icon" {...props} />,
  };
});

// 0 0 0 0 0 0
// 1 1 1 1 1 1
const board = makeBoard(['000000', '111111'], 'level-1/board-test');

/**
 * Render, give the board surface a size (nothing lays out on its own in the
 * test renderer), and wait for stored progress to load as the screen does.
 * The viewport is left unset - BoardScreen falls back to a fixed one now
 * that panning/zooming is driven by whatever wall hosts it - which is fine
 * here since none of these tests drop a strip successfully inside the canvas
 * bounds (only outside them, which does not depend on the viewport at all).
 */
async function renderBoard() {
  const utils = render(<BoardScreen board={board} />);
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

  it('keeps the airborne gesture handler mounted before anything is lifted', async () => {
    await renderBoard();
    // Stones appear mid-drag. Attaching a gesture handler while another gesture
    // is running takes the app down, so the empty strip has to be there already.
    expect(screen.getByTestId('airborne-strip-empty')).toBeTruthy();
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

  it('hands the board every pixel the surface has', async () => {
    await renderBoard();
    // The canvas takes the measured surface whole; the progress count floats
    // over it instead of taking a bar of its own.
    const canvas = screen.getByTestId('board-canvas');
    expect(canvas.props.width).toBe(390);
    expect(canvas.props.height).toBe(600);
  });
});

describe('dragging the tray', () => {
  /**
   * These drive the real pan handlers. A worklet that reaches across a module
   * boundary crashes on a device the moment the drag starts, and the only way
   * to catch that here is to actually run the gesture.
   */
  it('sizes the strip as the finger slides across the stones', async () => {
    await renderBoard();
    fireEvent.press(screen.getByTestId('color-1'));

    fireGestureHandler(getByGestureTestId('tray-pan'), [
      { state: State.BEGAN, x: 10, y: 20, absoluteX: 10, absoluteY: 700, translationY: 0 },
      { state: State.ACTIVE, x: 40, y: 20, absoluteX: 40, absoluteY: 700, translationY: 0 },
      { state: State.ACTIVE, x: 100, y: 20, absoluteX: 100, absoluteY: 700, translationY: 0 },
      { state: State.END, x: 100, y: 20, absoluteX: 100, absoluteY: 700, translationY: 0 },
    ]);

    await waitFor(() =>
      expect(screen.getByTestId('tray-detail')).toHaveTextContent(/Taking 3 of 5/)
    );
    // A sideways swipe alone never lifts anything.
    expect(screen.queryByTestId('airborne-strip')).toBeNull();
  });

  it('lifts the stones into the air on an upward pull', async () => {
    await renderBoard();
    fireEvent.press(screen.getByTestId('color-1'));

    fireGestureHandler(getByGestureTestId('tray-pan'), [
      { state: State.BEGAN, x: 55, y: 20, absoluteX: 55, absoluteY: 700, translationY: 0 },
      { state: State.ACTIVE, x: 55, y: 20, absoluteX: 55, absoluteY: 700, translationY: 0 },
      { state: State.ACTIVE, x: 55, y: -60, absoluteX: 55, absoluteY: 620, translationY: -80 },
    ]);

    await waitFor(() => expect(screen.getByTestId('airborne-strip')).toBeTruthy());
  });

  it('leaves the stones hanging where a drop did not fit', async () => {
    await renderBoard();
    fireEvent.press(screen.getByTestId('color-1'));

    fireGestureHandler(getByGestureTestId('tray-pan'), [
      { state: State.BEGAN, x: 55, y: 20, absoluteX: 55, absoluteY: 700, translationY: 0 },
      { state: State.ACTIVE, x: 55, y: 20, absoluteX: 55, absoluteY: 700, translationY: 0 },
      { state: State.ACTIVE, x: 55, y: -60, absoluteX: 55, absoluteY: 620, translationY: -80 },
      // Released over the HUD, which is not the board.
      { state: State.END, x: 55, y: -60, absoluteX: 55, absoluteY: 620, translationY: -80 },
    ]);

    await waitFor(() => expect(screen.getByTestId('airborne-strip')).toBeTruthy());
    expect(screen.getByTestId('board-progress')).toHaveTextContent('0 / 12');
  });

  it('keeps stones already in the air instead of losing them to a fresh tray touch', async () => {
    await renderBoard();
    fireEvent.press(screen.getByTestId('color-1'));

    // Lift the stones, then drop them somewhere that doesn't fit (over the
    // HUD) - identical to "leaves the stones hanging" above.
    fireGestureHandler(getByGestureTestId('tray-pan'), [
      { state: State.BEGAN, x: 55, y: 20, absoluteX: 55, absoluteY: 700, translationY: 0 },
      { state: State.ACTIVE, x: 55, y: 20, absoluteX: 55, absoluteY: 700, translationY: 0 },
      { state: State.ACTIVE, x: 55, y: -60, absoluteX: 55, absoluteY: 620, translationY: -80 },
      { state: State.END, x: 55, y: -60, absoluteX: 55, absoluteY: 620, translationY: -80 },
    ]);
    await waitFor(() => expect(screen.getByTestId('airborne-strip')).toBeTruthy());
    const detailBefore = screen.getByTestId('tray-detail').props.children;

    // Touching the tray again - as if reaching to take a stone - used to
    // silently overwrite the strip still hanging in the air with a fresh one.
    fireGestureHandler(getByGestureTestId('tray-pan'), [
      { state: State.BEGAN, x: 10, y: 20, absoluteX: 10, absoluteY: 700, translationY: 0 },
      { state: State.ACTIVE, x: 10, y: -60, absoluteX: 10, absoluteY: 620, translationY: -80 },
      { state: State.END, x: 10, y: -60, absoluteX: 10, absoluteY: 620, translationY: -80 },
    ]);

    // Nothing changed: still airborne, still the same count as before.
    expect(screen.getByTestId('airborne-strip')).toBeTruthy();
    expect(screen.getByTestId('tray-detail').props.children).toEqual(detailBefore);
    expect(screen.getByTestId('board-progress')).toHaveTextContent('0 / 12');
  });

  it('places nothing when the finger never pulled up', async () => {
    await renderBoard();
    fireEvent.press(screen.getByTestId('color-1'));

    fireGestureHandler(getByGestureTestId('tray-pan'), [
      { state: State.BEGAN, x: 10, y: 20, absoluteX: 10, absoluteY: 700, translationY: 0 },
      { state: State.ACTIVE, x: 80, y: 22, absoluteX: 80, absoluteY: 702, translationY: 2 },
      { state: State.ACTIVE, x: 200, y: 24, absoluteX: 200, absoluteY: 704, translationY: 4 },
      { state: State.END, x: 200, y: 24, absoluteX: 200, absoluteY: 704, translationY: 4 },
    ]);

    await waitFor(() =>
      expect(screen.getByTestId('tray-detail')).toHaveTextContent(/Taking 5 of 5/)
    );
    expect(screen.queryByTestId('airborne-strip')).toBeNull();
    expect(screen.getByTestId('board-progress')).toHaveTextContent('0 / 12');
  });
});

/** Orientation the airborne stones are laid out in right now. */
function airborneDirection(): string {
  return StyleSheet.flatten(screen.getByTestId('airborne-strip').props.style).flexDirection;
}

describe('the stones in the air', () => {
  async function lift() {
    await renderBoard();
    fireEvent.press(screen.getByTestId('color-1'));
    fireGestureHandler(getByGestureTestId('tray-pan'), [
      { state: State.BEGAN, x: 55, y: 20, absoluteX: 55, absoluteY: 700, translationY: 0 },
      { state: State.ACTIVE, x: 55, y: 20, absoluteX: 55, absoluteY: 700, translationY: 0 },
      { state: State.ACTIVE, x: 55, y: -60, absoluteX: 55, absoluteY: 620, translationY: -80 },
      { state: State.END, x: 55, y: -60, absoluteX: 55, absoluteY: 620, translationY: -80 },
    ]);
    await waitFor(() => expect(screen.getByTestId('airborne-strip')).toBeTruthy());
  }

  it('can be dragged again without crashing', async () => {
    await lift();
    fireGestureHandler(getByGestureTestId('airborne-pan'), [
      { state: State.BEGAN, changeX: 0, changeY: 0 },
      { state: State.ACTIVE, changeX: -20, changeY: -40 },
      { state: State.ACTIVE, changeX: -20, changeY: -40 },
      { state: State.END, changeX: 0, changeY: 0 },
    ]);
    await waitFor(() => expect(screen.getByTestId('airborne-strip')).toBeTruthy());
  });

  it('rotates on a tap and stays in the air', async () => {
    await lift();
    expect(airborneDirection()).toBe('row');
    fireGestureHandler(getByGestureTestId('airborne-tap'), [
      { state: State.BEGAN },
      { state: State.ACTIVE },
      { state: State.END },
    ]);
    await waitFor(() => expect(airborneDirection()).toBe('column'));
  });
});
