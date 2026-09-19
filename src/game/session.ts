import { TRAY_SLOTS, cellIndex, cellRow, otherOrientation, stripCells } from './geometry';
import type {
  AirborneStrip,
  BoardData,
  BoardProgress,
  ColorIndex,
  Orientation,
  PlaceResult,
  Placement,
  PlacementFailure,
  TraySelection,
} from './types';

export interface CellView {
  /** Colour the cell needs. */
  required: ColorIndex;
  /** Number printed on an empty cell. */
  number: number;
  /** Colour of the stone on the cell, or null while it is empty. */
  placed: ColorIndex | null;
  /** Placement order of the stone on the cell, or -1 while it is empty. */
  order: number;
}

/**
 * Mutable state of one board in play.
 *
 * Stone economy (BUILD_PLAN.md): per board, the supply of each colour equals
 * exactly the number of cells needing it. The session keeps that promise by
 * only ever letting a stone land on a cell that needs its colour — a strip that
 * would cover a wrong or occupied cell is rejected whole and consumes nothing.
 * So for every colour, `remaining === cells still empty of that colour`, and the
 * player can never run out mid-board.
 *
 * Two pieces of held state, not one:
 *  - the **tray selection**, a colour and how many stones the next lift takes
 *    (one by default). Selecting costs nothing; the tray keeps showing the pile.
 *  - the **airborne strip**, stones already lifted out of the tray. They hang in
 *    the air until they land somewhere legal, so a drop that does not fit leaves
 *    them where they were released rather than returning them.
 *
 * Every placed stone carries a monotonic `order` and a timestamp, because the
 * level-complete replay re-draws the board in the player's own solving order.
 */
export class BoardSession {
  readonly board: BoardData;

  /** Cells needing each colour. Index is the colour. */
  private readonly required: number[];
  /** Stones of each colour already on the board. */
  private readonly placedPerColor: number[];
  /** Colour of the stone on each cell, -1 while empty. */
  private readonly colorByCell: Int32Array;
  /** Placement order of the stone on each cell, -1 while empty. */
  private readonly orderByCell: Int32Array;

  private readonly history: Placement[] = [];
  private nextOrder = 0;
  private selection: TraySelection | null = null;
  private airborne: AirborneStrip | null = null;
  private listeners = new Set<() => void>();
  /** Bumped on every state change so React can subscribe with useSyncExternalStore. */
  private revision = 0;

  constructor(board: BoardData) {
    const expected = board.width * board.height;
    if (board.cells.length !== expected) {
      throw new Error(
        `board ${board.id}: expected ${expected} cells for ${board.width}x${board.height}, got ${board.cells.length}`
      );
    }
    this.board = board;
    this.required = new Array(board.palette.length).fill(0);
    this.placedPerColor = new Array(board.palette.length).fill(0);
    this.colorByCell = new Int32Array(expected).fill(-1);
    this.orderByCell = new Int32Array(expected).fill(-1);
    for (const color of board.cells) {
      if (color < 0 || color >= board.palette.length) {
        throw new Error(`board ${board.id}: cell colour ${color} is not in the palette`);
      }
      this.required[color] += 1;
    }
  }

  // --- subscription -------------------------------------------------------

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getRevision = (): number => this.revision;

  private emit(): void {
    this.revision += 1;
    for (const listener of this.listeners) listener();
  }

  // --- supply -------------------------------------------------------------

  /** Cells on this board needing `color`. */
  requiredFor(color: ColorIndex): number {
    return this.required[color] ?? 0;
  }

  /** Stones of `color` already on the board. */
  placedFor(color: ColorIndex): number {
    return this.placedPerColor[color] ?? 0;
  }

  /**
   * Stones of `color` still owed to the board, airborne ones included.
   * Always equals the number of cells of that colour still empty.
   */
  remainingFor(color: ColorIndex): number {
    return this.requiredFor(color) - this.placedFor(color);
  }

  /** Stones of `color` still in the tray pile, so not already in the air. */
  availableFor(color: ColorIndex): number {
    const inAir = this.airborne?.color === color ? this.airborne.count : 0;
    return this.remainingFor(color) - inAir;
  }

  /** Colours that still have stones owed, in palette order. */
  unfinishedColors(): ColorIndex[] {
    const colors: ColorIndex[] = [];
    for (let color = 0; color < this.required.length; color += 1) {
      if (this.remainingFor(color) > 0) colors.push(color);
    }
    return colors;
  }

  // --- board reads --------------------------------------------------------

  cellAt(row: number, col: number): CellView {
    return this.cellAtIndex(cellIndex(row, col, this.board.width));
  }

  cellAtIndex(index: number): CellView {
    const required = this.board.cells[index];
    const placed = this.colorByCell[index];
    return {
      required,
      number: this.board.palette[required].number,
      placed: placed === -1 ? null : placed,
      order: this.orderByCell[index],
    };
  }

  isEmptyAt(index: number): boolean {
    return this.colorByCell[index] === -1;
  }

  /** Placements oldest first — the order the replay draws them in. */
  get placements(): readonly Placement[] {
    return this.history;
  }

  get stonesPlaced(): number {
    return this.history.length;
  }

  get stonesTotal(): number {
    return this.board.cells.length;
  }

  isComplete(): boolean {
    return this.history.length === this.board.cells.length;
  }

  // --- tray ---------------------------------------------------------------

  get traySelection(): TraySelection | null {
    return this.selection;
  }

  /** Stones the tray shows for the selected colour: the pile, capped at five. */
  get trayStones(): number {
    if (!this.selection) return 0;
    return Math.min(TRAY_SLOTS, this.availableFor(this.selection.color));
  }

  /**
   * Point the tray at a colour. Takes one stone by default; a swipe across the
   * tray sets a different count. Stones already in the air go back to the pile,
   * since picking a colour is how the player changes their mind.
   */
  selectColor(color: ColorIndex): boolean {
    if (color < 0 || color >= this.board.palette.length) return false;
    if (this.remainingFor(color) <= 0) return false;
    this.airborne = null;
    this.selection = { color, count: 1 };
    this.emit();
    return true;
  }

  /**
   * How many stones the next lift takes, 1..5, clamped to what the board still
   * owes this colour. Driven by swiping sideways across the tray. Stones
   * already in the air count towards the limit, since the next lift replaces
   * them rather than adding to them.
   */
  setSelectionCount(count: number): boolean {
    if (!this.selection) return false;
    const max = Math.min(TRAY_SLOTS, this.remainingFor(this.selection.color));
    if (max < 1) return false;
    const next = Math.min(Math.max(Math.round(count), 1), max);
    if (next === this.selection.count) return false;
    this.selection = { ...this.selection, count: next };
    this.emit();
    return true;
  }

  // --- the strip in the air -----------------------------------------------

  get airborneStrip(): AirborneStrip | null {
    return this.airborne;
  }

  /**
   * Lift the selected stones out of the tray — the upward pull at the end of
   * the tray swipe. Anything already in the air goes back to the pile first.
   */
  liftStrip(orientation: Orientation = 'horizontal'): boolean {
    if (!this.selection) return false;
    const { color } = this.selection;
    const pool = this.remainingFor(color);
    const count = Math.min(this.selection.count, pool);
    if (count < 1) return false;
    this.airborne = { color, count, orientation };
    this.emit();
    return true;
  }

  /** A tap on the airborne stones flips them; they stay in the air. */
  rotateStrip(): boolean {
    if (!this.airborne) return false;
    this.airborne = { ...this.airborne, orientation: otherOrientation(this.airborne.orientation) };
    this.emit();
    return true;
  }

  /** Put the airborne stones back in the pile. */
  returnStrip(): boolean {
    if (!this.airborne) return false;
    this.airborne = null;
    this.emit();
    return true;
  }

  // --- placement ----------------------------------------------------------

  /**
   * Cells the airborne strip would cover with its head on (row, col), or null
   * when nothing is in the air or the strip runs off the board.
   */
  previewCells(row: number, col: number): number[] | null {
    if (!this.airborne) return null;
    return stripCells(row, col, this.airborne.count, this.airborne.orientation, this.board);
  }

  /** Why a placement at (row, col) would fail, or null when it would succeed. */
  placementFailure(row: number, col: number): PlacementFailure | null {
    if (!this.airborne) return 'no-strip';
    const cells = this.previewCells(row, col);
    if (!cells) return 'out-of-bounds';
    for (const cell of cells) {
      if (this.colorByCell[cell] !== -1) return 'occupied';
      if (this.board.cells[cell] !== this.airborne.color) return 'wrong-color';
    }
    return null;
  }

  canPlace(row: number, col: number): boolean {
    return this.placementFailure(row, col) === null;
  }

  /**
   * Lay the airborne strip down with its head on (row, col).
   *
   * All or nothing: if any covered cell is occupied or wants another colour the
   * whole strip stays in the air. That is what keeps the exact-supply promise —
   * a stone can only ever be spent on a cell that needed it.
   */
  place(row: number, col: number, at: number = Date.now()): PlaceResult {
    const failure = this.placementFailure(row, col);
    if (failure) return { ok: false, reason: failure };

    const strip = this.airborne!;
    const cells = this.previewCells(row, col)!;
    const placements: Placement[] = [];
    for (const cell of cells) {
      const placement: Placement = { cell, color: strip.color, order: this.nextOrder, at };
      this.nextOrder += 1;
      this.colorByCell[cell] = strip.color;
      this.orderByCell[cell] = placement.order;
      this.placedPerColor[strip.color] += 1;
      this.history.push(placement);
      placements.push(placement);
    }

    // The stones have landed, so the player's hand is empty again. The tray
    // keeps the same colour and count, ready for the next swipe and pull.
    this.airborne = null;
    if (this.selection && this.remainingFor(this.selection.color) <= 0) this.selection = null;

    const completedRows = this.rowsCompletedBy(cells);

    this.emit();
    return { ok: true, placements, completedRows };
  }

  /**
   * Rows a just-placed strip finished off, for a "row complete" sound/haptic.
   * Only checks the rows the new cells actually touch, not the whole board.
   */
  private rowsCompletedBy(cells: number[]): number[] {
    const rows = new Set(cells.map((cell) => cellRow(cell, this.board.width)));
    const completed: number[] = [];
    for (const row of rows) {
      let full = true;
      const start = row * this.board.width;
      for (let col = 0; col < this.board.width; col += 1) {
        if (this.colorByCell[start + col] === -1) {
          full = false;
          break;
        }
      }
      if (full) completed.push(row);
    }
    return completed;
  }

  // --- persistence --------------------------------------------------------

  /**
   * Apply stored placements to an empty session, in their recorded order.
   * Placements that no longer fit the board (a re-generated image, a corrupt
   * save) are skipped rather than throwing, so progress degrades instead of
   * blocking play. Returns how many stones were restored.
   */
  restoreProgress(progress: BoardProgress | null): number {
    if (!progress || progress.boardId !== this.board.id) return 0;
    const ordered = [...progress.placements].sort((a, b) => a.order - b.order);
    let restored = 0;
    for (const placement of ordered) {
      const { cell, color } = placement;
      if (!Number.isInteger(cell) || cell < 0 || cell >= this.board.cells.length) continue;
      if (this.colorByCell[cell] !== -1) continue;
      if (this.board.cells[cell] !== color) continue;
      this.colorByCell[cell] = color;
      this.orderByCell[cell] = this.nextOrder;
      this.placedPerColor[color] += 1;
      this.history.push({ ...placement, order: this.nextOrder });
      this.nextOrder += 1;
      restored += 1;
    }
    if (restored > 0) this.emit();
    return restored;
  }

  toProgress(): BoardProgress {
    return {
      version: 1,
      boardId: this.board.id,
      placements: this.history.map((placement) => ({ ...placement })),
    };
  }

  /** Convenience: a fresh session with stored progress already replayed into it. */
  static fromProgress(board: BoardData, progress: BoardProgress | null): BoardSession {
    const session = new BoardSession(board);
    session.restoreProgress(progress);
    return session;
  }
}
