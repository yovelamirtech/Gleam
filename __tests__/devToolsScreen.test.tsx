import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { loadProgress } from '../src/storage/progress';
import DevToolsScreen from '../src/screens/DevToolsScreen';

const navigation = { navigate: jest.fn(), goBack: jest.fn() };

async function renderDevTools() {
  const utils = render(
    <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}>
      {/* @ts-expect-error - a plain stub is enough for a screen that only calls navigate/goBack */}
      <DevToolsScreen navigation={navigation} route={{}} />
    </SafeAreaProvider>
  );
  await act(async () => {
    await Promise.resolve();
  });
  return utils;
}

describe('DevToolsScreen: preview a level-complete screen', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it('instantly finishes every board of a prepared level and jumps to its complete screen', async () => {
    await renderDevTools();

    // Level 1 (id 0) is sampleLagoon, one of the prepared levels.
    await act(async () => {
      fireEvent.press(screen.getByText(/Instantly finish level 1 and preview/));
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => expect(navigation.navigate).toHaveBeenCalledWith('LevelComplete', { levelId: 0 }));

    const progress = await loadProgress();
    expect(progress.levels[0].status).toBe('completed');
  }, 15000);

  it('warns instead of crashing for a level with no prepared artwork yet', async () => {
    await renderDevTools();
    const levelStepper = screen.getByLabelText('Increase Level');
    // Level ids 0-6 are prepared; step well past them.
    for (let i = 0; i < 10; i += 1) fireEvent.press(levelStepper);

    fireEvent.press(screen.getByText(/Instantly finish level 11 and preview/));

    expect(navigation.navigate).not.toHaveBeenCalled();
  });
});
