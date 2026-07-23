import { test, expect } from '@playwright/test';

test.describe('Authentication smoke', () => {
  test('redirects unauthenticated users to sign in', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/auth\/sign-in/);
  });

  test('sign in page renders', async ({ page }) => {
    await page.goto('/auth/sign-in', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('form')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Big Bull Car Spa')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
  });

  test('sign up page renders', async ({ page }) => {
    await page.goto('/auth/sign-up');
    await expect(page.getByText('Create your account')).toBeVisible();
  });
});
