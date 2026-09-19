import type { Placement } from './types';

/**
 * Frames for the level-complete celebration (BUILD_PLAN.md): the stones vanish
 * newest-first, then reappear oldest-first so the picture redraws itself in the
 * order the player actually solved it. Both directions come from the stored
 * placement order, which is why order is persisted and not just position.
 */
export function replayForward(placements: readonly Placement[]): Placement[] {
  return [...placements].sort((a, b) => a.order - b.order);
}

export function replayReverse(placements: readonly Placement[]): Placement[] {
  return replayForward(placements).reverse();
}

/** Stones to show at `step` of the redraw, 0 meaning a blank board. */
export function replaySlice(placements: readonly Placement[], step: number): Placement[] {
  const ordered = replayForward(placements);
  return ordered.slice(0, Math.min(Math.max(step, 0), ordered.length));
}
