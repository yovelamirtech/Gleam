import { resolveDropHead, type DropContext } from '../src/game/drop';
import type { AirborneStrip } from '../src/game/types';

const CELL = 24;

function context(overrides: Partial<DropContext> = {}): DropContext {
  return {
    board: { width: 40, height: 40 },
    strip: { color: 0, count: 3, orientation: 'horizontal' } as AirborneStrip,
    canvasOrigin: { x: 20, y: 100 },
    canvasSize: { width: 360, height: 600 },
    viewport: { translateX: 0, translateY: 0, scale: 1 },
    cellSize: CELL,
    fingerOffsetCells: 0,
    ...overrides,
  };
}

describe('resolveDropHead', () => {
  it('maps a screen point to the cell under it', () => {
    // Canvas origin is (20, 100), so this is 48pt right and 72pt down the board.
    expect(resolveDropHead(68, 172, context())).toEqual({ row: 3, col: 2 });
  });

  it('lifts the head above the finger by the finger offset', () => {
    const head = resolveDropHead(68, 172, context({ fingerOffsetCells: 1 }));
    expect(head).toEqual({ row: 2, col: 2 });
  });

  it('accounts for the current pan and zoom', () => {
    const head = resolveDropHead(
      20,
      100,
      context({ viewport: { translateX: -240, translateY: -480, scale: 2 } })
    );
    expect(head).toEqual({ row: 10, col: 5 });
  });

  it('returns nothing when the tray is empty', () => {
    expect(resolveDropHead(68, 172, context({ strip: null }))).toBeNull();
  });

  it('returns nothing when the finger is off the canvas', () => {
    expect(resolveDropHead(10, 172, context())).toBeNull(); // left of the canvas
    expect(resolveDropHead(68, 50, context())).toBeNull(); // above it
    expect(resolveDropHead(500, 172, context())).toBeNull(); // right of it
    expect(resolveDropHead(68, 900, context())).toBeNull(); // below it
  });

  it('returns nothing when the point is well outside the grid', () => {
    // Canvas is wider than the zoomed-out board, so a point inside the canvas
    // can still be far off the board itself.
    const head = resolveDropHead(
      370,
      680,
      context({ viewport: { translateX: -2000, translateY: -2000, scale: 1 } })
    );
    expect(head).toBeNull();
  });

  it('pulls a strip near the right edge back so all of it fits', () => {
    const head = resolveDropHead(
      20 + 39 * CELL + 5,
      100 + 5,
      context({ canvasSize: { width: 1200, height: 1200 } })
    );
    expect(head).toEqual({ row: 0, col: 37 });
  });

  it('pulls a vertical strip near the bottom edge up so all of it fits', () => {
    const head = resolveDropHead(
      20 + 5,
      100 + 39 * CELL + 5,
      context({
        strip: { color: 0, count: 5, orientation: 'vertical' },
        canvasSize: { width: 1200, height: 1200 },
      })
    );
    expect(head).toEqual({ row: 35, col: 0 });
  });
});
