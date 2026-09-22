import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BannerAdBox } from '../ads/BannerAdBox';
import SettingsButton from '../components/SettingsButton';
import { WallGridCanvas } from '../components/WallGridCanvas';
import { BOARDS_PER_LEVEL } from '../constants/board';
import { preparedLevelFor } from '../game/levels';
import { createPlaceholderBoard } from '../game/placeholderBoard';
import type { BoardData, BoardProgress } from '../game/types';
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
import {
  clampViewport,
  fitViewport,
  viewportStyle,
  zoomAround,
  type ViewportBounds,
} from '../ui/viewport';
import BoardScreen from './BoardScreen';

type Props = NativeStackScreenProps<RootStackParamList, 'Boards'>;

/**
 * The unified board wall (HANDOFF.md item 8): every board of a level drawn as
 * its own real, empty grid - the numbers a player needs to plan a drop, via
 * `WallGridCanvas` - on one continuous pannable/zoomable canvas, thin tile
 * borders standing in for the hard screen-to-screen transition
 * `BoardsScreen`/`BoardRoute` used to have. Pinching in on a spot past
 * `PLAYABLE_SCALE` swaps that board's tile for a live, playable
 * `BoardScreen` covering the whole screen - no navigation push, so panning
 * back out returns to exactly where the wall was left.
 *
 * Scoped-down from the fullest reading of the user's ask (see HANDOFF.md item
 * 8): only the board the viewport is centred on ever becomes a live, playable
 * `BoardScreen` (its own pan/zoom, tray, HUD, onboarding, dev tools, sounds -
 * all already tested) rather than every nearby board sharing one interactive
 * session, which would need a much larger rewrite of the gesture/session code
 * to place stones across board boundaries. So entering/leaving play is still
 * a hand-off between two components, not a single continuously-animated
 * canvas with one shared session.
 */
export default function UnifiedBoardScreen({ navigation, route }: Props) {
  const { levelId, boardId: targetBoardId } = route.params;
  const [progress, setProgress] = useState<Progress>(initialProgress);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [activeBoardId, setActiveBoardId] = useState<number | null>(null);
  const insets = useSafeAreaInsets();
  const prepared = preparedLevelFor(levelId);

  // Bumped whenever the player leaves a board they were playing, so
  // `WallGridCanvas` reloads that board's just-saved progress instead of
  // going on showing it as it looked before the player zoomed in.
  const [wallRefreshToken, setWallRefreshToken] = useState(0);
  const previousActiveBoardId = useRef<number | null>(null);
  useEffect(() => {
    if (previousActiveBoardId.current !== null && previousActiveBoardId.current !== activeBoardId) {
      setWallRefreshToken((token) => token + 1);
    }
    previousActiveBoardId.current = activeBoardId;
  }, [activeBoardId]);

  // A synchronous, always-current copy of the active board's own progress,
  // fed by `BoardScreen`'s `onProgress` on every placement - not React state,
  // so a placement never re-renders the wall. `WallGridCanvas` reads it
  // instead of a fresh AsyncStorage read the moment the player leaves a
  // board, since that read can race the session's own debounced write.
  const liveOverridesRef = useRef<Map<number, BoardProgress>>(new Map());
  const activeBoardIdRef = useRef<number | null>(null);
  useEffect(() => {
    activeBoardIdRef.current = activeBoardId;
  }, [activeBoardId]);
  const handleActiveProgress = useCallback((progress: BoardProgress) => {
    if (activeBoardIdRef.current !== null) {
      liveOverridesRef.current.set(activeBoardIdRef.current, progress);
    }
  }, []);

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
      const layoutBounds: ViewportBounds = {
        canvasWidth: width,
        canvasHeight: height,
        boardWidth: WALL_PX_WIDTH,
        boardHeight: WALL_PX_HEIGHT,
      };

      // `wallWrap` also relayouts whenever the banner ad below it mounts or
      // unmounts (it hides the instant a board becomes playable) - onLayout
      // used to always jump the viewport back to `fitViewport` on *every*
      // call, which undid the player's zoom the moment a board they zoomed
      // into actually became playable, dropping scale back under
      // `PLAYABLE_SCALE` and kicking them straight back out to the wall.
      // Only the very first layout should set an initial viewport; a later
      // resize just reclamps whatever the player already has, so it doesn't
      // erase a live pan/zoom for a size change that has nothing to do with it.
      const isInitialLayout = canvasSize.width === 0;
      setCanvasSize({ width, height });

      if (!isInitialLayout) {
        const reclamped = clampViewport(
          { translateX: translateX.value, translateY: translateY.value, scale: scale.value },
          layoutBounds
        );
        translateX.value = reclamped.translateX;
        translateY.value = reclamped.translateY;
        scale.value = reclamped.scale;
        return;
      }

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
    [targetBoardId, translateX, translateY, scale, canvasSize.width]
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

    const pinch = Gesture.Pinch()
      .withTestId('board-wall-pinch')
      .onChange((event) => {
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

  const animatedStyle = useAnimatedStyle(() =>
    viewportStyle({ translateX: translateX.value, translateY: translateY.value, scale: scale.value })
  );

  const activeStatus = activeBoardId !== null ? boardStatus(progress, levelId, activeBoardId) : 'locked';
  const showGameplay = activeBoardId !== null && activeStatus !== 'locked';

  const activeBoard: BoardData | null = useMemo(() => {
    if (activeBoardId === null) return null;
    return prepared
      ? prepared.getBoard(activeBoardId)
      : createPlaceholderBoard(activeBoardId, { levelId: `level-${levelId + 1}` });
  }, [activeBoardId, prepared, levelId]);

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
          {canvasSize.width > 0 ? (
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <WallGridCanvas
                prepared={prepared}
                levelId={levelId}
                width={canvasSize.width}
                height={canvasSize.height}
                translateX={translateX}
                translateY={translateY}
                scale={scale}
                refreshToken={wallRefreshToken}
                excludeBoardId={showGameplay ? activeBoardId : null}
                liveOverrides={liveOverridesRef}
              />
            </View>
          ) : null}
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
                />
              );
            })}
          </Animated.View>
        </View>
      </GestureDetector>

      <View style={[styles.header, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        {/* Left, not right: Expo Go's own floating dev-menu bubble also sits
            in the top-right corner on a real device, and covers ours there. */}
        <View style={styles.leftButtons}>
          <Pressable
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Back to levels"
            testID="wall-back-button"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.backButton}
          >
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
          <SettingsButton onPress={() => navigation.navigate('Settings')} />
        </View>
        <View style={styles.titleBlock}>
          <Text style={[styles.title, styles.textRight]}>{prepared?.name ?? `Level ${levelId + 1}`}</Text>
          <Text style={[styles.subtitle, styles.textRight]}>
            {activeBoardId !== null && !showGameplay
              ? 'Locked - finish a neighbouring board to open it.'
              : 'Pinch in on a board to play it, out to see the whole picture.'}
          </Text>
        </View>
      </View>

      {!showGameplay ? (
        <View style={[styles.adBar, { paddingBottom: insets.bottom }]} pointerEvents="box-none">
          <BannerAdBox />
        </View>
      ) : null}

      {showGameplay && activeBoard && activeBoardId !== null ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none" testID="active-board-overlay">
          <BoardScreen
            board={activeBoard}
            originX={boardTilePosition(activeBoardId).x}
            originY={boardTilePosition(activeBoardId).y}
            translateX={translateX}
            translateY={translateY}
            scale={scale}
            onComplete={handleComplete}
            onProgress={handleActiveProgress}
          />
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
}: {
  boardId: number;
  x: number;
  y: number;
  locked: boolean;
  completed: boolean;
}) {
  return (
    <View
      testID={`board-tile-${boardId}`}
      style={[styles.tile, { left: x, top: y, width: BOARD_PX_X, height: BOARD_PX_Y }]}
    >
      {/* The grid itself is `WallGridCanvas`, one shared Skia canvas behind
          every tile - this View is only the border plus the lock/complete
          overlay. */}
      {locked && <View style={styles.tileLockOverlay} pointerEvents="none" />}
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
  leftButtons: { flexDirection: 'row', gap: 8 },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backIcon: { fontSize: 18, color: colors.textMuted },
  titleBlock: { flexShrink: 1 },
  textRight: { textAlign: 'right' },
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
  // Absolute, like `header` - mounting/unmounting the ad (it hides once a
  // board becomes playable) must never resize `wallWrap`'s own flex layout,
  // since that would re-fire its `onLayout` and reclamp the player's zoom.
  adBar: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  tile: {
    position: 'absolute',
    // In wall-space units, not screen px: the wall's own fit-to-screen scale
    // is roughly 1/20 on a phone (48 boards on one canvas), so a border has
    // to be this many units wide just to survive as one visible pixel once
    // the Animated.View's transform shrinks everything down to fit - the old
    // 0.5 born from copying BoardsScreen's per-tile styling, where borders
    // were never inside a scaled-down transform to begin with.
    borderWidth: BOARD_PX_X * 0.02,
    borderColor: 'rgba(31, 41, 51, 0.25)',
    overflow: 'hidden',
  },
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
});
