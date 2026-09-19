import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import icon from '../../assets/icon.png';
import { StoneIcon } from '../components/StoneIcon';
import { generatePalette } from '../game/palette';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'TapToStart'>;

const SPARKLE_PALETTE = generatePalette(6);

/** A few stray stones scattered around the icon, per BUILD_PLAN.md's rhinestone identity. */
const SPARKLES: { top: number; left: number; size: number; color: number }[] = [
  { top: -18, left: -70, size: 26, color: 0 },
  { top: 40, left: 92, size: 20, color: 2 },
  { top: -34, left: 60, size: 16, color: 4 },
  { top: 96, left: -84, size: 18, color: 1 },
  { top: 130, left: 30, size: 14, color: 5 },
];

/** The game's own title beat: its rhinestone symbol, tap anywhere to enter the levels wall. */
export default function TapToStartScreen({ navigation }: Props) {
  return (
    <Pressable
      style={styles.screen}
      onPress={() => navigation.replace('Levels')}
      accessibilityRole="button"
      accessibilityLabel="Tap to start"
    >
      <View style={styles.glow} />
      <View style={styles.iconWrap}>
        {SPARKLES.map((sparkle, index) => (
          <StoneIcon
            key={index}
            hex={SPARKLE_PALETTE[sparkle.color].hex}
            size={sparkle.size}
            style={[styles.sparkle, { top: sparkle.top, left: sparkle.left }]}
          />
        ))}
        <Image source={icon} style={styles.icon} resizeMode="contain" />
      </View>
      <Text style={styles.title}>Gleam</Text>
      <Text style={styles.prompt}>Tap to start</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  glow: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: colors.accentSoft,
    opacity: 0.7,
  },
  iconWrap: { alignItems: 'center', justifyContent: 'center' },
  icon: { width: 160, height: 160 },
  sparkle: { position: 'absolute' },
  title: { fontSize: 32, fontWeight: '700', color: colors.text, marginTop: 16 },
  prompt: { fontSize: 16, color: colors.textMuted, marginTop: 8 },
});
