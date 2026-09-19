import { useAudioPlayer, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { useCallback, useMemo, useRef } from 'react';

import boardSound from '../../assets/sounds/board.wav';
import clickSound from '../../assets/sounds/click.wav';
import rowSound from '../../assets/sounds/row.wav';
import { useSettings } from '../hooks/useSettings';

/**
 * How many overlapping instances of the click sound to keep ready. Placing
 * stones quickly can trigger it faster than one player's own seek-and-replay
 * round trip settles, so a single shared player made playback inconsistent
 * under rapid taps - restarting a still-playing instance every time raced
 * with itself. Cycling through a small pool instead means every click gets
 * its own, never-currently-playing player.
 */
const CLICK_POOL_SIZE = 4;

export interface GameSounds {
  /** A stone lands on the board. Always haptic; sound gated by settings. */
  onStonePlaced: () => void;
  /** A board row was just filled in by that placement. */
  onRowComplete: () => void;
  /** The board's last cell was just filled in. */
  onBoardComplete: () => void;
}

/**
 * One-shot game sound effects (BUILD_PLAN.md: a click per stone, a chime per
 * finished row, a fanfare per finished board) plus the placement haptic.
 * `src/storage/onboarding.ts`-style settings gate only the sound, never the
 * haptic — the plan lists no haptics toggle.
 */
export function useGameSounds(): GameSounds {
  const { settings } = useSettings();
  // Fixed count, same order every render - safe to call in a loop's place.
  const clickPlayers: AudioPlayer[] = [
    useAudioPlayer(clickSound),
    useAudioPlayer(clickSound),
    useAudioPlayer(clickSound),
    useAudioPlayer(clickSound),
  ];
  const nextClickPlayer = useRef(0);
  const rowPlayer = useAudioPlayer(rowSound);
  const boardPlayer = useAudioPlayer(boardSound);

  const play = useCallback(
    (player: AudioPlayer) => {
      if (!settings.soundEnabled) return;
      // Restart from the top even if a previous trigger is still ringing out -
      // placements can land faster than a click's own ~90ms decay.
      player.seekTo(0);
      player.play();
    },
    [settings.soundEnabled]
  );

  const onStonePlaced = useCallback(() => {
    const player = clickPlayers[nextClickPlayer.current];
    nextClickPlayer.current = (nextClickPlayer.current + 1) % clickPlayers.length;
    play(player);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // clickPlayers is rebuilt fresh every render (a new array from the fixed
    // set of hook calls above), so depending on its contents rather than its
    // identity would rebuild this callback every render for no reason.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play]);

  const onRowComplete = useCallback(() => play(rowPlayer), [play, rowPlayer]);
  const onBoardComplete = useCallback(() => play(boardPlayer), [play, boardPlayer]);

  // A stable object identity, so a consumer like BoardScreen's commitDrop
  // (and the gesture handlers built on it) doesn't get rebuilt every render
  // just because this hook returns a fresh object literal each time.
  return useMemo(
    () => ({ onStonePlaced, onRowComplete, onBoardComplete }),
    [onStonePlaced, onRowComplete, onBoardComplete]
  );
}
