import { Platform } from 'react-native';

/**
 * No real AdMob account exists for this app yet. These are Google's own
 * published test ad units (https://developers.google.com/admob/android/test-ads),
 * used in every build - dev and production alike - so ads render safely
 * with no risk of invalid-traffic policy strikes. Hardcoded here rather
 * than read from `TestIds` in `react-native-google-mobile-ads`, because
 * merely importing that package can crash the app under plain Expo Go -
 * see `src/ads/googleMobileAds.ts` for the one place that import happens
 * safely, and why. Swap these for real ad unit IDs from the AdMob console
 * before a store submission; the app IDs in app.json (also Google's public
 * test app IDs) need to change alongside them.
 */
export const BANNER_AD_UNIT_ID = Platform.select({
  ios: 'ca-app-pub-3940256099942544/2934735716',
  default: 'ca-app-pub-3940256099942544/6300978111',
});
export const INTERSTITIAL_AD_UNIT_ID = Platform.select({
  ios: 'ca-app-pub-3940256099942544/4411468910',
  default: 'ca-app-pub-3940256099942544/1033173712',
});
