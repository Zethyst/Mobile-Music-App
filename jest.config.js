module.exports = {
  preset: '@react-native/jest-preset',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|react-native-track-player|@react-navigation/.*|react-native-screens|react-native-gesture-handler|@react-native-vector-icons)/)',
  ],
};
