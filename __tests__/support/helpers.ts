import { generatePalette } from '../../src/game/palette';
import { BoardSession } from '../../src/game/session';
import type { BoardData } from '../../src/game/types';

/**
 * Build a tiny board from an ASCII map, one digit per cell.
 *
 *   makeBoard(['001', '221'])  ->  3x2 board using colours 0, 1 and 2
 */
export function makeBoard(rows: string[], id = 'test/board-0'): BoardData {
  const height = rows.length;
  const width = rows[0].length;
  const cells: number[] = [];
  let maxColor = 0;
  for (const row of rows) {
    if (row.length !== width) throw new Error('ragged board fixture');
    for (const char of row) {
      const color = Number.parseInt(char, 10);
      if (Number.isNaN(color)) throw new Error(`bad cell '${char}'`);
      maxColor = Math.max(maxColor, color);
      cells.push(color);
    }
  }
  return { id, width, height, palette: generatePalette(maxColor + 1), cells };
}

/** Cells of `color` on the board that still have no stone. */
export function emptyCellsOfColor(session: BoardSession, color: number): number {
  let count = 0;
  for (let index = 0; index < session.board.cells.length; index += 1) {
    if (session.board.cells[index] === color && session.isEmptyAt(index)) count += 1;
  }
  return count;
}

/**
 * The promise the whole stone economy rests on: for every colour, the stones
 * still owed equal the cells of that colour still empty. If this ever drifts,
 * a player can run out of stones with cells left to fill.
 */
export function expectSupplyMatchesBoard(session: BoardSession): void {
  for (let color = 0; color < session.board.palette.length; color += 1) {
    expect(session.remainingFor(color)).toBe(emptyCellsOfColor(session, color));
  }
}

/** Fill a board one stone at a time, taking each cell in reading order. */
export function fillBoard(session: BoardSession): void {
  for (let row = 0; row < session.board.height; row += 1) {
    for (let col = 0; col < session.board.width; col += 1) {
      const cell = session.cellAt(row, col);
      if (cell.placed !== null) continue;
      session.selectColor(cell.required);
      session.setStripCount(1);
      const result = session.place(row, col);
      if (!result.ok) throw new Error(`stuck at ${row},${col}: ${result.reason}`);
    }
  }
}
