/**
 * Core data types for a Gleam board.
 *
 * A level is one image split into 48 boards (8x6). Every board is a 40x40 grid
 * of cells, and every cell holds one palette colour. The player only ever sees
 * the palette *number* of a cell until a stone covers it.
 */

/** Index into a level's palette. Also the "number" shown on a cell, 1-based when displayed. */
export type ColorIndex = number;

/** Orientation of a strip of stones held over the board. */
export type Orientation = 'horizontal' | 'vertical';

export interface PaletteEntry {
  /** Position of this colour in the level palette. */
  index: ColorIndex;
  /** What the player reads on an empty cell: index + 1. */
  number: number;
  /** '#rrggbb' base colour of the stone. */
  hex: string;
}

export interface BoardData {
  /** Stable id, e.g. `level-1/board-27`. Used as the persistence key. */
  id: string;
  width: number;
  height: number;
  /** Shared by the whole level, so colours line up across board seams. */
  palette: PaletteEntry[];
  /**
   * Row-major colour index per cell, length === width * height.
   * `cells[row * width + col]` is the colour that cell needs.
   */
  cells: number[];
}

/** One stone the player has placed, in the order they placed it. */
export interface Placement {
  /** Row-major cell index on the board. */
  cell: number;
  color: ColorIndex;
  /** Monotonic counter, 0-based. The level-complete replay walks this order. */
  order: number;
  /** Epoch milliseconds at placement time. */
  at: number;
}

/** What the tray is pointed at: a colour, and how many stones the next lift takes. */
export interface TraySelection {
  color: ColorIndex;
  /** 1..TRAY_SLOTS. One by default; a swipe across the tray changes it. */
  count: number;
}

/**
 * Stones lifted out of the tray and hanging in the air.
 *
 * They stay airborne until they land somewhere legal: a release that does not
 * fit leaves them where the finger let go, and a tap flips them.
 */
export interface AirborneStrip {
  color: ColorIndex;
  /** 1..TRAY_SLOTS. */
  count: number;
  orientation: Orientation;
}

export type PlacementFailure =
  /** Nothing is in the air, so there is nothing to place. */
  | 'no-strip'
  /** Some cell of the strip falls outside the board. */
  | 'out-of-bounds'
  /** Some cell of the strip already has a stone on it. */
  | 'occupied'
  /** Some cell of the strip needs a different colour. */
  | 'wrong-color';

export type PlaceResult =
  | { ok: true; placements: Placement[]; completedRows: number[] }
  | { ok: false; reason: PlacementFailure };

/** Serialised board progress. Only the placements are stored; state is replayed from them. */
export interface BoardProgress {
  version: 1;
  boardId: string;
  /** Ascending by `order`. */
  placements: Placement[];
}
