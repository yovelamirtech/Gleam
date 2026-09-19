import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import React from 'react';

import { useGameSounds } from '../src/audio/useGameSounds';
import { SettingsProvider, useSettings } from '../src/hooks/useSettings';
import { saveSettings, type Settings } from '../src/storage/settings';

// Jest's asset transform resolves every static asset (any `require('*.wav')`)
// to the same placeholder value, so a real per-source registry can't tell
// click/row/board apart. `useGameSounds` calls `useAudioPlayer` exactly three
// times, always in the same order (click, row, board), on every render - so
// call-index-within-render stands in for "which sound" instead, stored as
// the three latest instances (one per render is enough; the hooks that use
// them only ever act on the current render's closures).
type FakePlayer = { play: jest.Mock; seekTo: jest.Mock };
let mockCallCount = 0;
const mockPlayers: [FakePlayer?, FakePlayer?, FakePlayer?] = [undefined, undefined, undefined];

jest.mock('expo-audio', () => ({
  useAudioPlayer: () => {
    const index = mockCallCount % 3;
    mockCallCount += 1;
    const player = { play: jest.fn(), seekTo: jest.fn() };
    mockPlayers[index] = player;
    return player;
  },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return <SettingsProvider>{children}</SettingsProvider>;
}

/**
 * Render the hook alongside the settings it reads, and let the provider's
 * own `loadSettings()` promise chain actually resolve before returning the
 * *current* render's sound handlers - not the initial (pre-load) render's,
 * whose player objects a later render (settled or not, `setSettings` always
 * creates a fresh object so React re-renders either way) would otherwise
 * orphan. Asserting `expected` here is a sanity check on top of that, not
 * the mechanism that waits for the load.
 */
async function renderSounds(expected: Settings) {
  const { result } = renderHook(() => ({ settings: useSettings().settings, sounds: useGameSounds() }), {
    wrapper,
  });
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
  expect(result.current.settings).toEqual(expected);
  return result.current.sounds;
}

describe('useGameSounds', () => {
  beforeEach(async () => {
    mockCallCount = 0;
    mockPlayers[0] = mockPlayers[1] = mockPlayers[2] = undefined;
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it('plays the click sound and a light haptic on every stone placement', async () => {
    const sounds = await renderSounds({ soundEnabled: true, musicEnabled: true });
    sounds.onStonePlaced();

    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    const [click, row, board] = mockPlayers;
    expect(click!.play).toHaveBeenCalled();
    expect(row!.play).not.toHaveBeenCalled();
    expect(board!.play).not.toHaveBeenCalled();
  });

  it('plays a distinct sound for a finished row and a finished board', async () => {
    const sounds = await renderSounds({ soundEnabled: true, musicEnabled: true });
    sounds.onRowComplete();
    sounds.onBoardComplete();

    const [click, row, board] = mockPlayers;
    expect(click!.play).not.toHaveBeenCalled();
    expect(row!.play).toHaveBeenCalled();
    expect(board!.play).toHaveBeenCalled();
  });

  it('mutes sound effects when the setting is off, but never the haptic', async () => {
    await saveSettings({ soundEnabled: false, musicEnabled: true });
    const sounds = await renderSounds({ soundEnabled: false, musicEnabled: true });
    sounds.onStonePlaced();

    expect(Haptics.impactAsync).toHaveBeenCalled();
    const [click] = mockPlayers;
    expect(click!.play).not.toHaveBeenCalled();
  });
});
