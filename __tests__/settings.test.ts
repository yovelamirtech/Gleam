import AsyncStorage from '@react-native-async-storage/async-storage';

import { loadSettings, saveSettings } from '../src/storage/settings';

describe('settings', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('defaults to sound and music both on', async () => {
    expect(await loadSettings()).toEqual({ soundEnabled: true, musicEnabled: true });
  });

  it('round-trips a saved change', async () => {
    await saveSettings({ soundEnabled: false, musicEnabled: true });
    expect(await loadSettings()).toEqual({ soundEnabled: false, musicEnabled: true });
  });

  it('falls back to defaults for malformed storage', async () => {
    await AsyncStorage.setItem('gleam:settings:v1', 'not json');
    expect(await loadSettings()).toEqual({ soundEnabled: true, musicEnabled: true });
  });

  it('fills in a missing field from a partial payload', async () => {
    await AsyncStorage.setItem('gleam:settings:v1', JSON.stringify({ soundEnabled: false }));
    expect(await loadSettings()).toEqual({ soundEnabled: false, musicEnabled: true });
  });
});
