import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'gleam:purchases:adsRemoved:v1';

/**
 * A local cache of the "remove ads" purchase, alongside the store's own
 * record of it. The store is always the source of truth (`usePurchases`
 * reconciles against `getAvailablePurchases` on connect), but that check
 * needs a live store connection; this cache lets ads stay off immediately on
 * every future launch even before that connection resolves.
 */
export async function loadAdsRemovedCache(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(STORAGE_KEY)) === 'true';
  } catch {
    return false;
  }
}

export async function saveAdsRemovedCache(adsRemoved: boolean): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, adsRemoved ? 'true' : 'false');
}
