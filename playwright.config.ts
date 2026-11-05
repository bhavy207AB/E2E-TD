import { defineConfig, devices } from '@playwright/test';
import 'dotenv/config';

/**
 * Reproduction config for TDV2-1138.
 *
 * Shape that triggers the bug:
 *   - one `setup` project containing a single setup test (tests/auth.setup.ts)
 *   - a `chromium` project with 4 tests that `dependencies: ['setup']`
 *
 * When this suite is run across two shards (`--shard=1/2` and `--shard=2/2`)
 * under one CI run id, Playwright runs the setup project in BOTH shard
 * processes. The setup test therefore executes twice (once per job) under a
 * single pw_test_id. On ingestion its rows upsert into one row
 * (ON CONFLICT run_id, pw_test_id, retry, run_start_time), but
 * judgeCompleteness sums each process's executedTests and counts the setup
 * once per job -> target (6) is one higher than stored rows (5) -> the run is
 * wrongly flagged Incomplete with 1 unnamed missing test.
 *
 * The TestDino reporter is intentionally NOT listed here: the repro drives the
 * run with `npx tdpw test` (see scripts/repro.sh), and the CLI injects the
 * reporter itself. Adding it here too would publish every run twice.
 */

const STORAGE_STATE = '.auth/state.json';

export default defineConfig({
  testDir: './tests',
  // Every test must pass for the bug to show (an Incomplete run with no real
  // failures), so keep the suite fully parallel but deterministic.
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  // One worker per shard process mirrors a typical sharded CI job and keeps the
  // reproduction deterministic.
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
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Consumes the state produced by the setup test, so this project
        // genuinely depends on setup — exactly the real-world pattern from the
        // ticket (a Playwright setup project / test.setup in e2e).
        storageState: STORAGE_STATE,
      },
      dependencies: ['setup'],
    },
  ],
});
