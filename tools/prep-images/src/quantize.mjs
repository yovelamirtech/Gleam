/**
 * Colour quantization for a whole level image.
 *
 * Everything here runs on the full 320x240 image before it is cut into boards.
 * That is the point: one palette for the level means a shape crossing a board
 * seam keeps the same colour number on both sides.
 *
 * The method is median cut for the initial palette, then weighted k-means to
 * settle it. No dithering — a diamond painting is flat blocks of one colour per
 * cell, and scattered dither pixels would be miserable to place.
 */

/**
 * Channel weights for colour distance, a cheap stand-in for perceptual
 * distance: green counts most, blue least. Because this is just a per-axis
 * scaling of RGB space, plain (weighted) means are still valid centroids.
 */
const WEIGHT_R = 2;
const WEIGHT_G = 4;
const WEIGHT_B = 3;

function distance(r1, g1, b1, r2, g2, b2) {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return WEIGHT_R * dr * dr + WEIGHT_G * dg * dg + WEIGHT_B * db * db;
}

/**
 * Collapses raw RGB pixels into unique colours with occurrence counts.
 *
 * @param {Uint8Array|Buffer} rgb Packed RGB triples.
 * @returns {{r: Int32Array, g: Int32Array, b: Int32Array, count: Float64Array, length: number}}
 */
export function buildHistogram(rgb) {
  if (rgb.length % 3 !== 0) {
    throw new Error(`pixel buffer length ${rgb.length} is not a multiple of 3`);
  }
  const counts = new Map();
  for (let i = 0; i < rgb.length; i += 3) {
    const key = (rgb[i] << 16) | (rgb[i + 1] << 8) | rgb[i + 2];
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const length = counts.size;
  const hist = {
    r: new Int32Array(length),
    g: new Int32Array(length),
    b: new Int32Array(length),
    count: new Float64Array(length),
    length,
  };
  let i = 0;
  // Map iteration order is insertion order, which follows the pixel order, so
  // the histogram is deterministic for a given image.
  for (const [key, count] of counts) {
    hist.r[i] = (key >> 16) & 0xff;
    hist.g[i] = (key >> 8) & 0xff;
    hist.b[i] = key & 0xff;
    hist.count[i] = count;
    i += 1;
  }
  return hist;
}

/** Weighted mean colour of the histogram entries listed in `indices`. */
function meanColor(hist, indices) {
  let total = 0;
  let sr = 0;
  let sg = 0;
  let sb = 0;
  for (const i of indices) {
    const w = hist.count[i];
    total += w;
    sr += hist.r[i] * w;
    sg += hist.g[i] * w;
    sb += hist.b[i] * w;
  }
  if (total === 0) return [0, 0, 0];
  return [sr / total, sg / total, sb / total];
}

/** Longest axis of a box and the extent along it, weighted like the distance. */
function widestAxis(hist, indices) {
  let minR = 255;
  let maxR = 0;
  let minG = 255;
  let maxG = 0;
  let minB = 255;
  let maxB = 0;
  for (const i of indices) {
    if (hist.r[i] < minR) minR = hist.r[i];
    if (hist.r[i] > maxR) maxR = hist.r[i];
    if (hist.g[i] < minG) minG = hist.g[i];
    if (hist.g[i] > maxG) maxG = hist.g[i];
    if (hist.b[i] < minB) minB = hist.b[i];
    if (hist.b[i] > maxB) maxB = hist.b[i];
  }
  const spans = [
    { axis: 'r', span: (maxR - minR) * WEIGHT_R },
    { axis: 'g', span: (maxG - minG) * WEIGHT_G },
    { axis: 'b', span: (maxB - minB) * WEIGHT_B },
  ];
  spans.sort((a, b) => b.span - a.span);
  return spans[0];
}

/**
 * Median cut: repeatedly split the box that is worst off (widest spread,
 * broken by pixel count) until we have `colors` boxes.
 */
function medianCut(hist, colors) {
  const all = Array.from({ length: hist.length }, (_, i) => i);
  const boxes = [makeBox(hist, all)];

  while (boxes.length < colors) {
    let target = -1;
    let bestScore = 0;
    for (let i = 0; i < boxes.length; i += 1) {
      const box = boxes[i];
      if (box.indices.length < 2 || box.span <= 0) continue;
      const score = box.span * Math.log2(box.weight + 1);
      if (score > bestScore) {
        bestScore = score;
        target = i;
      }
    }
    // Every remaining box is a single colour: the image has fewer distinct
    // colours than the requested palette, so stop early.
    if (target === -1) break;

    const box = boxes[target];
    const axis = box.axis;
    const sorted = box.indices.slice().sort((a, b) => hist[axis][a] - hist[axis][b]);

    // Split at the weighted median so both halves carry a similar pixel count.
    const half = box.weight / 2;
    let running = 0;
    let cut = 0;
    for (; cut < sorted.length - 1; cut += 1) {
      running += hist.count[sorted[cut]];
      if (running >= half) break;
    }
    cut += 1;

    boxes.splice(target, 1, makeBox(hist, sorted.slice(0, cut)), makeBox(hist, sorted.slice(cut)));
  }

  return boxes.map((box) => meanColor(hist, box.indices));
}

function makeBox(hist, indices) {
  const { axis, span } = widestAxis(hist, indices);
  let weight = 0;
  for (const i of indices) weight += hist.count[i];
  return { indices, axis, span, weight };
}

/**
 * Weighted Lloyd's algorithm over the histogram. Converges fast because median
 * cut already put the centroids somewhere sensible.
 */
function refine(hist, palette, iterations) {
  const k = palette.length;
  const assignment = new Int32Array(hist.length);

  for (let iter = 0; iter < iterations; iter += 1) {
    let moved = 0;
    for (let i = 0; i < hist.length; i += 1) {
      let best = 0;
      let bestDist = Infinity;
      for (let c = 0; c < k; c += 1) {
        const d = distance(hist.r[i], hist.g[i], hist.b[i], palette[c][0], palette[c][1], palette[c][2]);
        if (d < bestDist) {
          bestDist = d;
          best = c;
        }
      }
      if (assignment[i] !== best) moved += 1;
      assignment[i] = best;
    }

    const sums = Array.from({ length: k }, () => [0, 0, 0, 0]);
    for (let i = 0; i < hist.length; i += 1) {
      const s = sums[assignment[i]];
      const w = hist.count[i];
      s[0] += hist.r[i] * w;
      s[1] += hist.g[i] * w;
      s[2] += hist.b[i] * w;
      s[3] += w;
    }

    for (let c = 0; c < k; c += 1) {
      if (sums[c][3] > 0) {
        palette[c] = [sums[c][0] / sums[c][3], sums[c][1] / sums[c][3], sums[c][2] / sums[c][3]];
      } else {
        // An empty cluster is a wasted palette slot. Hand it to the colour that
        // is currently represented worst, so it stops being an outlier.
        palette[c] = worstRepresented(hist, palette, assignment);
      }
    }

    if (moved === 0 && iter > 0) break;
  }

  return palette;
}

function worstRepresented(hist, palette, assignment) {
  let worst = 0;
  let worstDist = -1;
  for (let i = 0; i < hist.length; i += 1) {
    const c = palette[assignment[i]];
    const d = distance(hist.r[i], hist.g[i], hist.b[i], c[0], c[1], c[2]) * hist.count[i];
    if (d > worstDist) {
      worstDist = d;
      worst = i;
    }
  }
  return [hist.r[worst], hist.g[worst], hist.b[worst]];
}

const clamp255 = (v) => Math.min(255, Math.max(0, Math.round(v)));

/** Rec. 709 luma, used to order the palette from darkest to lightest. */
export function luminance([r, g, b]) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function toHex([r, g, b]) {
  return `#${[r, g, b].map((v) => clamp255(v).toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Quantizes a whole image to a fixed palette.
 *
 * @param {Uint8Array|Buffer} rgb Packed RGB triples for the whole image.
 * @param {object} [options]
 * @param {number} [options.colors] Palette size to aim for.
 * @param {number} [options.iterations] k-means refinement passes.
 * @returns {{palette: Array<{rgb: number[], hex: string}>, indices: Uint8Array}}
 *   `indices[i]` is the palette slot chosen for pixel `i`, in the same order as
 *   the input. The palette is sorted darkest to lightest.
 */
export function quantize(rgb, { colors = 24, iterations = 12 } = {}) {
  const hist = buildHistogram(rgb);
  const requested = Math.max(1, Math.min(colors, hist.length));

  let palette = medianCut(hist, requested);
  palette = refine(hist, palette, iterations);

  // Darkest first, so colour numbers run in a predictable order for the player
  // and stay stable if the tool is re-run on the same image.
  palette.sort((a, b) => luminance(a) - luminance(b) || a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
  const snapped = palette.map((c) => [clamp255(c[0]), clamp255(c[1]), clamp255(c[2])]);

  // Two centroids can round to the same RGB triple; drop the duplicates rather
  // than shipping two colour numbers the player cannot tell apart.
  const seen = new Set();
  const finalPalette = [];
  for (const c of snapped) {
    const key = c.join(',');
    if (seen.has(key)) continue;
    seen.add(key);
    finalPalette.push(c);
  }

  // Map every distinct source colour once, then stamp the pixels.
  const lookup = new Map();
  const indices = new Uint8Array(rgb.length / 3);
  for (let p = 0, i = 0; p < rgb.length; p += 3, i += 1) {
    const key = (rgb[p] << 16) | (rgb[p + 1] << 8) | rgb[p + 2];
    let slot = lookup.get(key);
    if (slot === undefined) {
      let best = 0;
      let bestDist = Infinity;
      for (let c = 0; c < finalPalette.length; c += 1) {
        const d = distance(rgb[p], rgb[p + 1], rgb[p + 2], finalPalette[c][0], finalPalette[c][1], finalPalette[c][2]);
        if (d < bestDist) {
          bestDist = d;
          best = c;
        }
      }
      slot = best;
      lookup.set(key, slot);
    }
    indices[i] = slot;
  }

  return {
    palette: finalPalette.map((c) => ({ rgb: c, hex: toHex(c) })),
    indices,
  };
}
