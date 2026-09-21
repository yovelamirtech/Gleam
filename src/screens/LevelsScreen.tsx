import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ImageBackground, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BannerAdBox } from '../ads/BannerAdBox';
import SettingsButton from '../components/SettingsButton';
import { LEVEL_COUNT } from '../constants/board';
import { preparedLevelFor } from '../game/levels';
import type { RootStackParamList } from '../navigation/types';
import { initialProgress, loadProgress, type Progress } from '../storage/progress';
import { colors } from '../theme/colors';
import {
  LEVEL_TILE,
  LEVEL_TILE_GAP,
  WALL_HEIGHT,
  WALL_WIDTH,
  levelAtPoint,
  levelTilePosition,
} from '../ui/levelsWall';
import {
  clampViewport,
  fitViewport,
  viewportStyle,
  zoomAround,
  type ViewportBounds,
} from '../ui/viewport';

type Props = NativeStackScreenProps<RootStackParamList, 'Levels'>;

/**
 * The unified levels wall: every level's full preview artwork on one giant
 * canvas, only the centre level unlocked at the start, free pan/zoom to
 * browse - see HANDOFF.md's "unified wall" item. Unlike the board-level
 * version of the same idea (still a separate, harder round - it touches
 * Skia stone rendering, this doesn't), this wall is just 20 images, so a
 * plain transformed `View` is enough; no tiled/virtualized rendering needed.
 */
export default function LevelsScreen({ navigation }: Props) {
  const [progress, setProgress] = useState<Progress>(initialProgress);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const insets = useSafeAreaInsets();

  // Reloaded on every focus, not just on mount, so returning from a level
  // (or a progress reset in Settings) shows the wall's current unlock state.
  useFocusEffect(
    useCallback(() => {
      loadProgress().then(setProgress);
    }, [])
  );

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  const bounds: ViewportBounds = {
    canvasWidth: canvasSize.width,
    canvasHeight: canvasSize.height,
    boardWidth: WALL_WIDTH,
    boardHeight: WALL_HEIGHT,
  };

  const handleTap = useCallback(
    (levelId: number) => {
      const status = progress.levels[levelId]?.status ?? 'locked';
      if (status === 'locked') return;
      navigation.navigate('Boards', { levelId });
    },
    [navigation, progress]
  );

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      setCanvasSize({ width, height });
      const start = fitViewport({
        canvasWidth: width,
        canvasHeight: height,
        boardWidth: WALL_WIDTH,
        boardHeight: WALL_HEIGHT,
      });
      translateX.value = start.translateX;
      translateY.value = start.translateY;
      scale.value = start.scale;
    },
    [translateX, translateY, scale]
  );

  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .averageTouches(true)
      .onChange((event) => {
        const next = clampViewport(
          {
            translateX: translateX.value + event.changeX,
            translateY: translateY.value + event.changeY,
            scale: scale.value,
          },
          bounds
        );
        translateX.value = next.translateX;
        translateY.value = next.translateY;
      });

    const pinch = Gesture.Pinch().onChange((event) => {
      const next = zoomAround(
        { translateX: translateX.value, translateY: translateY.value, scale: scale.value },
        event.focalX,
        event.focalY,
        scale.value * event.scaleChange,
        bounds
      );
      translateX.value = next.translateX;
      translateY.value = next.translateY;
      scale.value = next.scale;
    });

    // A still finger resolves to a tap against the wall the viewport is
    // currently showing; a moving one loses the tap and pans instead.
    const tap = Gesture.Tap()
      .withTestId('levels-wall-tap')
      .onEnd((event) => {
        const wallX = (event.x - translateX.value) / scale.value;
        const wallY = (event.y - translateY.value) / scale.value;
        const levelId = levelAtPoint(wallX, wallY);
        if (levelId !== null) runOnJS(handleTap)(levelId);
      });

    // Race, not Exclusive: Exclusive makes pan `requireToFail` the tap, so a
    // drag can't start moving the wall until the tap gesture times out on its
    // own (~500ms) - the wall reads as stuck unless you hold still first. A
    // race lets both gestures watch the touch from the first frame, so pan
    // takes over the instant the finger moves past the tap's own move
    // threshold, with no wait.
    return Gesture.Simultaneous(Gesture.Race(pan, tap), pinch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bounds.canvasWidth, bounds.canvasHeight, handleTap, scale, translateX, translateY]);

  const animatedStyle = useAnimatedStyle(() =>
    viewportStyle({ translateX: translateX.value, translateY: translateY.value, scale: scale.value })
  );

  return (
    <View style={styles.screen}>
      <GestureDetector gesture={gesture}>
        <View style={styles.wallWrap} onLayout={onLayout} testID="levels-wall">
          <Animated.View
            style={[{ width: WALL_WIDTH, height: WALL_HEIGHT }, animatedStyle]}
          >
            {Array.from({ length: LEVEL_COUNT }, (_, levelId) => {
              const status = progress.levels[levelId]?.status ?? 'locked';
              const { x, y } = levelTilePosition(levelId);
              const prepared = preparedLevelFor(levelId);
              return (
                <LevelTile
                  key={levelId}
                  levelId={levelId}
                  x={x}
                  y={y}
                  locked={status === 'locked'}
                  completed={status === 'completed'}
                  previewSource={prepared?.previewSource}
                />
              );
            })}
          </Animated.View>
        </View>
      </GestureDetector>

      <View style={[styles.header, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        {/* Left, not right: Expo Go's own floating dev-menu bubble also sits
            in the top-right corner on a real device, and covers ours there. */}
        <SettingsButton onPress={() => navigation.navigate('Settings')} />
        <View style={styles.titleBlock}>
          <Text style={[styles.title, styles.textRight]}>Levels</Text>
          <Text style={[styles.subtitle, styles.textRight]}>Pinch to zoom, drag to look around.</Text>
        </View>
      </View>

      <View style={{ paddingBottom: insets.bottom }}>
        <BannerAdBox />
      </View>
    </View>
  );
}

function LevelTile({
  levelId,
  x,
  y,
  locked,
  completed,
  previewSource,
}: {
  levelId: number;
  x: number;
  y: number;
  locked: boolean;
  completed: boolean;
  previewSource?: number;
}) {
  return (
    <View
      testID={`level-tile-${levelId}`}
      style={[
        styles.tile,
        {
          left: x + LEVEL_TILE_GAP / 2,
          top: y + LEVEL_TILE_GAP / 2,
          width: LEVEL_TILE - LEVEL_TILE_GAP,
          height: LEVEL_TILE - LEVEL_TILE_GAP,
        },
      ]}
    >
      {previewSource ? (
        <ImageBackground
          source={previewSource}
          style={styles.tileImage}
          imageStyle={locked && styles.tileImageLocked}
        >
          {locked && (
            <View style={styles.tileLockOverlay}>
              <Text style={styles.tileLockIcon}>🔒</Text>
            </View>
          )}
        </ImageBackground>
      ) : (
        <View style={[styles.tilePlaceholder, locked && styles.tilePlaceholderLocked]}>
          <Text style={styles.tilePlaceholderLabel}>{locked ? '🔒' : levelId + 1}</Text>
        </View>
      )}
      {completed && <View style={styles.tileCompletedBorder} pointerEvents="none" />}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  wallWrap: { flex: 1, overflow: 'hidden' },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
  },
  titleBlock: { flexShrink: 1 },
  textRight: { textAlign: 'right' },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    textShadowColor: colors.background,
    textShadowRadius: 6,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
    textShadowColor: colors.background,
    textShadowRadius: 6,
  },
  tile: {
    position: 'absolute',
    borderWidth: 0.5,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  tileImage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  tileLockIcon: { fontSize: 22 },
  tilePlaceholder: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tilePlaceholderLocked: { backgroundColor: colors.locked },
  tilePlaceholderLabel: { fontSize: 20, fontWeight: '600', color: colors.text },
  tileCompletedBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 3,
    borderColor: colors.completed,
  },
});
