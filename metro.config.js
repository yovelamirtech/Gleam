// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// react-native-worklets (react-native-reanimated 4's engine) needs inline
// requires to initialise correctly; Expo's own default config leaves them
// off, which otherwise crashes the app the moment any worklet actually runs
// - in this app, the first pan/pinch/tap on a pannable/zoomable wall
// (LevelsScreen, the board wall, BoardScreen). See
// https://docs.swmansion.com/react-native-worklets/docs/guides/troubleshooting/.
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

module.exports = config;
