import { test as setup, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const STORAGE_STATE = '.auth/state.json';

/**
 * The single shared setup test.
 *
 * This is the test that makes TDV2-1138 reproduce: it lives in the `setup`
 * project, every test in the `chromium` project depends on it, so Playwright
 * runs it once PER shard process. Seed a known TodoMVC state and persist it as
 * storage state for the dependent tests — a real setup step, not a no-op.
 */
setup('seed todo state', async ({ page }) => {
  await page.goto('/todomvc');

  const newTodo = page.getByPlaceholder('What needs to be done?');
  for (const item of ['buy milk', 'walk the dog', 'ship TDV2-1138 fix']) {
    await newTodo.fill(item);
    await newTodo.press('Enter');
  }

  // Confirm the seed actually took before persisting it.
  await expect(page.getByTestId('todo-title')).toHaveCount(3);

  fs.mkdirSync(path.dirname(STORAGE_STATE), { recursive: true });
  await page.context().storageState({ path: STORAGE_STATE });
});
