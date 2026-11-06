// Smoke suite S1–S2 (spec e2e-smoke-tests § 7): the production bundle and the API answer.
import { expect, test } from '@playwright/test';
import { API_URL, WEB_URL } from '../support/paths.js';

// The session endpoint issues the CSRF token, so it answers only the configured web origin.
test('S1 the API session endpoint answers anonymously', async ({ request }) => {
  const response = await request.get(`${API_URL}/api/session`, { headers: { Origin: WEB_URL } });
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('application/json');
});

// Uncaught script errors fail the check; transient resource errors (Chromium reports
// net::ERR_NETWORK_CHANGED while Docker adds interfaces) are covered by the API response check.
test('S2 the home page renders the production bundle and reaches the API', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const agenda = page.waitForResponse((response) => response.url().startsWith(`${API_URL}/api/`)
    && response.request().method() === 'GET' && response.url().includes('/events'));
  const response = await page.goto('/');
  expect(response.status()).toBe(200);
  expect((await agenda).status()).toBe(200);
  await expect(page.getByRole('link', { name: 'HappiHub' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
  expect(errors).toEqual([]);
});
