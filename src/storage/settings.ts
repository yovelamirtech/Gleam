import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'gleam:settings:v1';

export type Settings = {
  soundEnabled: boolean;
  musicEnabled: boolean;
};

const DEFAULT_SETTINGS: Settings = { soundEnabled: true, musicEnabled: true };

export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      soundEnabled: parsed.soundEnabled ?? DEFAULT_SETTINGS.soundEnabled,
      musicEnabled: parsed.musicEnabled ?? DEFAULT_SETTINGS.musicEnabled,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
