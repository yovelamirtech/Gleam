/* eslint-env jest */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// expo-audio and expo-haptics both need a native module the test renderer
// doesn't have, same reasoning as the Skia canvas mock in BoardScreen.test.tsx.
jest.mock('expo-audio', () => ({
  useAudioPlayer: () => ({ play: jest.fn(), pause: jest.fn(), seekTo: jest.fn(), loop: false, volume: 1 }),
}));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy', Soft: 'soft', Rigid: 'rigid' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

// Ads and IAP are both native modules with no test-renderer surface. Stubbed
// to their idle/disconnected shape by default; individual tests override
// with their own jest.mock where the ad/purchase state itself is under test.
jest.mock('react-native-google-mobile-ads', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: () => ({ initialize: jest.fn(() => Promise.resolve([])) }),
    TestIds: { BANNER: 'test-banner', INTERSTITIAL: 'test-interstitial' },
    BannerAdSize: { ANCHORED_ADAPTIVE_BANNER: 'ANCHORED_ADAPTIVE_BANNER' },
    BannerAd: (props) => React.createElement(View, { testID: 'banner-ad', ...props }),
    useInterstitialAd: () => ({ status: 'idle', show: jest.fn(), load: jest.fn() }),
  };
});
jest.mock('expo-iap', () => ({
  useIAP: () => ({
    connected: false,
    products: [],
    availablePurchases: [],
    fetchProducts: jest.fn(),
    getAvailablePurchases: jest.fn(),
    requestPurchase: jest.fn(),
    finishTransaction: jest.fn(),
    restorePurchases: jest.fn(),
  }),
}));
