import { TRAY_SLOTS } from '../src/game/geometry';
import { BoardSession } from '../src/game/session';

import { expectSupplyMatchesBoard, fillBoard, makeBoard, take } from './support/helpers';

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
    expect(() => new BoardSession({ ...board, cells: board.cells.slice(0, 5) })).toThrow(
      /expected 18 cells/
    );
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

describe('pointing the tray at a colour', () => {
  it('takes one stone by default', () => {
    const session = fresh();
    expect(session.selectColor(0)).toBe(true);
    expect(session.traySelection).toEqual({ color: 0, count: 1 });
  });

  it('leaves the tray showing the pile, not the strip', () => {
    const session = fresh();
    session.selectColor(0);
    expect(session.trayStones).toBe(TRAY_SLOTS);
    session.setSelectionCount(3);
    // Sizing the strip does not empty the tray; the stones are still in it.
    expect(session.trayStones).toBe(TRAY_SLOTS);
  });

  it('shows only what is left once the pile drops below a full tray', () => {
    const session = fresh();
    session.selectColor(1);
    expect(session.trayStones).toBe(3);
  });

  it('refuses a colour the board no longer owes', () => {
    const session = fresh();
    take(session, 1, 3);
    session.place(2, 0);
    expect(session.selectColor(1)).toBe(false);
    expect(session.traySelection).toBeNull();
  });

  it('ignores a colour outside the palette', () => {
    const session = fresh();
    expect(session.selectColor(7)).toBe(false);
    expect(session.traySelection).toBeNull();
  });

  it('returns airborne stones to the pile when another colour is picked', () => {
    const session = fresh();
    take(session, 0, 4);
    expect(session.availableFor(0)).toBe(8);
    session.selectColor(1);
    expect(session.airborneStrip).toBeNull();
    expect(session.availableFor(0)).toBe(12);
  });

  it('resets to one stone on a new colour', () => {
    const session = fresh();
    session.selectColor(0);
    session.setSelectionCount(5);
    session.selectColor(2);
    expect(session.traySelection).toEqual({ color: 2, count: 1 });
  });
});

describe('sizing the strip with a swipe', () => {
  it('raises the count to the stone under the finger', () => {
    const session = fresh();
    session.selectColor(0);
    expect(session.setSelectionCount(4)).toBe(true);
    expect(session.traySelection?.count).toBe(4);
  });

  it('clamps to the tray size and to what is in the pile', () => {
    const session = fresh();
    session.selectColor(0);
    session.setSelectionCount(99);
    expect(session.traySelection?.count).toBe(TRAY_SLOTS);
    session.selectColor(1);
    session.setSelectionCount(5);
    expect(session.traySelection?.count).toBe(3);
    session.setSelectionCount(0);
    expect(session.traySelection?.count).toBe(1);
  });

  it('does nothing with no colour picked', () => {
    const session = fresh();
    expect(session.setSelectionCount(3)).toBe(false);
  });
});

describe('lifting stones into the air', () => {
  it('pulls the selected number out of the tray', () => {
    const session = fresh();
    session.selectColor(0);
    session.setSelectionCount(3);
    expect(session.liftStrip()).toBe(true);
    expect(session.airborneStrip).toEqual({ color: 0, count: 3, orientation: 'horizontal' });
  });

  it('reserves the airborne stones against the pile', () => {
    const session = fresh();
    take(session, 0, 3);
    expect(session.availableFor(0)).toBe(9);
    expect(session.remainingFor(0)).toBe(12);
    expect(session.trayStones).toBe(TRAY_SLOTS);
  });

  it('lifts vertically when that is the carried orientation', () => {
    const session = fresh();
    take(session, 0, 2, 'vertical');
    expect(session.airborneStrip?.orientation).toBe('vertical');
  });

  it('replaces a strip already in the air rather than stacking one', () => {
    const session = fresh();
    take(session, 0, 3);
    take(session, 0, 2);
    expect(session.airborneStrip?.count).toBe(2);
    expect(session.availableFor(0)).toBe(10);
  });

  it('does nothing with no colour picked', () => {
    const session = fresh();
    expect(session.liftStrip()).toBe(false);
  });
});

describe('the stones in the air', () => {
  it('flips orientation on a tap and stays airborne', () => {
    const session = fresh();
    take(session, 0, 3);
    expect(session.rotateStrip()).toBe(true);
    expect(session.airborneStrip).toEqual({ color: 0, count: 3, orientation: 'vertical' });
    session.rotateStrip();
    expect(session.airborneStrip?.orientation).toBe('horizontal');
  });

  it('stays in the air after a drop that does not fit', () => {
    const session = fresh();
    take(session, 0, 3);
    expect(session.place(2, 0)).toEqual({ ok: false, reason: 'wrong-color' });
    expect(session.airborneStrip).toEqual({ color: 0, count: 3, orientation: 'horizontal' });
    expect(session.stonesPlaced).toBe(0);
  });

  it('can be put back in the pile deliberately', () => {
    const session = fresh();
    take(session, 0, 3);
    expect(session.returnStrip()).toBe(true);
    expect(session.airborneStrip).toBeNull();
    expect(session.availableFor(0)).toBe(12);
  });

  it('does nothing when there is nothing in the air', () => {
    const session = fresh();
    expect(session.rotateStrip()).toBe(false);
    expect(session.returnStrip()).toBe(false);
  });
});

describe('placing a strip', () => {
  it('lays a horizontal strip left to right from the head', () => {
    const session = fresh();
    take(session, 0, 3);
    expect(session.place(0, 0, 1000).ok).toBe(true);
    expect(session.cellAt(0, 0).placed).toBe(0);
    expect(session.cellAt(0, 2).placed).toBe(0);
    expect(session.cellAt(0, 3).placed).toBeNull();
  });

  it('lays a vertical strip downward from the head', () => {
    const session = fresh();
    take(session, 0, 2, 'vertical');
    session.place(0, 4);
    expect(session.cellAt(0, 4).placed).toBe(0);
    expect(session.cellAt(1, 4).placed).toBe(0);
  });

  it('refuses a strip that runs off the board, spending nothing', () => {
    const session = fresh();
    take(session, 0, 5);
    expect(session.place(0, 3)).toEqual({ ok: false, reason: 'out-of-bounds' });
    expect(session.stonesPlaced).toBe(0);
    expect(session.remainingFor(0)).toBe(12);
  });

  it('refuses the whole strip when any cell is already covered', () => {
    const session = fresh();
    take(session, 0, 1);
    session.place(0, 2);
    take(session, 0, 3);
    expect(session.place(0, 0)).toEqual({ ok: false, reason: 'occupied' });
    expect(session.stonesPlaced).toBe(1);
  });

  it('refuses to place with nothing in the air', () => {
    const session = fresh();
    session.selectColor(0);
    expect(session.place(0, 0)).toEqual({ ok: false, reason: 'no-strip' });
  });

  it('reports why a drop would fail without changing anything', () => {
    const session = fresh();
    take(session, 0, 3);
    expect(session.canPlace(0, 0)).toBe(true);
    expect(session.placementFailure(2, 0)).toBe('wrong-color');
    expect(session.placementFailure(0, 4)).toBe('out-of-bounds');
    expect(session.stonesPlaced).toBe(0);
  });

  it('previews exactly the cells a drop would cover', () => {
    const session = fresh();
    take(session, 0, 2, 'vertical');
    expect(session.previewCells(0, 1)).toEqual([1, 7]);
    expect(session.previewCells(2, 1)).toBeNull();
  });
});

describe('row completion', () => {
  it('reports no completed row for a placement that does not finish one', () => {
    const session = fresh();
    take(session, 0, 3);
    const result = session.place(0, 0);
    expect(result.ok && result.completedRows).toEqual([]);
  });

  it('reports the row once the placement that fills its last empty cell lands', () => {
    const session = fresh();
    take(session, 0, 5);
    const first = session.place(0, 0);
    expect(first.ok && first.completedRows).toEqual([]);

    take(session, 0, 1);
    const second = session.place(0, 5);
    expect(second.ok && second.completedRows).toEqual([0]);
  });

  it('reports every row a single placement finishes at once', () => {
    const session = fresh();
    // Fill columns 0-4 of both all-colour-0 rows, leaving column 5 of each empty.
    take(session, 0, 5);
    session.place(0, 0);
    take(session, 0, 5);
    session.place(1, 0);

    // One vertical strip lands on both remaining cells at once.
    take(session, 0, 2, 'vertical');
    const result = session.place(0, 5);
    expect(result.ok && result.completedRows).toEqual([0, 1]);
  });
});

describe('dev tool: instant completion', () => {
  it('fills every empty cell with its required colour in one batch', () => {
    const session = fresh();
    take(session, 0, 3);
    session.place(0, 0); // three real stones down first, so the batch has to skip them

    session.completeInstantly();

    expect(session.isComplete()).toBe(true);
    for (let cell = 0; cell < board.cells.length; cell += 1) {
      expect(session.cellAtIndex(cell).placed).toBe(board.cells[cell]);
    }
    expectSupplyMatchesBoard(session);
  });

  it('drops whatever was airborne or selected, since nothing is left to place', () => {
    const session = fresh();
    take(session, 1, 2);

    session.completeInstantly();

    expect(session.airborneStrip).toBeNull();
    expect(session.traySelection).toBeNull();
  });

  it('does nothing, and does not notify, on an already-complete board', () => {
    const session = fresh();
    session.completeInstantly();
    let notified = false;
    session.subscribe(() => {
      notified = true;
    });

    session.completeInstantly();

    expect(notified).toBe(false);
  });

  it('keeps placement order monotonic on top of stones already placed', () => {
    const session = fresh();
    take(session, 0, 1);
    session.place(0, 0, 1000);

    session.completeInstantly(2000);

    const orders = session.placements.map((p) => p.order);
    expect(new Set(orders).size).toBe(orders.length);
    expect(Math.min(...orders)).toBe(0);
  });
});

describe('after the stones land', () => {
  it('empties the hand and keeps the tray on the same colour and count', () => {
    const session = fresh();
    take(session, 0, 3);
    session.place(0, 0);
    expect(session.airborneStrip).toBeNull();
    expect(session.traySelection).toEqual({ color: 0, count: 3 });
  });

  it('shows the pile shrinking in the tray near the end of a colour', () => {
    const session = fresh();
    take(session, 2, 2);
    session.place(2, 3);
    expect(session.trayStones).toBe(1);
    expect(session.traySelection?.count).toBe(2);
  });

  it('drops the selection once the colour is finished', () => {
    const session = fresh();
    take(session, 1, 3);
    session.place(2, 0);
    expect(session.traySelection).toBeNull();
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
    take(session, 0, 4);
    session.place(0, 0);
    expectSupplyMatchesBoard(session);
    take(session, 0, 4);
    session.place(0, 0); // occupied
    expectSupplyMatchesBoard(session);
    session.place(2, 0); // wrong colour
    expectSupplyMatchesBoard(session);
    take(session, 2, 3);
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
    take(session, 0, 3);
    session.place(0, 0, 1000);
    take(session, 0, 2);
    session.place(1, 0, 2000);
    expect(session.placements.map((p) => p.order)).toEqual([0, 1, 2, 3, 4]);
    expect(session.placements.map((p) => p.cell)).toEqual([0, 1, 2, 6, 7]);
  });

  it('stamps every stone of a strip with the time of that drop', () => {
    const session = fresh();
    take(session, 0, 2);
    session.place(0, 0, 4242);
    expect(session.placements.map((p) => p.at)).toEqual([4242, 4242]);
  });

  it('records the order on the cell as well as in history', () => {
    const session = fresh();
    take(session, 0, 1);
    session.place(0, 1, 1);
    take(session, 0, 1);
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
    session.liftStrip();
    session.rotateStrip();
    expect(listener).toHaveBeenCalledTimes(3);
    expect(session.getRevision()).toBe(3);
    unsubscribe();
    session.returnStrip();
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it('stays quiet when a call changes nothing', () => {
    const session = fresh();
    take(session, 0, 3);
    const listener = jest.fn();
    session.subscribe(listener);
    session.setSelectionCount(3); // already three
    session.place(2, 0); // wrong colour
    expect(listener).not.toHaveBeenCalled();
  });
});
