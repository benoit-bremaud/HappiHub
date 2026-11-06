// J-E2E-4 public agenda as a visitor (spec e2e-smoke-tests § 4, UC21) on the #251 demo data.
import { expect, test } from '@playwright/test';

test('J-E2E-4 a visitor browses the agenda, never sees drafts or hidden events, and opens an event', async ({ page }) => {
  await page.goto('/');
  const agenda = page.getByRole('region', { name: 'Upcoming events' });
  const card = agenda.getByRole('link', { name: /^Le Malade imaginaire,/ });
  await expect(card).toBeVisible();
  await expect(agenda.getByRole('link', { name: /^Brouillon minimal/ })).toHaveCount(0);
  await expect(agenda.getByRole('link', { name: /^Spectacle masqué par la modération/ })).toHaveCount(0);

  await card.click();
  await expect(page).toHaveURL(/\/events\/[^/]+$/);
  await expect(page.getByText('Le Malade imaginaire').first()).toBeVisible();
});
