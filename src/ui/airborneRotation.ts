import type { Orientation } from '../game/types';

type StripShape = { count: number; orientation: Orientation };

function dims(strip: StripShape, stone: number): { width: number; height: number } {
  return strip.orientation === 'horizontal'
    ? { width: strip.count * stone, height: stone }
    : { width: stone, height: strip.count * stone };
}

/**
 * How much to shift the airborne strip's rendered top-left corner
 * (`stripX`/`stripY` in `BoardScreen`) when its orientation flips, so the
 * rotation pivots around the strip's own centre instead of its first stone.
 * A `count x 1` bounding box becomes `1 x count` (or back), so the corner
 * that stays fixed - the centre - moves by half the size difference on
 * whichever axis changed.
 */
export function rotationPivotShift(before: StripShape, after: StripShape, stone: number): { dx: number; dy: number } {
  const beforeDims = dims(before, stone);
  const afterDims = dims(after, stone);
  return {
    dx: (beforeDims.width - afterDims.width) / 2,
    dy: (beforeDims.height - afterDims.height) / 2,
  };
}
