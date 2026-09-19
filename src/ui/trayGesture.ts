import { TRAY_SLOTS } from '../game/geometry';

/**
 * The tray swipe.
 *
 * The tray always shows the pile, up to five stones. Touching it takes one
 * stone; sliding sideways across the stones raises the count to whichever stone
 * is under the finger, with the tray background filling behind them to show
 * it. Pulling upward lifts that many stones out of the tray and into the air.
 */
export interface TrayMetrics {
  /** Width and height of one stone slot. */
  slotSize: number;
  /** Space between slots. */
  gap: number;
  /** Padding inside the tray before the first slot. */
  padding: number;
  /** How many slots the tray has. */
  slots?: number;
}

/** Stone under a touch at `x`, measured from the tray's left edge. 1-based. */
export function countAtX(x: number, metrics: TrayMetrics): number {
  'worklet';
  const slots = metrics.slots ?? TRAY_SLOTS;
  const pitch = metrics.slotSize + metrics.gap;
  if (pitch <= 0) return 1;
  const slot = Math.floor((x - metrics.padding) / pitch) + 1;
  return Math.min(Math.max(slot, 1), slots);
}

/** Left edge and width of the fill that sits behind the first `count` stones. */
export function fillExtent(count: number, metrics: TrayMetrics): { x: number; width: number } {
  'worklet';
  const slots = metrics.slots ?? TRAY_SLOTS;
  const taken = Math.min(Math.max(count, 0), slots);
  const pitch = metrics.slotSize + metrics.gap;
  return {
    x: 0,
    width: taken === 0 ? 0 : metrics.padding * 2 + taken * metrics.slotSize + (taken - 1) * metrics.gap,
  };
}

/** How far up the finger must travel before the stones leave the tray. */
export const LIFT_THRESHOLD = 26;

/** True once an upward pull has gone far enough to lift the stones. */
export function shouldLift(translationY: number, threshold: number = LIFT_THRESHOLD): boolean {
  'worklet';
  return translationY <= -threshold;
}
