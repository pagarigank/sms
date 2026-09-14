import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  timeout: 90_000,
  globalTimeout: 600_000,
  // Use storage state from global setup
  use: {
    baseURL: 'http://localhost:3001',
    // storageState not used — tests login via UI
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // globalSetup: './e2e/global-setup.ts',  // disabled — use pre-saved auth-state.json
});
