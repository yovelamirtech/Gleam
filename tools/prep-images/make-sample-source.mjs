#!/usr/bin/env node
/**
 * Draws the sample level's source image.
 *
 * Real levels come from the artist's own images. This one is generated so the
 * committed sample is reproducible from the repo alone, and so it has what the
 * pipeline needs to be worth looking at: smooth gradients that force the
 * quantizer to choose, and large shapes (the sun, the hills, the reflection)
 * that run across board seams where a per-board palette would show a join.
 *
 *   node make-sample-source.mjs ../../assets/levels-src/sample-lagoon.png
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const WIDTH = 1280;
const HEIGHT = 960;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const mix = (a, b, t) => a.map((channel, i) => channel + (b[i] - channel) * clamp(t, 0, 1));
const smoothstep = (edge0, edge1, x) => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

const SKY_TOP = [38, 46, 96];
const SKY_MID = [206, 106, 92];
const SKY_LOW = [246, 182, 106];
const SUN = [255, 243, 198];
const HILL_FAR = [86, 70, 108];
const HILL_NEAR = [48, 40, 72];
const WATER_FAR = [128, 84, 96];
const WATER_NEAR = [26, 30, 62];
const GLINT = [255, 226, 168];

const HORIZON = HEIGHT * 0.56;
const SUN_X = WIDTH * 0.38;
const SUN_Y = HORIZON - HEIGHT * 0.1;
const SUN_R = HEIGHT * 0.12;

/** Rolling hill silhouette: height above the horizon at a given x. */
function hillHeight(x, amplitude, frequency, phase) {
  const u = (x / WIDTH) * Math.PI * 2;
  return (
    amplitude *
    (0.55 + 0.45 * Math.sin(u * frequency + phase) * Math.cos(u * frequency * 0.5 + phase * 1.7))
  );
}

function skyColor(x, y) {
  const t = y / HORIZON;
  const base = t < 0.62 ? mix(SKY_TOP, SKY_MID, t / 0.62) : mix(SKY_MID, SKY_LOW, (t - 0.62) / 0.38);

  // Sun disc with a soft halo around it.
  const distance = Math.hypot(x - SUN_X, y - SUN_Y);
  const disc = 1 - smoothstep(SUN_R * 0.92, SUN_R * 1.04, distance);
  const halo = (1 - smoothstep(SUN_R, SUN_R * 3.4, distance)) * 0.55;
  let color = mix(base, SUN, halo);
  color = mix(color, SUN, disc);

  // A few long, flat clouds catching the light.
  const band = Math.sin(y * 0.035 + Math.sin(x * 0.004) * 1.4);
  const cloud = smoothstep(0.86, 1, band) * smoothstep(HEIGHT * 0.06, HEIGHT * 0.3, y) *
    (1 - smoothstep(HORIZON * 0.72, HORIZON, y));
  return mix(color, [255, 214, 192], cloud * 0.75);
}

function waterColor(x, y) {
  const t = (y - HORIZON) / (HEIGHT - HORIZON);
  let color = mix(WATER_FAR, WATER_NEAR, Math.sqrt(t));

  // The sun's reflection, widening as it comes towards the viewer.
  const spread = SUN_R * (0.55 + t * 3.2);
  const column = 1 - smoothstep(spread * 0.45, spread, Math.abs(x - SUN_X));
  // Kept deliberately broad: at 320x240 cells a tight ripple would alias into
  // single-cell speckle, which is horrible to actually place stones on.
  const rippleFrequency = 0.13 - t * 0.06;
  const ripple = 0.5 + 0.5 * Math.sin(y * rippleFrequency + Math.sin(x * 0.005) * 1.6);
  const glint = column * ripple * (1 - t * 0.45);
  color = mix(color, GLINT, glint * 0.85);

  // Wide swells so the water is not a flat gradient.
  const swell = Math.sin(y * 0.045 + Math.sin(x * 0.006) * 2.2) * 0.5 + 0.5;
  return mix(color, WATER_NEAR, swell * 0.18 * t);
}

function render() {
  const pixels = Buffer.allocUnsafe(WIDTH * HEIGHT * 3);
  const farRidge = HEIGHT * 0.1;
  const nearRidge = HEIGHT * 0.055;

  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      let color;
      if (y < HORIZON) {
        color = skyColor(x, y);
        const far = HORIZON - hillHeight(x, farRidge, 1.6, 0.4);
        const near = HORIZON - hillHeight(x, nearRidge, 2.9, 2.1);
        if (y > far) color = mix(color, HILL_FAR, 0.92);
        if (y > near) color = HILL_NEAR;
      } else {
        color = waterColor(x, y);
      }

      const offset = (y * WIDTH + x) * 3;
      pixels[offset] = clamp(Math.round(color[0]), 0, 255);
      pixels[offset + 1] = clamp(Math.round(color[1]), 0, 255);
      pixels[offset + 2] = clamp(Math.round(color[2]), 0, 255);
    }
  }
  return pixels;
}

const outPath = path.resolve(process.argv[2] ?? '../../assets/levels-src/sample-lagoon.png');
await mkdir(path.dirname(outPath), { recursive: true });
await sharp(render(), { raw: { width: WIDTH, height: HEIGHT, channels: 3 } })
  .png({ compressionLevel: 9 })
  .toFile(outPath);
process.stdout.write(`${path.relative(process.cwd(), outPath)}: ${WIDTH}x${HEIGHT}\n`);
