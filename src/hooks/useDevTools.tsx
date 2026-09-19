import React, { createContext, useContext, useState } from 'react';

interface DevToolsContextValue {
  showFps: boolean;
  setShowFps: (value: boolean) => void;
}

const DevToolsContext = createContext<DevToolsContextValue>({
  showFps: false,
  setShowFps: () => {},
});

/**
 * Dev-only toggles that need to be read from somewhere other than where
 * they're set — right now just the FPS overlay, flipped on the dev tools
 * menu but rendered at the `App.tsx` root so it floats over every screen.
 * Not persisted: a dev restarting the app is expected to flip it again,
 * same as any other in-session debug toggle.
 */
export function DevToolsProvider({ children }: { children: React.ReactNode }) {
  const [showFps, setShowFps] = useState(false);
  return (
    <DevToolsContext.Provider value={{ showFps, setShowFps }}>{children}</DevToolsContext.Provider>
  );
}

export function useDevTools(): DevToolsContextValue {
  return useContext(DevToolsContext);
}
