// J-E2E-3 event creation and publication (spec e2e-smoke-tests § 4, UC15 and UC17).
import { expect, test } from '@playwright/test';
import { persona } from '../../support/personas.js';

const SLUG = 'demo-treteaux-du-quartier';

// `datetime-local` value two weeks after the run date, so the event stays in the future.
const inTwoWeeks = () => {
  const date = new Date(Date.now() + 14 * 24 * 3600e3);
  date.setHours(20, 0, 0, 0);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T20:00`;
};

test('J-E2E-3 an organizer creates, edits, previews and publishes an event shown on the agenda', async ({ page }) => {
  const title = `E2E soirée ${Date.now()}`;
  const claire = persona('claire');
  await page.goto('/signin');
  await page.getByLabel('Email').fill(claire.email);
  await page.getByLabel('Password').fill(claire.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/account$/);

  await page.goto(`/associations/${SLUG}/events`);
  await page.getByRole('link', { name: 'Create an event' }).click();
  await page.getByLabel('Title').fill(title);
  await page.getByLabel('Title').blur();
  await page.getByRole('radio', { name: 'Theatre' }).check();
  await page.getByLabel('Short description').fill('Une soirée de test de bout en bout.');
  await page.getByLabel('Short description').blur();
  await page.getByRole('button', { name: 'Next: When and where?' }).click();

  await page.getByLabel('Start').fill(inTwoWeeks());
  await page.getByLabel('Start').blur();
  await page.getByLabel('Venue').fill('Salle des fêtes');
  await page.getByLabel('Venue').blur();
  await page.getByLabel('City').fill('Lyon');
  await page.getByRole('list', { name: 'Cities found' }).getByRole('button', { name: /^Lyon \(/ }).click();
  await expect(page.getByText(/^City: Lyon Change$/)).toBeVisible();
  await page.getByRole('button', { name: 'Next: Look' }).click();

  await page.getByRole('radio', { name: 'Night' }).check();
  await page.getByRole('button', { name: 'Next: Preview' }).click();
  await expect(page.getByLabel('Desktop preview')).toContainText(title);
  await page.getByRole('button', { name: 'Publish' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Publish' }).click();
  await expect(page.getByRole('region', { name: 'Published event' })).toBeVisible();

  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.goto('/');
  await expect(page.getByRole('region', { name: 'Upcoming events' }).getByRole('link', { name: new RegExp(`^${title},`) }))
    .toBeVisible();
});
