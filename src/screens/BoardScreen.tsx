import {
  Canvas,
  Group,
  LinearGradient,
  Path,
  RoundedRect,
  Skia,
  vec,
} from '@shopify/react-native-skia';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BOARD_CELLS_X, BOARD_CELLS_Y, HUD_SLOTS } from '../constants/board';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Board'>;

/** Placeholder palette until the prep script quantizes real level images. */
const DEMO_COLORS = ['#E8746C', '#F2B950', '#6FBF8B', '#5AA9E6', '#A585D8'];

/**
 * The board itself: a 40 x 40 grid of numbered cells the player fills with
 * stones. Placeholder — it draws the grid and one demo strip of faux-3D
 * stones through Skia so the renderer is proven, but nothing is playable
 * yet: no cell numbers, no stone inventory, no drag, no zoom or pan.
 */
export default function BoardScreen({ navigation, route }: Props) {
  const { levelId, boardId } = route.params;
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const canvasSize = Math.min(width - 32, height - insets.top - insets.bottom - 220);
  const cell = canvasSize / BOARD_CELLS_X;

  const gridPath = useMemo(() => {
    const path = Skia.Path.Make();
    for (let x = 0; x <= BOARD_CELLS_X; x += 1) {
      path.moveTo(x * cell, 0);
      path.lineTo(x * cell, BOARD_CELLS_Y * cell);
    }
    for (let y = 0; y <= BOARD_CELLS_Y; y += 1) {
      path.moveTo(0, y * cell);
      path.lineTo(BOARD_CELLS_X * cell, y * cell);
    }
    return path;
  }, [cell]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.exitButton}>
          <Text style={styles.exitLabel}>Exit</Text>
        </Pressable>
        <Text style={styles.headerTitle}>
          Level {levelId + 1} · Board {boardId + 1}
        </Text>
      </View>

      <Canvas style={{ width: canvasSize, height: canvasSize, alignSelf: 'center' }}>
        <Path path={gridPath} style="stroke" strokeWidth={0.5} color={colors.gridLine} />
        {DEMO_COLORS.map((tint, i) => (
          <Stone key={tint} x={i * cell} y={0} size={cell} tint={tint} />
        ))}
      </Canvas>

      <Text style={styles.note}>
        Placeholder board. Cell numbers, stone inventory, drag-to-place and zoom are still to come.
      </Text>

      <View style={styles.hud}>
        {Array.from({ length: HUD_SLOTS }, (_, i) => (
          <View key={i} style={styles.hudSlot} />
        ))}
      </View>
    </View>
  );
}

/**
 * One faux-3D stone: a light-to-dark gradient plus a small highlight, lit from
 * a fixed top-left source, per BUILD_PLAN.md. No real 3D and no animation.
 */
function Stone({ x, y, size, tint }: { x: number; y: number; size: number; tint: string }) {
  const inset = size * 0.08;
  const s = size - inset * 2;
  return (
    <Group transform={[{ translateX: x + inset }, { translateY: y + inset }]}>
      <RoundedRect x={0} y={0} width={s} height={s} r={s * 0.2}>
        <LinearGradient start={vec(0, 0)} end={vec(s, s)} colors={[lighten(tint), tint]} />
      </RoundedRect>
      <RoundedRect
        x={s * 0.18}
        y={s * 0.18}
        width={s * 0.28}
        height={s * 0.28}
        r={s * 0.1}
        color="rgba(255,255,255,0.55)"
      />
    </Group>
  );
}

/** Cheap top-left highlight tint; replaced once the real palette lands. */
function lighten(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * 0.45);
  const r = mix((n >> 16) & 0xff);
  const g = mix((n >> 8) & 0xff);
  const b = mix(n & 0xff);
  return `rgb(${r}, ${g}, ${b})`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  exitButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.accentSoft,
  },
  exitLabel: { color: colors.accent, fontWeight: '600' },
  headerTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  note: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 13,
    paddingHorizontal: 32,
    paddingTop: 16,
  },
  hud: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 20,
    marginTop: 'auto',
  },
  hudSlot: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
