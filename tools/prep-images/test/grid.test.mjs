import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import {
  BOARD_CELLS,
  BOARD_COLS,
  BOARD_COUNT,
  BOARD_HEIGHT,
  BOARD_ROWS,
  BOARD_WIDTH,
  LEVEL_HEIGHT,
  LEVEL_WIDTH,
  START_BOARD_ID,
} from '../src/constants.mjs';
import { boardId, neighborsOf, splitIntoBoards, stoneCounts } from '../src/grid.mjs';

/** A level grid where every cell holds a value derived from its position. */
function levelGrid(fn) {
  const cells = new Uint8Array(LEVEL_WIDTH * LEVEL_HEIGHT);
  for (let y = 0; y < LEVEL_HEIGHT; y += 1) {
    for (let x = 0; x < LEVEL_WIDTH; x += 1) cells[y * LEVEL_WIDTH + x] = fn(x, y);
  }
  return cells;
}

describe('geometry', () => {
  test('matches the layout the build plan fixes', () => {
    assert.equal(BOARD_COUNT, 48);
    assert.equal(BOARD_COLS, 8);
    assert.equal(BOARD_ROWS, 6);
    assert.equal(BOARD_CELLS, 1600);
    assert.equal(LEVEL_WIDTH, 320);
    assert.equal(LEVEL_HEIGHT, 240);
  });

  test('the starting board is a central one', () => {
    assert.equal(START_BOARD_ID, boardId(3, 2));
    const neighbors = neighborsOf(3, 2);
    assert.ok(Object.values(neighbors).every((id) => id !== null), 'start board should be interior');
  });
});

describe('neighborsOf', () => {
  test('an interior board has four neighbours', () => {
    assert.deepEqual(neighborsOf(3, 2), { up: 11, down: 27, left: 18, right: 20 });
  });

  test('edges and corners have none across the boundary', () => {
    assert.deepEqual(neighborsOf(0, 0), { up: null, down: 8, left: null, right: 1 });
    assert.deepEqual(neighborsOf(BOARD_COLS - 1, BOARD_ROWS - 1), {
      up: 39,
      down: null,
      left: 46,
      right: null,
    });
  });

  test('neighbour links are symmetric', () => {
    const opposite = { up: 'down', down: 'up', left: 'right', right: 'left' };
    for (let row = 0; row < BOARD_ROWS; row += 1) {
      for (let col = 0; col < BOARD_COLS; col += 1) {
        const id = boardId(col, row);
        for (const [side, neighbor] of Object.entries(neighborsOf(col, row))) {
          if (neighbor === null) continue;
          const back = neighborsOf(neighbor % BOARD_COLS, Math.floor(neighbor / BOARD_COLS));
          assert.equal(back[opposite[side]], id, `${id} ${side} link is not symmetric`);
        }
      }
    }
  });
});

describe('stoneCounts', () => {
  test('supplies exactly as many stones as cells of that colour', () => {
    const stones = stoneCounts(Uint8Array.from([3, 1, 3, 7, 1, 3]));
    assert.deepEqual(stones, [
      { color: 1, count: 2 },
      { color: 3, count: 3 },
      { color: 7, count: 1 },
    ]);
  });

  test('lists no colour the board does not use', () => {
    const stones = stoneCounts(Uint8Array.from([5, 5, 5]));
    assert.deepEqual(stones, [{ color: 5, count: 3 }]);
  });
});

describe('splitIntoBoards', () => {
  const cells = levelGrid((x, y) => (x * 7 + y * 13) % 251 % 24);
  const boards = splitIntoBoards(cells);

  test('produces the 48 boards in id order', () => {
    assert.equal(boards.length, BOARD_COUNT);
    boards.forEach((board, index) => {
      assert.equal(board.id, index);
      assert.equal(board.id, board.row * BOARD_COLS + board.col);
      assert.equal(board.cells.length, BOARD_CELLS);
    });
  });

  test('every board takes its own 40x40 window of the level', () => {
    for (const board of boards) {
      for (let y = 0; y < BOARD_HEIGHT; y += 1) {
        for (let x = 0; x < BOARD_WIDTH; x += 1) {
          const levelX = board.col * BOARD_WIDTH + x;
          const levelY = board.row * BOARD_HEIGHT + y;
          assert.equal(board.cells[y * BOARD_WIDTH + x], cells[levelY * LEVEL_WIDTH + levelX]);
        }
      }
    }
  });

  test('the boards reassemble into the level with nothing lost or duplicated', () => {
    const rebuilt = new Int16Array(LEVEL_WIDTH * LEVEL_HEIGHT).fill(-1);
    for (const board of boards) {
      for (let y = 0; y < BOARD_HEIGHT; y += 1) {
        for (let x = 0; x < BOARD_WIDTH; x += 1) {
          const at = (board.row * BOARD_HEIGHT + y) * LEVEL_WIDTH + board.col * BOARD_WIDTH + x;
          assert.equal(rebuilt[at], -1, `cell ${at} was written by two boards`);
          rebuilt[at] = board.cells[y * BOARD_WIDTH + x];
        }
      }
    }
    assert.deepEqual([...rebuilt], [...cells]);
  });

  test('cells touching across a seam keep the same colour numbers', () => {
    // Quantizing per board would renumber colours at the join; because the
    // palette is chosen for the whole image first, a run of one colour keeps
    // one number the whole way across.
    const stripe = splitIntoBoards(levelGrid((_x, y) => y % 5));
    for (const board of stripe) {
      if (board.neighbors.right === null) continue;
      const right = stripe[board.neighbors.right];
      for (let y = 0; y < BOARD_HEIGHT; y += 1) {
        assert.equal(
          board.cells[y * BOARD_WIDTH + (BOARD_WIDTH - 1)],
          right.cells[y * BOARD_WIDTH],
          `seam between ${board.id} and ${right.id} breaks on row ${y}`,
        );
      }
    }
  });

  test('stone inventory covers every cell of the board exactly once', () => {
    for (const board of boards) {
      const total = board.stones.reduce((sum, stone) => sum + stone.count, 0);
      assert.equal(total, BOARD_CELLS, `board ${board.id} supplies ${total} stones`);
      const demand = new Map();
      for (const cell of board.cells) demand.set(cell, (demand.get(cell) ?? 0) + 1);
      for (const stone of board.stones) assert.equal(stone.count, demand.get(stone.color));
      assert.equal(board.stones.length, demand.size);
    }
  });

  test('rejects a grid that is not a whole level', () => {
    assert.throws(() => splitIntoBoards(new Uint8Array(100)), /expected 76800 cells/);
  });
});
