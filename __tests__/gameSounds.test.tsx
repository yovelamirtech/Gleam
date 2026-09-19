import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import React from 'react';

import { useGameSounds } from '../src/audio/useGameSounds';
import { SettingsProvider, useSettings } from '../src/hooks/useSettings';
import { saveSettings, type Settings } from '../src/storage/settings';

// Jest's asset transform resolves every static asset (any `require('*.wav')`)
// to the same placeholder value, so a real per-source registry can't tell
// click/row/board apart. `useGameSounds` calls `useAudioPlayer` exactly six
// times, always in the same order (4 click-pool players, then row, then
// board), on every render - so call-index-within-render stands in for
// "which sound" instead, stored as the six latest instances (one per render
// is enough; the hooks that use them only ever act on the current render's
// closures).
type FakePlayer = { play: jest.Mock; seekTo: jest.Mock };
const mockClickPoolSize = 4;
const mockSlotCount = mockClickPoolSize + 2; // + row, board
let mockCallCount = 0;
let mockPlayers: (FakePlayer | undefined)[] = new Array(mockSlotCount).fill(undefined);

jest.mock('expo-audio', () => ({
  useAudioPlayer: () => {
    const index = mockCallCount % mockSlotCount;
    mockCallCount += 1;
    // Persists across re-renders once created, matching the real
    // useAudioPlayer's own per-call-site stability (a re-render doesn't get
    // a new player unless the source changes) - the thing this hook's own
    // memoization (see useGameSounds.ts) now relies on.
    if (!mockPlayers[index]) {
      mockPlayers[index] = { play: jest.fn(), seekTo: jest.fn() };
    }
    return mockPlayers[index]!;
  },
}));

function clickPlayers(): FakePlayer[] {
  return mockPlayers.slice(0, mockClickPoolSize) as FakePlayer[];
}
function rowPlayer(): FakePlayer {
  return mockPlayers[mockClickPoolSize] as FakePlayer;
}
function boardPlayer(): FakePlayer {
  return mockPlayers[mockClickPoolSize + 1] as FakePlayer;
}

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
    mockPlayers = new Array(mockSlotCount).fill(undefined);
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it('plays the click sound and a light haptic on every stone placement', async () => {
    const sounds = await renderSounds({ soundEnabled: true, musicEnabled: true });
    sounds.onStonePlaced();

    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    expect(clickPlayers()[0].play).toHaveBeenCalled();
    expect(rowPlayer().play).not.toHaveBeenCalled();
    expect(boardPlayer().play).not.toHaveBeenCalled();
  });

  it('cycles through the click pool round-robin, so rapid placements never race the same player', async () => {
    const sounds = await renderSounds({ soundEnabled: true, musicEnabled: true });
    const players = clickPlayers();

    for (let i = 0; i < players.length; i += 1) sounds.onStonePlaced();

    for (const player of players) {
      expect(player.play).toHaveBeenCalledTimes(1);
    }

    // A fifth placement wraps back around to the first player.
    sounds.onStonePlaced();
    expect(players[0].play).toHaveBeenCalledTimes(2);
  });

  it('plays a distinct sound for a finished row and a finished board', async () => {
    const sounds = await renderSounds({ soundEnabled: true, musicEnabled: true });
    sounds.onRowComplete();
    sounds.onBoardComplete();

    expect(clickPlayers().every((player) => !player.play.mock.calls.length)).toBe(true);
    expect(rowPlayer().play).toHaveBeenCalled();
    expect(boardPlayer().play).toHaveBeenCalled();
  });

  it('mutes sound effects when the setting is off, but never the haptic', async () => {
    await saveSettings({ soundEnabled: false, musicEnabled: true });
    const sounds = await renderSounds({ soundEnabled: false, musicEnabled: true });
    sounds.onStonePlaced();

    expect(Haptics.impactAsync).toHaveBeenCalled();
    expect(clickPlayers()[0].play).not.toHaveBeenCalled();
  });
});
