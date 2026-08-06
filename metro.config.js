// https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// ── Tree-shaking: use package.json `exports` field (modern ESM packages) ──────
config.resolver = {
  ...config.resolver,
  unstable_enablePackageExports: true,
  unstable_conditionNames: ['browser', 'require', 'default'],
};

// ── Minification: drop console.* in production, two-pass compress ─────────────
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    compress: {
      // Remove all console calls in production bundles
      drop_console: true,
      pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn'],
      // Two-pass compression for better size reduction
      passes: 2,
      // Safe to reduce function boilerplate
      reduce_funcs: false,
    },
    mangle: {
      // Don't mangle top-level names (can break lazy requires)
      toplevel: false,
    },
  },
};

module.exports = config;
