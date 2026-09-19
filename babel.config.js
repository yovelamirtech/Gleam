module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // react-native-worklets/plugin must stay last: reanimated 4 workletises through it.
    plugins: ['react-native-worklets/plugin'],
  };
};
