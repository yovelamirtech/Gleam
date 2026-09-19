import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';

import { TRAY_SLOTS } from '../game/geometry';
import type { PaletteEntry, TraySelection } from '../game/types';
import { lighten } from '../ui/colors';
import { theme } from '../ui/theme';
import { fillExtent, type TrayMetrics } from '../ui/trayGesture';
import { StoneIcon } from './StoneIcon';

export const TRAY_SLOT = 40;
export const TRAY_GAP = 5;
export const TRAY_PADDING = 7;

export const trayMetrics: TrayMetrics = {
  slotSize: TRAY_SLOT,
  gap: TRAY_GAP,
  padding: TRAY_PADDING,
  slots: TRAY_SLOTS,
};

/** Anything GestureDetector accepts, including composed gestures. */
type BoardGesture = React.ComponentProps<typeof GestureDetector>['gesture'];

interface Props {
  selection: TraySelection | null;
  entry: PaletteEntry | null;
  /** Stones in the pile for the selected colour, capped at the tray size. */
  stones: number;
  /** Stones under the finger right now; the fill behind them shows the count. */
  count: number;
  /** Swipe-and-pull gesture, owned by the board screen. */
  gesture: BoardGesture;
}

/**
 * The stone tray.
 *
 * The tray shows the pile, not the strip in hand, so the stones stay put as you
 * take from them. Touching takes one; sliding sideways fills the panel behind
 * the stones up to the one under your finger; pulling up lifts that many into
 * the air. Rotation is not here — it happens on the airborne stones themselves.
 */
export function HudTray({ selection, entry, stones, count, gesture }: Props) {
  const hex = entry?.hex ?? theme.cellEmpty;
  const fill = fillExtent(selection ? count : 0, trayMetrics);

  return (
    <View style={styles.container} testID="hud-tray">
      <GestureDetector gesture={gesture}>
        <View style={styles.tray} testID="tray-slots">
          {selection && fill.width > 0 ? (
            <View
              testID="tray-fill"
              style={[styles.fill, { left: fill.x, width: fill.width, backgroundColor: lighten(hex, 0.55) }]}
            />
          ) : null}
          {Array.from({ length: TRAY_SLOTS }, (_, index) => {
            const present = index < stones;
            return (
              <View key={index} testID={`tray-stone-${index + 1}`} style={styles.slot}>
                {present ? <StoneIcon hex={hex} size={TRAY_SLOT} /> : null}
              </View>
            );
          })}
        </View>
      </GestureDetector>

      <View style={styles.meta}>
        <Text style={styles.metaTitle} testID="tray-label">
          {entry ? `Colour ${entry.number}` : 'Pick a colour'}
        </Text>
        <Text style={styles.metaDetail} testID="tray-detail">
          {selection
            ? `Taking ${count} of ${stones} · slide for more, pull up to lift`
            : 'Tap a swatch below the board'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: theme.panel,
    borderTopWidth: 1,
    borderTopColor: theme.panelBorder,
  },
  tray: {
    flexDirection: 'row',
    gap: TRAY_GAP,
    padding: TRAY_PADDING,
    borderRadius: 14,
    backgroundColor: theme.appBackground,
  },
  fill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: 14,
  },
  slot: {
    width: TRAY_SLOT,
    height: TRAY_SLOT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: {
    flex: 1,
  },
  metaTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.text,
  },
  metaDetail: {
    fontSize: 11,
    color: theme.textMuted,
  },
});

export default HudTray;
