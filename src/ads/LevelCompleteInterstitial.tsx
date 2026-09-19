import { useEffect, useRef } from 'react';
import { useInterstitialAd } from 'react-native-google-mobile-ads';

import { INTERSTITIAL_AD_UNIT_ID } from '../constants/ads';
import { usePurchases } from '../hooks/usePurchases';

/**
 * Non-visual: loads an interstitial as soon as `LevelCompleteScreen` mounts
 * (a full level finishing is the natural pause point BUILD_PLAN.md calls
 * for) and shows it the moment it's ready. Shows at most once per mount,
 * since `status` moves on to 'showing'/'closed' afterwards and this never
 * re-triggers on those.
 */
export function LevelCompleteInterstitial() {
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
