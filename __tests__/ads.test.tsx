import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { BannerAdBox } from '../src/ads/BannerAdBox';
import { LevelCompleteInterstitial } from '../src/ads/LevelCompleteInterstitial';

let mockAdsRemoved = false;
jest.mock('../src/hooks/usePurchases', () => ({
  usePurchases: () => ({ adsRemoved: mockAdsRemoved, removeAdsPrice: null, buyRemoveAds: jest.fn(), restore: jest.fn() }),
}));

const mockShow = jest.fn();
let mockStatus: 'idle' | 'loading' | 'loaded' = 'idle';
jest.mock('react-native-google-mobile-ads', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: () => ({ initialize: jest.fn() }),
    TestIds: { BANNER: 'test-banner', INTERSTITIAL: 'test-interstitial' },
    BannerAdSize: { ANCHORED_ADAPTIVE_BANNER: 'ANCHORED_ADAPTIVE_BANNER' },
    BannerAd: (props: object) => React.createElement(View, { testID: 'banner-ad', ...props }),
    useInterstitialAd: () => ({ status: mockStatus, show: mockShow }),
  };
});

describe('BannerAdBox', () => {
  beforeEach(() => {
    mockAdsRemoved = false;
  });

  it('shows a banner when ads are not removed', () => {
    render(<BannerAdBox />);
    expect(screen.getByTestId('banner-ad')).toBeTruthy();
  });

  it('shows nothing once ads are removed', () => {
    mockAdsRemoved = true;
    render(<BannerAdBox />);
    expect(screen.queryByTestId('banner-ad')).toBeNull();
  });

  it('collapses to nothing if the banner fails to load', () => {
    render(<BannerAdBox />);
    fireEvent(screen.getByTestId('banner-ad'), 'adFailedToLoad');
    expect(screen.queryByTestId('banner-ad')).toBeNull();
  });
});

describe('LevelCompleteInterstitial', () => {
  beforeEach(() => {
    mockAdsRemoved = false;
    mockStatus = 'idle';
    mockShow.mockClear();
  });

  it('shows the interstitial once it finishes loading', () => {
    mockStatus = 'loaded';
    render(<LevelCompleteInterstitial />);
    expect(mockShow).toHaveBeenCalledTimes(1);
  });

  it('does not show anything while still loading', () => {
    mockStatus = 'loading';
    render(<LevelCompleteInterstitial />);
    expect(mockShow).not.toHaveBeenCalled();
  });
});
