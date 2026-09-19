import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SettingsProvider } from '../src/hooks/useSettings';
import SettingsScreen from '../src/screens/SettingsScreen';
import { saveSettings } from '../src/storage/settings';

const navigation = { goBack: jest.fn(), navigate: jest.fn() } as unknown as never;

async function renderSettings() {
  const utils = render(
    <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}>
      <SettingsProvider>
        {/* @ts-expect-error - a plain stub is enough for a screen that only calls goBack/navigate */}
        <SettingsScreen navigation={navigation} route={{}} />
      </SettingsProvider>
    </SafeAreaProvider>
  );
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
  return utils;
}

describe('SettingsScreen toggle feedback', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it('confirms with a sound and a light haptic when a toggle is switched on', async () => {
    await saveSettings({ soundEnabled: false, musicEnabled: false });
    await renderSettings();

    fireEvent.press(screen.getByTestId('toggle-sound'));

    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
  });

  it('stays silent when a toggle is switched off', async () => {
    await saveSettings({ soundEnabled: true, musicEnabled: true });
    await renderSettings();

    fireEvent.press(screen.getByTestId('toggle-sound'));

    expect(Haptics.impactAsync).not.toHaveBeenCalled();
  });

  it('gives the same confirmation for the music toggle', async () => {
    await saveSettings({ soundEnabled: false, musicEnabled: false });
    await renderSettings();

    fireEvent.press(screen.getByTestId('toggle-music'));

    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
  });
});
