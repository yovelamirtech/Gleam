import { useEffect, useRef } from 'react';

import { INTERSTITIAL_AD_UNIT_ID } from '../constants/ads';
import { usePurchases } from '../hooks/usePurchases';
import googleMobileAds from './googleMobileAds';

/**
 * Only ever mounted (by `LevelCompleteInterstitial` below) when the native
 * ads module is actually available, so calling its hook unconditionally
 * here is safe - the alternative, calling it from a component that might
 * not have the module at all, has no way to skip the call without breaking
 * the rules of hooks.
 */
function InterstitialAd() {
  const { useInterstitialAd } = googleMobileAds!;
  const { adsRemoved } = usePurchases();
  const { status, show } = useInterstitialAd({ adUnitId: adsRemoved ? null : INTERSTITIAL_AD_UNIT_ID });
  const shownRef = useRef(false);

  useEffect(() => {
    if (status === 'loaded' && !shownRef.current) {
      shownRef.current = true;
      show();
    }
  }, [status, show]);

  return null;
}

/**
 * Non-visual: loads an interstitial as soon as `LevelCompleteScreen` mounts
 * (a full level finishing is the natural pause point BUILD_PLAN.md calls
 * for) and shows it the moment it's ready. Shows at most once per mount.
 * Renders nothing at all if the native ads module isn't available (plain
 * Expo Go; see `googleMobileAds.ts`).
 */
export function LevelCompleteInterstitial() {
  if (!googleMobileAds) return null;
  return <InterstitialAd />;
}
