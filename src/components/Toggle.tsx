import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, TouchableOpacity } from 'react-native';

import { colors } from '../theme/colors';

const TOGGLE_TRAVEL = 20; // track width (50) - thumb (24) - padding on both sides (3 + 3)

interface Props {
  value: boolean;
  onValueChange: (value: boolean) => void;
  testID?: string;
}

/**
 * A custom switch instead of the built-in RN `Switch`: on Android it
 * sometimes ignores `trackColor` and shows the system's own green accent.
 */
export default function Toggle({ value, onValueChange, testID }: Props) {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [value, anim]);

  const trackBackground = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.locked, colors.accent],
  });
  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, TOGGLE_TRAVEL],
  });

  return (
    <TouchableOpacity testID={testID} activeOpacity={0.8} onPress={() => onValueChange(!value)}>
      <Animated.View style={[styles.track, { backgroundColor: trackBackground }]}>
        <Animated.View style={[styles.thumb, { transform: [{ translateX }] }]} />
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 50,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  thumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
});
