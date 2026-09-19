import {
  clampStripHead,
  cellCol,
  cellIndex,
  cellRow,
  inBounds,
  otherOrientation,
  stripCells,
} from '../src/game/geometry';

const board = { width: 40, height: 40 };

describe('cell indexing', () => {
  it('round-trips row/col through a row-major index', () => {
    for (const [row, col] of [
      [0, 0],
      [0, 39],
      [39, 0],
      [17, 23],
    ]) {
      const index = cellIndex(row, col, board.width);
      expect(cellRow(index, board.width)).toBe(row);
      expect(cellCol(index, board.width)).toBe(col);
    }
  });

  it('rejects positions off the board', () => {
    expect(inBounds(0, 0, board)).toBe(true);
    expect(inBounds(39, 39, board)).toBe(true);
    expect(inBounds(-1, 0, board)).toBe(false);
    expect(inBounds(0, 40, board)).toBe(false);
  });
});

describe('stripCells', () => {
  it('grows right when horizontal and down when vertical', () => {
    expect(stripCells(2, 3, 3, 'horizontal', board)).toEqual([83, 84, 85]);
    expect(stripCells(2, 3, 3, 'vertical', board)).toEqual([83, 123, 163]);
  });

  it('returns null rather than a clipped strip when it runs off an edge', () => {
    expect(stripCells(0, 38, 3, 'horizontal', board)).toBeNull();
    expect(stripCells(38, 0, 3, 'vertical', board)).toBeNull();
    expect(stripCells(0, 37, 3, 'horizontal', board)).toHaveLength(3);
  });

  it('refuses a strip of zero stones', () => {
    expect(stripCells(0, 0, 0, 'horizontal', board)).toBeNull();
  });
});

describe('clampStripHead', () => {
  it('pulls a head back so the whole strip fits', () => {
    expect(clampStripHead(0, 39, 5, 'horizontal', board)).toEqual({ row: 0, col: 35 });
    expect(clampStripHead(39, 0, 5, 'vertical', board)).toEqual({ row: 35, col: 0 });
  });

  it('pulls a head inside the board from negative coordinates', () => {
    expect(clampStripHead(-4, -7, 2, 'horizontal', board)).toEqual({ row: 0, col: 0 });
  });

  it('leaves a head that already fits alone', () => {
    expect(clampStripHead(10, 10, 5, 'horizontal', board)).toEqual({ row: 10, col: 10 });
  });
});

describe('otherOrientation', () => {
  it('flips both ways', () => {
    expect(otherOrientation('horizontal')).toBe('vertical');
    expect(otherOrientation('vertical')).toBe('horizontal');
  });
});
