module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // Reanimated 4 + RN CLI: must be last — transforms worklets for the UI runtime
    'react-native-worklets/plugin',
  ],
};
