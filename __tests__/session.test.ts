import { TRAY_SLOTS } from '../src/game/geometry';
import { BoardSession } from '../src/game/session';

import { expectSupplyMatchesBoard, fillBoard, makeBoard } from './support/helpers';

// 0 0 0 0 0 0
// 0 0 0 0 0 0
// 1 1 1 2 2 2
const board = makeBoard(['000000', '000000', '111222']);

function fresh(): BoardSession {
  return new BoardSession(board);
}

describe('construction', () => {
  it('counts the supply of each colour from the board itself', () => {
    const session = fresh();
    expect(session.requiredFor(0)).toBe(12);
    expect(session.requiredFor(1)).toBe(3);
    expect(session.requiredFor(2)).toBe(3);
    expect(session.stonesTotal).toBe(18);
  });

  it('rejects a board whose cell count does not match its size', () => {
    expect(
      () => new BoardSession({ ...board, cells: board.cells.slice(0, 5) })
    ).toThrow(/expected 18 cells/);
  });

  it('rejects a cell colour that is not in the palette', () => {
    const cells = [...board.cells];
    cells[0] = 9;
    expect(() => new BoardSession({ ...board, cells })).toThrow(/not in the palette/);
  });

  it('shows the palette number on a cell, never its colour', () => {
    const session = fresh();
    expect(session.cellAt(0, 0)).toMatchObject({ required: 0, number: 1, placed: null, order: -1 });
    expect(session.cellAt(2, 0)).toMatchObject({ required: 1, number: 2, placed: null });
  });
});

describe('picking a colour up', () => {
  it('fills all five slots when supply allows', () => {
    const session = fresh();
    expect(session.selectColor(0)).toBe(true);
    expect(session.heldStrip).toEqual({ color: 0, count: TRAY_SLOTS, orientation: 'horizontal' });
  });

  it('fills only as many slots as the board still owes', () => {
    const session = fresh();
    session.selectColor(1);
    expect(session.heldStrip?.count).toBe(3);
  });

  it('refuses a colour with nothing left and keeps the held strip', () => {
    const session = fresh();
    session.selectColor(1);
    session.place(2, 0); // spends all three stones of colour 1
    session.selectColor(2);
    expect(session.selectColor(1)).toBe(false);
    expect(session.heldStrip?.color).toBe(2);
  });

  it('returns the previous strip to supply when another colour is picked', () => {
    const session = fresh();
    session.selectColor(0);
    expect(session.availableFor(0)).toBe(12 - TRAY_SLOTS);
    session.selectColor(1);
    expect(session.availableFor(0)).toBe(12);
  });

  it('ignores a colour outside the palette', () => {
    const session = fresh();
    expect(session.selectColor(7)).toBe(false);
    expect(session.heldStrip).toBeNull();
  });
});

describe('shaping the strip', () => {
  it('trims the strip to the tapped slot', () => {
    const session = fresh();
    session.selectColor(0);
    expect(session.setStripCount(2)).toBe(true);
    expect(session.heldStrip?.count).toBe(2);
    expect(session.availableFor(0)).toBe(10);
  });

  it('clamps a count to the tray size and to what is left', () => {
    const session = fresh();
    session.selectColor(0);
    session.setStripCount(99);
    expect(session.heldStrip?.count).toBe(TRAY_SLOTS);
    session.selectColor(1);
    session.setStripCount(5);
    expect(session.heldStrip?.count).toBe(3);
    session.setStripCount(0);
    expect(session.heldStrip?.count).toBe(1);
  });

  it('rotates between horizontal and vertical', () => {
    const session = fresh();
    session.selectColor(0);
    session.rotateStrip();
    expect(session.heldStrip?.orientation).toBe('vertical');
    session.rotateStrip();
    expect(session.heldStrip?.orientation).toBe('horizontal');
  });

  it('does nothing with an empty tray', () => {
    const session = fresh();
    expect(session.rotateStrip()).toBe(false);
    expect(session.setStripCount(3)).toBe(false);
    expect(session.cancelStrip()).toBe(false);
  });
});

describe('placing a strip', () => {
  it('lays a horizontal strip left to right from the head', () => {
    const session = fresh();
    session.selectColor(0);
    session.setStripCount(3);
    const result = session.place(0, 0, 1000);
    expect(result.ok).toBe(true);
    expect(session.cellAt(0, 0).placed).toBe(0);
    expect(session.cellAt(0, 2).placed).toBe(0);
    expect(session.cellAt(0, 3).placed).toBeNull();
  });

  it('lays a vertical strip downward from the head', () => {
    const session = fresh();
    session.selectColor(0, 'vertical');
    session.setStripCount(2);
    session.place(0, 4);
    expect(session.cellAt(0, 4).placed).toBe(0);
    expect(session.cellAt(1, 4).placed).toBe(0);
  });

  it('refuses a strip that runs off the board, spending nothing', () => {
    const session = fresh();
    session.selectColor(0);
    session.setStripCount(5);
    expect(session.place(0, 3)).toEqual({ ok: false, reason: 'out-of-bounds' });
    expect(session.stonesPlaced).toBe(0);
    expect(session.remainingFor(0)).toBe(12);
  });

  it('refuses the whole strip when any cell wants another colour', () => {
    const session = fresh();
    session.selectColor(0);
    session.setStripCount(3);
    // Row 2 is colours 1 and 2, not 0.
    expect(session.place(2, 0)).toEqual({ ok: false, reason: 'wrong-color' });
    expect(session.stonesPlaced).toBe(0);
  });

  it('refuses the whole strip when any cell is already covered', () => {
    const session = fresh();
    session.selectColor(0);
    session.setStripCount(1);
    session.place(0, 2);
    session.setStripCount(3);
    expect(session.place(0, 0)).toEqual({ ok: false, reason: 'occupied' });
    expect(session.stonesPlaced).toBe(1);
  });

  it('refuses to place with an empty tray', () => {
    const session = fresh();
    expect(session.place(0, 0)).toEqual({ ok: false, reason: 'no-strip' });
  });

  it('reports why a drop would fail without changing anything', () => {
    const session = fresh();
    session.selectColor(0);
    session.setStripCount(3);
    expect(session.canPlace(0, 0)).toBe(true);
    expect(session.placementFailure(2, 0)).toBe('wrong-color');
    expect(session.placementFailure(0, 4)).toBe('out-of-bounds');
    expect(session.stonesPlaced).toBe(0);
  });

  it('previews exactly the cells a drop would cover', () => {
    const session = fresh();
    session.selectColor(0, 'vertical');
    session.setStripCount(2);
    expect(session.previewCells(0, 1)).toEqual([1, 7]);
    expect(session.previewCells(2, 1)).toBeNull();
  });
});

describe('the tray after a placement', () => {
  it('refills with the same colour at the same length', () => {
    const session = fresh();
    session.selectColor(0);
    session.setStripCount(3);
    session.place(0, 0);
    expect(session.heldStrip).toEqual({ color: 0, count: 3, orientation: 'horizontal' });
  });

  it('keeps the orientation the player chose', () => {
    const session = fresh();
    session.selectColor(0, 'vertical');
    session.setStripCount(2);
    session.place(0, 0);
    expect(session.heldStrip?.orientation).toBe('vertical');
  });

  it('shrinks the refill when the board owes fewer stones than the strip', () => {
    const session = fresh();
    session.selectColor(2);
    session.setStripCount(2);
    session.place(2, 3);
    expect(session.heldStrip?.count).toBe(1);
  });

  it('empties the tray once a colour is finished', () => {
    const session = fresh();
    session.selectColor(1);
    session.place(2, 0);
    expect(session.heldStrip).toBeNull();
    expect(session.remainingFor(1)).toBe(0);
    expect(session.unfinishedColors()).toEqual([0, 2]);
  });
});

describe('the stone economy', () => {
  it('starts with supply exactly matching the board', () => {
    expectSupplyMatchesBoard(fresh());
  });

  it('keeps supply matching the board through good and bad drops', () => {
    const session = fresh();
    session.selectColor(0);
    session.setStripCount(4);
    session.place(0, 0);
    expectSupplyMatchesBoard(session);
    session.place(0, 0); // occupied
    expectSupplyMatchesBoard(session);
    session.place(2, 0); // wrong colour
    expectSupplyMatchesBoard(session);
    session.selectColor(2);
    session.place(2, 3);
    expectSupplyMatchesBoard(session);
  });

  it('ends with every colour at zero when the board is filled', () => {
    const session = fresh();
    fillBoard(session);
    expect(session.isComplete()).toBe(true);
    expect(session.unfinishedColors()).toEqual([]);
    expectSupplyMatchesBoard(session);
  });
});

describe('placement order', () => {
  it('numbers stones consecutively in the order they went down', () => {
    const session = fresh();
    session.selectColor(0);
    session.setStripCount(3);
    session.place(0, 0, 1000);
    session.setStripCount(2);
    session.place(1, 0, 2000);
    expect(session.placements.map((p) => p.order)).toEqual([0, 1, 2, 3, 4]);
    expect(session.placements.map((p) => p.cell)).toEqual([0, 1, 2, 6, 7]);
  });

  it('stamps every stone of a strip with the time of that drop', () => {
    const session = fresh();
    session.selectColor(0);
    session.setStripCount(2);
    session.place(0, 0, 4242);
    expect(session.placements.map((p) => p.at)).toEqual([4242, 4242]);
  });

  it('records the order on the cell as well as in history', () => {
    const session = fresh();
    session.selectColor(0);
    session.setStripCount(1);
    session.place(0, 1, 1);
    session.place(0, 0, 2);
    expect(session.cellAt(0, 1).order).toBe(0);
    expect(session.cellAt(0, 0).order).toBe(1);
  });
});

describe('subscription', () => {
  it('notifies subscribers and bumps the revision on every change', () => {
    const session = fresh();
    const listener = jest.fn();
    const unsubscribe = session.subscribe(listener);
    session.selectColor(0);
    session.rotateStrip();
    expect(listener).toHaveBeenCalledTimes(2);
    expect(session.getRevision()).toBe(2);
    unsubscribe();
    session.cancelStrip();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('stays quiet when a call changes nothing', () => {
    const session = fresh();
    session.selectColor(0);
    const listener = jest.fn();
    session.subscribe(listener);
    session.setStripCount(TRAY_SLOTS); // already five
    session.place(2, 0); // wrong colour
    expect(listener).not.toHaveBeenCalled();
  });
});
