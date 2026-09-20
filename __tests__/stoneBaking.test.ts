import { BAKE_BATCH_SIZE, bakeBoundary } from '../src/ui/stoneBaking';

describe('bakeBoundary', () => {
  it('stays at zero before the first full batch', () => {
    expect(bakeBoundary(0)).toBe(0);
    expect(bakeBoundary(BAKE_BATCH_SIZE - 1)).toBe(0);
  });

  it('advances to a batch boundary exactly on it, not past it', () => {
    expect(bakeBoundary(BAKE_BATCH_SIZE)).toBe(BAKE_BATCH_SIZE);
    expect(bakeBoundary(BAKE_BATCH_SIZE + 1)).toBe(BAKE_BATCH_SIZE);
    expect(bakeBoundary(2 * BAKE_BATCH_SIZE - 1)).toBe(BAKE_BATCH_SIZE);
    expect(bakeBoundary(2 * BAKE_BATCH_SIZE)).toBe(2 * BAKE_BATCH_SIZE);
  });

  it('only ever grows as placements grow, matching a session history that never shrinks', () => {
    let previous = 0;
    for (let total = 0; total <= 5 * BAKE_BATCH_SIZE; total += 1) {
      const boundary = bakeBoundary(total);
      expect(boundary).toBeGreaterThanOrEqual(previous);
      expect(boundary).toBeLessThanOrEqual(total);
      previous = boundary;
    }
  });

  it('covers a full board (1600 cells) in whole batches, with a bounded remainder', () => {
    const boundary = bakeBoundary(1600);
    expect(1600 - boundary).toBeLessThan(BAKE_BATCH_SIZE);
  });
});
