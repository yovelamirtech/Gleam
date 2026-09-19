import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'gleam:onboarding:v1';

/** Whether the first-run board coach marks have already been shown or skipped. */
export async function hasSeenOnboarding(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(STORAGE_KEY)) === 'true';
  } catch {
    return false;
  }
}

export async function markOnboardingSeen(): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, 'true');
}
