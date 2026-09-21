import { Skia, type SkFont } from '@shopify/react-native-skia';

const cache = new Map<number, SkFont | null>();

/**
 * Font at a given size, for the numbers printed on empty cells.
 *
 * Skia's own built-in default typeface (`Skia.Font(undefined, size)`), not
 * `Skia.FontMgr.System().matchFamilyStyle('', {})` - that used to look up the
 * OS's default family by an empty name, which on a real device (confirmed via
 * Expo Go on iOS) either threw or matched nothing, silently blanking every
 * number on the board (the `if (!font) continue` below then skips all of
 * them) despite rendering fine in every test, since RN Testing Library never
 * touches a real font manager. The default typeface needs no OS lookup at
 * all, so there's nothing left to fail this way.
 *
 * Returns null only if the `Skia.Font` call itself throws, so callers can
 * still simply skip the numbers instead of crashing the board.
 */
export function numberFont(size: number): SkFont | null {
  const key = Math.round(size * 10);
  const cached = cache.get(key);
  if (cached !== undefined) return cached;
  let font: SkFont | null = null;
  try {
    font = Skia.Font(undefined, size);
  } catch {
    font = null;
  }
  cache.set(key, font);
  return font;
}
