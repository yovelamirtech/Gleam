import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test, { describe } from 'node:test';

import { DEFAULT_COLORS } from '../src/constants.mjs';
import { parseArgs } from '../prep-images.mjs';
import { verifyLevel } from '../verify-level.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));

describe('parseArgs', () => {
  test('defaults match the build plan', () => {
    const options = parseArgs(['a.png']);
    assert.deepEqual(options.inputs, ['a.png']);
    assert.equal(options.colors, DEFAULT_COLORS);
    assert.equal(options.fit, 'cover');
    assert.equal(options.preview, true);
    assert.equal(options.force, false);
  });

  test('takes several inputs for a batch run', () => {
    assert.deepEqual(parseArgs(['a.png', 'b.jpg', 'shots/']).inputs, ['a.png', 'b.jpg', 'shots/']);
  });

  test('reads the options it documents', () => {
    const options = parseArgs([
      'a.png',
      '--colors', '30',
      '--fit', 'contain',
      '--id', 'koi-pond',
      '--name', 'Koi Pond',
      '--no-preview',
      '--preview-scale', '6',
      '--force',
    ]);
    assert.equal(options.colors, 30);
    assert.equal(options.fit, 'contain');
    assert.equal(options.id, 'koi-pond');
    assert.equal(options.name, 'Koi Pond');
    assert.equal(options.preview, false);
    assert.equal(options.previewScale, 6);
    assert.equal(options.force, true);
  });

  test('rejects values that would produce an unusable level', () => {
    assert.throws(() => parseArgs(['a.png', '--colors', '1']), /--colors/);
    assert.throws(() => parseArgs(['a.png', '--colors', '999']), /--colors/);
    assert.throws(() => parseArgs(['a.png', '--colors', 'lots']), /--colors/);
    assert.throws(() => parseArgs(['a.png', '--fit', 'squash']), /--fit/);
    assert.throws(() => parseArgs(['a.png', '--preview-scale', '0']), /--preview-scale/);
    assert.throws(() => parseArgs(['a.png', '--out']), /--out needs a value/);
    assert.throws(() => parseArgs(['a.png', '--colours', '24']), /unknown option --colours/);
  });
});

test('the committed sample level is still valid', async () => {
  const problems = await verifyLevel(path.resolve(HERE, '../../../assets/levels/sample-lagoon'));
  assert.deepEqual(problems, [], problems.join('\n'));
});
