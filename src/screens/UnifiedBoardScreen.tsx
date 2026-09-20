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
import {
  clampViewport,
  fitViewport,
  viewportStyle,
  zoomAround,
  type ViewportBounds,
} from '../ui/viewport';
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
/** The whole level's `preview.png` at its own native resolution (960x720 for an 8x6 wall of 40-cell boards at 3px/cell). */
const WALL_ARTWORK_NATIVE_WIDTH = BOARDS_X * PREVIEW_BOARD_PX;
const WALL_ARTWORK_NATIVE_HEIGHT = BOARDS_Y * PREVIEW_BOARD_PX;

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
  // Temporary on-screen diagnostic (HANDOFF.md item 17/19/20): this is what
  // actually found the real bug - the readout showed a perfectly correct
  // viewport (scale/translate exactly matching a manual fitViewport
  // calculation) on a screen that still rendered nothing, which pointed at
  // how that viewport gets *applied* (`viewportStyle`, `viewport.ts`) rather
  // than at the viewport maths or the artwork rendering technique. Left in
  // for one more round pending on-device confirmation of the latest attempt
  // at that fix; remove once confirmed.
  const [debugInfo, setDebugInfo] = useState('layout pending');
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
      setDebugInfo(
        `canvas ${width.toFixed(0)}x${height.toFixed(0)} wall ${WALL_PX_WIDTH}x${WALL_PX_HEIGHT} ` +
          `scale ${start.scale.toFixed(4)} tx ${start.translateX.toFixed(1)} ty ${start.translateY.toFixed(1)}`
      );
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
            {prepared?.previewSource ? (
              // One shared Image for the whole level, not one per tile: each
              // tile used to render its own copy of this artwork inside a
              // `position:'absolute'` box with both an `overflow:'hidden'`
              // parent *and* its own `transform: scale` - correct in every
              // test (RN Testing Library never actually rasterizes anything),
              // but a real device rendered nothing at all until the wall was
              // zoomed in far past where the wall's own transform should have
              // made that unnecessary. One plain, untransformed-parent Image
              // behind the tiles removes that combination entirely; the tiles
              // above it are just borders and lock/complete overlays now.
              <Image
                source={prepared.previewSource}
                style={[
                  styles.wallArtworkImage,
                  {
                    width: WALL_ARTWORK_NATIVE_WIDTH,
                    height: WALL_ARTWORK_NATIVE_HEIGHT,
                    // Anchors the scale at the image's own top-left corner
                    // instead of its centre (RN's default, like CSS's) - see
                    // `viewportStyle`'s comment in `viewport.ts` for why that
                    // matters and why this is `[0, 0, 0]` (three plain
                    // numbers), not a `'0 0'` string (RN's docs say a string
                    // needs explicit `%`/`px` units to parse, and silently
                    // falls back to the 50%/50% default otherwise - which is
                    // what this was before, and why it never worked).
                    transformOrigin: [0, 0, 0],
                    transform: [{ scale: ARTWORK_SCALE }],
                  },
                ]}
              />
            ) : null}
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
                  hasArtwork={Boolean(prepared?.previewSource)}
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
          <Text style={[styles.title, styles.textRight]}>{prepared?.name ?? `Level ${levelId + 1}`}</Text>
          <Text style={[styles.subtitle, styles.textRight]}>
            {activeBoardId !== null && !showGameplay
              ? 'Locked - finish a neighbouring board to open it.'
              : 'Pinch in on a board to play it, out to see the whole picture.'}
          </Text>
          {/* Temporary diagnostic, see the debugInfo comment above - remove once confirmed. */}
          <Text style={[styles.debugText, styles.textRight]} testID="board-wall-debug">
            {debugInfo}
          </Text>
        </View>
      </View>

      {!showGameplay ? (
        <View style={[styles.adBar, { paddingBottom: insets.bottom }]} pointerEvents="box-none">
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
  hasArtwork,
}: {
  boardId: number;
  x: number;
  y: number;
  locked: boolean;
  completed: boolean;
  hasArtwork: boolean;
}) {
  return (
    <View
      testID={`board-tile-${boardId}`}
      style={[styles.tile, { left: x, top: y, width: BOARD_PX_X, height: BOARD_PX_Y }]}
    >
      {hasArtwork ? (
        <>
          {/* The artwork itself is one shared Image behind every tile (see
              above) - a locked tile used to also dim its own copy of the
              image directly; this overlay alone reads as "locked" just as
              well without needing a second, per-tile Image. */}
          {locked && <View style={styles.tileLockOverlay} pointerEvents="none" />}
          {completed && <View style={styles.tileCompletedBorder} pointerEvents="none" />}
        </>
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
  // Temporary diagnostic text style, see the debugInfo comment above.
  debugText: {
    fontSize: 11,
    color: colors.danger,
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
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
  wallArtworkImage: { position: 'absolute', left: 0, top: 0 },
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
  // Deliberately more saturated than colors.surface/locked: those read as
  // near-identical to colors.background once the wall's fit-to-screen scale
  // (~1/20) flattens out subtle tone differences, which is what made a level
  // with no prepared artwork yet look like a blank white screen.
  tilePlaceholder: { flex: 1, backgroundColor: '#E2E8F1' },
  tilePlaceholderLocked: { backgroundColor: '#C9D3E0' },
});
