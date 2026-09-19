import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LevelCompleteCanvas } from '../components/LevelCompleteCanvas';
import { LEVEL_CELLS_X, LEVEL_CELLS_Y } from '../constants/board';
import { globalCellIndex, loadLevelPlacements } from '../game/levelReplay';
import type { PreparedLevel } from '../game/levels/preparedLevel';
import { preparedLevelFor } from '../game/levels';
import type { RootStackParamList } from '../navigation/types';
import { theme } from '../ui/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'LevelComplete'>;

const TOTAL_CELLS = LEVEL_CELLS_X * LEVEL_CELLS_Y;

type Phase = 'loading' | 'full' | 'sparkle' | 'hiding' | 'showing' | 'done';

/** Duration of each step of the celebration, in milliseconds. */
const DURATIONS: Record<Exclude<Phase, 'loading' | 'done'>, number> = {
  full: 500,
  sparkle: 900,
  hiding: 800,
  showing: 1100,
};

/** How much real time can pass between picture rebuilds; caps the redraw rate of a 76800-cell canvas. */
const FRAME_BUDGET_MS = 40;

function assembleLevelCells(prepared: PreparedLevel): Uint16Array {
  const cells = new Uint16Array(TOTAL_CELLS);
  for (let boardId = 0; boardId < 48; boardId += 1) {
    const board = prepared.getBoard(boardId);
    for (let local = 0; local < board.cells.length; local += 1) {
      cells[globalCellIndex(boardId, local)] = board.cells[local];
    }
  }
  return cells;
}

/**
 * The level-complete celebration (BUILD_PLAN.md): zoom out onto the whole
 * picture, a one-off sparkle sweep, every stone vanishing newest-first, then
 * reappearing in the order the player actually placed them — as if the
 * picture is painting itself again.
 */
export default function LevelCompleteScreen({ navigation, route }: Props) {
  const { levelId } = route.params;
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const prepared = useMemo(() => preparedLevelFor(levelId), [levelId]);

  const [phase, setPhase] = useState<Phase>('loading');
  const [revealThreshold, setRevealThreshold] = useState(TOTAL_CELLS);
  const [sparkle, setSparkle] = useState<number | null>(null);
  const [orderByCell, setOrderByCell] = useState<Int32Array | null>(null);
  const [levelCells, setLevelCells] = useState<Uint16Array | null>(null);
  const doneRef = useRef(false);

  const canvasWidth = Math.min(windowWidth - 32, 640);
  const canvasHeight = canvasWidth * (LEVEL_CELLS_Y / LEVEL_CELLS_X);

  // Load every board's saved placements once, merge them into one solving
  // order for the whole level, and lay out the picture's own colours.
  useEffect(() => {
    if (!prepared) {
      setPhase('done');
      return;
    }
    let cancelled = false;
    const boardIds = Array.from({ length: 48 }, (_, boardId) => prepared.getBoard(boardId).id);
    loadLevelPlacements(boardIds)
      .then((merged) => {
        if (cancelled) return;
        const order = new Int32Array(TOTAL_CELLS).fill(-1);
        for (const placement of merged) order[placement.cell] = placement.order;
        setOrderByCell(order);
        setLevelCells(assembleLevelCells(prepared));
        setPhase('full');
      })
      .catch(() => {
        if (!cancelled) setPhase('done');
      });
    return () => {
      cancelled = true;
    };
  }, [prepared]);

  // Steps through full -> sparkle -> hiding -> showing -> done, each phase
  // driving one animated value at a throttled rate (a 76800-cell picture is
  // too much to rebuild every frame).
  useEffect(() => {
    if (phase === 'loading' || phase === 'done') return undefined;

    let raf: ReturnType<typeof requestAnimationFrame> | null = null;
    let lastUpdate = 0;
    const start = Date.now();
    const duration = phase === 'full' ? DURATIONS.full : DURATIONS[phase as Exclude<Phase, 'loading' | 'done' | 'full'>];

    const tick = () => {
      const elapsed = Date.now() - start;
      const t = Math.min(1, elapsed / duration);
      const now = Date.now();
      if (now - lastUpdate >= FRAME_BUDGET_MS || t >= 1) {
        lastUpdate = now;
        if (phase === 'sparkle') setSparkle(t);
        else if (phase === 'hiding') setRevealThreshold(Math.round(TOTAL_CELLS * (1 - t)));
        else if (phase === 'showing') setRevealThreshold(Math.round(TOTAL_CELLS * t));
      }
      if (t < 1) {
        raf = requestAnimationFrame(tick);
        return;
      }
      if (phase === 'full') setPhase('sparkle');
      else if (phase === 'sparkle') {
        setSparkle(null);
        setPhase('hiding');
      } else if (phase === 'hiding') setPhase('showing');
      else if (phase === 'showing') setPhase('done');
    };

    raf = requestAnimationFrame(tick);
    return () => {
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== 'done' || doneRef.current) return;
    doneRef.current = true;
    navigation.popToTop();
  }, [phase, navigation]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <Text style={styles.title}>{prepared?.name ?? 'Level complete'}</Text>
      <View style={styles.canvasWrap}>
        {levelCells && orderByCell ? (
          <LevelCompleteCanvas
            width={canvasWidth}
            height={canvasHeight}
            levelCells={levelCells}
            palette={prepared ? prepared.getBoard(0).palette : []}
            orderByCell={orderByCell}
            revealThreshold={revealThreshold}
            sparkle={sparkle}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.appBackground,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 16,
  },
  canvasWrap: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: theme.boardBackground,
  },
});
