/* eslint-env jest */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// expo-audio and expo-haptics both need a native module the test renderer
// doesn't have, same reasoning as the Skia canvas mock in BoardScreen.test.tsx.
jest.mock('expo-audio', () => ({
  useAudioPlayer: () => ({ play: jest.fn(), pause: jest.fn(), seekTo: jest.fn(), loop: false, volume: 1 }),
}));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy', Soft: 'soft', Rigid: 'rigid' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));
