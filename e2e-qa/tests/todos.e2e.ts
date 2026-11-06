import { test } from '@e2e-dev/web';
import { expect } from 'e2e';

// Real interactions against the todo app, behind the restored admin session.
test.describe('todos', { tags: ['todos'], session: 'admin' }, () => {
  test.beforeEach(async ({ app }) => {
    await app.open('/todos');
  });

  test('adds todos and tracks the remaining count', async ({ screen }) => {
    await expect(screen.getByRole('status', 'Remaining')).toHaveText('0 remaining');

    await screen.getByLabel('New todo').fill('Write the release notes');
    await screen.getByRole('button', 'Add').tap();
    await expect(screen.getByRole('listitem')).toHaveCount(1);
    await expect(screen.getByRole('status', 'Remaining')).toHaveText('1 remaining');

    await screen.getByLabel('New todo').fill('Ship the e2e reporter');
    await screen.getByRole('button', 'Add').tap();
    await expect(screen.getByRole('listitem')).toHaveCount(2);
    await expect(screen.getByRole('status', 'Remaining')).toHaveText('2 remaining');
  });

  test('completing a todo lowers the remaining count', async ({ screen }) => {
    await screen.getByLabel('New todo').fill('Review the PR');
    await screen.getByRole('button', 'Add').tap();
    await expect(screen.getByRole('status', 'Remaining')).toHaveText('1 remaining');

    await screen.getByRole('checkbox', 'Complete Review the PR').check();
    await expect(screen.getByRole('status', 'Remaining')).toHaveText('0 remaining');
  });

  test('ignores an empty submission', async ({ screen }) => {
    await screen.getByRole('button', 'Add').tap();
    await expect(screen.getByRole('listitem')).toHaveCount(0);
    await expect(screen.getByRole('status', 'Remaining')).toHaveText('0 remaining');
  });
});
