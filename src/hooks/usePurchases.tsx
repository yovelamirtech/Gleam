import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useIAP } from 'expo-iap';

import { REMOVE_ADS_SKU } from '../iap/constants';
import { loadAdsRemovedCache, saveAdsRemovedCache } from '../storage/purchases';

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
 * Wraps expo-iap's `useIAP` with the one product this app sells. Reconciles
 * against the store on connect and after every restore/purchase, but also
 * caches the result locally (`src/storage/purchases.ts`) so ads stay off on
 * every future launch even before that connection resolves - same reasoning
 * as `SettingsProvider`'s `loaded` flag for music.
 */
export function PurchasesProvider({ children }: { children: React.ReactNode }) {
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

export function usePurchases(): PurchasesContextValue {
  return useContext(PurchasesContext);
}
