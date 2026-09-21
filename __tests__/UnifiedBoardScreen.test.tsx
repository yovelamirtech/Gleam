import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BOARDS_PER_LEVEL } from '../src/constants/board';
import UnifiedBoardScreen from '../src/screens/UnifiedBoardScreen';

// useFocusEffect needs a real NavigationContainer just to read "is this
// screen focused" - same stub LevelsScreen.test.tsx uses.
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useFocusEffect: (effect: () => void) => require('react').useEffect(effect, []),
}));

// The wall's own grid overlay is a Skia canvas too, same reasoning as BoardCanvas below.
jest.mock('../src/components/WallGridCanvas', () => {
  const { View } = require('react-native');
  return {
    WallGridCanvas: (props: { width: number; height: number }) => (
      <View testID="wall-grid-canvas" {...props} />
    ),
  };
});
// The Skia canvas needs a native surface, same reasoning as BoardScreen.test.tsx.
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

const navigation = { navigate: jest.fn(), replace: jest.fn(), goBack: jest.fn() };

// A level id past PREPARED_LEVELS.length (7 today) has no prepared artwork,
// so every tile is the plain placeholder look - deterministic either way.
const UNPREPARED_LEVEL_ID = 19;

async function renderWall(params: { levelId: number; boardId?: number } = { levelId: UNPREPARED_LEVEL_ID }) {
  const utils = render(
    <SafeAreaProvider
      initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}
    >
      {/* @ts-expect-error - a plain stub is enough for a screen that only calls navigate/replace */}
      <UnifiedBoardScreen navigation={navigation} route={{ params }} />
    </SafeAreaProvider>
  );
  fireEvent(screen.getByTestId('board-wall'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 800 } },
  });
  await act(async () => {
    await Promise.resolve();
  });
  return utils;
}

describe('UnifiedBoardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders one tile per board of the level, zoomed out', async () => {
    await renderWall();
    for (let boardId = 0; boardId < BOARDS_PER_LEVEL; boardId += 1) {
      expect(screen.getByTestId(`board-tile-${boardId}`)).toBeTruthy();
    }
    expect(screen.queryByTestId('active-board-overlay')).toBeNull();
  });

  it('jumps straight into playing a board when the route carries a boardId (the dev-tools shortcut)', async () => {
    // Board 28 is the level's unlockable centre board (centreBoardId), so it
    // starts unlocked even with no stored progress.
    await renderWall({ levelId: UNPREPARED_LEVEL_ID, boardId: 28 });
    await waitFor(() => expect(screen.getByTestId('active-board-overlay')).toBeTruthy());
    fireEvent(screen.getByTestId('board-surface'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 600 } },
    });
    expect(screen.getByTestId('board-canvas')).toBeTruthy();
  });

  it('does not enter gameplay for a boardId that is still locked', async () => {
    // Board 0 is not the wall's centre and has no completed neighbour yet, so
    // it starts locked - jumping to it should show the wall, not a live board.
    await renderWall({ levelId: UNPREPARED_LEVEL_ID, boardId: 0 });
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.queryByTestId('active-board-overlay')).toBeNull();
  });

  it('exiting the active board zooms back out to the wall instead of leaving the level', async () => {
    await renderWall({ levelId: UNPREPARED_LEVEL_ID, boardId: 28 });
    await waitFor(() => expect(screen.getByTestId('active-board-overlay')).toBeTruthy());
    await waitFor(() => expect(screen.queryByTestId('board-loading')).toBeNull());

    fireEvent.press(screen.getByTestId('exit-board'));

    await waitFor(() => expect(screen.queryByTestId('active-board-overlay')).toBeNull());
    expect(navigation.goBack).not.toHaveBeenCalled();
    expect(screen.getByTestId(`board-tile-28`)).toBeTruthy();
  });
});
