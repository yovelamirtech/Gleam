import React from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import type { AirborneStrip as AirborneStripState, PaletteEntry } from '../game/types';
import { StoneIcon } from './StoneIcon';

/** On-screen size of one airborne stone. */
export const AIRBORNE_STONE = 30;

/** Anything GestureDetector accepts, including composed gestures. */
type BoardGesture = React.ComponentProps<typeof GestureDetector>['gesture'];

interface Props {
  strip: AirborneStripState | null;
  entry: PaletteEntry | null;
  /** Screen position of the strip's head. */
  x: SharedValue<number>;
  y: SharedValue<number>;
  /** Tap to rotate, drag to move and drop. */
  gesture: BoardGesture;
}

/**
 * Stones lifted out of the tray, hanging over the game.
 *
 * They follow the finger while dragging and stay where they were released when
 * the drop did not fit, rather than snapping back to the tray. A tap rotates
 * them in place. They float above everything, so they can be carried over the
 * HUD as well as the board.
 *
 * The detector stays mounted even with no stones to show. Stones appear in the
 * middle of a tray drag, and attaching a gesture handler while another gesture
 * is running is exactly the kind of thing that takes the app down with it; an
 * empty strip is just an invisible view that ignores touches.
 */
export function AirborneStrip({ strip, entry, x, y, gesture }: Props) {
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }],
  }));

  const hex = entry?.hex ?? '#ffffff';
  const stones = strip && entry ? strip.count : 0;

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        testID={stones > 0 ? 'airborne-strip' : 'airborne-strip-empty'}
        pointerEvents={stones > 0 ? 'auto' : 'none'}
        style={[
          styles.strip,
          { flexDirection: strip?.orientation === 'vertical' ? 'column' : 'row' },
          stones > 0 ? styles.raised : null,
          style,
        ]}
      >
        {Array.from({ length: stones }, (_, index) => (
          <StoneIcon key={index} hex={hex} size={AIRBORNE_STONE} />
        ))}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  strip: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  raised: {
    // A deliberately heavy drop shadow, so the stones read as hovering well
    // above the board rather than sitting flush on it.
    shadowColor: '#0f172a',
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 8 },
    elevation: 14,
  },
});

export default AirborneStrip;
