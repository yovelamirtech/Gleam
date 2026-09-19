import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import type { BoardSession } from '../game/session';
import { readableTextOn } from '../ui/colors';
import { theme } from '../ui/theme';

interface Props {
  session: BoardSession;
  selected: number | null;
  onSelect: (color: number) => void;
}

/**
 * Colour strip along the bottom of the board.
 *
 * Each swatch shows its number and how many stones the board still owes that
 * colour. Because supply is exact, that count doubles as "cells of this colour
 * left to fill" — colours drop out of the list as they are finished.
 */
export function ColorPicker({ session, selected, onSelect }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      testID="color-picker"
    >
      {session.board.palette.map((entry) => {
        const remaining = session.remainingFor(entry.index);
        if (remaining === 0) return null;
        const active = selected === entry.index;
        return (
          <Pressable
            key={entry.index}
            testID={`color-${entry.number}`}
            accessibilityRole="button"
            accessibilityLabel={`Colour ${entry.number}, ${remaining} stones left`}
            onPress={() => onSelect(entry.index)}
            style={[styles.swatch, { backgroundColor: entry.hex }, active && styles.swatchActive]}
          >
            <Text style={[styles.number, { color: readableTextOn(entry.hex) }]}>{entry.number}</Text>
            <Text style={[styles.count, { color: readableTextOn(entry.hex) }]}>{remaining}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
    alignItems: 'center',
  },
  swatch: {
    width: 42,
    height: 42,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchActive: {
    borderColor: theme.text,
    transform: [{ scale: 1.08 }],
  },
  number: {
    fontSize: 15,
    fontWeight: '700',
  },
  count: {
    fontSize: 10,
    opacity: 0.85,
  },
});

export default ColorPicker;
