import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Dev tool: a small floating FPS readout, refreshed roughly once a second
 * from a rolling `requestAnimationFrame` count. Mounted once at the app
 * root, gated by `DEV_TOOLS_ENABLED` and the dev tools "Show FPS" toggle
 * (`src/hooks/useDevTools.tsx`), so it floats over every screen.
 */
export function FpsOverlay() {
  const [fps, setFps] = useState(0);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    let frameCount = 0;
    let windowStart = performance.now();
    let handle: number;

    const tick = () => {
      frameCount += 1;
      const now = performance.now();
      const elapsed = now - windowStart;
      if (elapsed >= 500) {
        setFps(Math.round((frameCount * 1000) / elapsed));
        frameCount = 0;
        windowStart = now;
      }
      handle = requestAnimationFrame(tick);
    };
    handle = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(handle);
  }, []);

  return (
    <Text style={[styles.badge, { top: insets.top + 6 }]} pointerEvents="none">
      {fps} fps
    </Text>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    color: '#ffffff',
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    overflow: 'hidden',
  },
});

export default FpsOverlay;
