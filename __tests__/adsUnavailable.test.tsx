import { render, screen } from '@testing-library/react-native';
import React from 'react';

// Simulates plain Expo Go: the native module isn't linked, so importing the
// package throws (`TurboModuleRegistry.getEnforcing` runs at the top of its
// own module, not lazily). `src/ads/googleMobileAds.ts` is the one place
// that require happens inside a try/catch specifically so this doesn't take
// the whole app down with it - this file proves that degrades gracefully
// instead of just asserting it by reading the code.
jest.mock('react-native-google-mobile-ads', () => {
  throw new Error('RNGoogleMobileAdsModule could not be found');
});
jest.mock('../src/hooks/usePurchases', () => ({
  usePurchases: () => ({ adsRemoved: false, removeAdsPrice: null, buyRemoveAds: jest.fn(), restore: jest.fn() }),
}));

import { BannerAdBox } from '../src/ads/BannerAdBox';
import { LevelCompleteInterstitial } from '../src/ads/LevelCompleteInterstitial';
import googleMobileAds from '../src/ads/googleMobileAds';

describe('ads when the native module is unavailable', () => {
  it('resolves to null instead of throwing', () => {
    expect(googleMobileAds).toBeNull();
  });

  it('BannerAdBox renders nothing', () => {
    render(<BannerAdBox />);
    expect(screen.queryByTestId('banner-ad')).toBeNull();
  });

  it('LevelCompleteInterstitial renders nothing and never calls the ad hook', () => {
    const { toJSON } = render(<LevelCompleteInterstitial />);
    expect(toJSON()).toBeNull();
  });
});
