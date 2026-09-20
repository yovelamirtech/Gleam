/**
 * Pan/zoom maths for the board.
 *
 * A 40x40 board does not fit on a phone screen at a usable stone size, so the
 * player moves around inside it. Everything here is pure and marked `worklet`
 * so the same functions run on the gesture thread and in tests.
 */

export interface Viewport {
  translateX: number;
  translateY: number;
  scale: number;
}

export interface ViewportBounds {
  canvasWidth: number;
  canvasHeight: number;
  /** Board size in board-space units (cells * CELL). */
  boardWidth: number;
  boardHeight: number;
}

export const MIN_SCALE_FACTOR = 1;
export const MAX_SCALE = 4;

/** Scale at which the whole board is just visible. */
export function fitScale(bounds: ViewportBounds): number {
  'worklet';
  if (bounds.boardWidth <= 0 || bounds.boardHeight <= 0) return 1;
  return Math.min(
    bounds.canvasWidth / bounds.boardWidth,
    bounds.canvasHeight / bounds.boardHeight
  );
}

/**
 * Keep the board covering the canvas, and centred on whichever axis is smaller
 * than the canvas, so it can never be flung off into empty space.
 */
export function clampViewport(viewport: Viewport, bounds: ViewportBounds): Viewport {
  'worklet';
  const min = fitScale(bounds) * MIN_SCALE_FACTOR;
  const scale = Math.min(Math.max(viewport.scale, min), MAX_SCALE);
  const scaledWidth = bounds.boardWidth * scale;
  const scaledHeight = bounds.boardHeight * scale;

  const clampAxis = (value: number, scaled: number, canvas: number): number => {
    if (scaled <= canvas) return (canvas - scaled) / 2;
    return Math.min(Math.max(value, canvas - scaled), 0);
  };

  return {
    scale,
    translateX: clampAxis(viewport.translateX, scaledWidth, bounds.canvasWidth),
    translateY: clampAxis(viewport.translateY, scaledHeight, bounds.canvasHeight),
  };
}

/** Viewport showing the whole board, centred. */
export function fitViewport(bounds: ViewportBounds): Viewport {
  'worklet';
  return clampViewport(
    { translateX: 0, translateY: 0, scale: fitScale(bounds) },
    bounds
  );
}

/** Zoom about a screen point, so pinching keeps the pinched spot under the fingers. */
export function zoomAround(
  viewport: Viewport,
  focalX: number,
  focalY: number,
  nextScale: number,
  bounds: ViewportBounds
): Viewport {
  'worklet';
  const scale = Math.min(Math.max(nextScale, fitScale(bounds) * MIN_SCALE_FACTOR), MAX_SCALE);
  const ratio = scale / viewport.scale;
  return clampViewport(
    {
      scale,
      translateX: focalX - (focalX - viewport.translateX) * ratio,
      translateY: focalY - (focalY - viewport.translateY) * ratio,
    },
    bounds
  );
}

/**
 * Cell under a point given in canvas coordinates. Returns fractional-free
 * row/col that may fall outside the board — callers decide what to do with
 * an off-board result, since dropping there returns the strip to the tray.
 */
export function canvasToCell(
  x: number,
  y: number,
  viewport: Viewport,
  cellSize: number
): { row: number; col: number } {
  'worklet';
  const boardX = (x - viewport.translateX) / viewport.scale;
  const boardY = (y - viewport.translateY) / viewport.scale;
  return { row: Math.floor(boardY / cellSize), col: Math.floor(boardX / cellSize) };
}

/**
 * The `transform` array for an `Animated.View` showing this viewport over
 * content of the given size - not just `[{translateX},{translateY},
 * {scale}]`. RN's own `{scale}` (like CSS's) anchors at the element's own
 * *centre* by default, but every function above assumes the origin-anchored
 * convention a Skia `Group transform` actually uses (`BoardCanvas` draws
 * this way, which is why `BoardScreen` never hit this): scale from (0,0),
 * then translate. Skipping this correction doesn't just misalign things by
 * a few pixels - for a wall thousands of units wide at a small `scale`, the
 * centre-anchor error is thousands of pixels, easily enough to push the
 * entire rendered wall off-screen while `translateX`/`translateY`/`scale`
 * all read as perfectly correct (`LevelsScreen`'s and
 * `UnifiedBoardScreen`'s wall - the only two screens that pan/zoom a plain
 * `Animated.View` instead of a Skia canvas - both had this bug).
 */
export function viewportTransform(
  viewport: Viewport,
  contentWidth: number,
  contentHeight: number
): Array<{ scale: number } | { translateX: number } | { translateY: number }> {
  'worklet';
  const { scale, translateX, translateY } = viewport;
  return [
    { scale },
    { translateX: translateX - (contentWidth / 2) * (1 - scale) },
    { translateY: translateY - (contentHeight / 2) * (1 - scale) },
  ];
}

/** Top-left of a cell in canvas coordinates. */
export function cellToCanvas(
  row: number,
  col: number,
  viewport: Viewport,
  cellSize: number
): { x: number; y: number } {
  'worklet';
  return {
    x: col * cellSize * viewport.scale + viewport.translateX,
    y: row * cellSize * viewport.scale + viewport.translateY,
  };
}
