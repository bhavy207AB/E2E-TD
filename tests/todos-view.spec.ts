import { test, expect } from '@playwright/test';

// Dependent project tests — they run against the state seeded by the shared
// setup test (tests/auth.setup.ts). 2 of the 4 tests the run must account for.

test.beforeEach(async ({ page }) => {
  await page.goto('/todomvc');
});

test('shows the three seeded todos', async ({ page }) => {
  await expect(page.getByTestId('todo-title')).toHaveText([
    'buy milk',
    'walk the dog',
    'ship TDV2-1138 fix',
  ]);
});

test('counter reflects the seeded open items', async ({ page }) => {
  await expect(page.locator('.todo-count')).toHaveText('3 items left');
});
