import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import { buildHistogram, luminance, quantize, toHex } from '../src/quantize.mjs';

/** Builds a packed RGB buffer from a list of [r, g, b] triples. */
const pixels = (colors) => Uint8Array.from(colors.flat());

describe('buildHistogram', () => {
  test('collapses repeated colours and keeps their counts', () => {
    const hist = buildHistogram(pixels([[10, 20, 30], [10, 20, 30], [40, 50, 60]]));
    assert.equal(hist.length, 2);
    assert.deepEqual([...hist.count], [2, 1]);
    assert.equal(hist.r[0], 10);
    assert.equal(hist.b[1], 60);
  });

  test('rejects a buffer that is not whole RGB triples', () => {
    assert.throws(() => buildHistogram(new Uint8Array(5)), /multiple of 3/);
  });
});

describe('quantize', () => {
  test('never returns more colours than asked for', () => {
    const colors = [];
    for (let i = 0; i < 400; i += 1) colors.push([i % 256, (i * 7) % 256, (i * 13) % 256]);
    const { palette } = quantize(pixels(colors), { colors: 12 });
    assert.ok(palette.length <= 12, `palette had ${palette.length} colours`);
  });

  test('returns fewer colours when the image has fewer than the budget', () => {
    const { palette } = quantize(pixels([[0, 0, 0], [255, 255, 255], [0, 0, 0]]), { colors: 16 });
    assert.equal(palette.length, 2);
  });

  test('keeps flat blocks exact when they fit in the palette', () => {
    const red = [220, 40, 40];
    const blue = [30, 60, 200];
    const { palette, indices } = quantize(pixels([red, red, blue, blue, red]), { colors: 4 });
    assert.equal(palette.length, 2);
    assert.deepEqual(palette[indices[0]].rgb, red);
    assert.deepEqual(palette[indices[2]].rgb, blue);
    assert.equal(indices[0], indices[1]);
    assert.notEqual(indices[0], indices[2]);
  });

  test('orders the palette from darkest to lightest', () => {
    const colors = [];
    for (let i = 0; i < 256; i += 1) colors.push([i, 255 - i, (i * 3) % 256]);
    const { palette } = quantize(pixels(colors), { colors: 8 });
    const lumas = palette.map((entry) => luminance(entry.rgb));
    assert.deepEqual(lumas, [...lumas].sort((a, b) => a - b));
  });

  test('is deterministic for the same input', () => {
    const colors = [];
    for (let i = 0; i < 500; i += 1) colors.push([(i * 11) % 256, (i * 29) % 256, (i * 47) % 256]);
    const buffer = pixels(colors);
    const first = quantize(buffer, { colors: 10 });
    const second = quantize(buffer, { colors: 10 });
    assert.deepEqual(first.palette, second.palette);
    assert.deepEqual([...first.indices], [...second.indices]);
  });

  test('every index points at a real palette entry', () => {
    const colors = [];
    for (let i = 0; i < 1000; i += 1) colors.push([(i * 3) % 256, (i * 5) % 256, (i * 97) % 256]);
    const { palette, indices } = quantize(pixels(colors), { colors: 24 });
    for (const index of indices) {
      assert.ok(Number.isInteger(index) && index >= 0 && index < palette.length);
    }
  });
});

test('toHex pads and clamps', () => {
  assert.equal(toHex([0, 8, 255]), '#0008ff');
  assert.equal(toHex([-4, 260, 127.6]), '#00ff80');
});
