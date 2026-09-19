import {
  MAX_SCALE,
  canvasToCell,
  cellToCanvas,
  clampViewport,
  fitScale,
  fitViewport,
  zoomAround,
} from '../src/ui/viewport';

const CELL = 24;
// A 40x40 board of 24pt cells on a 400x700 canvas: much taller and wider than
// the screen, which is why the board pans and zooms at all.
const bounds = {
  canvasWidth: 400,
  canvasHeight: 700,
  boardWidth: 40 * CELL,
  boardHeight: 40 * CELL,
};

describe('fitScale', () => {
  it('picks the axis that runs out first', () => {
    expect(fitScale(bounds)).toBeCloseTo(400 / 960);
  });

  it('does not divide by a zero-sized board', () => {
    expect(fitScale({ ...bounds, boardWidth: 0, boardHeight: 0 })).toBe(1);
  });
});

describe('clampViewport', () => {
  it('never lets the board pan away from the canvas', () => {
    const clamped = clampViewport({ translateX: 500, translateY: 500, scale: 1 }, bounds);
    expect(clamped.translateX).toBe(0);
    expect(clamped.translateY).toBe(0);
  });

  it('stops the far edge from pulling inside the canvas', () => {
    const clamped = clampViewport({ translateX: -5000, translateY: -5000, scale: 1 }, bounds);
    expect(clamped.translateX).toBe(400 - 960);
    expect(clamped.translateY).toBe(700 - 960);
  });

  it('centres the board on an axis where it is smaller than the canvas', () => {
    const scale = fitScale(bounds);
    const clamped = clampViewport({ translateX: 0, translateY: 0, scale }, bounds);
    expect(clamped.translateX).toBeCloseTo(0);
    expect(clamped.translateY).toBeCloseTo((700 - 960 * scale) / 2);
  });

  it('keeps the scale between whole-board and the zoom-in limit', () => {
    expect(clampViewport({ translateX: 0, translateY: 0, scale: 0.01 }, bounds).scale).toBeCloseTo(
      fitScale(bounds)
    );
    expect(clampViewport({ translateX: 0, translateY: 0, scale: 99 }, bounds).scale).toBe(MAX_SCALE);
  });
});

describe('fitViewport', () => {
  it('shows the whole board, centred', () => {
    const viewport = fitViewport(bounds);
    expect(viewport.scale).toBeCloseTo(fitScale(bounds));
    expect(bounds.boardWidth * viewport.scale).toBeLessThanOrEqual(bounds.canvasWidth + 0.001);
    expect(bounds.boardHeight * viewport.scale).toBeLessThanOrEqual(bounds.canvasHeight + 0.001);
  });
});

describe('zoomAround', () => {
  it('keeps the pinched point under the fingers', () => {
    const start = { translateX: -100, translateY: -200, scale: 1 };
    const focalX = 150;
    const focalY = 300;
    const before = canvasToCell(focalX, focalY, start, CELL);
    const zoomed = zoomAround(start, focalX, focalY, 2, bounds);
    const after = canvasToCell(focalX, focalY, zoomed, CELL);
    expect(after).toEqual(before);
  });

  it('refuses to zoom past the limits', () => {
    const start = { translateX: 0, translateY: 0, scale: 1 };
    expect(zoomAround(start, 0, 0, 100, bounds).scale).toBe(MAX_SCALE);
    expect(zoomAround(start, 0, 0, 0.001, bounds).scale).toBeCloseTo(fitScale(bounds));
  });
});

describe('canvasToCell', () => {
  it('maps a canvas point to the cell under it', () => {
    const viewport = { translateX: 0, translateY: 0, scale: 1 };
    expect(canvasToCell(0, 0, viewport, CELL)).toEqual({ row: 0, col: 0 });
    expect(canvasToCell(23.9, 23.9, viewport, CELL)).toEqual({ row: 0, col: 0 });
    expect(canvasToCell(24, 48, viewport, CELL)).toEqual({ row: 2, col: 1 });
  });

  it('accounts for pan and zoom', () => {
    const viewport = { translateX: -120, translateY: -240, scale: 2 };
    expect(canvasToCell(0, 0, viewport, CELL)).toEqual({ row: 5, col: 2 });
  });

  it('reports cells outside the board so a drop there can be rejected', () => {
    const viewport = { translateX: 0, translateY: 0, scale: 1 };
    expect(canvasToCell(-10, -10, viewport, CELL)).toEqual({ row: -1, col: -1 });
  });

  it('round-trips with cellToCanvas', () => {
    const viewport = { translateX: -37, translateY: 19, scale: 1.7 };
    const point = cellToCanvas(12, 8, viewport, CELL);
    expect(canvasToCell(point.x + 1, point.y + 1, viewport, CELL)).toEqual({ row: 12, col: 8 });
  });
});
