const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const config = {
  // resolver: {
  //   alias: {
  //     crypto: 'react-native-get-random-values',
  //   },
  //   fallback: {
  //     crypto: require.resolve('react-native-get-random-values'),
  //     stream: require.resolve('readable-stream'),
  //     buffer: require.resolve('buffer'),
  //   },
  // },
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: false,
      },
    }),
  },
  server: {
    port: 8081,
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);