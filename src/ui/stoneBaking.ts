/**
 * Batch-boundary maths for `BoardCanvas`'s incremental stones picture.
 *
 * Rebuilding the whole board's stones picture from scratch on every single
 * placement costs O(n) work at the n-th placement (replaying every past
 * stone's `drawStone` calls), so filling a board of N cells this way costs
 * O(N^2) draw-call work in total. Instead the canvas keeps a "baked" picture
 * covering every full batch of `BAKE_BATCH_SIZE` placements - rebuilt only
 * when a new batch completes, by drawing the previous baked picture (a
 * single `drawPicture` call, not a replay of every stone in it) plus the new
 * batch's own stones - and a small "tail" picture covering the placements
 * since the last batch boundary, rebuilt every placement but bounded to at
 * most `BAKE_BATCH_SIZE - 1` stones. Total work across a full fill is
 * O(N * BAKE_BATCH_SIZE), not O(N^2).
 */
export const BAKE_BATCH_SIZE = 16;

/**
 * The placement count the baked picture should cover for `totalPlacements`
 * placements so far - the largest multiple of `BAKE_BATCH_SIZE` not
 * exceeding it. Placements grow monotonically within a board session (see
 * `BoardSession.history`), so this only ever moves forward.
 */
export function bakeBoundary(totalPlacements: number): number {
  return Math.floor(totalPlacements / BAKE_BATCH_SIZE) * BAKE_BATCH_SIZE;
}
