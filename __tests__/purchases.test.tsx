import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook } from '@testing-library/react-native';
import React from 'react';

import { REMOVE_ADS_SKU } from '../src/iap/constants';
import { PurchasesProvider, usePurchases } from '../src/hooks/usePurchases';

// expo-iap needs a native store connection the test renderer doesn't have,
// same reasoning as the expo-audio/expo-haptics mocks in jest.setup.js. This
// file overrides the global stub with one whose state a test can drive, and
// captures `onPurchaseSuccess` so a test can simulate the store's own async
// purchase-succeeded event the way the real listener would deliver it.
let mockConnected = false;
let mockAvailablePurchases: Array<{ productId: string }> = [];
let capturedOnPurchaseSuccess: ((purchase: { productId: string }) => void) | null = null;
const mockFetchProducts = jest.fn();
const mockGetAvailablePurchases = jest.fn();
const mockRequestPurchase = jest.fn();
const mockFinishTransaction = jest.fn();
const mockRestorePurchases = jest.fn();

// isIapAvailable() (src/hooks/usePurchases.tsx) checks this before ever
// calling useIAP - these tests are about the live-IAP behaviour, so it
// always resolves here.
jest.mock('expo-modules-core', () => {
  const actual = jest.requireActual('expo-modules-core');
  return {
    ...actual,
    requireNativeModule: jest.fn((name: string) => (name === 'ExpoIap' ? {} : actual.requireNativeModule(name))),
  };
});

jest.mock('expo-iap', () => ({
  useIAP: (options?: { onPurchaseSuccess?: (purchase: { productId: string }) => void }) => {
    capturedOnPurchaseSuccess = options?.onPurchaseSuccess ?? null;
    return {
      connected: mockConnected,
      products: [{ id: 'remove_ads', displayPrice: '$2.99' }],
      availablePurchases: mockAvailablePurchases,
      fetchProducts: mockFetchProducts,
      getAvailablePurchases: mockGetAvailablePurchases,
      requestPurchase: mockRequestPurchase,
      finishTransaction: mockFinishTransaction,
      restorePurchases: mockRestorePurchases,
    };
  },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return <PurchasesProvider>{children}</PurchasesProvider>;
}

async function renderPurchases() {
  const { result } = renderHook(() => usePurchases(), { wrapper });
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
  return result;
}

describe('usePurchases', () => {
  beforeEach(async () => {
    mockConnected = false;
    mockAvailablePurchases = [];
    capturedOnPurchaseSuccess = null;
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it('starts with ads not removed', async () => {
    const result = await renderPurchases();
    expect(result.current.adsRemoved).toBe(false);
  });

  it('marks ads removed and finishes the transaction when the store reports a successful purchase', async () => {
    const result = await renderPurchases();
    const purchase = { productId: REMOVE_ADS_SKU };

    await act(async () => {
      capturedOnPurchaseSuccess?.(purchase);
    });

    expect(result.current.adsRemoved).toBe(true);
    expect(mockFinishTransaction).toHaveBeenCalledWith({ purchase, isConsumable: false });
  });

  it('ignores a purchase success for an unrelated product id', async () => {
    const result = await renderPurchases();

    await act(async () => {
      capturedOnPurchaseSuccess?.({ productId: 'something-else' });
    });

    expect(result.current.adsRemoved).toBe(false);
    expect(mockFinishTransaction).not.toHaveBeenCalled();
  });

  it('picks up a purchase already owned by the store once connected', async () => {
    mockConnected = true;
    mockAvailablePurchases = [{ productId: REMOVE_ADS_SKU }];
    const result = await renderPurchases();

    expect(result.current.adsRemoved).toBe(true);
  });

  it('remembers a purchase across remounts via the local cache', async () => {
    const first = await renderPurchases();
    await act(async () => {
      capturedOnPurchaseSuccess?.({ productId: REMOVE_ADS_SKU });
    });
    expect(first.current.adsRemoved).toBe(true);

    const second = await renderPurchases();
    expect(second.current.adsRemoved).toBe(true);
  });

  it('exposes the store price for the remove-ads product once connected', async () => {
    mockConnected = true;
    const result = await renderPurchases();
    expect(result.current.removeAdsPrice).toBe('$2.99');
  });
});
