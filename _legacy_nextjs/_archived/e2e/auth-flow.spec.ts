import { test, expect } from '@playwright/test';

test.describe('Auth flow', () => {
  test('register, login, reach student dashboard', async ({ page }) => {
    const stamp = Date.now();
    const email = `e2e-${stamp}@example.com`;
    const idNumber = `E2E-${stamp}`;
    const fullName = 'E2E Test Student';
    const password = 'Passw0rd!';

    await page.goto('/register');

    await page.getByLabel('Full Name').fill(fullName);
    await page.getByLabel('ID Number').fill(idNumber);
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Phone').fill('+254700000000');
    await page.getByLabel('Location').fill('Nairobi');
    await page.getByLabel('School / Institution').fill('Test U');
    await page.getByLabel('Field of Study').fill('CS');
    await page.getByLabel('Course of Study').fill('BSc');
    await page.getByLabel('Password').fill(password);

    await page.getByRole('button', { name: 'Register' }).click();
    await page.waitForURL('**/login', { timeout: 15_000 });

    await page.getByPlaceholder('Email').fill(email);
    await page.getByPlaceholder('Password').fill(password);
    await page.getByRole('button', { name: 'Login' }).click();

    await page.waitForURL('**/student/dashboard', { timeout: 15_000 });
    await expect(page.getByText(`Welcome, ${fullName}`)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(email)).toBeVisible();
  });
});
