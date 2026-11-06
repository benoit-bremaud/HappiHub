// E2E and smoke suites on the local production build (spec: docs/architecture/specs/e2e-smoke-tests.md).
import { defineConfig, devices } from '@playwright/test';
import { WEB_URL } from './support/paths.js';

export const config = defineConfig({
  testDir: './tests',
  globalSetup: './globalSetup.js',
  // One worker: the journeys share one database and the sign-in rate limits (spec § 4).
  workers: 1,
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  reporter: [['list']],
  timeout: 60_000,
  use: { baseURL: WEB_URL, trace: 'retain-on-failure', ...devices['Desktop Chrome'] },
  projects: [
    { name: 'smoke', testMatch: 'smoke.spec.js' },
    { name: 'e2e', testMatch: 'journeys/*.spec.js', dependencies: ['smoke'] },
  ],
});

// Playwright reads the configuration from the default export only.
export default config;
