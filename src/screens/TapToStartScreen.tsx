import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Image, Pressable, StyleSheet, Text } from 'react-native';

import icon from '../../assets/icon.png';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'TapToStart'>;

/** The game's own title beat: its rhinestone symbol, tap anywhere to enter the levels wall. */
export default function TapToStartScreen({ navigation }: Props) {
  return (
    <Pressable
      style={styles.screen}
      onPress={() => navigation.replace('Levels')}
      accessibilityRole="button"
      accessibilityLabel="Tap to start"
    >
      <Image source={icon} style={styles.icon} resizeMode="contain" />
      <Text style={styles.title}>Gleam</Text>
      <Text style={styles.prompt}>Tap to start</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  icon: { width: 160, height: 160 },
  title: { fontSize: 32, fontWeight: '700', color: colors.text, marginTop: 16 },
  prompt: { fontSize: 16, color: colors.textMuted, marginTop: 8 },
});
