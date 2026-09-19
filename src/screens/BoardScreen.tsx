import React, { useCallback, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BoardCanvas, CELL, type DropPreview } from '../components/BoardCanvas';
import ColorPicker from '../components/ColorPicker';
import HudTray from '../components/HudTray';
import { resolveDropHead } from '../game/drop';
import { TRAY_SLOTS } from '../game/geometry';
import { useBoardSession } from '../hooks/useBoardSession';
import type { BoardData } from '../game/types';
import { darken, lighten } from '../ui/colors';
import { theme } from '../ui/theme';
import {
  MAX_SCALE,
  clampViewport,
  fitViewport,
  zoomAround,
  type ViewportBounds,
} from '../ui/viewport';

interface Props {
  board: BoardData;
  /** Back to the levels screen. The board keeps its progress. */
  onExit?: () => void;
}

/**
 * The board screen: a 40x40 grid you pan and zoom around, a colour picker, and
 * a five-slot tray you drag strips of stones out of.
 *
 * Gesture split — one finger on the board pans it, two fingers pinch to zoom,
 * and a drag that starts on the tray carries the strip. That keeps placing a
 * strip from ever fighting with moving the view.
 */
export function BoardScreen({ board, onExit }: Props) {
  const { session, revision, ready } = useBoardSession(board);

  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const canvasRef = useRef<View>(null);
  /** Where the canvas sits on screen, so a finger position can find its cell. */
  const canvasOrigin = useRef({ x: 0, y: 0 });
  const [preview, setPreview] = useState<DropPreview | null>(null);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const fingerX = useSharedValue(0);
  const fingerY = useSharedValue(0);
  const dragging = useSharedValue(0);

  const bounds = useMemo<ViewportBounds>(
    () => ({
      canvasWidth: canvasSize.width,
      canvasHeight: canvasSize.height,
      boardWidth: board.width * CELL,
      boardHeight: board.height * CELL,
    }),
    [canvasSize, board.width, board.height]
  );

  const strip = session.heldStrip;
  const entry = strip ? board.palette[strip.color] : null;

  const onCanvasLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      setCanvasSize({ width, height });
      canvasRef.current?.measureInWindow((x, y) => {
        canvasOrigin.current = { x, y };
      });
      const next = fitViewport({
        canvasWidth: width,
        canvasHeight: height,
        boardWidth: board.width * CELL,
        boardHeight: board.height * CELL,
      });
      // Start zoomed in enough to read the numbers, centred on the board.
      const start = zoomAround(next, width / 2, height / 2, Math.min(MAX_SCALE, next.scale * 2.2), {
        canvasWidth: width,
        canvasHeight: height,
        boardWidth: board.width * CELL,
        boardHeight: board.height * CELL,
      });
      translateX.value = start.translateX;
      translateY.value = start.translateY;
      scale.value = start.scale;
    },
    [board.width, board.height, scale, translateX, translateY]
  );

  /** Screen point to the cell the strip head would land on. */
  const headAt = useCallback(
    (screenX: number, screenY: number) =>
      resolveDropHead(screenX, screenY, {
        board,
        strip: session.heldStrip,
        canvasOrigin: canvasOrigin.current,
        canvasSize,
        viewport: {
          translateX: translateX.value,
          translateY: translateY.value,
          scale: scale.value,
        },
        cellSize: CELL,
      }),
    [session, board, canvasSize, translateX, translateY, scale]
  );

  const updatePreview = useCallback(
    (screenX: number, screenY: number) => {
      const held = session.heldStrip;
      const head = headAt(screenX, screenY);
      if (!held || !head) {
        setPreview(null);
        return;
      }
      setPreview({
        row: head.row,
        col: head.col,
        count: held.count,
        orientation: held.orientation,
        color: held.color,
        hex: board.palette[held.color].hex,
        valid: session.canPlace(head.row, head.col),
      });
    },
    [session, board.palette, headAt]
  );

  const commitDrop = useCallback(
    (screenX: number, screenY: number) => {
      setPreview(null);
      const head = headAt(screenX, screenY);
      // The tray is the strip: releasing off the grid, or onto cells that want
      // another colour, simply leaves the stones where they were. Nothing is
      // consumed on a miss, which is what keeps the supply exact.
      if (!head) return;
      session.place(head.row, head.col);
    },
    [session, headAt]
  );

  const dragGesture = useMemo(
    () =>
      Gesture.Pan()
        .onBegin((event) => {
          fingerX.value = event.absoluteX;
          fingerY.value = event.absoluteY;
          dragging.value = withTiming(1, { duration: 90 });
          runOnJS(updatePreview)(event.absoluteX, event.absoluteY);
        })
        .onUpdate((event) => {
          fingerX.value = event.absoluteX;
          fingerY.value = event.absoluteY;
          runOnJS(updatePreview)(event.absoluteX, event.absoluteY);
        })
        .onEnd((event) => {
          dragging.value = 0;
          runOnJS(commitDrop)(event.absoluteX, event.absoluteY);
        })
        .onFinalize(() => {
          dragging.value = 0;
        }),
    [commitDrop, dragging, fingerX, fingerY, updatePreview]
  );

  const viewportGesture = useMemo(() => {
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

    return Gesture.Simultaneous(pan, pinch);
  }, [bounds, scale, translateX, translateY]);

  const floatingStripStyle = useAnimatedStyle(() => ({
    opacity: dragging.value,
    transform: [
      { translateX: fingerX.value - CELL / 2 },
      { translateY: fingerY.value - CELL * 2 },
    ],
  }));

  const handleSelectColor = useCallback(
    (color: number) => {
      session.selectColor(color, session.heldStrip?.orientation ?? 'horizontal');
    },
    [session]
  );

  const stripHex = entry?.hex ?? theme.accent;
  const complete = session.isComplete();

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          onPress={onExit}
          accessibilityRole="button"
          accessibilityLabel="Back to levels"
          testID="exit-board"
          style={styles.exit}
        >
          <Text style={styles.exitLabel}>Back</Text>
        </Pressable>
        <Text style={styles.progress} testID="board-progress">
          {session.stonesPlaced} / {session.stonesTotal}
        </Text>
      </View>

      <GestureDetector gesture={viewportGesture}>
        <View ref={canvasRef} style={styles.canvasWrap} onLayout={onCanvasLayout}>
          {canvasSize.width > 0 ? (
            <BoardCanvas
              session={session}
              revision={revision}
              preview={preview}
              width={canvasSize.width}
              height={canvasSize.height}
              translateX={translateX}
              translateY={translateY}
              scale={scale}
            />
          ) : null}
          {complete ? (
            <View style={styles.completeBanner} testID="board-complete">
              <Text style={styles.completeText}>Board complete</Text>
            </View>
          ) : null}
          {!ready ? <View style={styles.loading} testID="board-loading" /> : null}
        </View>
      </GestureDetector>

      <ColorPicker session={session} selected={strip?.color ?? null} onSelect={handleSelectColor} />

      <HudTray
        strip={strip}
        entry={entry}
        remaining={strip ? session.remainingFor(strip.color) : 0}
        onRotate={() => session.rotateStrip()}
        onSetCount={(count) => session.setStripCount(Math.min(count, TRAY_SLOTS))}
        dragGesture={dragGesture}
      />

      <Animated.View
        pointerEvents="none"
        style={[
          styles.floating,
          { flexDirection: strip?.orientation === 'vertical' ? 'column' : 'row' },
          floatingStripStyle,
        ]}
      >
        {strip
          ? Array.from({ length: strip.count }, (_, index) => (
              <View
                key={index}
                style={[
                  styles.floatingStone,
                  { backgroundColor: stripHex, borderColor: darken(stripHex, 0.3) },
                ]}
              >
                <View style={[styles.floatingGleam, { backgroundColor: lighten(stripHex, 0.6) }]} />
              </View>
            ))
          : null}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.appBackground,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  exit: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: theme.panel,
    borderWidth: 1,
    borderColor: theme.panelBorder,
  },
  exitLabel: {
    color: theme.text,
    fontWeight: '600',
  },
  progress: {
    color: theme.textMuted,
    fontVariant: ['tabular-nums'],
  },
  canvasWrap: {
    flex: 1,
    margin: 12,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: theme.boardBackground,
    borderWidth: 1,
    borderColor: theme.panelBorder,
  },
  loading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.appBackground,
    opacity: 0.7,
  },
  completeBanner: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: theme.positive,
  },
  completeText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  floating: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  floatingStone: {
    width: CELL,
    height: CELL,
    borderRadius: 6,
    borderWidth: 1.5,
  },
  floatingGleam: {
    position: 'absolute',
    top: 3,
    left: 3,
    width: CELL * 0.3,
    height: CELL * 0.22,
    borderRadius: CELL * 0.15,
  },
});

export default BoardScreen;
