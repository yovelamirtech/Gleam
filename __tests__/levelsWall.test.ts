import { LEVELS_X, LEVEL_COUNT } from '../src/constants/board';
import { LEVEL_TILE, WALL_HEIGHT, WALL_WIDTH, levelAtPoint, levelTilePosition } from '../src/ui/levelsWall';

describe('levelTilePosition', () => {
  it('places level ids in row-major order across the wall', () => {
    expect(levelTilePosition(0)).toEqual({ x: 0, y: 0 });
    expect(levelTilePosition(1)).toEqual({ x: LEVEL_TILE, y: 0 });
    expect(levelTilePosition(LEVELS_X)).toEqual({ x: 0, y: LEVEL_TILE });
  });
});

describe('levelAtPoint', () => {
  it('maps a point inside a tile back to that tile\'s level id', () => {
    const { x, y } = levelTilePosition(6);
    expect(levelAtPoint(x + 1, y + 1)).toBe(6);
    expect(levelAtPoint(x + LEVEL_TILE - 1, y + LEVEL_TILE - 1)).toBe(6);
  });

  it('returns null off the wall entirely', () => {
    expect(levelAtPoint(-1, 0)).toBeNull();
    expect(levelAtPoint(0, -1)).toBeNull();
    expect(levelAtPoint(WALL_WIDTH, 0)).toBeNull();
    expect(levelAtPoint(0, WALL_HEIGHT)).toBeNull();
  });

  it('covers every level id exactly once across the whole wall', () => {
    const seen = new Set<number>();
    for (let levelId = 0; levelId < LEVEL_COUNT; levelId += 1) {
      const { x, y } = levelTilePosition(levelId);
      const found = levelAtPoint(x + LEVEL_TILE / 2, y + LEVEL_TILE / 2);
      expect(found).toBe(levelId);
      seen.add(found as number);
    }
    expect(seen.size).toBe(LEVEL_COUNT);
  });
});
