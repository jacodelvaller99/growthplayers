const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Patch import.meta for web compatibility (Zustand devtools uses import.meta.env)
const originalTransformSync = config.transformer?.transformerPath;

config.transformer = {
  ...config.transformer,
  minifierConfig: {
    ...config.transformer?.minifierConfig,
  },
};

// Allow resolving zustand and other ESM packages
config.resolver = {
  ...config.resolver,
  unstable_enablePackageExports: false,
};

module.exports = config;
