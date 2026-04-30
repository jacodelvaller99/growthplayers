import { defineConfig, devices } from '@playwright/test';

/**
 * Batman QA Suite — Playwright Configuration
 *
 * Target: Expo web build deployed at growthplayers.vercel.app
 * Viewport: iPhone 14 Pro (390x844) — primary test target
 * Browsers: Chromium (primary), Firefox, WebKit (Safari-equiv)
 */

const BASE_URL = process.env.BASE_URL ?? 'https://growthplayers.vercel.app';

export default defineConfig({
  testDir: './__tests__/e2e',
  testMatch: '**/*.spec.ts',

  // Per-test timeout
  timeout: 30_000,

  // Retry failed tests once (flake guard)
  retries: process.env.CI ? 2 : 1,

  // Run tests in parallel
  workers: process.env.CI ? 2 : 4,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],

  use: {
    baseURL: BASE_URL,

    // Mobile viewport — iPhone 14 Pro
    viewport: { width: 390, height: 844 },

    // Capture on failure
    screenshot: 'only-on-failure',
    video:      'retain-on-failure',
    trace:      'on-first-retry',

    // Generous navigation timeout
    navigationTimeout: 20_000,

    // Ignore HTTPS errors for staging
    ignoreHTTPSErrors: true,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['iPhone 14 Pro'], channel: 'chromium' },
    },
    {
      name: 'firefox',
      use: { ...devices['iPhone 14 Pro'], browserName: 'firefox' },
    },
    {
      name: 'webkit',
      use: { ...devices['iPhone 14 Pro'] },
    },
  ],
});
