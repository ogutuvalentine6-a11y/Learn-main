import { test, expect } from '@playwright/test';

test.describe('Public pages (no auth)', () => {
  test('homepage renders hero, founder, footer', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText(/Learn Without Limits/i);
    await expect(page.getByText('Valentine Otieno Ogutu').first()).toBeVisible();
    await page.locator('footer').scrollIntoViewIfNeeded();
    await expect(page.locator('footer')).toContainText('Valentine Otieno Ogutu');
    await expect(page.locator('footer')).toContainText('Software Engineer');
    await expect(page.locator('footer')).toContainText('ogutuvalentine6-a11y');
  });

  test('public reels feed is accessible without login', async ({ page }) => {
    await page.goto('/reels');
    expect(page.url()).toContain('/reels');
    await expect(page.getByText(/Educational Reels/i)).toBeVisible();
    await expect(page.getByText(/Not authenticated/i)).toHaveCount(0);
  });

  test('public resources library is accessible without login', async ({ page }) => {
    await page.goto('/resources');
    expect(page.url()).toContain('/resources');
    await expect(page.getByText(/Resource Library/i)).toBeVisible();
    await expect(page.getByText(/Upload a resource/i)).toHaveCount(0);
  });
});
