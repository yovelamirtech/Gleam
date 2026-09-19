import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BOARDS_PER_LEVEL, BOARDS_X, BOARDS_Y, BOARD_CELLS_X, BOARD_CELLS_Y } from '../constants/board';
import { preparedLevelFor } from '../game/levels';
import type { RootStackParamList } from '../navigation/types';
import { boardStatus, initialProgress, loadProgress, type Progress } from '../storage/progress';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Boards'>;

/** Pixels per cell in `preview.png`, `tools/prep-images`' default (`--preview-scale`). */
const PREVIEW_SCALE_PX = 3;
const PREVIEW_BOARD_PX = BOARD_CELLS_X * PREVIEW_SCALE_PX;

/**
 * The 8 x 6 wall of boards inside one level. Same unlock rule as the levels
 * screen one layer up: a completed board opens the four boards touching it.
 * A prepared level's boards each show the matching crop of the level preview;
 * a level with no prepared art yet still shows plain tiles.
 */
export default function BoardsScreen({ navigation, route }: Props) {
  const { levelId } = route.params;
  const [progress, setProgress] = useState<Progress>(initialProgress);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const prepared = preparedLevelFor(levelId);

  useEffect(() => {
    loadProgress().then(setProgress);
  }, []);

  const gutter = 6;
  const tileSize = Math.floor((width - 32 - gutter * (BOARDS_X - 1)) / BOARDS_X);
  const artworkScale = tileSize / PREVIEW_BOARD_PX;

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom }]}>
      <Text style={styles.title}>{prepared?.name ?? `Level ${levelId + 1}`}</Text>
      <Text style={styles.subtitle}>48 boards. Finish one to open its neighbours.</Text>

      <View style={[styles.grid, { gap: gutter }]}>
        {Array.from({ length: BOARDS_PER_LEVEL }, (_, boardId) => {
          const status = boardStatus(progress, levelId, boardId);
          const unlocked = status !== 'locked';
          const col = boardId % BOARDS_X;
          const row = Math.floor(boardId / BOARDS_X);

          if (!prepared) {
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
          }

          return (
            <Pressable
              key={boardId}
              disabled={!unlocked}
              onPress={() => navigation.navigate('Board', { levelId, boardId })}
              style={[styles.tileArtwork, { width: tileSize, height: tileSize }]}
            >
              <Image
                source={prepared.previewSource}
                style={[
                  {
                    position: 'absolute',
                    width: BOARDS_X * BOARD_CELLS_X * PREVIEW_SCALE_PX * artworkScale,
                    height: BOARDS_Y * BOARD_CELLS_Y * PREVIEW_SCALE_PX * artworkScale,
                    left: -col * tileSize,
                    top: -row * tileSize,
                  },
                  !unlocked && styles.tileImageLocked,
                ]}
              />
              {!unlocked && <View style={styles.tileLockOverlay} />}
              {status === 'completed' && <View style={styles.tileCompletedBorder} />}
            </Pressable>
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
  tileArtwork: {
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  tileImageLocked: { opacity: 0.35 },
  tileLockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  tileCompletedBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 2,
    borderColor: colors.completed,
  },
});
