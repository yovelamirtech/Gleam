/**
 * Builds a whole level from one source image and writes it to disk.
 */
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

import {
  BOARD_COLS,
  BOARD_COUNT,
  BOARD_HEIGHT,
  BOARD_ROWS,
  BOARD_WIDTH,
  FORMAT_VERSION,
  LEVEL_HEIGHT,
  LEVEL_WIDTH,
  START_BOARD_ID,
} from './constants.mjs';
import { splitIntoBoards } from './grid.mjs';
import { quantize } from './quantize.mjs';

/** `Sunset Over Water.jpg` -> `sunset-over-water` */
export function slugify(value) {
  const slug = value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'level';
}

/** `sunset-over-water` -> `Sunset Over Water` */
export function titleize(slug) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');
}

export const boardFileName = (id) => `${String(id).padStart(3, '0')}.json`;

/**
 * Reads a source image and reduces it to one palette index per level cell.
 *
 * The resize happens first and the quantization second, over the whole
 * 320x240 grid at once. Quantizing board by board would give each board its
 * own palette and the colours would not line up across the seams.
 */
export async function buildLevelCells(input, { colors, fit = 'cover' }) {
  const image = sharp(input, { failOn: 'error' });
  const meta = await image.metadata();

  const { data } = await image
    .resize(LEVEL_WIDTH, LEVEL_HEIGHT, { fit, position: 'centre', background: '#ffffff', kernel: 'lanczos3' })
    .flatten({ background: '#ffffff' }) // a diamond cannot be transparent
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { palette, indices } = quantize(data, { colors });
  return {
    palette,
    indices,
    source: { width: meta.width ?? null, height: meta.height ?? null, format: meta.format ?? null },
  };
}

/**
 * Writes a board as JSON with `cells` laid out one board row per line, so a
 * board file can be read as the grid it is instead of 1600 numbers on one line.
 */
export function serializeBoard(levelId, board) {
  const head = {
    formatVersion: FORMAT_VERSION,
    levelId,
    id: board.id,
    col: board.col,
    row: board.row,
    width: BOARD_WIDTH,
    height: BOARD_HEIGHT,
    neighbors: board.neighbors,
    stones: board.stones,
  };

  const rows = [];
  for (let y = 0; y < BOARD_HEIGHT; y += 1) {
    const row = board.cells.subarray(y * BOARD_WIDTH, (y + 1) * BOARD_WIDTH);
    rows.push(`    ${Array.from(row).join(', ')}`);
  }

  const headJson = JSON.stringify(head, null, 2);
  const body = `${headJson.slice(0, -2)},\n  "cells": [\n${rows.join(',\n')}\n  ]\n}\n`;
  return body;
}

/** Renders the finished level as a PNG, for level-wall thumbnails and previews. */
async function writePreview(outPath, palette, indices, scale) {
  const pixels = Buffer.allocUnsafe(indices.length * 3);
  for (let i = 0; i < indices.length; i += 1) {
    const [r, g, b] = palette[indices[i]].rgb;
    pixels[i * 3] = r;
    pixels[i * 3 + 1] = g;
    pixels[i * 3 + 2] = b;
  }
  await sharp(pixels, { raw: { width: LEVEL_WIDTH, height: LEVEL_HEIGHT, channels: 3 } })
    .resize(LEVEL_WIDTH * scale, LEVEL_HEIGHT * scale, { kernel: 'nearest' })
    .png({ compressionLevel: 9 })
    .toFile(outPath);
}

/**
 * Turns one source image into a level directory.
 *
 * @param {object} options
 * @param {string} options.input Path to the source image.
 * @param {string} options.outDir Directory that holds all levels.
 * @param {number} options.colors Palette size.
 * @param {string} [options.id] Level id; defaults to a slug of the file name.
 * @param {string} [options.name] Display name; defaults to a title of the id.
 * @param {'cover'|'contain'} [options.fit] How to fit a non-4:3 source image.
 * @param {boolean} [options.preview] Also write preview.png.
 * @param {number} [options.previewScale] Pixels per cell in the preview.
 * @param {boolean} [options.force] Overwrite an existing level directory.
 */
export async function buildLevel({
  input,
  outDir,
  colors,
  id,
  name,
  fit = 'cover',
  preview = true,
  previewScale = 3,
  force = false,
}) {
  const levelId = slugify(id ?? path.basename(input, path.extname(input)));
  const levelDir = path.join(outDir, levelId);

  // Decode and quantize before touching the output directory, so an image that
  // cannot be read leaves no half-made level behind.
  const { palette, indices, source } = await buildLevelCells(input, { colors, fit });
  const boards = splitIntoBoards(indices);

  if (force) await rm(levelDir, { recursive: true, force: true });
  await mkdir(path.join(levelDir, 'boards'), { recursive: true });

  const levelCounts = new Array(palette.length).fill(0);
  for (const index of indices) levelCounts[index] += 1;

  await Promise.all(
    boards.map((board) =>
      writeFile(
        path.join(levelDir, 'boards', boardFileName(board.id)),
        serializeBoard(levelId, board),
      ),
    ),
  );

  if (preview) {
    await writePreview(path.join(levelDir, 'preview.png'), palette, indices, previewScale);
  }

  const manifest = {
    formatVersion: FORMAT_VERSION,
    id: levelId,
    name: name ?? titleize(levelId),
    source: { file: path.basename(input), ...source },
    generatedBy: 'tools/prep-images',
    grid: {
      boardCols: BOARD_COLS,
      boardRows: BOARD_ROWS,
      boardWidth: BOARD_WIDTH,
      boardHeight: BOARD_HEIGHT,
      levelWidth: LEVEL_WIDTH,
      levelHeight: LEVEL_HEIGHT,
      boardCount: BOARD_COUNT,
    },
    startBoardId: START_BOARD_ID,
    preview: preview ? 'preview.png' : null,
    palette: palette.map((entry, index) => ({
      index,
      number: index + 1,
      hex: entry.hex,
      rgb: entry.rgb,
      count: levelCounts[index],
    })),
    boards: boards.map((board) => ({
      id: board.id,
      col: board.col,
      row: board.row,
      file: `boards/${boardFileName(board.id)}`,
      colors: board.stones.map((stone) => stone.color),
      stoneCount: board.cells.length,
    })),
  };

  await writeFile(path.join(levelDir, 'level.json'), `${JSON.stringify(manifest, null, 2)}\n`);

  return { levelId, levelDir, manifest };
}
