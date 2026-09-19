import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, render } from '@testing-library/react-native';
import React from 'react';

import { BackgroundMusic } from '../src/audio/BackgroundMusic';
import { SettingsProvider } from '../src/hooks/useSettings';
import { saveSettings } from '../src/storage/settings';

const mockPlayer = { play: jest.fn(), pause: jest.fn(), loop: false, volume: 1 };

jest.mock('expo-audio', () => ({
  useAudioPlayer: () => mockPlayer,
}));

describe('BackgroundMusic', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it('sets a quiet, looping player and plays once settings load with music on', async () => {
    render(
      <SettingsProvider>
        <BackgroundMusic />
      </SettingsProvider>
    );
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockPlayer.loop).toBe(true);
    expect(mockPlayer.volume).toBeLessThan(1);
    expect(mockPlayer.volume).toBeGreaterThan(0);
    expect(mockPlayer.play).toHaveBeenCalled();
    expect(mockPlayer.pause).not.toHaveBeenCalled();
  });

  it('stays paused when the music setting is off', async () => {
    await saveSettings({ soundEnabled: true, musicEnabled: false });

    render(
      <SettingsProvider>
        <BackgroundMusic />
      </SettingsProvider>
    );
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockPlayer.pause).toHaveBeenCalled();
    expect(mockPlayer.play).not.toHaveBeenCalled();
  });
});
