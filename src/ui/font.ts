import { Skia, type SkFont } from '@shopify/react-native-skia';

const cache = new Map<number, SkFont | null>();

/**
 * Font at a given size, for the numbers printed on empty cells.
 *
 * Built via the zero-argument `Skia.Font()` plus `setSize`, not
 * `Skia.Font(undefined, size)` - the native constructor branches on the JS
 * *argument count*, and passing `undefined` explicitly still counts as one:
 * with two arguments it always tries to read a typeface out of `arguments[0]`
 * (`JsiSkTypeface::fromValue`, in `JsiSkFont.h`'s `createCtor`), and doing
 * that to a JS `undefined` throws on device (confirmed via the `fontMissing`
 * debug flag on a real iOS device) while `RN Testing Library`'s mock never
 * exercises the real native binding, so every test passed anyway. Calling
 * `Skia.Font()` with zero arguments takes a different branch that builds a
 * plain default `SkFont` with no typeface lookup at all, so there is nothing
 * left to fail this way; `setSize` alone can't throw.
 *
 * Returns null only if `Skia.Font()` itself throws, so callers can still
 * simply skip the numbers instead of crashing the board.
 */
export function numberFont(size: number): SkFont | null {
  const key = Math.round(size * 10);
  const cached = cache.get(key);
  if (cached !== undefined) return cached;
  let font: SkFont | null = null;
  try {
    font = Skia.Font();
    font.setSize(size);
  } catch {
    font = null;
  }
  cache.set(key, font);
  return font;
}
