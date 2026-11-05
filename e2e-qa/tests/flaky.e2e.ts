import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { existsSync, writeFileSync, rmSync } from 'node:fs';
import { test } from '@e2e-dev/web';
import { expect } from 'e2e';

// A genuine flaky result: the first attempt fails, the retry passes, so the
// run ends Passed/Flaky (item 2). The marker is keyed by viewport width so the
// two targets never race on it. retries:1 guarantees the second attempt runs.
test('is flaky then passes on retry', { tags: ['flaky'], retries: 1 }, async ({ app, browser, screen }) => {
  await app.open('/login');
  const width = await browser.evaluate(() => window.innerWidth);
  const marker = join(tmpdir(), `tdv2-1133-flaky-${width}`);

  await expect(screen.getByRole('heading', 'Sign in')).toBeVisible();

  if (existsSync(marker)) {
    rmSync(marker); // retry: clear and pass
  } else {
    writeFileSync(marker, '1'); // first attempt: fail
    throw new Error('Simulated flake: failing the first attempt on purpose');
  }
});
