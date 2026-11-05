import process from 'node:process';
import { existsSync } from 'node:fs';
import type { E2EConfig } from 'e2e';
import { web } from '@e2e-dev/web';
import { testdino } from '@testdino/e2e';

// The runner loads no .env itself; workers re-import this config, so load it here.
if (existsSync('.env')) process.loadEnvFile('.env');

const adminPassword = process.env.ADMIN_PASSWORD ?? 'secret123';

// One app declaration, launched by the runner and shared by both targets.
const app = {
  url: 'http://127.0.0.1:0',
  environment: 'staging' as const,
  command: {
    executable: 'node',
    args: ['app/server.mjs'],
    env: {
      PORT: '{port}',
      ADMIN_EMAIL: 'admin@example.test',
      ADMIN_PASSWORD: adminPassword,
    },
    log: '.e2e/logs/app.log',
  },
};

export default {
  tests: 'tests/**/*.e2e.ts',
  retries: 1,
  trace: 'retain-on-failure',
  video: 'retain-on-failure',
  targets: [
    { name: 'desktop-chromium', engine: web(), app },
    {
      name: 'mobile-webkit',
      engine: web({ browser: 'webkit', viewport: { width: 390, height: 844 } }),
      app,
    },
  ],
  credentials: {
    admin: { username: 'admin@example.test', password: adminPassword },
  },
  reporters: [
    'list',
    testdino({
      token: process.env.TESTDINO_TOKEN,
      serverUrl: process.env.TESTDINO_SERVER_URL,
      tags: ['tdv2-1133-qa'],
    }),
  ],
} satisfies E2EConfig;
