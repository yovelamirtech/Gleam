import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import SettingsButton from '../components/SettingsButton';
import { LEVELS_X, LEVEL_COUNT } from '../constants/board';
import { preparedLevelFor } from '../game/levels';
import type { RootStackParamList } from '../navigation/types';
import { initialProgress, loadProgress, type Progress } from '../storage/progress';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Levels'>;

/**
 * The "picture wall": every level is a tile on one grid, and completing a
 * level opens the levels next to it. A prepared level shows its own preview
 * image; every level past the end of `PREPARED_LEVELS` still shows a plain
 * numbered tile until its source image is prepared.
 */
export default function LevelsScreen({ navigation }: Props) {
  const [progress, setProgress] = useState<Progress>(initialProgress);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Reloaded on every focus, not just on mount, so returning from a level
  // (or a progress reset in Settings) shows the wall's current unlock state.
  useFocusEffect(
    useCallback(() => {
      loadProgress().then(setProgress);
    }, [])
  );

  const gutter = 12;
  const tileSize = Math.floor((width - gutter * (LEVELS_X + 1)) / LEVELS_X);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Levels</Text>
          <Text style={styles.subtitle}>Finish a level to open the ones next to it.</Text>
        </View>
        <SettingsButton onPress={() => navigation.navigate('Settings')} />
      </View>

      <View style={[styles.grid, { gap: gutter }]}>
        {Array.from({ length: LEVEL_COUNT }, (_, levelId) => {
          const status = progress.levels[levelId]?.status ?? 'locked';
          const unlocked = status !== 'locked';
          const prepared = preparedLevelFor(levelId);

          if (!prepared) {
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
          }

          return (
            <Pressable
              key={levelId}
              disabled={!unlocked}
              onPress={() => navigation.navigate('Boards', { levelId })}
              style={[
                styles.tileArtwork,
                { width: tileSize, height: tileSize },
                status === 'completed' && styles.tileCompleted,
              ]}
            >
              <ImageBackground
                source={prepared.previewSource}
                style={styles.tileArtworkImage}
                imageStyle={!unlocked && styles.tileImageLocked}
              >
                {!unlocked && (
                  <View style={styles.tileLockOverlay}>
                    <Text style={styles.tileLabelLocked}>🔒</Text>
                  </View>
                )}
              </ImageBackground>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
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
  tileArtwork: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  tileArtworkImage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tileImageLocked: { opacity: 0.35 },
  tileLockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
