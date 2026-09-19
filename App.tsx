import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import MobileAds from 'react-native-google-mobile-ads';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BackgroundMusic } from './src/audio/BackgroundMusic';
import { FpsOverlay } from './src/components/FpsOverlay';
import { DEV_TOOLS_ENABLED } from './src/constants/devTools';
import { DevToolsProvider, useDevTools } from './src/hooks/useDevTools';
import { PurchasesProvider } from './src/hooks/usePurchases';
import { SettingsProvider } from './src/hooks/useSettings';
import type { RootStackParamList } from './src/navigation/types';
import BoardRoute from './src/screens/BoardRoute';
import BoardsScreen from './src/screens/BoardsScreen';
import DevStoneGalleryScreen from './src/screens/DevStoneGalleryScreen';
import DevToolsScreen from './src/screens/DevToolsScreen';
import LevelCompleteScreen from './src/screens/LevelCompleteScreen';
import LevelsScreen from './src/screens/LevelsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import SplashScreen from './src/screens/SplashScreen';
import TapToStartScreen from './src/screens/TapToStartScreen';
import { colors } from './src/theme/colors';

const Stack = createNativeStackNavigator<RootStackParamList>();

/** Floats the FPS readout over every screen while the dev tools toggle is on. */
function DevFpsOverlay() {
  const { showFps } = useDevTools();
  if (!DEV_TOOLS_ENABLED || !showFps) return null;
  return <FpsOverlay />;
}

export default function App() {
  useEffect(() => {
    MobileAds().initialize();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SettingsProvider>
          <PurchasesProvider>
          <DevToolsProvider>
            <BackgroundMusic />
            <NavigationContainer>
              <Stack.Navigator
                initialRouteName="Splash"
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: colors.background },
                }}
              >
                <Stack.Screen name="Splash" component={SplashScreen} options={{ gestureEnabled: false }} />
                <Stack.Screen
                  name="TapToStart"
                  component={TapToStartScreen}
                  options={{ gestureEnabled: false }}
                />
                <Stack.Screen name="Levels" component={LevelsScreen} />
                <Stack.Screen name="Boards" component={BoardsScreen} />
                <Stack.Screen name="Board" component={BoardRoute} />
                <Stack.Screen
                  name="LevelComplete"
                  component={LevelCompleteScreen}
                  options={{ gestureEnabled: false }}
                />
                <Stack.Screen name="Settings" component={SettingsScreen} options={{ presentation: 'modal' }} />
                {DEV_TOOLS_ENABLED ? (
                  <Stack.Group screenOptions={{ presentation: 'modal' }}>
                    <Stack.Screen name="DevTools" component={DevToolsScreen} />
                    <Stack.Screen name="DevStoneGallery" component={DevStoneGalleryScreen} />
                  </Stack.Group>
                ) : null}
              </Stack.Navigator>
            </NavigationContainer>
            <DevFpsOverlay />
          </DevToolsProvider>
          </PurchasesProvider>
        </SettingsProvider>
        <StatusBar style="dark" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
