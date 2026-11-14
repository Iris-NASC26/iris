import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: ['browser/**/*.spec.ts', 'e2e/**/*.spec.ts'],
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:5173', browserName: 'chromium' },
  webServer: {
    command: 'python scripts/dev.py start',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: process.env.EARTH_TREND_TEST_EXISTING_SERVER === '1' && !process.env.CI,
    timeout: 30000,
  },
});
