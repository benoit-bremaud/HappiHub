// J-E2E-1 sign-up with email verification and J-E2E-2 sign-in / sign-out (spec e2e-smoke-tests § 4).
import { randomBytes } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { waitForMailLink } from '../../support/mailLog.js';
import { persona } from '../../support/personas.js';

const signIn = async (page, { email, password }) => {
  await page.goto('/signin');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
};

test('J-E2E-1 a new organizer signs up, verifies the email and signs in', async ({ page }) => {
  const email = `e2e-${Date.now()}@demo.example.com`;
  const password = randomBytes(18).toString('base64url');
  await page.goto('/signup');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByLabel('Association name').fill(`Demo E2E ${Date.now()}`);
  await page.getByRole('button', { name: 'Create my association' }).click();
  await expect(page.getByRole('status')).toBeVisible();

  await page.goto(await waitForMailLink('VERIFY', email));
  await expect(page.getByRole('status')).toHaveText('Your email address is verified.');

  await signIn(page, { email, password });
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
});

test('J-E2E-2 a seeded organizer is refused with a wrong password, then signs in and out', async ({ page }) => {
  const claire = persona('claire');
  await signIn(page, { email: claire.email, password: `${claire.password}-wrong` });
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page).toHaveURL(/\/signin$/);

  await signIn(page, claire);
  await expect(page).toHaveURL(/\/account$/);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
});
