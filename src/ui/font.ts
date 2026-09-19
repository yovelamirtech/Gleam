import { Skia, type SkFont } from '@shopify/react-native-skia';

const cache = new Map<number, SkFont | null>();

/**
 * System font at a given size, for the numbers printed on empty cells.
 *
 * Returns null when no system typeface is available (headless test renderers,
 * mostly) so callers can simply skip the numbers instead of crashing the board.
 */
export function numberFont(size: number): SkFont | null {
  const key = Math.round(size * 10);
  const cached = cache.get(key);
  if (cached !== undefined) return cached;
  let font: SkFont | null = null;
  try {
    const typeface = Skia.FontMgr.System().matchFamilyStyle('', {});
    font = Skia.Font(typeface ?? undefined, size);
  } catch {
    font = null;
  }
  cache.set(key, font);
  return font;
}
