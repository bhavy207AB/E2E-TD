import { test } from '@e2e-dev/web';
import { expect, credentials } from 'e2e';

// Sign in once per target and save the session other tests restore.
test.setup('authenticate as admin', { sessions: ['admin'] }, async ({ app, screen, browser, session }) => {
  const admin = credentials.user('admin');
  await app.open('/login');
  await screen.getByLabel('Email').fill(admin.username);
  await screen.getByLabel('Password').fill(admin.password);
  await screen.getByRole('button', 'Sign in').tap();

  // Prove the sign-in landed before saving the state.
  await expect(browser).toHaveURL('/dashboard');
  await expect(screen.getByRole('heading', 'Dashboard')).toBeVisible();
  await session.save('admin');
});
