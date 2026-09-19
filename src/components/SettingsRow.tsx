import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';

interface Props {
  label: string;
  onPress?: () => void;
  /** Content on the right of the row (a Toggle, say). With `onPress` and no `right`, a chevron shows instead. */
  right?: ReactNode;
}

export default function SettingsRow({ label, onPress, right }: Props) {
  const content = right ?? (onPress ? <Text style={styles.chevron}>›</Text> : null);
  const Wrapper = onPress ? Pressable : View;

  return (
    <Wrapper style={styles.row} onPress={onPress}>
      <Text style={styles.label}>{label}</Text>
      {content}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  label: {
    fontSize: 16,
    color: colors.text,
  },
  chevron: {
    fontSize: 18,
    color: colors.textFaint,
  },
});
