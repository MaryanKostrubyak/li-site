import { expect, test } from '@playwright/test';

test('public pages present Aether Clinic without demo language', async ({ page }) => {
  for (const path of ['/', '/services', '/doctors', '/doctors/amelia-smith', '/book', '/login', '/contact']) {
    await page.goto(path);
    await expect(page.locator('body')).not.toContainText(/\b(demo|fictional|portfolio)\b/i);
  }
});
