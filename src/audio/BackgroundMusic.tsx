import { useAudioPlayer } from 'expo-audio';
import { useEffect } from 'react';

import musicSource from '../../assets/sounds/music.wav';
import { useSettings } from '../hooks/useSettings';

const VOLUME = 0.35;

/**
 * Quiet looping background music for the whole app (BUILD_PLAN.md), mounted
 * once at the app root so it keeps playing across screen navigation. Renders
 * nothing; it only owns the player and reacts to the settings toggle.
 */
export function BackgroundMusic() {
  const { settings, loaded } = useSettings();
  const player = useAudioPlayer(musicSource);

  useEffect(() => {
    player.loop = true;
    player.volume = VOLUME;
  }, [player]);

  useEffect(() => {
    // Wait for the real stored preference: playing on the optimistic default
    // and then immediately pausing would blip audible sound for a player who
    // has music turned off.
    if (!loaded) return;
    if (settings.musicEnabled) {
      player.play();
    } else {
      player.pause();
    }
  }, [loaded, settings.musicEnabled, player]);

  return null;
}

export default BackgroundMusic;
