import React from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import type { AirborneStrip as AirborneStripState, PaletteEntry } from '../game/types';
import { darken, lighten } from '../ui/colors';

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
 */
export function AirborneStrip({ strip, entry, x, y, gesture }: Props) {
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }],
  }));

  if (!strip || !entry) return null;
  const hex = entry.hex;

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        testID="airborne-strip"
        style={[
          styles.strip,
          { flexDirection: strip.orientation === 'vertical' ? 'column' : 'row' },
          style,
        ]}
      >
        {Array.from({ length: strip.count }, (_, index) => (
          <View
            key={index}
            style={[styles.stone, { backgroundColor: hex, borderColor: darken(hex, 0.3) }]}
          >
            <View style={[styles.gleam, { backgroundColor: lighten(hex, 0.6) }]} />
          </View>
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
    // A little lift, so the stones read as hovering over the board.
    shadowColor: '#0f172a',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  stone: {
    width: AIRBORNE_STONE,
    height: AIRBORNE_STONE,
    borderRadius: 7,
    borderWidth: 1.5,
  },
  gleam: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: AIRBORNE_STONE * 0.3,
    height: AIRBORNE_STONE * 0.22,
    borderRadius: AIRBORNE_STONE * 0.15,
  },
});

export default AirborneStrip;
