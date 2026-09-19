import { TRAY_SLOTS, cellCol, cellRow } from '../src/game/geometry';
import { createPlaceholderBoard } from '../src/game/placeholderBoard';
import { BoardSession } from '../src/game/session';
import type { Orientation } from '../src/game/types';

import { expectSupplyMatchesBoard } from './support/helpers';

/** Small deterministic PRNG, so a failure is reproducible. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Play a whole 40x40 board the way a person would: pick a colour, take a strip,
 * drop it on a run of that colour, repeat. Asserts the invariants as it goes.
 */
function playBoard(seed: number): BoardSession {
  const random = mulberry32(seed);
  const board = createPlaceholderBoard(0);
  const session = new BoardSession(board);

  let guard = 0;
  while (!session.isComplete()) {
    guard += 1;
    if (guard > board.cells.length + 50) throw new Error('made no progress');

    const unfinished = session.unfinishedColors();
    expect(unfinished.length).toBeGreaterThan(0);
    const color = unfinished[Math.floor(random() * unfinished.length)];
    expect(session.selectColor(color)).toBe(true);

    const orientation: Orientation = random() < 0.5 ? 'horizontal' : 'vertical';
    if (session.heldStrip!.orientation !== orientation) session.rotateStrip();

    // Take the longest strip that has somewhere to go, down to a single stone —
    // a single stone always fits, because supply is exactly the empty cells.
    let placed = false;
    for (let count = Math.min(TRAY_SLOTS, session.remainingFor(color)); count >= 1; count -= 1) {
      session.setStripCount(count);
      const spot = firstLegalSpot(session);
      if (!spot) continue;
      const result = session.place(spot.row, spot.col);
      expect(result.ok).toBe(true);
      placed = true;
      break;
    }
    expect(placed).toBe(true);
    expectSupplyMatchesBoard(session);
  }
  return session;
}

/** First cell where the currently held strip would be accepted. */
function firstLegalSpot(session: BoardSession): { row: number; col: number } | null {
  const { width, height } = session.board;
  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      if (session.canPlace(row, col)) return { row, col };
    }
  }
  return null;
}

describe('playing a full 40x40 board', () => {
  const session = playBoard(1234);

  it('fills every cell', () => {
    expect(session.isComplete()).toBe(true);
    expect(session.stonesPlaced).toBe(1600);
    for (let index = 0; index < session.board.cells.length; index += 1) {
      expect(session.cellAtIndex(index).placed).toBe(session.board.cells[index]);
    }
  });

  it('ends with every colour spent to exactly zero', () => {
    for (const entry of session.board.palette) {
      expect(session.remainingFor(entry.index)).toBe(0);
      expect(session.placedFor(entry.index)).toBe(session.requiredFor(entry.index));
    }
    expect(session.heldStrip).toBeNull();
  });

  it('records a gap-free placement order covering every stone once', () => {
    const orders = session.placements.map((p) => p.order);
    expect(orders).toEqual(orders.map((_, index) => index));
    expect(new Set(session.placements.map((p) => p.cell)).size).toBe(1600);
  });

  it('records each stone on the cell it covers', () => {
    for (const placement of session.placements) {
      const row = cellRow(placement.cell, session.board.width);
      const col = cellCol(placement.cell, session.board.width);
      expect(session.cellAt(row, col).order).toBe(placement.order);
    }
  });

  it('never got stuck, whichever colour came up first', () => {
    for (const seed of [7, 99, 20240919]) {
      expect(() => playBoard(seed)).not.toThrow();
    }
  });
});

describe('misses never leak supply', () => {
  it('only ever moves stones out of the tray on a placement that was accepted', () => {
    const board = createPlaceholderBoard(2);
    const session = new BoardSession(board);
    const random = mulberry32(5);
    session.selectColor(board.cells[0]);

    let rejected = 0;
    for (let attempt = 0; attempt < 500; attempt += 1) {
      const row = Math.floor(random() * board.height);
      const col = Math.floor(random() * board.width);
      const held = session.heldStrip;
      const before = session.stonesPlaced;
      const result = session.place(row, col);
      if (result.ok) {
        expect(session.stonesPlaced).toBe(before + (held?.count ?? 0));
      } else {
        rejected += 1;
        expect(session.stonesPlaced).toBe(before);
      }
      expectSupplyMatchesBoard(session);
    }

    // The point of the run: plenty of the random drops really were illegal.
    expect(rejected).toBeGreaterThan(100);
  });
});
