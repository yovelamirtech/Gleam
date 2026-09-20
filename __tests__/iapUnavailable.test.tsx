import { act, renderHook } from '@testing-library/react-native';
import React from 'react';

// Simulates plain Expo Go: expo-iap's native module isn't linked.
// requireNativeModule throws (the same call expo-iap's own module resolution
// makes internally) rather than useIAP() ever running - useIAP itself
// registers listeners that resolve the native module *before* its own
// initConnection try/catch, so calling it here would surface as an
// unhandled promise rejection instead of a graceful "not connected" state.
// This file proves the fallback works instead of just asserting it by
// reading the code.
jest.mock('expo-modules-core', () => {
  const actual = jest.requireActual('expo-modules-core');
  return {
    ...actual,
    requireNativeModule: jest.fn((name: string) => {
      if (name === 'ExpoIap') throw new Error("Cannot find native module 'ExpoIap'");
      return actual.requireNativeModule(name);
    }),
  };
});

const mockUseIAP = jest.fn();
jest.mock('expo-iap', () => ({ useIAP: (...args: unknown[]) => mockUseIAP(...args) }));

import { PurchasesProvider, usePurchases } from '../src/hooks/usePurchases';

function wrapper({ children }: { children: React.ReactNode }) {
  return <PurchasesProvider>{children}</PurchasesProvider>;
}

describe('usePurchases when the native module is unavailable', () => {
  beforeEach(() => {
    mockUseIAP.mockClear();
  });

  it('never calls useIAP at all', async () => {
    const { result } = renderHook(() => usePurchases(), { wrapper });
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockUseIAP).not.toHaveBeenCalled();
    expect(result.current.adsRemoved).toBe(false);
    expect(result.current.removeAdsPrice).toBeNull();
  });

  it('buyRemoveAds and restore are harmless no-ops', async () => {
    const { result } = renderHook(() => usePurchases(), { wrapper });
    await act(async () => {
      await Promise.resolve();
    });
    expect(() => result.current.buyRemoveAds()).not.toThrow();
    expect(() => result.current.restore()).not.toThrow();
  });
});
