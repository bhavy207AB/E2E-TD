import { test, expect } from '@playwright/test';

// Dependent project tests — the remaining 2 of the 4 tests. Each starts from
// the seeded state and mutates its own isolated context, so they stay
// independent and deterministic (the repro needs every test to pass).

test.beforeEach(async ({ page }) => {
  await page.goto('/todomvc');
});

test('can add a todo on top of the seeded state', async ({ page }) => {
  const newTodo = page.getByPlaceholder('What needs to be done?');
  await newTodo.fill('review the PR');
  await newTodo.press('Enter');

  await expect(page.getByTestId('todo-title')).toHaveCount(4);
  await expect(page.locator('.todo-count')).toHaveText('4 items left');
});

test('can complete a seeded todo', async ({ page }) => {
  const first = page.getByRole('listitem').filter({ hasText: 'buy milk' });
  await first.getByRole('checkbox').check();

  await expect(first).toHaveClass(/completed/);
  await expect(page.locator('.todo-count')).toHaveText('2 items left');
});
