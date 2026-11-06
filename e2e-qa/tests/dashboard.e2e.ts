import process from 'node:process';
import { test } from '@e2e-dev/web';
import { expect } from 'e2e';

// Restores the admin session, so it opens the dashboard directly without the
// sign-in form. Covers the visual-comparison path (item 10) with a stable card.
test.describe('dashboard', { tags: ['dashboard'] }, () => {
  test('opens directly from a restored session', { session: 'admin' }, async ({ app, screen }) => {
    await app.open('/dashboard');
    await expect(screen.getByRole('heading', 'Dashboard')).toBeVisible();
    await expect(screen.getByRole('region', 'Summary')).toBeVisible();
  });

  test('summary card matches its screenshot', { session: 'admin', tags: ['visual'] }, async ({ app, screen }) => {
    // Screenshot baselines are per OS; only macOS ones are committed. On other
    // platforms (CI Linux) skip rather than fail — regenerate there with -u.
    test.skip(process.platform !== 'darwin', 'screenshot baselines committed for macOS only');
    await app.open('/dashboard');
    const summary = screen.getByRole('region', 'Summary');
    await expect(summary).toBeVisible();
    // Element-scoped screenshot: a stable card with no clocks or live data.
    await expect(summary).toHaveScreenshot('summary-card.png', { maxDiffPixelRatio: 0.02 });
  });
});
