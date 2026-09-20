import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, LayoutRectangle, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS, useSharedValue } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useGameSounds } from '../audio/useGameSounds';
import AirborneStripView, { AIRBORNE_STONE } from '../components/AirborneStrip';
import { BoardCanvas, CELL, type DropPreview } from '../components/BoardCanvas';
import ColorPicker from '../components/ColorPicker';
import HudTray, { trayMetrics } from '../components/HudTray';
import OnboardingOverlay, { type OnboardingStep } from '../components/OnboardingOverlay';
import { DEV_TOOLS_ENABLED } from '../constants/devTools';
import { resolveDropHead } from '../game/drop';
import { useBoardSession } from '../hooks/useBoardSession';
import type { BoardData, Orientation } from '../game/types';
import { hasSeenOnboarding, markOnboardingSeen } from '../storage/onboarding';
import { rotationPivotShift } from '../ui/airborneRotation';
import { theme } from '../ui/theme';
import { countAtX, shouldLift } from '../ui/trayGesture';
import {
  MAX_SCALE,
  clampViewport,
  fitScale,
  fitViewport,
  zoomAround,
  type ViewportBounds,
} from '../ui/viewport';

/** Where the strip's *target* (the cell it would land on) sits relative to the finger. */
const CARRY_OFFSET_Y = AIRBORNE_STONE * 1.7;
/**
 * Extra height the strip *renders* above that target, on top of
 * `CARRY_OFFSET_Y` - the gap that reads as "these stones are hovering over
 * the board" rather than "these stones are sitting on the cell they'll
 * land in", which is what it looked like with the two at the same spot.
 */
const CARRY_VISUAL_LIFT = AIRBORNE_STONE * 1.1;

interface Props {
  board: BoardData;
  /** Back to the levels screen. The board keeps its progress. */
  onExit?: () => void;
  /** Fired once, the moment every cell of the board gets its stone. */
  onComplete?: () => void;
}

/**
 * The board screen.
 *
 * The board takes the whole screen above a thin HUD; the exit button and the
 * progress count float over it rather than taking a bar of their own.
 *
 * Gesture split — one finger on the board pans it, two fingers pinch to zoom,
 * a swipe-and-pull on the tray lifts stones into the air, and the airborne
 * stones carry their own drag and tap. Placing never fights with moving.
 */
export function BoardScreen({ board, onExit, onComplete }: Props) {
  const { session, revision, ready } = useBoardSession(board);
  const sounds = useGameSounds();

  /** Guards against firing onComplete again on every later revision. */
  const completedRef = useRef(false);
  useEffect(() => {
    completedRef.current = false;
  }, [board.id]);
  useEffect(() => {
    if (!completedRef.current && session.isComplete()) {
      completedRef.current = true;
      sounds.onBoardComplete();
      onComplete?.();
    }
    // sounds' identity changes with the settings toggle; only board completion should re-fire this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, revision, onComplete]);

  // First-run coach marks. `null` means "still checking storage" so the
  // overlay never flashes on for a returning player while that resolves.
  const [onboardingSeen, setOnboardingSeen] = useState<boolean | null>(null);
  const [colorPickerLayout, setColorPickerLayout] = useState<LayoutRectangle | null>(null);
  const [trayLayout, setTrayLayout] = useState<LayoutRectangle | null>(null);
  useEffect(() => {
    hasSeenOnboarding().then(setOnboardingSeen);
  }, []);
  const dismissOnboarding = useCallback(() => {
    setOnboardingSeen(true);
    markOnboardingSeen();
  }, []);
  // Bumped whenever the player actually does what the current onboarding
  // step is pointing at, so the overlay can move itself along instead of
  // waiting for an explicit "Next" tap.
  const [colorPickedSignal, setColorPickedSignal] = useState(0);
  const [stripLiftedSignal, setStripLiftedSignal] = useState(0);
  const onboardingSteps: OnboardingStep[] | null =
    onboardingSeen === false && colorPickerLayout && trayLayout
      ? [
          {
            target: colorPickerLayout,
            title: 'Pick a colour',
            body: 'Tap a swatch to pick up its stones.',
          },
          {
            target: trayLayout,
            title: 'Place the stones',
            body: 'Slide sideways to choose how many, then pull up and drag them onto the board.',
          },
        ]
      : null;

  // Dev tools (BUILD_PLAN.md): instant-complete and the solution overlay both
  // need a live session, so they live here rather than on the DevTools menu.
  const [devPanelOpen, setDevPanelOpen] = useState(false);
  const [showSolution, setShowSolution] = useState(false);

  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  // Temporary on-screen diagnostic: a report of "can zoom in but not back
  // out" on a real device needs the actual scale numbers to tell a stuck
  // gesture apart from a legitimate floor (`clampViewport`'s min is
  // `fitScale` - the whole board just visible - which is a real limit, not a
  // bug). Remove once the real cause is confirmed.
  const [debugScale, setDebugScale] = useState('layout pending');
  const canvasRef = useRef<View>(null);
  /** Where the canvas sits on screen, so a strip position can find its cell. */
  const canvasOrigin = useRef({ x: 0, y: 0 });
  const [preview, setPreview] = useState<DropPreview | null>(null);
  /** Orientation the next lift uses, carried over from the last rotation. */
  const orientation = useRef<Orientation>('horizontal');

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  /** Screen position of the airborne strip's head. */
  const stripX = useSharedValue(0);
  const stripY = useSharedValue(0);
  /** True once a tray swipe has pulled the stones out of the tray. */
  const lifted = useRef(false);
  /** Last preview we pushed to React, so a drag does not re-render per pixel. */
  const previewKey = useRef<string | null>(null);

  // A worklet runs on the UI thread with only what it captured, and an imported
  // binding compiles to a property read on a module object that does not
  // survive that crossing. So the gesture worklets below close over plain local
  // numbers and do every decision back on the JS thread.
  const stoneHalf = AIRBORNE_STONE / 2;
  const carryOffsetY = CARRY_OFFSET_Y;
  const carryVisualLift = CARRY_VISUAL_LIFT;

  const bounds = useMemo<ViewportBounds>(
    () => ({
      canvasWidth: canvasSize.width,
      canvasHeight: canvasSize.height,
      boardWidth: board.width * CELL,
      boardHeight: board.height * CELL,
    }),
    [canvasSize, board.width, board.height]
  );

  const selection = session.traySelection;
  const airborne = session.airborneStrip;
  const trayEntry = selection ? board.palette[selection.color] : null;
  const airborneEntry = airborne ? board.palette[airborne.color] : null;

  const onCanvasLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      setCanvasSize({ width, height });
      // Not every renderer implements measureInWindow; without it the origin
      // stays at zero, which only matters for a real drag.
      canvasRef.current?.measureInWindow?.((x, y) => {
        canvasOrigin.current = { x, y };
      });
      const whole = fitViewport({
        canvasWidth: width,
        canvasHeight: height,
        boardWidth: board.width * CELL,
        boardHeight: board.height * CELL,
      });
      // Start zoomed in enough to read the numbers, centred on the board.
      const start = zoomAround(whole, width / 2, height / 2, Math.min(MAX_SCALE, whole.scale * 2.2), {
        canvasWidth: width,
        canvasHeight: height,
        boardWidth: board.width * CELL,
        boardHeight: board.height * CELL,
      });
      translateX.value = start.translateX;
      translateY.value = start.translateY;
      scale.value = start.scale;
      setDebugScale(
        `fit ${whole.scale.toFixed(3)} start ${start.scale.toFixed(3)} min ${whole.scale.toFixed(3)} max ${MAX_SCALE}`
      );
    },
    [board.width, board.height, scale, translateX, translateY]
  );

  /** Cell the strip's head sits over, from the head's own screen position. */
  const headAt = useCallback(
    (headX: number, headY: number) =>
      resolveDropHead(headX + AIRBORNE_STONE / 2, headY + AIRBORNE_STONE / 2, {
        board,
        strip: session.airborneStrip,
        canvasOrigin: canvasOrigin.current,
        canvasSize,
        viewport: {
          translateX: translateX.value,
          translateY: translateY.value,
          scale: scale.value,
        },
        cellSize: CELL,
        fingerOffsetCells: 0,
      }),
    [session, board, canvasSize, translateX, translateY, scale]
  );

  const updatePreview = useCallback(
    (headX: number, headY: number) => {
      const strip = session.airborneStrip;
      const head = strip ? headAt(headX, headY) : null;
      if (!strip || !head) {
        if (previewKey.current !== null) {
          previewKey.current = null;
          setPreview(null);
        }
        return;
      }
      const valid = session.canPlace(head.row, head.col);
      // A drag fires many times per cell; only redraw when the outcome changes.
      const key = `${head.row}:${head.col}:${strip.count}:${strip.orientation}:${strip.color}:${valid}`;
      if (previewKey.current === key) return;
      previewKey.current = key;
      setPreview({
        row: head.row,
        col: head.col,
        count: strip.count,
        orientation: strip.orientation,
        color: strip.color,
        hex: board.palette[strip.color].hex,
        valid,
      });
    },
    [session, board.palette, headAt]
  );

  /**
   * Try to land the stones. A drop that does not fit — off the board, over the
   * HUD, or onto cells wanting another colour — leaves them hanging where they
   * were released, so nothing is consumed and nothing snaps back.
   */
  const commitDrop = useCallback(
    (headX: number, headY: number) => {
      previewKey.current = null;
      setPreview(null);
      const head = headAt(headX, headY);
      if (!head) return;
      const result = session.place(head.row, head.col);
      if (!result.ok) return;
      sounds.onStonePlaced();
      if (result.completedRows.length > 0) sounds.onRowComplete();
    },
    [session, headAt, sounds]
  );

  /**
   * Touching the tray takes one stone — or whichever stone is under the
   * finger. Not while something is already airborne: that strip is still
   * waiting to be placed somewhere, and a fresh tray touch used to silently
   * throw it away and start a new one in its place.
   */
  const trayTouched = useCallback(
    (x: number) => {
      lifted.current = false;
      if (session.airborneStrip) return;
      session.setSelectionCount(countAtX(x, trayMetrics));
    },
    [session]
  );

  /**
   * A tray drag: sideways sizes the strip, an upward pull lifts it out, and
   * once it is out the stones follow the finger. Blocked from starting a new
   * lift while a strip from an earlier gesture is still airborne, for the
   * same reason as `trayTouched`.
   */
  const trayDragged = useCallback(
    (x: number, translationY: number, headX: number, headY: number) => {
      if (!lifted.current) {
        if (session.airborneStrip) return;
        if (!shouldLift(translationY)) {
          session.setSelectionCount(countAtX(x, trayMetrics));
          return;
        }
        if (!session.liftStrip(orientation.current)) return;
        lifted.current = true;
        setStripLiftedSignal((value) => value + 1);
      }
      updatePreview(headX, headY);
    },
    [session, updatePreview]
  );

  /** Letting go after a tray drag. A drag that never lifted places nothing. */
  const trayReleased = useCallback(
    (headX: number, headY: number) => {
      if (!lifted.current) return;
      lifted.current = false;
      commitDrop(headX, headY);
    },
    [commitDrop]
  );

  /**
   * Flips the airborne strip in place around its own centre. The strip's
   * screen position (`stripX`/`stripY`) is its top-left corner, so swapping a
   * `count x 1` bounding box for a `1 x count` one (or back) shifts that
   * corner by half the size difference on each axis - otherwise the strip
   * pivots around its first stone instead of its middle.
   */
  const rotateStones = useCallback(() => {
    const before = session.airborneStrip;
    if (!session.rotateStrip()) return;
    const after = session.airborneStrip;
    orientation.current = after?.orientation ?? orientation.current;
    if (!before || !after) return;
    const { dx, dy } = rotationPivotShift(before, after, AIRBORNE_STONE);
    stripX.value += dx;
    stripY.value += dy;
  }, [session, stripX, stripY]);

  // --- gestures -----------------------------------------------------------

  const trayGesture = useMemo(
    () =>
      Gesture.Pan()
        .withTestId('tray-pan')
        .onBegin((event) => {
          runOnJS(trayTouched)(event.x);
        })
        .onUpdate((event) => {
          // Keep the stones under the finger here, decide what that means in JS.
          // The strip renders higher than its own target cell (carryVisualLift on
          // top of carryOffsetY), so it visibly hovers over the board instead of
          // sitting flush on the cell it would land on.
          const headX = event.absoluteX - stoneHalf;
          const headY = event.absoluteY - carryOffsetY;
          stripX.value = headX;
          stripY.value = headY - carryVisualLift;
          runOnJS(trayDragged)(event.x, event.translationY, headX, headY);
        })
        .onEnd((event) => {
          runOnJS(trayReleased)(event.absoluteX - stoneHalf, event.absoluteY - carryOffsetY);
        }),
    [carryOffsetY, carryVisualLift, stoneHalf, stripX, stripY, trayDragged, trayReleased, trayTouched]
  );

  const airborneGesture = useMemo(() => {
    const drag = Gesture.Pan()
      .withTestId('airborne-pan')
      .onChange((event) => {
        stripX.value += event.changeX;
        stripY.value += event.changeY;
        // stripY is the strip's rendered (visually-lifted) position; undo that
        // lift to get back the target cell it's actually hovering over.
        runOnJS(updatePreview)(stripX.value, stripY.value + carryVisualLift);
      })
      .onEnd(() => {
        runOnJS(commitDrop)(stripX.value, stripY.value + carryVisualLift);
      });
    const tap = Gesture.Tap()
      .withTestId('airborne-tap')
      .onEnd(() => {
        runOnJS(rotateStones)();
      });
    // A drag beats a tap, so carrying the stones never reads as a rotation.
    return Gesture.Exclusive(drag, tap);
  }, [carryVisualLift, commitDrop, rotateStones, stripX, stripY, updatePreview]);

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
      runOnJS(setDebugScale)(
        `scale ${next.scale.toFixed(3)} change ${event.scaleChange.toFixed(3)} min ${fitScale(bounds).toFixed(3)} max ${MAX_SCALE}`
      );
    });

    return Gesture.Simultaneous(pan, pinch);
  }, [bounds, scale, translateX, translateY]);

  const handleSelectColor = useCallback(
    (color: number) => {
      session.selectColor(color);
      setColorPickedSignal((value) => value + 1);
    },
    [session]
  );

  return (
    // The airborne stones sit outside the safe-area view on purpose: they are
    // positioned in screen coordinates, and a padded parent would shift them.
    <View style={styles.screen}>
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <View style={styles.boardArea}>
          <GestureDetector gesture={viewportGesture}>
            <View
              ref={canvasRef}
              testID="board-surface"
              style={styles.canvasWrap}
              onLayout={onCanvasLayout}
            >
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
                  showSolution={DEV_TOOLS_ENABLED && showSolution}
                />
              ) : null}
            </View>
          </GestureDetector>

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
          {/* Temporary diagnostic, see the debugScale comment above - remove once confirmed. */}
          <Text style={styles.debugText} testID="board-debug-scale">
            {debugScale}
          </Text>
          {session.isComplete() ? (
            <View style={styles.completeBanner} testID="board-complete">
              <Text style={styles.completeText}>Board complete</Text>
            </View>
          ) : null}
          {!ready ? <View style={styles.loading} testID="board-loading" /> : null}

          {DEV_TOOLS_ENABLED ? (
            <>
              <Pressable
                onPress={() => setDevPanelOpen((open) => !open)}
                accessibilityRole="button"
                accessibilityLabel="Dev tools"
                testID="dev-panel-toggle"
                style={styles.devButton}
              >
                <Text style={styles.devButtonLabel}>🛠</Text>
              </Pressable>
              {devPanelOpen ? (
                <View style={styles.devPanel} testID="dev-panel">
                  <Pressable
                    onPress={() => session.completeInstantly()}
                    accessibilityRole="button"
                    testID="dev-instant-complete"
                    style={styles.devPanelRow}
                  >
                    <Text style={styles.devPanelLabel}>Instant complete</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setShowSolution((value) => !value)}
                    accessibilityRole="button"
                    testID="dev-show-solution"
                    style={styles.devPanelRow}
                  >
                    <Text style={styles.devPanelLabel}>
                      {showSolution ? 'Hide solution' : 'Show solution'}
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </>
          ) : null}
        </View>

        <View testID="color-picker-row" onLayout={(event) => setColorPickerLayout(event.nativeEvent.layout)}>
          <ColorPicker
            session={session}
            selected={selection?.color ?? null}
            onSelect={handleSelectColor}
          />
        </View>

        <View testID="hud-tray-row" onLayout={(event) => setTrayLayout(event.nativeEvent.layout)}>
          <HudTray
            selection={selection}
            entry={trayEntry}
            stones={session.trayStones}
            count={selection?.count ?? 0}
            gesture={trayGesture}
          />
        </View>

        {onboardingSteps ? (
          <OnboardingOverlay
            steps={onboardingSteps}
            onDone={dismissOnboarding}
            advanceFromStep0={colorPickedSignal}
            advanceFromStep1={stripLiftedSignal}
          />
        ) : null}
      </SafeAreaView>

      <AirborneStripView
        strip={airborne}
        entry={airborneEntry}
        x={stripX}
        y={stripY}
        gesture={airborneGesture}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.appBackground,
  },
  boardArea: {
    flex: 1,
  },
  canvasWrap: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: theme.boardBackground,
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
  exit: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: theme.panel,
    borderWidth: 1,
    borderColor: theme.panelBorder,
  },
  exitLabel: {
    color: theme.text,
    fontWeight: '600',
  },
  progress: {
    position: 'absolute',
    top: 16,
    right: 14,
    color: theme.textMuted,
    fontVariant: ['tabular-nums'],
  },
  // Temporary diagnostic text style, see the debugScale comment above.
  debugText: {
    position: 'absolute',
    top: 40,
    right: 14,
    fontSize: 11,
    color: theme.negative,
    fontVariant: ['tabular-nums'],
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
  devButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.panel,
    borderWidth: 1,
    borderColor: theme.panelBorder,
  },
  devButtonLabel: {
    fontSize: 16,
  },
  devPanel: {
    position: 'absolute',
    bottom: 52,
    right: 10,
    backgroundColor: theme.panel,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.panelBorder,
    paddingVertical: 4,
    minWidth: 160,
  },
  devPanelRow: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  devPanelLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.text,
  },
});

export default BoardScreen;
