import React, { useState } from 'react';
import { LayoutRectangle, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../ui/theme';

/**
 * Rough height of the card below, so it can be placed above the target row
 * without waiting a render for its own onLayout. Both steps' bodies are one
 * short paragraph, so this stays close in practice; worth confirming on a
 * real screen alongside the rest of this component (see HANDOFF.md).
 */
const CARD_HEIGHT_ESTIMATE = 132;
const CARD_GAP = 14;

export interface OnboardingStep {
  /** The row this step is about, measured in the overlay's own coordinate space. */
  target: LayoutRectangle;
  title: string;
  body: string;
}

interface Props {
  steps: OnboardingStep[];
  /** Fired once, whether the sequence finished or was skipped. */
  onDone: () => void;
}

/**
 * First-run board coach marks: everything above and below the step's row
 * stays dimmed, the row itself stays fully visible (both target rows already
 * span the full board width, so a top/bottom dim is a spotlight without
 * needing a cut-out shape), with a card above pointing down into it.
 *
 * Shown once ever, not per board — `src/storage/onboarding.ts` tracks that,
 * and the board screen only mounts this while it's false.
 */
export function OnboardingOverlay({ steps, onDone }: Props) {
  const [index, setIndex] = useState(0);
  const step = steps[index];
  const isLast = index === steps.length - 1;
  const { target } = step;

  function advance() {
    if (isLast) {
      onDone();
    } else {
      setIndex(index + 1);
    }
  }

  const cardTop = Math.max(target.y - CARD_HEIGHT_ESTIMATE - CARD_GAP, 12);

  return (
    <View style={StyleSheet.absoluteFill} testID="onboarding-overlay">
      <View style={[styles.dim, { top: 0, height: target.y }]} />
      <View style={[styles.dim, { top: target.y + target.height, bottom: 0 }]} />

      <View style={[styles.card, { top: cardTop }]} testID={`onboarding-step-${index}`}>
        <Text style={styles.title}>{step.title}</Text>
        <Text style={styles.body}>{step.body}</Text>
        <View style={styles.actions}>
          <Pressable onPress={onDone} accessibilityRole="button" accessibilityLabel="Skip onboarding">
            <Text style={styles.skip}>Skip</Text>
          </Pressable>
          <Pressable
            onPress={advance}
            accessibilityRole="button"
            accessibilityLabel={isLast ? 'Got it' : 'Next'}
            style={styles.nextButton}
          >
            <Text style={styles.nextLabel}>{isLast ? 'Got it' : 'Next'}</Text>
          </Pressable>
        </View>
        <View style={styles.caret} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dim: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: 'rgba(10, 14, 24, 0.72)',
  },
  card: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: theme.panel,
    borderRadius: 16,
    padding: 16,
    shadowColor: theme.shadow,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.text,
  },
  body: {
    fontSize: 14,
    color: theme.textMuted,
    marginTop: 6,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 20,
    marginTop: 14,
  },
  skip: {
    fontSize: 14,
    color: theme.textMuted,
    fontWeight: '600',
  },
  nextButton: {
    backgroundColor: theme.accent,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  nextLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  caret: {
    position: 'absolute',
    bottom: -8,
    left: '50%',
    marginLeft: -8,
    width: 16,
    height: 16,
    backgroundColor: theme.panel,
    transform: [{ rotate: '45deg' }],
  },
});

export default OnboardingOverlay;
