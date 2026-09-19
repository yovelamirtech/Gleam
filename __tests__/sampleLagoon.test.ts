import { BOARD_CELLS_X, BOARD_CELLS_Y, CELLS_PER_BOARD } from '../src/constants/board';
import { getSampleLagoonBoard, SAMPLE_LAGOON_START_BOARD } from '../src/game/levels/sampleLagoon';

describe('getSampleLagoonBoard', () => {
  it('reads the generated grid at its real size', () => {
    const board = getSampleLagoonBoard(SAMPLE_LAGOON_START_BOARD);
    expect(board.id).toBe(`sample-lagoon/board-${SAMPLE_LAGOON_START_BOARD}`);
    expect(board.width).toBe(BOARD_CELLS_X);
    expect(board.height).toBe(BOARD_CELLS_Y);
    expect(board.cells).toHaveLength(CELLS_PER_BOARD);
  });

  it('shares one palette across boards, so seams line up', () => {
    const first = getSampleLagoonBoard(0);
    const other = getSampleLagoonBoard(1);
    expect(other.palette).toBe(first.palette);
    expect(first.palette.length).toBeGreaterThan(0);
  });

  it('every cell points at a real palette entry', () => {
    const board = getSampleLagoonBoard(0);
    for (const cell of board.cells) {
      expect(cell).toBeGreaterThanOrEqual(0);
      expect(cell).toBeLessThan(board.palette.length);
    }
  });

  it('gives each of the 48 boards a distinct id', () => {
    const ids = new Set(Array.from({ length: 48 }, (_, id) => getSampleLagoonBoard(id).id));
    expect(ids.size).toBe(48);
  });
});
