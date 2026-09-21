import { matchFont, type SkFont } from '@shopify/react-native-skia';

const cache = new Map<number, SkFont | null>();

/**
 * Font at a given size, for the numbers printed on empty cells.
 *
 * `Skia.Font()` (no typeface) leaves the font's typeface null, and drawing
 * with a null typeface renders nothing - no crash, no error, just zero
 * glyphs (confirmed on a real device via the `fontMissing`/`drawTextError`
 * debug flags both reading clean while every cell still came up blank).
 * `matchFont` goes through the platform's real font manager instead: its
 * default family, `"System"`, is aliased by react-native-skia itself to an
 * actual system font (`.AppleSystemUIFont` on iOS - see
 * `JsiSkFontMgr.h`'s `matchFamilyStyle`, which calls
 * `resolveFontFamily("System")` before the native lookup), so it resolves to
 * a typeface that actually has glyphs.
 *
 * Returns null only if `matchFont` itself throws, so callers can still
 * simply skip the numbers instead of crashing the board.
 */
export function numberFont(size: number): SkFont | null {
  const key = Math.round(size * 10);
  const cached = cache.get(key);
  if (cached !== undefined) return cached;
  let font: SkFont | null = null;
  try {
    font = matchFont({ fontSize: size });
  } catch {
    font = null;
  }
  cache.set(key, font);
  return font;
}
