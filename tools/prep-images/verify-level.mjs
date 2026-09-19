#!/usr/bin/env node
/**
 * Checks a generated level directory against everything the app will assume.
 *
 * Run it on any level before committing it:
 *   node verify-level.mjs ../../assets/levels/sample-lagoon
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  BOARD_CELLS,
  BOARD_COLS,
  BOARD_COUNT,
  BOARD_HEIGHT,
  BOARD_ROWS,
  BOARD_WIDTH,
  FORMAT_VERSION,
} from './src/constants.mjs';
import { boardFileName } from './src/level.mjs';
import { neighborsOf } from './src/grid.mjs';

/**
 * @param {string} levelDir
 * @returns {Promise<string[]>} Problems found; empty means the level is sound.
 */
export async function verifyLevel(levelDir) {
  const problems = [];
  const fail = (message) => problems.push(message);

  const manifest = JSON.parse(await readFile(path.join(levelDir, 'level.json'), 'utf8'));

  if (manifest.formatVersion !== FORMAT_VERSION) {
    fail(`level.json formatVersion is ${manifest.formatVersion}, expected ${FORMAT_VERSION}`);
  }
  if (manifest.boards.length !== BOARD_COUNT) {
    fail(`level.json lists ${manifest.boards.length} boards, expected ${BOARD_COUNT}`);
  }
  if (manifest.palette.length < 2) {
    fail(`palette has ${manifest.palette.length} colours, expected at least 2`);
  }

  const paletteSize = manifest.palette.length;
  manifest.palette.forEach((entry, index) => {
    if (entry.index !== index) fail(`palette[${index}] has index ${entry.index}`);
    if (entry.number !== index + 1) fail(`palette[${index}] has number ${entry.number}`);
    if (!/^#[0-9a-f]{6}$/.test(entry.hex)) fail(`palette[${index}] hex ${entry.hex} is malformed`);
  });

  // Every cell of the level, so we can check the palette counts and the seams.
  const levelCells = new Int16Array(BOARD_COLS * BOARD_WIDTH * BOARD_ROWS * BOARD_HEIGHT).fill(-1);
  const levelWidth = BOARD_COLS * BOARD_WIDTH;
  const paletteUse = new Array(paletteSize).fill(0);

  for (let id = 0; id < BOARD_COUNT; id += 1) {
    const listed = manifest.boards.find((board) => board.id === id);
    if (!listed) {
      fail(`level.json has no entry for board ${id}`);
      continue;
    }

    const board = JSON.parse(await readFile(path.join(levelDir, listed.file), 'utf8'));
    const where = `board ${id} (${listed.file})`;

    if (board.id !== id) fail(`${where}: id is ${board.id}`);
    if (board.levelId !== manifest.id) fail(`${where}: levelId is ${board.levelId}`);
    if (board.col !== listed.col || board.row !== listed.row) {
      fail(`${where}: col/row ${board.col}/${board.row} disagrees with level.json ${listed.col}/${listed.row}`);
    }
    if (board.id !== board.row * BOARD_COLS + board.col) {
      fail(`${where}: id does not match row ${board.row} col ${board.col}`);
    }
    if (board.width !== BOARD_WIDTH || board.height !== BOARD_HEIGHT) {
      fail(`${where}: is ${board.width}x${board.height}, expected ${BOARD_WIDTH}x${BOARD_HEIGHT}`);
    }
    if (board.cells.length !== BOARD_CELLS) {
      fail(`${where}: has ${board.cells.length} cells, expected ${BOARD_CELLS}`);
    }

    const expectedNeighbors = neighborsOf(board.col, board.row);
    for (const [side, expected] of Object.entries(expectedNeighbors)) {
      if (board.neighbors[side] !== expected) {
        fail(`${where}: neighbour ${side} is ${board.neighbors[side]}, expected ${expected}`);
      }
    }

    // The stone economy: inventory per colour must equal demand per colour,
    // exactly. Too few and the board is unsolvable, too many and leftovers sit
    // in the tray at the end.
    const demand = new Map();
    for (const cell of board.cells) {
      if (!Number.isInteger(cell) || cell < 0 || cell >= paletteSize) {
        fail(`${where}: cell value ${cell} is outside the palette`);
        continue;
      }
      demand.set(cell, (demand.get(cell) ?? 0) + 1);
      paletteUse[cell] += 1;
    }

    const inventory = new Map(board.stones.map((stone) => [stone.color, stone.count]));
    if (inventory.size !== board.stones.length) fail(`${where}: stones lists a colour twice`);
    for (const [color, count] of demand) {
      if (inventory.get(color) !== count) {
        fail(`${where}: colour ${color} needs ${count} stones but the board supplies ${inventory.get(color) ?? 0}`);
      }
    }
    for (const color of inventory.keys()) {
      if (!demand.has(color)) fail(`${where}: supplies colour ${color} that no cell needs`);
    }
    const supplied = board.stones.reduce((total, stone) => total + stone.count, 0);
    if (supplied !== BOARD_CELLS) {
      fail(`${where}: supplies ${supplied} stones for ${BOARD_CELLS} cells`);
    }

    const listedColors = [...demand.keys()].sort((a, b) => a - b);
    if (JSON.stringify(listed.colors) !== JSON.stringify(listedColors)) {
      fail(`${where}: level.json colours disagree with the board's own cells`);
    }

    for (let y = 0; y < BOARD_HEIGHT; y += 1) {
      for (let x = 0; x < BOARD_WIDTH; x += 1) {
        const levelX = board.col * BOARD_WIDTH + x;
        const levelY = board.row * BOARD_HEIGHT + y;
        levelCells[levelY * levelWidth + levelX] = board.cells[y * BOARD_WIDTH + x];
      }
    }
  }

  if (levelCells.includes(-1)) fail('some level cells were never covered by a board');

  manifest.palette.forEach((entry, index) => {
    if (entry.count !== paletteUse[index]) {
      fail(`palette[${index}] claims ${entry.count} cells but the boards use ${paletteUse[index]}`);
    }
    if (paletteUse[index] === 0) fail(`palette[${index}] is never used by any cell`);
  });

  const startBoard = manifest.boards.find((board) => board.id === manifest.startBoardId);
  if (!startBoard) fail(`startBoardId ${manifest.startBoardId} is not a board in this level`);

  return problems;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dirs = process.argv.slice(2);
  if (dirs.length === 0) {
    process.stderr.write('Usage: node verify-level.mjs <level-dir...>\n');
    process.exitCode = 1;
  } else {
    let bad = 0;
    for (const dir of dirs) {
      let problems;
      try {
        problems = await verifyLevel(dir);
      } catch (error) {
        // An unreadable or malformed level is a problem like any other, not a
        // reason to abandon the rest of the list.
        problems = [`could not be read: ${error.message}`];
      }
      if (problems.length === 0) {
        process.stdout.write(`${dir}: ok\n`);
      } else {
        bad += 1;
        process.stdout.write(`${dir}: ${problems.length} problem(s)\n`);
        for (const problem of problems) process.stdout.write(`  - ${problem}\n`);
      }
    }
    process.exitCode = bad > 0 ? 1 : 0;
  }
}
