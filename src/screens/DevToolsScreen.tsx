import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import SettingsRow from '../components/SettingsRow';
import SettingsSection from '../components/SettingsSection';
import Toggle from '../components/Toggle';
import { BOARDS_PER_LEVEL, LEVEL_COUNT } from '../constants/board';
import { preparedLevelFor } from '../game/levels';
import { saveBoardProgress } from '../game/persistence';
import { BoardSession } from '../game/session';
import { useDevTools } from '../hooks/useDevTools';
import type { RootStackParamList } from '../navigation/types';
import { loadProgress, markBoardCompleted, resetProgress, saveProgress, unlockAll } from '../storage/progress';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'DevTools'>;

/** A +/- number picker, clamped to [0, max]. Steppers rather than a text
 * field, since level/board numbers are small and this stays keyboard-free. */
function Stepper({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (next: number) => void }) {
  return (
    <View style={styles.stepperRow}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperControl}>
        <Pressable
          onPress={() => onChange(Math.max(0, value - 1))}
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
          style={styles.stepperButton}
        >
          <Text style={styles.stepperButtonText}>−</Text>
        </Pressable>
        <Text style={styles.stepperValue}>{value}</Text>
        <Pressable
          onPress={() => onChange(Math.min(max, value + 1))}
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
          style={styles.stepperButton}
        >
          <Text style={styles.stepperButtonText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

/**
 * Dev-only menu, gated behind `DEV_TOOLS_ENABLED` at the one place it's
 * reachable from (a row on `SettingsScreen`, per BUILD_PLAN.md's "מסומנים
 * בבירור ככלי פיתוח"): unlock everything, jump straight to a board, reset
 * progress, toggle the FPS overlay, and open the stone style gallery.
 * Instant-complete and the solution overlay live on `BoardScreen` itself
 * instead - they need a live board session, which this menu doesn't have.
 */
export default function DevToolsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { showFps, setShowFps } = useDevTools();
  const [levelId, setLevelId] = useState(0);
  const [boardId, setBoardId] = useState(0);

  async function handleUnlockAll() {
    const progress = await loadProgress();
    await saveProgress(unlockAll(progress));
    Alert.alert('Unlocked', 'Every level and board is now reachable.');
  }

  /**
   * The level-complete celebration is otherwise only reachable by actually
   * finishing all 48 boards of a level. This instantly solves every one of
   * them (real artwork, not a blank shell) and marks the level complete on
   * the walls too, so `LevelCompleteScreen` has real placement data to
   * replay - not just a quick nav shortcut to an empty screen.
   */
  async function handlePreviewLevelComplete() {
    const prepared = preparedLevelFor(levelId);
    if (!prepared) {
      Alert.alert('No artwork yet', `Level ${levelId + 1} has no prepared source image.`);
      return;
    }
    let progress = await loadProgress();
    for (let board = 0; board < BOARDS_PER_LEVEL; board += 1) {
      const session = new BoardSession(prepared.getBoard(board));
      session.completeInstantly();
      await saveBoardProgress(session.toProgress());
      progress = markBoardCompleted(progress, levelId, board);
    }
    await saveProgress(progress);
    navigation.navigate('LevelComplete', { levelId });
  }

  function handleResetProgress() {
    Alert.alert(
      'Reset progress',
      'This deletes every level and board you have unlocked or completed. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: () => resetProgress() },
      ]
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>Dev tools</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <SettingsSection title="Progress">
          <SettingsRow label="Unlock every level and board" onPress={handleUnlockAll} />
          <SettingsRow label="Reset progress" onPress={handleResetProgress} />
        </SettingsSection>

        <SettingsSection title="Jump to a board">
          <Stepper label="Level" value={levelId} max={LEVEL_COUNT - 1} onChange={setLevelId} />
          <Stepper label="Board" value={boardId} max={BOARDS_PER_LEVEL - 1} onChange={setBoardId} />
          <SettingsRow
            label={`Go to level ${levelId + 1}, board ${boardId + 1}`}
            onPress={() => navigation.navigate('Board', { levelId, boardId })}
          />
          <SettingsRow
            label={`Instantly finish level ${levelId + 1} and preview its complete screen`}
            onPress={handlePreviewLevelComplete}
          />
        </SettingsSection>

        <SettingsSection title="Performance">
          <SettingsRow label="Show FPS overlay" right={<Toggle value={showFps} onValueChange={setShowFps} />} />
        </SettingsSection>

        <SettingsSection title="Design">
          <SettingsRow label="Stone style gallery" onPress={() => navigation.navigate('DevStoneGallery')} />
        </SettingsSection>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  back: { fontSize: 16, color: colors.textMuted },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  stepperLabel: { fontSize: 16, color: colors.text },
  stepperControl: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepperButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
  },
  stepperButtonText: { fontSize: 18, fontWeight: '700', color: colors.accent },
  stepperValue: { fontSize: 16, fontWeight: '600', color: colors.text, minWidth: 28, textAlign: 'center' },
});
