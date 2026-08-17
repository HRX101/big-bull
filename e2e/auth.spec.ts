import { test, expect } from '@playwright/test';

test.describe('Authentication smoke', () => {
  test('redirects unauthenticated users to sign in', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/auth\/sign-in/);
  });

  test('sign in page renders', async ({ page }) => {
    await page.goto('/auth/sign-in');
    const form = page.locator('form');

    await expect(page.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible();
    await expect(form.locator('#email')).toBeVisible();
    await expect(form.locator('#password')).toBeVisible();
    await expect(form.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test('sign up page renders', async ({ page }) => {
    await page.goto('/auth/sign-up');
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
  });
});
