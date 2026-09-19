import { LIFT_THRESHOLD, countAtX, fillExtent, shouldLift } from '../src/ui/trayGesture';

// Matches the tray's own layout: 40pt stones, 5pt apart, 7pt of padding.
const metrics = { slotSize: 40, gap: 5, padding: 7, slots: 5 };

describe('countAtX', () => {
  it('takes one stone where the swipe starts', () => {
    expect(countAtX(7, metrics)).toBe(1);
    expect(countAtX(20, metrics)).toBe(1);
  });

  it('raises the count to the stone under the finger', () => {
    expect(countAtX(7 + 45, metrics)).toBe(2);
    expect(countAtX(7 + 90, metrics)).toBe(3);
    expect(countAtX(7 + 135, metrics)).toBe(4);
    expect(countAtX(7 + 180, metrics)).toBe(5);
  });

  it('never goes below one or past the tray', () => {
    expect(countAtX(-50, metrics)).toBe(1);
    expect(countAtX(0, metrics)).toBe(1);
    expect(countAtX(9999, metrics)).toBe(5);
  });

  it('survives a degenerate tray rather than dividing by zero', () => {
    expect(countAtX(10, { slotSize: 0, gap: 0, padding: 0 })).toBe(1);
  });
});

describe('fillExtent', () => {
  it('covers nothing when no stones are taken', () => {
    expect(fillExtent(0, metrics)).toEqual({ x: 0, width: 0 });
  });

  it('grows to cover the stones under and behind the finger', () => {
    // One stone: both paddings plus the stone itself.
    expect(fillExtent(1, metrics).width).toBe(7 * 2 + 40);
    // Three stones: two gaps between them as well.
    expect(fillExtent(3, metrics).width).toBe(7 * 2 + 40 * 3 + 5 * 2);
  });

  it('stops at the full tray', () => {
    expect(fillExtent(9, metrics)).toEqual(fillExtent(5, metrics));
  });

  it('always starts at the left edge of the tray', () => {
    expect(fillExtent(4, metrics).x).toBe(0);
  });
});

describe('shouldLift', () => {
  it('waits for a real upward pull', () => {
    expect(shouldLift(0)).toBe(false);
    expect(shouldLift(-10)).toBe(false);
    expect(shouldLift(-LIFT_THRESHOLD)).toBe(true);
    expect(shouldLift(-80)).toBe(true);
  });

  it('never lifts on a downward drag', () => {
    expect(shouldLift(60)).toBe(false);
  });

  it('honours a custom threshold', () => {
    expect(shouldLift(-12, 10)).toBe(true);
    expect(shouldLift(-12, 20)).toBe(false);
  });
});
