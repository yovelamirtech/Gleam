import type { PaletteEntry } from './types';

/** Colours a level quantizes down to, per BUILD_PLAN.md (~20-30). */
export const DEFAULT_PALETTE_SIZE = 24;

function toHex(value: number): string {
  return Math.round(Math.min(Math.max(value, 0), 255))
    .toString(16)
    .padStart(2, '0');
}

/** HSL in 0..1 / 0..1 / 0..1 to '#rrggbb'. */
export function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 1) + 1) % 1) * 6;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const [r1, g1, b1] =
    hp < 1 ? [c, x, 0] :
    hp < 2 ? [x, c, 0] :
    hp < 3 ? [0, c, x] :
    hp < 4 ? [0, x, c] :
    hp < 5 ? [x, 0, c] :
    [c, 0, x];
  const m = l - c / 2;
  return `#${toHex((r1 + m) * 255)}${toHex((g1 + m) * 255)}${toHex((b1 + m) * 255)}`;
}

/**
 * A stand-in for the palette the image prep script will emit.
 *
 * Sweeps hue while stepping lightness, so neighbouring numbers stay visually
 * distinct — the player picks colours by number, and near-identical swatches
 * next to each other in the picker are the fastest way to make that miserable.
 */
export function generatePalette(size: number = DEFAULT_PALETTE_SIZE): PaletteEntry[] {
  const entries: PaletteEntry[] = [];
  for (let index = 0; index < size; index += 1) {
    const hue = (index * 0.618033988749895) % 1;
    const lightness = 0.38 + ((index % 4) / 4) * 0.34;
    const saturation = 0.45 + ((index % 3) / 3) * 0.35;
    entries.push({ index, number: index + 1, hex: hslToHex(hue, saturation, lightness) });
  }
  return entries;
}
