import { test } from '@e2e-dev/web';
import { expect } from 'e2e';

// A real, deterministic failure. Tagged so normal runs can exclude it, and
// included when exercising exit codes / Test Controls (item 7), re-run of
// failed tests (item 8), and the failed-test visual on TestDino.
test('reports a wrong remaining count (always fails)', { tags: ['failing'], session: 'admin', retries: 0 }, async ({ app, screen }) => {
  await app.open('/todos');
  await screen.getByLabel('New todo').fill('A task that will be mis-asserted');
  await screen.getByRole('button', 'Add').tap();
  // The app correctly shows "1 remaining"; this asserts the wrong value on purpose.
  await expect(screen.getByRole('status', 'Remaining')).toHaveText('99 remaining');
});
