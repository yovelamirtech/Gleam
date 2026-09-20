import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { Image, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BannerAdBox } from '../ads/BannerAdBox';
import SettingsButton from '../components/SettingsButton';
import { BOARDS_PER_LEVEL, BOARDS_X, BOARDS_Y, BOARD_CELLS_X, CELL } from '../constants/board';
import { preparedLevelFor } from '../game/levels';
import { createPlaceholderBoard } from '../game/placeholderBoard';
import type { BoardData } from '../game/types';
import type { RootStackParamList } from '../navigation/types';
import {
  boardStatus,
  initialProgress,
  loadProgress,
  markBoardCompleted,
  saveProgress,
  type Progress,
} from '../storage/progress';
import { colors } from '../theme/colors';
import {
  BOARD_PX_X,
  BOARD_PX_Y,
  WALL_PX_HEIGHT,
  WALL_PX_WIDTH,
  boardTilePosition,
  centreBoardAt,
  isPlayableScale,
} from '../ui/unifiedBoard';
import { clampViewport, fitViewport, zoomAround, type ViewportBounds } from '../ui/viewport';
import BoardScreen from './BoardScreen';

type Props = NativeStackScreenProps<RootStackParamList, 'Boards'>;

/** Pixels per cell in `preview.png`, `tools/prep-images`' default (`--preview-scale`). */
const PREVIEW_SCALE_PX = 3;
const PREVIEW_BOARD_PX = BOARD_CELLS_X * PREVIEW_SCALE_PX;
/**
 * Scales the whole level's `preview.png` so one board's slice of it exactly
 * covers one `BOARD_PX_X`-square wall tile. A fixed constant, not computed
 * from the screen's own size the way `BoardsScreen` used to (`artworkScale`
 * there): every tile here has a fixed size in wall-space units regardless of
 * zoom, since the wall's own pan/zoom transform is what makes it bigger or
 * smaller on screen.
 */
const ARTWORK_SCALE = CELL / PREVIEW_SCALE_PX;

/**
 * The unified board wall (HANDOFF.md item 8): every board of a level's full
 * preview artwork on one continuous pannable/zoomable canvas, thin tile
 * borders standing in for the hard screen-to-screen transition
 * `BoardsScreen`/`BoardRoute` used to have. Pinching in on a spot past
 * `PLAYABLE_SCALE` swaps that board's tile for a live, playable
 * `BoardScreen` covering the whole screen - no navigation push, so panning
 * back out returns to exactly where the wall was left.
 *
 * Scoped-down from the fullest reading of the user's ask (see HANDOFF.md item
 * 8): only the board the viewport is centred on ever becomes a live Skia
 * board: this reuses `BoardScreen` wholesale (its own pan/zoom, tray, HUD,
 * onboarding, dev tools, sounds - all already tested) rather than rendering
 * every nearby board's stones inside one shared canvas, which would need a
 * much larger rewrite of that gesture/session code to place stones in wall
 * coordinates. So the wall shows only mosaic artwork right up to the moment
 * you're zoomed in enough to play - never a *second* live board rendered
 * next to the one you're playing - and entering/leaving play is a hand-off
 * between two components, not a single continuously-animated canvas.
 */
export default function UnifiedBoardScreen({ navigation, route }: Props) {
  const { levelId, boardId: targetBoardId } = route.params;
  const [progress, setProgress] = useState<Progress>(initialProgress);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [activeBoardId, setActiveBoardId] = useState<number | null>(null);
  const insets = useSafeAreaInsets();
  const prepared = preparedLevelFor(levelId);

  // Reloaded on every focus, not just on mount, so returning from the levels
  // wall (or a progress reset in Settings) shows this wall's current unlock
  // state.
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
    boardWidth: WALL_PX_WIDTH,
    boardHeight: WALL_PX_HEIGHT,
  };

  /**
   * Recomputed on every pan/pinch step, but only ever pushed to React state
   * (and so only ever re-renders) when the board it names actually changes.
   */
  const updateActiveBoard = useCallback(() => {
    const viewport = { translateX: translateX.value, translateY: translateY.value, scale: scale.value };
    const centre = isPlayableScale(viewport.scale)
      ? centreBoardAt(viewport, canvasSize.width, canvasSize.height)
      : null;
    setActiveBoardId((current) => (current === centre ? current : centre));
  }, [canvasSize.width, canvasSize.height, scale, translateX, translateY]);

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      setCanvasSize({ width, height });
      const layoutBounds: ViewportBounds = {
        canvasWidth: width,
        canvasHeight: height,
        boardWidth: WALL_PX_WIDTH,
        boardHeight: WALL_PX_HEIGHT,
      };

      // Dev-tools shortcut (DevToolsScreen's "jump to a board"): start already
      // zoomed in and playing that board, instead of the whole wall's fit view.
      if (targetBoardId !== undefined) {
        const { x, y } = boardTilePosition(targetBoardId);
        const targetScale = 1;
        const zoomed = clampViewport(
          {
            translateX: width / 2 - (x + BOARD_PX_X / 2) * targetScale,
            translateY: height / 2 - (y + BOARD_PX_Y / 2) * targetScale,
            scale: targetScale,
          },
          layoutBounds
        );
        translateX.value = zoomed.translateX;
        translateY.value = zoomed.translateY;
        scale.value = zoomed.scale;
        setActiveBoardId(targetBoardId);
        return;
      }

      const start = fitViewport(layoutBounds);
      translateX.value = start.translateX;
      translateY.value = start.translateY;
      scale.value = start.scale;
    },
    [targetBoardId, translateX, translateY, scale]
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
        runOnJS(updateActiveBoard)();
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
      runOnJS(updateActiveBoard)();
    });

    return Gesture.Simultaneous(pan, pinch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bounds.canvasWidth, bounds.canvasHeight, scale, translateX, translateY, updateActiveBoard]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const activeStatus = activeBoardId !== null ? boardStatus(progress, levelId, activeBoardId) : 'locked';
  const showGameplay = activeBoardId !== null && activeStatus !== 'locked';

  const activeBoard: BoardData | null = useMemo(() => {
    if (activeBoardId === null) return null;
    return prepared
      ? prepared.getBoard(activeBoardId)
      : createPlaceholderBoard(activeBoardId, { levelId: `level-${levelId + 1}` });
  }, [activeBoardId, prepared, levelId]);

  /** Zoom back out to the whole wall - leaving a board never leaves the level. */
  const zoomToWall = useCallback(() => {
    if (canvasSize.width === 0) return;
    const whole = fitViewport({
      canvasWidth: canvasSize.width,
      canvasHeight: canvasSize.height,
      boardWidth: WALL_PX_WIDTH,
      boardHeight: WALL_PX_HEIGHT,
    });
    translateX.value = whole.translateX;
    translateY.value = whole.translateY;
    scale.value = whole.scale;
    setActiveBoardId(null);
  }, [canvasSize, scale, translateX, translateY]);

  const handleComplete = useCallback(() => {
    if (activeBoardId === null) return;
    loadProgress()
      .then((current) => {
        const wasLevelComplete = current.levels[levelId]?.status === 'completed';
        const next = markBoardCompleted(current, levelId, activeBoardId);
        return saveProgress(next).then(() => {
          setProgress(next);
          const isLevelComplete = next.levels[levelId]?.status === 'completed';
          if (!wasLevelComplete && isLevelComplete) {
            navigation.replace('LevelComplete', { levelId });
          }
        });
      })
      .catch(() => {
        // A failed write just means the unlock is re-derived next time progress loads.
      });
  }, [activeBoardId, levelId, navigation]);

  return (
    <View style={styles.screen}>
      <GestureDetector gesture={gesture}>
        <View style={styles.wallWrap} onLayout={onLayout} testID="board-wall">
          <Animated.View style={[{ width: WALL_PX_WIDTH, height: WALL_PX_HEIGHT }, animatedStyle]}>
            {Array.from({ length: BOARDS_PER_LEVEL }, (_, boardId) => {
              const status = boardStatus(progress, levelId, boardId);
              const { x, y } = boardTilePosition(boardId);
              return (
                <BoardTile
                  key={boardId}
                  boardId={boardId}
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
        <View>
          <Text style={styles.title}>{prepared?.name ?? `Level ${levelId + 1}`}</Text>
          <Text style={styles.subtitle}>
            {activeBoardId !== null && !showGameplay
              ? 'Locked - finish a neighbouring board to open it.'
              : 'Pinch in on a board to play it, out to see the whole picture.'}
          </Text>
        </View>
        <SettingsButton onPress={() => navigation.navigate('Settings')} />
      </View>

      {!showGameplay ? (
        <View style={{ paddingBottom: insets.bottom }} pointerEvents="box-none">
          <BannerAdBox />
        </View>
      ) : null}

      {showGameplay && activeBoard ? (
        <View style={StyleSheet.absoluteFill} testID="active-board-overlay">
          <BoardScreen board={activeBoard} onExit={zoomToWall} onComplete={handleComplete} />
        </View>
      ) : null}
    </View>
  );
}

function BoardTile({
  boardId,
  x,
  y,
  locked,
  completed,
  previewSource,
}: {
  boardId: number;
  x: number;
  y: number;
  locked: boolean;
  completed: boolean;
  previewSource?: number;
}) {
  const col = boardId % BOARDS_X;
  const row = Math.floor(boardId / BOARDS_X);

  return (
    <View
      testID={`board-tile-${boardId}`}
      style={[styles.tile, { left: x, top: y, width: BOARD_PX_X, height: BOARD_PX_Y }]}
    >
      {previewSource ? (
        <View style={styles.tileArtwork}>
          <Image
            source={previewSource}
            style={[
              styles.tileArtworkImage,
              {
                // Decoded at the source PNG's own resolution (a few hundred
                // px) and blown up to wall size by a GPU transform, not by
                // native width/height: 48 tiles each decoding a copy of the
                // artwork *upscaled* to its wall-space size (thousands of px
                // square) is tens of megapixels each, ~48x over - on a real
                // device that's the difference between this rendering and a
                // blank white screen with everything pushed off-bounds.
                width: BOARDS_X * PREVIEW_BOARD_PX,
                height: BOARDS_Y * PREVIEW_BOARD_PX,
                left: -col * BOARD_PX_X,
                top: -row * BOARD_PX_Y,
                transform: [{ scale: ARTWORK_SCALE }],
                transformOrigin: '0 0',
              },
              locked && styles.tileImageLocked,
            ]}
          />
          {locked && <View style={styles.tileLockOverlay} pointerEvents="none" />}
          {completed && <View style={styles.tileCompletedBorder} pointerEvents="none" />}
        </View>
      ) : (
        <View style={[styles.tilePlaceholder, locked && styles.tilePlaceholderLocked]} />
      )}
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
  title: {
    fontSize: 24,
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
  tileArtwork: { flex: 1 },
  tileArtworkImage: { position: 'absolute' },
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
    borderWidth: 3,
    borderColor: colors.completed,
  },
  tilePlaceholder: { flex: 1, backgroundColor: colors.surface },
  tilePlaceholderLocked: { backgroundColor: colors.locked },
});
