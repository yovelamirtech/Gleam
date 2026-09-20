/**
 * Grid dimensions from BUILD_PLAN.md. Every level is one image cut into a
 * BOARDS_X x BOARDS_Y wall of boards, and every board is a square of cells.
 */
export const BOARDS_X = 8;
export const BOARDS_Y = 6;
export const BOARDS_PER_LEVEL = BOARDS_X * BOARDS_Y; // 48

export const BOARD_CELLS_X = 40;
export const BOARD_CELLS_Y = 40;
export const CELLS_PER_BOARD = BOARD_CELLS_X * BOARD_CELLS_Y; // 1600

/**
 * One cell in board space, in `BoardCanvas`'s Skia pixels. Kept here rather
 * than in `BoardCanvas.tsx` itself so plain (non-Skia) modules - like
 * `src/ui/unifiedBoard.ts`'s wall-space geometry - can share it without
 * pulling in `@shopify/react-native-skia`, which Jest can't parse outside a
 * real native runtime.
 */
export const CELL = 24;

/** Full level resolution in cells: 320 x 240. */
export const LEVEL_CELLS_X = BOARDS_X * BOARD_CELLS_X;
export const LEVEL_CELLS_Y = BOARDS_Y * BOARD_CELLS_Y;

/** The HUD holds one strip of at most five stones. */
export const HUD_SLOTS = 5;

/** Levels are laid out on the same kind of wall as boards inside a level. */
export const LEVELS_X = 4;
export const LEVELS_Y = 5;
export const LEVEL_COUNT = LEVELS_X * LEVELS_Y;
