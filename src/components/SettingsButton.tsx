import { Pressable, StyleSheet, Text } from 'react-native';

import { colors } from '../theme/colors';

interface Props {
  onPress: () => void;
}

/** The gear icon shown on every screen, opening the settings screen. */
export default function SettingsButton({ onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Settings"
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      style={styles.button}
    >
      <Text style={styles.icon}>⚙</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  icon: {
    fontSize: 18,
    color: colors.textMuted,
  },
});
