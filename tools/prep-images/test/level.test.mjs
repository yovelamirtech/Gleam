import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test, { after, before, describe } from 'node:test';
import sharp from 'sharp';

import {
  BOARD_COLS,
  BOARD_COUNT,
  BOARD_HEIGHT,
  BOARD_WIDTH,
  LEVEL_HEIGHT,
  LEVEL_WIDTH,
  START_BOARD_ID,
} from '../src/constants.mjs';
import { buildLevel, buildLevelCells, boardFileName, slugify, titleize } from '../src/level.mjs';
import { verifyLevel } from '../verify-level.mjs';

/**
 * A source image with a smooth left-to-right hue sweep and a big soft disc.
 * Both features run across board seams, which is where a per-board palette
 * would show a join.
 */
async function writeSourceImage(file, width = 640, height = 480) {
  const pixels = Buffer.allocUnsafe(width * height * 3);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const u = x / width;
      const v = y / height;
      const disc = Math.hypot(x - width * 0.5, y - height * 0.45) / (height * 0.3);
      const glow = Math.max(0, 1 - disc) ** 1.5;
      const offset = (y * width + x) * 3;
      pixels[offset] = Math.round(255 * Math.min(1, u * 0.8 + glow));
      pixels[offset + 1] = Math.round(255 * Math.min(1, v * 0.6 + glow * 0.8));
      pixels[offset + 2] = Math.round(255 * Math.min(1, (1 - u) * 0.7 + glow * 0.4));
    }
  }
  await sharp(pixels, { raw: { width, height, channels: 3 } }).png().toFile(file);
}

describe('slugify and titleize', () => {
  test('turns a file name into an id', () => {
    assert.equal(slugify('Sunset Over Water.jpg'), 'sunset-over-water-jpg');
    assert.equal(slugify('  Café_Noir!! '), 'cafe-noir');
    assert.equal(slugify('***'), 'level');
  });

  test('turns an id back into a display name', () => {
    assert.equal(titleize('sunset-over-water'), 'Sunset Over Water');
  });
});

test('board file names sort in id order', () => {
  assert.equal(boardFileName(0), '000.json');
  assert.equal(boardFileName(47), '047.json');
  const names = Array.from({ length: BOARD_COUNT }, (_, id) => boardFileName(id));
  assert.deepEqual(names, [...names].sort());
});

describe('buildLevel', () => {
  let workDir;
  let outDir;
  let source;
  let result;

  before(async () => {
    workDir = await mkdtemp(path.join(tmpdir(), 'gleam-prep-'));
    outDir = path.join(workDir, 'levels');
    source = path.join(workDir, 'Test Scene.png');
    await writeSourceImage(source);
    result = await buildLevel({ input: source, outDir, colors: 16 });
  });

  after(async () => {
    await rm(workDir, { recursive: true, force: true });
  });

  test('names the level after the source file', () => {
    assert.equal(result.levelId, 'test-scene');
    assert.equal(result.manifest.name, 'Test Scene');
    assert.equal(result.manifest.source.file, 'Test Scene.png');
    assert.equal(result.manifest.source.width, 640);
  });

  test('writes a level the verifier is happy with', async () => {
    const problems = await verifyLevel(result.levelDir);
    assert.deepEqual(problems, [], problems.join('\n'));
  });

  test('stays within the requested palette and starts on a central board', () => {
    assert.ok(result.manifest.palette.length <= 16);
    assert.equal(result.manifest.startBoardId, START_BOARD_ID);
    assert.equal(result.manifest.boards.length, BOARD_COUNT);
  });

  test('palette counts add up to every cell in the level', () => {
    const total = result.manifest.palette.reduce((sum, entry) => sum + entry.count, 0);
    assert.equal(total, LEVEL_WIDTH * LEVEL_HEIGHT);
  });

  test('the boards are windows on one whole-image quantization', async () => {
    // The strongest statement of the seam guarantee: read every board back off
    // disk, reassemble them, and check the result is cell-for-cell identical to
    // quantizing the whole 320x240 image in one pass. Anything quantized per
    // board would diverge here.
    const { indices } = await buildLevelCells(source, { colors: 16 });
    const rebuilt = new Int16Array(LEVEL_WIDTH * LEVEL_HEIGHT).fill(-1);

    for (let id = 0; id < BOARD_COUNT; id += 1) {
      const board = JSON.parse(
        await readFile(path.join(result.levelDir, 'boards', boardFileName(id)), 'utf8'),
      );
      for (let y = 0; y < BOARD_HEIGHT; y += 1) {
        for (let x = 0; x < BOARD_WIDTH; x += 1) {
          const at = (board.row * BOARD_HEIGHT + y) * LEVEL_WIDTH + board.col * BOARD_WIDTH + x;
          rebuilt[at] = board.cells[y * BOARD_WIDTH + x];
        }
      }
    }

    assert.deepEqual([...rebuilt], [...indices]);
  });

  test('colours step no harder across a board seam than inside a board', async () => {
    // What the player actually sees: no visible join. Compare how much the
    // colour changes between the two columns either side of every vertical
    // seam against the same measure for ordinary neighbouring columns.
    const { palette, indices } = await buildLevelCells(source, { colors: 16 });
    const step = (leftX, y) => {
      const a = palette[indices[y * LEVEL_WIDTH + leftX]].rgb;
      const b = palette[indices[y * LEVEL_WIDTH + leftX + 1]].rgb;
      return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
    };

    let seamTotal = 0;
    let seamCount = 0;
    let insideTotal = 0;
    let insideCount = 0;
    for (let y = 0; y < LEVEL_HEIGHT; y += 1) {
      for (let x = 0; x < LEVEL_WIDTH - 1; x += 1) {
        if ((x + 1) % BOARD_WIDTH === 0) {
          seamTotal += step(x, y);
          seamCount += 1;
        } else {
          insideTotal += step(x, y);
          insideCount += 1;
        }
      }
    }

    const seamStep = seamTotal / seamCount;
    const insideStep = insideTotal / insideCount;
    assert.ok(seamCount === LEVEL_HEIGHT * (BOARD_COLS - 1));
    assert.ok(
      seamStep <= insideStep * 1.5 + 1,
      `seam colour step ${seamStep.toFixed(2)} is worse than the ${insideStep.toFixed(2)} seen inside boards`,
    );
  });

  test('writes a preview sized to the level grid', async () => {
    const meta = await sharp(path.join(result.levelDir, 'preview.png')).metadata();
    assert.equal(meta.width, LEVEL_WIDTH * 3);
    assert.equal(meta.height, LEVEL_HEIGHT * 3);
  });

  test('every board knows its own place in the level', async () => {
    for (let id = 0; id < BOARD_COUNT; id += 1) {
      const board = JSON.parse(await readFile(path.join(result.levelDir, 'boards', boardFileName(id)), 'utf8'));
      assert.equal(board.id, id);
      assert.equal(board.col, id % BOARD_COLS);
      assert.equal(board.row, Math.floor(id / BOARD_COLS));
      assert.equal(board.levelId, result.levelId);
    }
  });

  test('re-running with --force replaces the level rather than merging with it', async () => {
    const again = await buildLevel({ input: source, outDir, colors: 8, force: true });
    assert.ok(again.manifest.palette.length <= 8);
    assert.deepEqual(await verifyLevel(again.levelDir), []);
  });
});
