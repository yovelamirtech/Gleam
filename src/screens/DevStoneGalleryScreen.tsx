import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Canvas, Picture, Skia, createPicture } from '@shopify/react-native-skia';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { generatePalette } from '../game/palette';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { drawStone } from '../ui/drawStone';

type Props = NativeStackScreenProps<RootStackParamList, 'DevStoneGallery'>;

const PALETTE = generatePalette(24);
const SIZES = [24, 40, 64, 96] as const;
const GRID_COLUMNS = 6;
const GAP = 4;

/**
 * Dev tool: every palette colour's stone, free of any board or game state,
 * at a chosen cell size (`src/ui/drawStone.ts` is meant to hold up from
 * `CELL = 24` on the real board up to a size big enough to see each facet
 * clearly) - a place to check the faux-3D style on its own, per
 * BUILD_PLAN.md's dev-tools list.
 */
export default function DevStoneGalleryScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [size, setSize] = useState<(typeof SIZES)[number]>(40);

  const gridWidth = GRID_COLUMNS * size + (GRID_COLUMNS - 1) * GAP;
  const rows = Math.ceil(PALETTE.length / GRID_COLUMNS);
  const gridHeight = rows * size + (rows - 1) * GAP;

  const picture = useMemo(
    () =>
      createPicture((canvas) => {
        PALETTE.forEach((entry, index) => {
          const col = index % GRID_COLUMNS;
          const row = Math.floor(index / GRID_COLUMNS);
          drawStone(canvas, col * (size + GAP), row * (size + GAP), size, entry.hex);
        });
      }, Skia.XYWHRect(0, 0, gridWidth, gridHeight)),
    [size, gridWidth, gridHeight]
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>Stone style gallery</Text>
      </View>

      <View style={styles.sizeRow}>
        {SIZES.map((option) => (
          <Pressable
            key={option}
            onPress={() => setSize(option)}
            accessibilityRole="button"
            accessibilityLabel={`${option} pixel stones`}
            style={[styles.sizeButton, option === size && styles.sizeButtonActive]}
          >
            <Text style={[styles.sizeLabel, option === size && styles.sizeLabelActive]}>{option}px</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.canvasWrap}>
        <Canvas style={{ width: gridWidth, height: gridHeight }}>
          <Picture picture={picture} />
        </Canvas>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  back: { fontSize: 16, color: colors.textMuted },
  sizeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 16,
    marginBottom: 20,
  },
  sizeButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sizeButtonActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  sizeLabel: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  sizeLabelActive: { color: '#ffffff' },
  canvasWrap: { alignItems: 'center' },
});
