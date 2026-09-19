import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector, type GestureType } from 'react-native-gesture-handler';

import { TRAY_SLOTS } from '../game/geometry';
import type { HeldStrip, PaletteEntry } from '../game/types';
import { darken, lighten } from '../ui/colors';
import { theme } from '../ui/theme';

interface Props {
  strip: HeldStrip | null;
  entry: PaletteEntry | null;
  /** Stones of the held colour the board still owes, the held ones included. */
  remaining: number;
  /** Tapping the strip flips it between horizontal and vertical. */
  onRotate: () => void;
  /** Tapping the nth slot takes n stones instead of a full five. */
  onSetCount: (count: number) => void;
  /** Pan gesture that lifts the strip onto the board; owned by the board screen. */
  dragGesture: GestureType;
}

/**
 * Five-slot stone tray.
 *
 * Picking a colour fills the slots from board supply. Dragging off the tray
 * lifts the filled slots as one strip; tapping the strip rotates it; tapping a
 * single slot trims the strip to that length. There is no separate return
 * button — releasing off the grid, or picking another colour, puts the stones
 * back (BUILD_PLAN.md).
 */
export function HudTray({ strip, entry, remaining, onRotate, onSetCount, dragGesture }: Props) {
  const tap = Gesture.Tap()
    .enabled(strip !== null)
    .onEnd(() => {
      onRotate();
    })
    .runOnJS(true);

  // A drag beats a tap, so lifting the strip never registers as a rotation.
  const gesture = Gesture.Exclusive(dragGesture, tap);

  return (
    <View style={styles.container} testID="hud-tray">
      <GestureDetector gesture={gesture}>
        <View
          style={[styles.slots, strip?.orientation === 'vertical' && styles.slotsVertical]}
          testID="tray-slots"
        >
          {Array.from({ length: TRAY_SLOTS }, (_, index) => {
            const filled = strip !== null && index < strip.count;
            const hex = entry?.hex ?? theme.cellEmpty;
            return (
              <Pressable
                key={index}
                testID={`tray-slot-${index + 1}`}
                accessibilityRole="button"
                accessibilityLabel={`Take ${index + 1} stone${index === 0 ? '' : 's'}`}
                onPress={() => onSetCount(index + 1)}
                style={[
                  styles.slot,
                  filled
                    ? {
                        backgroundColor: hex,
                        borderColor: darken(hex, 0.25),
                        shadowColor: darken(hex, 0.5),
                      }
                    : styles.slotEmpty,
                ]}
              >
                {filled ? (
                  <View style={[styles.gleam, { backgroundColor: lighten(hex, 0.6) }]} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </GestureDetector>

      <View style={styles.meta}>
        <Text style={styles.metaTitle} testID="tray-label">
          {entry ? `Colour ${entry.number}` : 'Pick a colour'}
        </Text>
        <Text style={styles.metaDetail}>
          {strip
            ? `${strip.count} stone${strip.count === 1 ? '' : 's'} · ${strip.orientation} · ${remaining} left`
            : 'Tap a swatch to fill the tray'}
        </Text>
        <Text style={styles.metaHint}>
          {strip ? 'Tap the tray to rotate · drag onto the board to place' : ''}
        </Text>
      </View>
    </View>
  );
}

const SLOT = 34;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: theme.panel,
    borderTopWidth: 1,
    borderTopColor: theme.panelBorder,
  },
  slots: {
    flexDirection: 'row',
    gap: 4,
    padding: 6,
    borderRadius: 14,
    backgroundColor: theme.appBackground,
  },
  slotsVertical: {
    flexDirection: 'column',
  },
  slot: {
    width: SLOT,
    height: SLOT,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotEmpty: {
    backgroundColor: theme.cellEmpty,
    borderColor: theme.panelBorder,
  },
  gleam: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: SLOT * 0.3,
    height: SLOT * 0.22,
    borderRadius: SLOT * 0.15,
    opacity: 0.85,
  },
  meta: {
    flex: 1,
  },
  metaTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.text,
  },
  metaDetail: {
    fontSize: 12,
    color: theme.textMuted,
  },
  metaHint: {
    fontSize: 11,
    color: theme.textMuted,
    opacity: 0.8,
  },
});

export default HudTray;
