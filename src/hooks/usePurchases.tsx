import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { requireNativeModule } from 'expo-modules-core';
import { useIAP } from 'expo-iap';

import { REMOVE_ADS_SKU } from '../iap/constants';
import { loadAdsRemovedCache, saveAdsRemovedCache } from '../storage/purchases';

/**
 * Unlike `react-native-google-mobile-ads` (see `src/ads/googleMobileAds.ts`),
 * `expo-iap` doesn't throw at import time when its native module is missing
 * - it resolves the module lazily through a Proxy. But `useIAP` itself
 * registers its purchase-update/error listeners *before* its own
 * `initConnection` try/catch (see its source), and those listener functions
 * resolve the native module eagerly and throw synchronously when it's
 * missing - inside an `async` function nobody awaits, so under plain
 * Expo Go (which can't run this native module at all, same as the ads one)
 * this surfaces as an unhandled promise rejection
 * (`Cannot find native module 'ExpoIap'`) that crashes the app, not a
 * caught "not connected" state the way the rest of `useIAP` degrades.
 *
 * Checked the same way `expo-iap`'s own module resolution does internally
 * (`ExpoIapModule.js`'s `requireNativeModule('ExpoIap')`), so `useIAP`
 * itself is never called at all when this is false - the whole purchase
 * flow degrades to "nothing owned, no price to show", same as a real
 * missing native module already does everywhere else in this app.
 */
function isIapAvailable(): boolean {
  try {
    requireNativeModule('ExpoIap');
    return true;
  } catch {
    return false;
  }
}

interface PurchasesContextValue {
  /** True once the "remove ads" purchase is confirmed owned - hides every ad. */
  adsRemoved: boolean;
  /** The store's own price string for the purchase, once fetched (e.g. "$2.99"). */
  removeAdsPrice: string | null;
  /** Starts the purchase flow. The result arrives async via the store's own listener. */
  buyRemoveAds: () => void;
  /** Re-checks the store for purchases already owned (e.g. after a reinstall). */
  restore: () => void;
}

const PurchasesContext = createContext<PurchasesContextValue>({
  adsRemoved: false,
  removeAdsPrice: null,
  buyRemoveAds: () => {},
  restore: () => {},
});

/**
 * The "remove ads" cache read/write, shared by both the live-IAP and
 * disabled-IAP providers below - a previously-recorded purchase still hides
 * ads under Expo Go (where live IAP can't run at all), same as any other
 * cached state in this app.
 */
function useCachedAdsRemoved() {
  const [adsRemoved, setAdsRemoved] = useState(false);

  useEffect(() => {
    // Only ever turns this on, never off: the store (not the cache) is what
    // can revoke a purchase, and a cache read resolving after the store has
    // already confirmed ownership must not stomp that back to false.
    loadAdsRemovedCache().then((cached) => {
      if (cached) setAdsRemoved(true);
    });
  }, []);

  const markOwned = useCallback(() => {
    setAdsRemoved(true);
    saveAdsRemovedCache(true);
  }, []);

  return { adsRemoved, markOwned };
}

/** No native IAP module: nothing to buy or restore, just whatever the cache already knows. */
function DisabledPurchasesProvider({ children }: { children: React.ReactNode }) {
  const { adsRemoved } = useCachedAdsRemoved();
  const value = useMemo(
    () => ({ adsRemoved, removeAdsPrice: null, buyRemoveAds: () => {}, restore: () => {} }),
    [adsRemoved]
  );
  return <PurchasesContext.Provider value={value}>{children}</PurchasesContext.Provider>;
}

/**
 * Wraps expo-iap's `useIAP` with the one product this app sells. Reconciles
 * against the store on connect and after every restore/purchase, but also
 * caches the result locally (`src/storage/purchases.ts`) so ads stay off on
 * every future launch even before that connection resolves - same reasoning
 * as `SettingsProvider`'s `loaded` flag for music.
 */
function LiveIapPurchasesProvider({ children }: { children: React.ReactNode }) {
  const { adsRemoved, markOwned } = useCachedAdsRemoved();

  const { connected, products, availablePurchases, fetchProducts, getAvailablePurchases, requestPurchase, finishTransaction, restorePurchases } =
    useIAP({
      onPurchaseSuccess: (purchase) => {
        if (purchase.productId !== REMOVE_ADS_SKU) return;
        markOwned();
        finishTransaction({ purchase, isConsumable: false });
      },
    });

  useEffect(() => {
    if (!connected) return;
    fetchProducts({ skus: [REMOVE_ADS_SKU], type: 'in-app' });
    getAvailablePurchases();
  }, [connected, fetchProducts, getAvailablePurchases]);

  useEffect(() => {
    if (availablePurchases.some((purchase) => purchase.productId === REMOVE_ADS_SKU)) {
      markOwned();
    }
  }, [availablePurchases, markOwned]);

  const removeAdsPrice = useMemo(
    () => products.find((product) => product.id === REMOVE_ADS_SKU)?.displayPrice ?? null,
    [products]
  );

  const buyRemoveAds = useCallback(() => {
    requestPurchase({
      request: { apple: { sku: REMOVE_ADS_SKU }, google: { skus: [REMOVE_ADS_SKU] } },
      type: 'in-app',
    });
  }, [requestPurchase]);

  const restore = useCallback(() => {
    restorePurchases();
  }, [restorePurchases]);

  const value = useMemo(
    () => ({ adsRemoved, removeAdsPrice, buyRemoveAds, restore }),
    [adsRemoved, removeAdsPrice, buyRemoveAds, restore]
  );

  return <PurchasesContext.Provider value={value}>{children}</PurchasesContext.Provider>;
}

export function PurchasesProvider({ children }: { children: React.ReactNode }) {
  return isIapAvailable() ? (
    <LiveIapPurchasesProvider>{children}</LiveIapPurchasesProvider>
  ) : (
    <DisabledPurchasesProvider>{children}</DisabledPurchasesProvider>
  );
}

export function usePurchases(): PurchasesContextValue {
  return useContext(PurchasesContext);
}
