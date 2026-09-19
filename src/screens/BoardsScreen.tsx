import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BOARDS_PER_LEVEL, BOARDS_X } from '../constants/board';
import type { RootStackParamList } from '../navigation/types';
import { boardStatus, initialProgress, loadProgress, type Progress } from '../storage/progress';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Boards'>;

/**
 * The 8 x 6 wall of boards inside one level. Same unlock rule as the levels
 * screen one layer up: a completed board opens the four boards touching it.
 * Placeholder — the tiles carry no artwork yet.
 */
export default function BoardsScreen({ navigation, route }: Props) {
  const { levelId } = route.params;
  const [progress, setProgress] = useState<Progress>(initialProgress);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadProgress().then(setProgress);
  }, []);

  const gutter = 6;
  const tileSize = Math.floor((width - 32 - gutter * (BOARDS_X - 1)) / BOARDS_X);

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom }]}>
      <Text style={styles.title}>Level {levelId + 1}</Text>
      <Text style={styles.subtitle}>48 boards. Finish one to open its neighbours.</Text>

      <View style={[styles.grid, { gap: gutter }]}>
        {Array.from({ length: BOARDS_PER_LEVEL }, (_, boardId) => {
          const status = boardStatus(progress, levelId, boardId);
          const unlocked = status !== 'locked';
          return (
            <Pressable
              key={boardId}
              disabled={!unlocked}
              onPress={() => navigation.navigate('Board', { levelId, boardId })}
              style={[
                styles.tile,
                { width: tileSize, height: tileSize },
                !unlocked && styles.tileLocked,
                status === 'completed' && styles.tileCompleted,
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: 16 },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted, marginTop: 4, marginBottom: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  tile: {
    borderRadius: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tileLocked: { backgroundColor: colors.locked, borderColor: colors.locked },
  tileCompleted: { backgroundColor: colors.completed, borderColor: colors.completed },
});
