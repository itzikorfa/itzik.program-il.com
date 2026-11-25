import { defineConfig, devices } from '@playwright/test';

const chromium = { browserName: 'chromium' as const };

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  reporter: 'line',
  use: { baseURL: 'http://localhost:4321' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'iphone', use: { ...devices['iPhone 13'], ...chromium } },
    { name: 'pixel', use: { ...devices['Pixel 7'] } },
    { name: 'small', use: { ...devices['Pixel 7'], viewport: { width: 360, height: 740 } } },
  ],
  webServer: {
    command: 'node tests/e2e/serve.mjs',
    url: 'http://localhost:4321',
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
