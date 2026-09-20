import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import LevelsScreen from '../src/screens/LevelsScreen';
import { LEVEL_TILE } from '../src/ui/levelsWall';
import { centreLevelId } from '../src/storage/progress';

// useFocusEffect needs a real NavigationContainer just to read "is this
// screen focused" - not what's under test here, so it's stubbed to behave
// like a plain effect that always fires (screen is always "focused").
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (effect: () => void) => require('react').useEffect(effect, []),
}));

const navigation = { goBack: jest.fn(), navigate: jest.fn() } as unknown as never;

async function renderWall() {
  const utils = render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      {/* @ts-expect-error - a plain stub is enough for a screen that only calls navigate */}
      <LevelsScreen navigation={navigation} route={{}} />
    </SafeAreaProvider>
  );
  fireEvent(screen.getByTestId('levels-wall'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 600 } },
  });
  // Progress loads asynchronously (AsyncStorage); wait for the centre tile,
  // which only renders unlocked once that resolves.
  await waitFor(() => expect(screen.getByTestId(`level-tile-${centreLevelId()}`)).toBeTruthy());
  return utils;
}

function tapAt(x: number, y: number) {
  fireGestureHandler(getByGestureTestId('levels-wall-tap'), [
    { state: State.BEGAN, x, y },
    { state: State.END, x, y },
  ]);
}

describe('LevelsScreen (unified wall)', () => {
  it('renders every level as a tile on one wall', async () => {
    await renderWall();
    for (let levelId = 0; levelId < 20; levelId += 1) {
      expect(screen.getByTestId(`level-tile-${levelId}`)).toBeTruthy();
    }
  });

  it('starts with only the centre level unlocked', async () => {
    await renderWall();
    // The centre tile shows its own number, not a lock.
    expect(screen.getByText(String(centreLevelId() + 1))).toBeTruthy();
    // A corner tile (id 0) is locked.
    const lockIcons = screen.getAllByText('🔒');
    expect(lockIcons.length).toBe(19);
  });

  it('navigates to the boards wall when an unlocked tile is tapped', async () => {
    (navigation as unknown as { navigate: jest.Mock }).navigate.mockClear();
    await renderWall();
    // Fit-to-screen at 390x600 over a 800x1000 wall (4x200 by 5x200) starts
    // scaled down; tap in the centre of the screen, which the initial fit
    // viewport centres on the wall's own centre - the unlocked tile.
    tapAt(195, 300);
    await waitFor(() =>
      expect((navigation as unknown as { navigate: jest.Mock }).navigate).toHaveBeenCalledWith(
        'Boards',
        { levelId: centreLevelId() }
      )
    );
  });

  it('does nothing when a locked tile is tapped', async () => {
    (navigation as unknown as { navigate: jest.Mock }).navigate.mockClear();
    await renderWall();
    // Screen point over the middle of level 0's tile (wall-space 100,100),
    // through the same fit-to-screen viewport as the centre-tile test above.
    // Locked at a fresh start.
    tapAt(49, 105);
    expect((navigation as unknown as { navigate: jest.Mock }).navigate).not.toHaveBeenCalled();
  });
});

// Sanity check that the tile size constant this suite reasons about in
// comments matches the real layout module, so the geometry above stays true
// if LEVEL_TILE is ever changed.
it('LEVEL_TILE is 200', () => {
  expect(LEVEL_TILE).toBe(200);
});
