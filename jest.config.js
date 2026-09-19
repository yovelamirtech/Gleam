module.exports = {
  preset: 'jest-expo',
  // Keeps worklets off its `.native` implementation, which needs a real
  // JSI runtime; reanimated and gesture-handler then load in plain Jest.
  resolver: 'react-native-worklets/jest/resolver.js',
  setupFiles: [
    ...require('jest-expo/jest-preset').setupFiles,
    '<rootDir>/node_modules/react-native-gesture-handler/jestSetup.js',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // Shared fixtures live in __tests__/support and are not suites themselves.
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
};
