import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import wordmark from '../../assets/studio_logo/wordmark.png';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

/** First screen shown: a beat on the studio wordmark, then on to "Tap to Start". */
export default function SplashScreen({ navigation }: Props) {
  useEffect(() => {
    const timer = setTimeout(() => navigation.replace('TapToStart'), 1400);
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.screen} testID="splash-screen">
      <Image source={wordmark} style={styles.wordmark} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  // Matches wordmark.png's own 1440x400 aspect ratio.
  wordmark: { width: '70%', maxWidth: 360, aspectRatio: 1440 / 400 },
});
