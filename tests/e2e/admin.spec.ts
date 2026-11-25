import { test, expect } from '@playwright/test';

test('admin page', async ({ request, page }) => {
  const res = await request.get('/admin/');
  expect(res.status()).toBe(200);
  const html = await res.text();
  expect(html).toContain('<meta name="robots" content="noindex, nofollow">');
  expect(html).toContain('name="viewport"');
  expect(html).toMatch(/@sveltia\/cms@\d+\.\d+\.\d+\/dist\/sveltia-cms\.js/);
  await page.goto('/');
  await expect(page.locator('a[href*="/admin"]')).toHaveCount(0);
});
