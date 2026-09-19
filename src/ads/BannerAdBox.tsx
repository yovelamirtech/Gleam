import { useState } from 'react';
import { View } from 'react-native';

import { BANNER_AD_UNIT_ID } from '../constants/ads';
import { usePurchases } from '../hooks/usePurchases';
import googleMobileAds from './googleMobileAds';

/**
 * An anchored adaptive banner, or nothing at all once "remove ads" is owned
 * - or if the native ads module isn't available at all (plain Expo Go; see
 * `googleMobileAds.ts`). Also collapses to nothing (rather than an empty
 * grey box) when a request comes back empty - `onAdFailedToLoad` fires on
 * every no-fill, not just real errors, and this is deliberately quiet about
 * the difference.
 */
export function BannerAdBox() {
  const { adsRemoved } = usePurchases();
  const [failed, setFailed] = useState(false);

  if (!googleMobileAds || adsRemoved || failed) return null;
  const { BannerAd, BannerAdSize } = googleMobileAds;

  return (
    <View>
      <BannerAd
        unitId={BANNER_AD_UNIT_ID}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        onAdFailedToLoad={() => setFailed(true)}
      />
    </View>
  );
}
