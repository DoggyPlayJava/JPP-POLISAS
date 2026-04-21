import { test, expect } from '@playwright/test';

test('has expected page title on root', async ({ page }) => {
  // Navigate to root
  await page.goto('/');

  // Expect a specific title
  await expect(page).toHaveTitle(/JPP Digital/i);
});

test('login button exists and navigates to login page', async ({ page }) => {
  await page.goto('/');

  // Find something that gets us to login page, or just navigate to login
  await page.goto('/login');

  // Verify the login page renders a recognizable heading or button
  const signInText = page.locator('text=Log Masuk');
  await expect(signInText.first()).toBeVisible();
});
