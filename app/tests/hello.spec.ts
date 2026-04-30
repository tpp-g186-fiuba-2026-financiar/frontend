import { test, expect } from '@playwright/test';

test('shows welcome message', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await expect(page.getByText('Welcome!')).toBeVisible();
});

test('shows message from API', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await expect(page.getByText('Hello from Financiar backend!')).toBeVisible();
});