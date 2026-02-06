import { defineConfig, devices } from '@playwright/test';

import { resolveApiBaseUrl, resolveWebBaseUrl } from './e2e/helpers/api';
import { resolveDatabaseUrl } from './e2e/helpers/db-seed';

const isCi = Boolean(process.env.CI);
const webBaseUrl = resolveWebBaseUrl();
const apiBaseUrl = resolveApiBaseUrl();
const databaseUrl = resolveDatabaseUrl();

export default defineConfig({
  testDir: './e2e',
  testMatch: ['**/*.spec.ts'],
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 2 : 0,
  workers: isCi ? 2 : 4,
  reporter: [['list'], ['html', { open: 'never' }]],
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  use: {
    baseURL: webBaseUrl,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
      },
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
      },
    },
  ],
  webServer: [
    {
      command: 'pnpm --filter @the-dmz/api dev',
      url: `${apiBaseUrl}/health`,
      timeout: 120_000,
      reuseExistingServer: !isCi,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        DATABASE_URL: databaseUrl,
        REDIS_URL: process.env.REDIS_URL ?? 'redis://127.0.0.1:6379',
      },
    },
    {
      command: 'pnpm --filter @the-dmz/web dev --host 127.0.0.1 --port 5173 --strictPort',
      url: webBaseUrl,
      timeout: 120_000,
      reuseExistingServer: !isCi,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        VITE_API_URL: apiBaseUrl,
      },
    },
  ],
});
