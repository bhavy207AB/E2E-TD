import { defineConfig, devices } from '@playwright/test';
import 'dotenv/config';

/**
 * Control config for TDV2-1138: the SAME four tests, sharded the same way, but
 * with NO shared setup test (each test seeds its own state). Used to confirm
 * that a sharded run with no shared test is unaffected and shows Passed —
 * both before and after the fix.
 */
export default defineConfig({
  testDir: './tests-nosetup',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: 'https://demo.playwright.dev',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
