import {
  BOARD_PX_X,
  BOARD_PX_Y,
  PLAYABLE_SCALE,
  WALL_PX_HEIGHT,
  WALL_PX_WIDTH,
  boardAtPoint,
  boardTilePosition,
  centreBoardAt,
  isPlayableScale,
} from '../src/ui/unifiedBoard';
import { BOARDS_X, BOARDS_Y } from '../src/constants/board';

describe('boardTilePosition', () => {
  it('places board 0 at the top-left corner', () => {
    expect(boardTilePosition(0)).toEqual({ x: 0, y: 0 });
  });

  it('advances one tile per column, wrapping to the next row', () => {
    expect(boardTilePosition(1)).toEqual({ x: BOARD_PX_X, y: 0 });
    expect(boardTilePosition(BOARDS_X)).toEqual({ x: 0, y: BOARD_PX_Y });
  });

  it('places the last board at the bottom-right corner', () => {
    const lastId = BOARDS_X * BOARDS_Y - 1;
    expect(boardTilePosition(lastId)).toEqual({
      x: (BOARDS_X - 1) * BOARD_PX_X,
      y: (BOARDS_Y - 1) * BOARD_PX_Y,
    });
  });
});

describe('boardAtPoint', () => {
  it('finds the board a wall-space point falls in', () => {
    expect(boardAtPoint(0, 0)).toBe(0);
    expect(boardAtPoint(BOARD_PX_X + 5, 5)).toBe(1);
    expect(boardAtPoint(5, BOARD_PX_Y + 5)).toBe(BOARDS_X);
  });

  it('is null off the wall in any direction', () => {
    expect(boardAtPoint(-1, 0)).toBeNull();
    expect(boardAtPoint(0, -1)).toBeNull();
    expect(boardAtPoint(WALL_PX_WIDTH, 0)).toBeNull();
    expect(boardAtPoint(0, WALL_PX_HEIGHT)).toBeNull();
  });
});

describe('centreBoardAt', () => {
  it('finds the board under the screen centre for an identity viewport', () => {
    const viewport = { translateX: 0, translateY: 0, scale: 1 };
    // Screen centre (200, 200) lands inside board 0's tile.
    expect(centreBoardAt(viewport, 400, 400)).toBe(0);
  });

  it('tracks panning: shifting the wall left brings the next board to centre', () => {
    const viewport = { translateX: -BOARD_PX_X, translateY: 0, scale: 1 };
    expect(centreBoardAt(viewport, 400, 400)).toBe(1);
  });

  it('is null when the screen centre pans off the wall', () => {
    const viewport = { translateX: WALL_PX_WIDTH + 1000, translateY: 0, scale: 1 };
    expect(centreBoardAt(viewport, 400, 400)).toBeNull();
  });
});

describe('isPlayableScale', () => {
  it('matches the documented threshold exactly', () => {
    expect(isPlayableScale(PLAYABLE_SCALE)).toBe(true);
    expect(isPlayableScale(PLAYABLE_SCALE - 0.01)).toBe(false);
  });
});
