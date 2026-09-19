import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LEVELS_X, LEVEL_COUNT } from '../constants/board';
import type { RootStackParamList } from '../navigation/types';
import { initialProgress, loadProgress, type Progress } from '../storage/progress';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Levels'>;

/**
 * The "picture wall": every level is a tile on one grid, and completing a
 * level opens the levels next to it. Placeholder — the tiles show an index
 * instead of the level's artwork.
 */
export default function LevelsScreen({ navigation }: Props) {
  const [progress, setProgress] = useState<Progress>(initialProgress);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadProgress().then(setProgress);
  }, []);

  const gutter = 12;
  const tileSize = Math.floor((width - gutter * (LEVELS_X + 1)) / LEVELS_X);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
    >
      <Text style={styles.title}>Levels</Text>
      <Text style={styles.subtitle}>Finish a level to open the ones next to it.</Text>

      <View style={[styles.grid, { gap: gutter }]}>
        {Array.from({ length: LEVEL_COUNT }, (_, levelId) => {
          const status = progress.levels[levelId]?.status ?? 'locked';
          const unlocked = status !== 'locked';
          return (
            <Pressable
              key={levelId}
              disabled={!unlocked}
              onPress={() => navigation.navigate('Boards', { levelId })}
              style={[
                styles.tile,
                { width: tileSize, height: tileSize },
                !unlocked && styles.tileLocked,
                status === 'completed' && styles.tileCompleted,
              ]}
            >
              <Text style={[styles.tileLabel, !unlocked && styles.tileLabelLocked]}>
                {unlocked ? levelId + 1 : '🔒'}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16 },
  title: { fontSize: 28, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted, marginTop: 4, marginBottom: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  tile: {
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLocked: { backgroundColor: colors.locked, borderColor: colors.locked },
  tileCompleted: { borderColor: colors.completed, borderWidth: 2 },
  tileLabel: { fontSize: 20, fontWeight: '600', color: colors.text },
  tileLabelLocked: { fontSize: 18, color: colors.textMuted },
});
