import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { loadSettings, saveSettings, type Settings } from '../storage/settings';

const DEFAULT_SETTINGS: Settings = { soundEnabled: true, musicEnabled: true };

interface SettingsContextValue {
  settings: Settings;
  /** False until the stored settings have been read at least once. */
  loaded: boolean;
  updateSettings: (patch: Partial<Settings>) => void;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  loaded: false,
  updateSettings: () => {},
});

/**
 * Loads settings once at the app root and shares them everywhere via
 * context, so a toggle in `SettingsScreen` takes effect immediately wherever
 * else they're read (background music, in-game sound/haptics) instead of
 * only on the next screen that happens to reload storage. `loaded` lets a
 * consumer like `BackgroundMusic` wait for the real stored value instead of
 * acting on the optimistic default first - a stored "music off" should never
 * cause even a brief blip of sound before the real preference arrives.
 */
export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadSettings().then((loadedSettings) => {
      setSettings(loadedSettings);
      setLoaded(true);
    });
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loaded, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  return useContext(SettingsContext);
}
