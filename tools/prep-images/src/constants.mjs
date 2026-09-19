/**
 * Level geometry, fixed by BUILD_PLAN.md.
 *
 * A level is one image at 320x240 cells, cut into 48 boards laid out 8 wide by
 * 6 tall, each board 40x40 cells.
 */
export const BOARD_COLS = 8;
export const BOARD_ROWS = 6;
export const BOARD_WIDTH = 40;
export const BOARD_HEIGHT = 40;

export const BOARD_COUNT = BOARD_COLS * BOARD_ROWS;
export const BOARD_CELLS = BOARD_WIDTH * BOARD_HEIGHT;
export const LEVEL_WIDTH = BOARD_COLS * BOARD_WIDTH;
export const LEVEL_HEIGHT = BOARD_ROWS * BOARD_HEIGHT;
export const LEVEL_CELLS = LEVEL_WIDTH * LEVEL_HEIGHT;

/** Version stamped into every file we write, so the app can reject old data. */
export const FORMAT_VERSION = 1;

/** The plan calls for a palette of roughly 20-30 colours. */
export const DEFAULT_COLORS = 24;
export const MIN_COLORS = 2;
export const MAX_COLORS = 64;

/** Board the player starts on: the most central one of the 8x6 grid. */
export const START_BOARD_ID =
  Math.floor((BOARD_ROWS - 1) / 2) * BOARD_COLS + Math.floor((BOARD_COLS - 1) / 2);
