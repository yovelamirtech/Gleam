import bicycletrex from './bicycletrex';
import lasertoaster from './lasertoaster';
import library from './library';
import robocat from './robocat';
import sampleLagoon from './sampleLagoon';
import tacopenguin from './tacopenguin';
import view from './view';
import type { PreparedLevel } from './preparedLevel';

/**
 * Maps a level id from the levels wall (0-based, `LEVEL_COUNT` slots) to one
 * of the prepared levels `tools/prep-images` has generated. Every level id
 * past the end of this list still falls back to a generated placeholder
 * board (see `BoardRoute`) until its own source image is prepared.
 */
export const PREPARED_LEVELS: PreparedLevel[] = [
  sampleLagoon,
  bicycletrex,
  lasertoaster,
  library,
  robocat,
  tacopenguin,
  view,
];

export function preparedLevelFor(levelId: number): PreparedLevel | undefined {
  return PREPARED_LEVELS[levelId];
}
