import type * as GoogleMobileAdsModule from 'react-native-google-mobile-ads';

/**
 * `react-native-google-mobile-ads` throws at *import* time, not just when
 * an ad is actually requested, if its native module isn't linked - it calls
 * `TurboModuleRegistry.getEnforcing(...)` at the top of the module, before
 * any component even renders. That's exactly the situation under plain
 * Expo Go, which can't run this native module at all (see HANDOFF.md's
 * "Before you can build a dev client"). A plain `import` of this package
 * anywhere in the app would therefore crash the whole app on launch, not
 * just the ad it's used for.
 *
 * `require`d through a try/catch here instead, so a missing native module
 * degrades to "no ads" rather than a crash. Every other place in the app
 * that needs this package goes through this module instead of importing it
 * directly. Once a real dev client exists (where the module *is* linked),
 * this resolves normally and ads work exactly as built.
 */
let googleMobileAds: typeof GoogleMobileAdsModule | null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  googleMobileAds = require('react-native-google-mobile-ads');
} catch {
  googleMobileAds = null;
}

export default googleMobileAds;
