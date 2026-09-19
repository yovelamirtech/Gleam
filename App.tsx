import { StatusBar } from 'expo-status-bar';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { createPlaceholderBoard } from './src/game/placeholderBoard';
import BoardScreen from './src/screens/BoardScreen';
import { theme } from './src/ui/theme';

/**
 * Entry point.
 *
 * Only the board screen exists so far, so the app opens straight onto one
 * placeholder board. The levels screen and the board grid around it come later;
 * this board stands in for whatever the image prep script will produce.
 */
export default function App() {
  const board = useMemo(() => createPlaceholderBoard(0), []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <View style={styles.root}>
          <BoardScreen board={board} />
          <StatusBar style="dark" />
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.appBackground,
  },
});
