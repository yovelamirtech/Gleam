import { Canvas, Group, Picture, Skia, createPicture, type SkPicture } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { BOARDS_PER_LEVEL } from '../constants/board';
import { createPlaceholderBoard } from '../game/placeholderBoard';
import type { PreparedLevel } from '../game/levels/preparedLevel';
import { drawBoardGrid } from '../ui/boardGrid';
import { WALL_PX_HEIGHT, WALL_PX_WIDTH, boardTilePosition } from '../ui/unifiedBoard';

interface Props {
  prepared: PreparedLevel | null | undefined;
  levelId: number;
  width: number;
  height: number;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  scale: SharedValue<number>;
}

/**
 * Every board of the level drawn as its real empty grid - the same cell
 * backgrounds, borders and numbers `BoardCanvas` draws on the live board
 * screen - baked once into a single picture instead of a flattened preview
 * image, so the wall tells a player which stones actually go where before
 * they zoom into any one board.
 */
export function WallGridCanvas({ prepared, levelId, width, height, translateX, translateY, scale }: Props) {
  const picture: SkPicture = useMemo(
    () =>
      createPicture((canvas) => {
        for (let boardId = 0; boardId < BOARDS_PER_LEVEL; boardId += 1) {
          const board = prepared
            ? prepared.getBoard(boardId)
            : createPlaceholderBoard(boardId, { levelId: `level-${levelId + 1}` });
          const { x, y } = boardTilePosition(boardId);
          drawBoardGrid(canvas, board, x, y);
        }
      }, Skia.XYWHRect(0, 0, WALL_PX_WIDTH, WALL_PX_HEIGHT)),
    [prepared, levelId]
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
