import { TRAY_SLOTS, cellIndex, otherOrientation, stripCells } from './geometry';
import type {
  BoardData,
  BoardProgress,
  ColorIndex,
  HeldStrip,
  Orientation,
  PlaceResult,
  Placement,
  PlacementFailure,
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
  private held: HeldStrip | null = null;
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
   * Stones of `color` still owed to the board, held ones included.
   * Always equals the number of cells of that colour still empty.
   */
  remainingFor(color: ColorIndex): number {
    return this.requiredFor(color) - this.placedFor(color);
  }

  /** Stones of `color` that can still be lifted into the tray. */
  availableFor(color: ColorIndex): number {
    const reserved = this.held?.color === color ? this.held.count : 0;
    return this.remainingFor(color) - reserved;
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
    const index = cellIndex(row, col, this.board.width);
    return this.cellAtIndex(index);
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

  get heldStrip(): HeldStrip | null {
    return this.held;
  }

  /**
   * Pick a colour up into the tray. Fills all five slots, or fewer when the
   * board owes fewer than five stones of that colour. Picking a colour while
   * another strip is held drops the old strip back into supply first — that is
   * the only "undo", there is no separate return button.
   */
  selectColor(color: ColorIndex, orientation: Orientation = 'horizontal'): boolean {
    if (color < 0 || color >= this.board.palette.length) return false;
    // A held strip goes back to supply first, so the pool for the new colour is
    // simply everything the board still owes it.
    const count = Math.min(TRAY_SLOTS, this.remainingFor(color));
    if (count <= 0) return false;
    this.held = { color, count, orientation };
    this.emit();
    return true;
  }

  /** Trim or refill the held strip. Tapping the nth tray slot takes n stones. */
  setStripCount(count: number): boolean {
    if (!this.held) return false;
    const max = Math.min(TRAY_SLOTS, this.remainingFor(this.held.color));
    const next = Math.min(Math.max(Math.round(count), 1), max);
    if (next === this.held.count) return false;
    this.held = { ...this.held, count: next };
    this.emit();
    return true;
  }

  /** Tapping the strip flips it between vertical and horizontal. */
  rotateStrip(): boolean {
    if (!this.held) return false;
    this.held = { ...this.held, orientation: otherOrientation(this.held.orientation) };
    this.emit();
    return true;
  }

  /** Drop the held strip back into supply — releasing outside the grid does this. */
  cancelStrip(): boolean {
    if (!this.held) return false;
    this.held = null;
    this.emit();
    return true;
  }

  // --- placement ----------------------------------------------------------

  /**
   * Cells the held strip would cover with its head on (row, col), or null when
   * nothing is held or the strip runs off the board.
   */
  previewCells(row: number, col: number): number[] | null {
    if (!this.held) return null;
    return stripCells(row, col, this.held.count, this.held.orientation, this.board);
  }

  /** Why a placement at (row, col) would fail, or null when it would succeed. */
  placementFailure(row: number, col: number): PlacementFailure | null {
    if (!this.held) return 'no-strip';
    const cells = this.previewCells(row, col);
    if (!cells) return 'out-of-bounds';
    for (const cell of cells) {
      if (this.colorByCell[cell] !== -1) return 'occupied';
      if (this.board.cells[cell] !== this.held.color) return 'wrong-color';
    }
    return null;
  }

  canPlace(row: number, col: number): boolean {
    return this.placementFailure(row, col) === null;
  }

  /**
   * Lay the held strip down with its head on (row, col).
   *
   * All or nothing: if any covered cell is occupied or wants another colour the
   * whole strip stays in the tray. That is what keeps the exact-supply promise —
   * a stone can only ever be spent on a cell that needed it.
   */
  place(row: number, col: number, at: number = Date.now()): PlaceResult {
    const failure = this.placementFailure(row, col);
    if (failure) return { ok: false, reason: failure };

    const held = this.held!;
    const cells = this.previewCells(row, col)!;
    const placements: Placement[] = [];
    for (const cell of cells) {
      const placement: Placement = { cell, color: held.color, order: this.nextOrder, at };
      this.nextOrder += 1;
      this.colorByCell[cell] = held.color;
      this.orderByCell[cell] = placement.order;
      this.placedPerColor[held.color] += 1;
      this.history.push(placement);
      placements.push(placement);
    }

    // Refill the tray with the same colour so the player keeps going, keeping
    // the strip length they chose unless the board owes fewer than that now.
    this.held = null;
    const refill = Math.min(TRAY_SLOTS, this.remainingFor(held.color));
    this.held = refill > 0 ? { ...held, count: Math.min(held.count, refill) } : null;

    this.emit();
    return { ok: true, placements };
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
