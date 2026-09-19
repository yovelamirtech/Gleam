import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { RootStackParamList } from './src/navigation/types';
import BoardRoute from './src/screens/BoardRoute';
import BoardsScreen from './src/screens/BoardsScreen';
import LevelCompleteScreen from './src/screens/LevelCompleteScreen';
import LevelsScreen from './src/screens/LevelsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import SplashScreen from './src/screens/SplashScreen';
import TapToStartScreen from './src/screens/TapToStartScreen';
import { colors } from './src/theme/colors';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
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
          </Stack.Navigator>
        </NavigationContainer>
        <StatusBar style="dark" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
