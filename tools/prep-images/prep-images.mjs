#!/usr/bin/env node
/**
 * Batch image preparation for Gleam levels.
 *
 * Usage:
 *   node prep-images.mjs <image-or-directory...> [options]
 *
 * Options:
 *   --out <dir>        Where levels are written (default ../../assets/levels)
 *   --colors <n>       Palette size, 2-64 (default 24)
 *   --fit cover|contain  How to fit a source image that is not 4:3 (default cover)
 *   --id <slug>        Level id; only valid with a single input
 *   --name <text>      Display name; only valid with a single input
 *   --no-preview       Skip preview.png
 *   --preview-scale <n>  Pixels per cell in preview.png (default 3)
 *   --force            Overwrite an existing level directory
 */
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { DEFAULT_COLORS, MAX_COLORS, MIN_COLORS } from './src/constants.mjs';
import { buildLevel } from './src/level.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_OUT = path.resolve(HERE, '../../assets/levels');
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.tiff', '.tif', '.gif', '.avif']);

class UsageError extends Error {}

export function parseArgs(argv) {
  const options = {
    inputs: [],
    out: DEFAULT_OUT,
    colors: DEFAULT_COLORS,
    fit: 'cover',
    id: undefined,
    name: undefined,
    preview: true,
    previewScale: 3,
    force: false,
  };

  const takeValue = (flag, value) => {
    if (value === undefined) throw new UsageError(`${flag} needs a value`);
    return value;
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case '--out':
        options.out = path.resolve(takeValue(arg, argv[++i]));
        break;
      case '--colors': {
        const colors = Number(takeValue(arg, argv[++i]));
        if (!Number.isInteger(colors) || colors < MIN_COLORS || colors > MAX_COLORS) {
          throw new UsageError(`--colors must be a whole number from ${MIN_COLORS} to ${MAX_COLORS}`);
        }
        options.colors = colors;
        break;
      }
      case '--fit': {
        const fit = takeValue(arg, argv[++i]);
        if (fit !== 'cover' && fit !== 'contain') throw new UsageError('--fit must be cover or contain');
        options.fit = fit;
        break;
      }
      case '--id':
        options.id = takeValue(arg, argv[++i]);
        break;
      case '--name':
        options.name = takeValue(arg, argv[++i]);
        break;
      case '--no-preview':
        options.preview = false;
        break;
      case '--preview-scale': {
        const scale = Number(takeValue(arg, argv[++i]));
        if (!Number.isInteger(scale) || scale < 1 || scale > 16) {
          throw new UsageError('--preview-scale must be a whole number from 1 to 16');
        }
        options.previewScale = scale;
        break;
      }
      case '--force':
        options.force = true;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      default:
        if (arg.startsWith('-')) throw new UsageError(`unknown option ${arg}`);
        options.inputs.push(arg);
    }
  }

  return options;
}

/** Expands directories into the image files inside them, sorted for a stable batch order. */
async function collectInputs(inputs) {
  const files = [];
  for (const input of inputs) {
    const info = await stat(input).catch(() => null);
    if (!info) throw new UsageError(`no such file or directory: ${input}`);
    if (info.isDirectory()) {
      const entries = await readdir(input);
      const images = entries
        .filter((entry) => IMAGE_EXTENSIONS.has(path.extname(entry).toLowerCase()))
        .sort()
        .map((entry) => path.join(input, entry));
      if (images.length === 0) throw new UsageError(`no images found in ${input}`);
      files.push(...images);
    } else {
      files.push(input);
    }
  }
  return files;
}

async function main(argv) {
  const options = parseArgs(argv);

  if (options.help || options.inputs.length === 0) {
    process.stdout.write(`${readUsage()}\n`);
    return options.help ? 0 : 1;
  }

  const files = await collectInputs(options.inputs);
  if (files.length > 1 && (options.id || options.name)) {
    throw new UsageError('--id and --name only make sense with a single input image');
  }

  let failures = 0;
  for (const file of files) {
    try {
      const { levelId, levelDir, manifest } = await buildLevel({ ...options, outDir: options.out, input: file });
      process.stdout.write(
        `${levelId}: ${manifest.palette.length} colours, ${manifest.boards.length} boards -> ${path.relative(process.cwd(), levelDir)}\n`,
      );
    } catch (error) {
      failures += 1;
      // Keep going: one unreadable image should not abandon the rest of a batch.
      process.stderr.write(`${file}: ${error.message}\n`);
    }
  }

  if (failures > 0) process.stderr.write(`\n${failures} of ${files.length} image(s) failed\n`);
  return failures > 0 ? 1 : 0;
}

function readUsage() {
  return [
    'Usage: node prep-images.mjs <image-or-directory...> [options]',
    '',
    `  --out <dir>          where levels are written (default ${path.relative(process.cwd(), DEFAULT_OUT) || DEFAULT_OUT})`,
    `  --colors <n>         palette size, ${MIN_COLORS}-${MAX_COLORS} (default ${DEFAULT_COLORS})`,
    '  --fit cover|contain  how to fit a source image that is not 4:3 (default cover)',
    '  --id <slug>          level id, single input only',
    '  --name <text>        display name, single input only',
    '  --no-preview         skip preview.png',
    '  --preview-scale <n>  pixels per cell in preview.png (default 3)',
    '  --force              overwrite an existing level directory',
  ].join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2))
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      process.stderr.write(`${error instanceof UsageError ? error.message : error.stack}\n`);
      process.exitCode = 1;
    });
}

export { main };
