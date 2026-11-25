import { test, expect } from '@playwright/test';

// e2e builds copy tests/fixtures/favorites/*.yaml into src/content/favorites/.
test('favorites are listed newest first with kind, why and credit', async ({ page }) => {
  await page.goto('/');
  const items = page.locator('#favorites li');
  await expect(items).toHaveCount(3);
  await expect(items.nth(0)).toContainText('Newest, same day');
  await expect(items.nth(1)).toContainText('Astro');
  await expect(items.nth(2)).toContainText('Oldest site');
  await expect(items.nth(1)).toContainText('[repo]');
  await expect(items.nth(0)).toContainText('[site]');
  await expect(items.nth(1)).toContainText('suggested by Dana');
  await expect(items.nth(0)).not.toContainText('suggested by');
  await expect(items.nth(1)).toContainText('2026-11-25');
});

test('favorite text is escaped and links open safely', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#favorites b')).toHaveCount(0);
  await expect(page.locator('#favorites')).toContainText('<b>bold?</b>');
  const a = page.locator('#favorites a', { hasText: 'Astro' });
  await expect(a).toHaveAttribute('href', 'https://github.com/withastro/astro');
  await expect(a).toHaveAttribute('rel', /noopener/);
});

test('favorites has a suggest link', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#favorites a[href="/favorites/suggest/"]')).toBeVisible();
});

test('long favorites do not make the page scroll sideways', async ({ page }) => {
  await page.goto('/');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('llms.txt lists favorites', async ({ request }) => {
  const txt = await (await request.get('/llms.txt')).text();
  expect(txt).toContain('[Astro](https://github.com/withastro/astro): favorite repo. Fast static sites');
});
