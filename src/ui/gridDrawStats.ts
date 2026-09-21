/**
 * Set by the last `drawBoardGrid` call (see `boardGrid.ts`), so a debug
 * overlay can report why numbers are missing without device console access.
 * Kept in its own module, with no Skia import, so a screen can read it
 * without pulling `@shopify/react-native-skia` into a test that mocks the
 * Skia-backed canvas components instead of the whole grid-drawing chain.
 * Remove once the missing-numbers bug (HANDOFF.md item 22/23) is confirmed
 * fixed on a real device.
 */
export const lastGridDrawStats = { fontMissing: false, drawTextError: null as string | null };
