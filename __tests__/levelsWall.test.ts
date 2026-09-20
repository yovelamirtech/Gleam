import { LEVELS_X, LEVELS_Y, LEVEL_COUNT } from '../src/constants/board';
import { LEVEL_TILE, WALL_HEIGHT, WALL_WIDTH, levelAtPoint, levelTilePosition } from '../src/ui/levelsWall';

describe('levelTilePosition', () => {
  it('places level 0 at the wall\'s centre tile', () => {
    // 4 wide, 5 tall: centre is row 2, col 2.
    expect(levelTilePosition(0)).toEqual({ x: 2 * LEVEL_TILE, y: 2 * LEVEL_TILE });
  });

  it('places low level ids in the ring immediately around the centre', () => {
    const centreCol = Math.floor(LEVELS_X / 2);
    const centreRow = Math.floor(LEVELS_Y / 2);
    for (let levelId = 1; levelId <= 8; levelId += 1) {
      const { x, y } = levelTilePosition(levelId);
      const col = x / LEVEL_TILE;
      const row = y / LEVEL_TILE;
      const distance = Math.max(Math.abs(row - centreRow), Math.abs(col - centreCol));
      expect(distance).toBe(1);
    }
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
