import { Canvas, Group, Picture, Skia, createPicture, type SkPicture } from '@shopify/react-native-skia';
import { useEffect, useMemo, useState } from 'react';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { BOARDS_PER_LEVEL } from '../constants/board';
import { loadBoardProgress } from '../game/persistence';
import { createPlaceholderBoard } from '../game/placeholderBoard';
import type { PreparedLevel } from '../game/levels/preparedLevel';
import type { BoardProgress } from '../game/types';
import { drawBoardGrid, drawBoardStones } from '../ui/boardGrid';
import { WALL_PX_HEIGHT, WALL_PX_WIDTH, boardTilePosition } from '../ui/unifiedBoard';

interface Props {
  prepared: PreparedLevel | null | undefined;
  levelId: number;
  width: number;
  height: number;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  scale: SharedValue<number>;
  /**
   * Bumped whenever the player leaves a live board (`UnifiedBoardScreen`'s
   * `activeBoardId` going back to null), so the wall reloads that board's
   * just-saved progress instead of going on showing it as it was before the
   * player zoomed in.
   */
  refreshToken?: number;
}

function boardFor(prepared: PreparedLevel | null | undefined, levelId: number, boardId: number) {
  return prepared
    ? prepared.getBoard(boardId)
    : createPlaceholderBoard(boardId, { levelId: `level-${levelId + 1}` });
}

/**
 * Every board of the level drawn as its real grid plus whatever stones are
 * already placed on it - the same cell backgrounds, borders, numbers and
 * stones `BoardCanvas` draws on the live board screen - baked once into a
 * single picture instead of a flattened preview image, so the wall tells a
 * player which stones actually go where, and shows their real progress,
 * before they zoom into any one board.
 */
export function WallGridCanvas({
  prepared,
  levelId,
  width,
  height,
  translateX,
  translateY,
  scale,
  refreshToken,
}: Props) {
  const [progressByBoard, setProgressByBoard] = useState<Map<number, BoardProgress | null>>(new Map());

  useEffect(() => {
    let cancelled = false;
    const boardIds = Array.from({ length: BOARDS_PER_LEVEL }, (_, boardId) => boardId);
    Promise.all(
      boardIds.map(async (boardId) => {
        const board = boardFor(prepared, levelId, boardId);
        const progress = await loadBoardProgress(board.id);
        return [boardId, progress] as const;
      })
    )
      .then((entries) => {
        if (!cancelled) setProgressByBoard(new Map(entries));
      })
      .catch(() => {
        // No stored progress readable: the wall just shows every board empty.
      });
    return () => {
      cancelled = true;
    };
  }, [prepared, levelId, refreshToken]);

  const picture: SkPicture = useMemo(
    () =>
      createPicture((canvas) => {
        for (let boardId = 0; boardId < BOARDS_PER_LEVEL; boardId += 1) {
          const board = boardFor(prepared, levelId, boardId);
          const { x, y } = boardTilePosition(boardId);
          drawBoardGrid(canvas, board, x, y);
          const progress = progressByBoard.get(boardId);
          if (progress) drawBoardStones(canvas, board, x, y, progress);
        }
      }, Skia.XYWHRect(0, 0, WALL_PX_WIDTH, WALL_PX_HEIGHT)),
    [prepared, levelId, progressByBoard]
  );

  const transform = useDerivedValue(() => [
    { translateX: translateX.value },
    { translateY: translateY.value },
    { scale: scale.value },
  ]);

  return (
    <Canvas style={{ width, height }}>
      <Group transform={transform}>
        <Picture picture={picture} />
      </Group>
    </Canvas>
  );
}
