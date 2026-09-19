import { TestIds } from 'react-native-google-mobile-ads';

/**
 * No real AdMob account exists for this app yet. Every build - dev and
 * production alike - uses Google's own published test ad units
 * (https://developers.google.com/admob/android/test-ads) so ads render
 * safely with no risk of invalid-traffic policy strikes. Swap these for real
 * ad unit IDs from the AdMob console before a store submission; the app IDs
 * in app.json (also Google's public test app IDs) need to change alongside
 * them.
 */
export const BANNER_AD_UNIT_ID = TestIds.BANNER;
export const INTERSTITIAL_AD_UNIT_ID = TestIds.INTERSTITIAL;
