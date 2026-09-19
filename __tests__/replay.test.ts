import { replayForward, replayReverse, replaySlice } from '../src/game/replay';
import { BoardSession } from '../src/game/session';
import type { Placement } from '../src/game/types';

import { makeBoard } from './support/helpers';

function solved(): BoardSession {
  const session = new BoardSession(makeBoard(['0011', '0011']));
  session.selectColor(0, 'vertical');
  session.setStripCount(2);
  session.place(0, 1, 100); // cells 1, 5
  session.place(0, 0, 200); // cells 0, 4
  session.selectColor(1);
  session.setStripCount(2);
  session.place(1, 2, 300); // cells 6, 7
  session.place(0, 2, 400); // cells 2, 3
  return session;
}

describe('replay ordering', () => {
  it('redraws the board in the order the player solved it', () => {
    const session = solved();
    expect(replayForward(session.placements).map((p) => p.cell)).toEqual([1, 5, 0, 4, 6, 7, 2, 3]);
  });

  it('removes stones newest first', () => {
    const session = solved();
    expect(replayReverse(session.placements).map((p) => p.cell)).toEqual([3, 2, 7, 6, 4, 0, 5, 1]);
  });

  it('sorts by recorded order even when the input is shuffled', () => {
    const shuffled: Placement[] = [...solved().placements].reverse();
    expect(replayForward(shuffled).map((p) => p.order)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it('slices the redraw into frames', () => {
    const session = solved();
    expect(replaySlice(session.placements, 0)).toEqual([]);
    expect(replaySlice(session.placements, 3).map((p) => p.cell)).toEqual([1, 5, 0]);
    expect(replaySlice(session.placements, 999)).toHaveLength(8);
    expect(replaySlice(session.placements, -5)).toEqual([]);
  });

  it('reproduces the finished picture when every frame is drawn', () => {
    const session = solved();
    const frame = replaySlice(session.placements, session.placements.length);
    const painted = new Map(frame.map((p) => [p.cell, p.color]));
    session.board.cells.forEach((required, cell) => {
      expect(painted.get(cell)).toBe(required);
    });
  });
});
