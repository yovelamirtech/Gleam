import type { BoardData, PaletteEntry } from '../types';

type LevelManifest = {
  id: string;
  name: string;
  startBoardId: number;
  palette: PaletteEntry[];
};

type RawBoard = {
  id: number;
  width: number;
  height: number;
  cells: number[];
};

/**
 * Shared shape behind every generated `src/game/levels/<id>.ts` module.
 * Each of those modules statically imports its own level.json, preview.png
 * and 48 board files (Metro needs the paths literal, so the imports can't be
 * generated at runtime), then hands them to this to build the same interface.
 */
export type PreparedLevel = {
  id: string;
  name: string;
  startBoardId: number;
  previewSource: number;
  getBoard: (boardId: number) => BoardData;
};

export function buildPreparedLevel(
  manifest: LevelManifest,
  previewSource: number,
  boards: RawBoard[]
): PreparedLevel {
  const palette: PaletteEntry[] = manifest.palette.map((entry) => ({
    index: entry.index,
    number: entry.number,
    hex: entry.hex,
  }));

  return {
    id: manifest.id,
    name: manifest.name,
    startBoardId: manifest.startBoardId,
    previewSource,
    getBoard(boardId: number): BoardData {
      const raw = boards[boardId];
      return {
        id: `${manifest.id}/board-${raw.id}`,
        width: raw.width,
        height: raw.height,
        palette,
        cells: raw.cells,
      };
    },
  };
}
