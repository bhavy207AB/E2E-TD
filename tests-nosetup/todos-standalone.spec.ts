import { test, expect } from '@playwright/test';

// Control suite: the same four behaviours, but each test seeds its own state in
// beforeEach. There is no shared setup test, so sharding this suite must always
// read Passed — this is the "sharded run with no shared test" control.

test.beforeEach(async ({ page }) => {
  await page.goto('/todomvc');
  const newTodo = page.getByPlaceholder('What needs to be done?');
  for (const item of ['buy milk', 'walk the dog', 'ship TDV2-1138 fix']) {
    await newTodo.fill(item);
    await newTodo.press('Enter');
  }
  await expect(page.getByTestId('todo-title')).toHaveCount(3);
});

test('shows the three todos', async ({ page }) => {
  await expect(page.getByTestId('todo-title')).toHaveText([
    'buy milk',
    'walk the dog',
    'ship TDV2-1138 fix',
  ]);
});

test('counter reflects open items', async ({ page }) => {
  await expect(page.locator('.todo-count')).toHaveText('3 items left');
});

test('can add a todo', async ({ page }) => {
  const newTodo = page.getByPlaceholder('What needs to be done?');
  await newTodo.fill('review the PR');
  await newTodo.press('Enter');
  await expect(page.getByTestId('todo-title')).toHaveCount(4);
});

test('can complete a todo', async ({ page }) => {
  const first = page.getByRole('listitem').filter({ hasText: 'buy milk' });
  await first.getByRole('checkbox').check();
  await expect(first).toHaveClass(/completed/);
  await expect(page.locator('.todo-count')).toHaveText('2 items left');
});
