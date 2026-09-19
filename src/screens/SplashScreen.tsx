import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import wordmark from '../../assets/studio_logo/wordmark.png';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

const FADE_IN_MS = 650;
const HOLD_MS = 500;
const FADE_OUT_MS = 550;

/**
 * First screen shown: the studio wordmark fades in slowly on a plain white
 * field, holds, fades back out, then hands off to "Tap to Start" - not a
 * hard cut in or out.
 */
export default function SplashScreen({ navigation }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const sequence = Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: FADE_IN_MS, useNativeDriver: true }),
      Animated.delay(HOLD_MS),
      Animated.timing(opacity, { toValue: 0, duration: FADE_OUT_MS, useNativeDriver: true }),
    ]);
    sequence.start(({ finished }) => {
      if (finished) navigation.replace('TapToStart');
    });
    return () => sequence.stop();
  }, [navigation, opacity]);

  return (
    <View style={styles.screen} testID="splash-screen">
      <Animated.Image source={wordmark} style={[styles.wordmark, { opacity }]} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' },
  // Matches wordmark.png's own 1440x400 aspect ratio.
  wordmark: { width: '70%', maxWidth: 360, aspectRatio: 1440 / 400 },
});
