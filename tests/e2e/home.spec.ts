import { test, expect } from '@playwright/test';
import { FORBIDDEN } from '../forbidden';

const SECTIONS = ['about', 'projects', 'blog', 'reading', 'contact'] as const;

test('shows name and title', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveText('Yizhak (Itzik) Orfanian');
  await expect(page.locator('body')).toContainText('Senior Software Developer');
});

test('command bar jumps to sections', async ({ page }) => {
  await page.goto('/');
  for (const s of SECTIONS) {
    // Real pointer click: locator.click() scrolls the target itself, which cancels the page's smooth scroll.
    const box = (await page.locator('nav.commands').getByRole('link', { name: s, exact: true }).boundingBox())!;
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page.locator(`#${s}`)).toBeInViewport();
  }
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('content visible without JS', async ({ page }) => {
    await page.goto('/');
    for (const s of SECTIONS) await expect(page.locator(`#${s}`)).toBeVisible();
  });
});

test('no private data', async ({ page }) => {
  await page.goto('/');
  const html = await page.content();
  for (const re of FORBIDDEN) expect(html).not.toMatch(re);
  await expect(page.locator('a[href="mailto:hi@program-il.com"]').first()).toBeAttached();
});

test('contact links', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('a[href="https://www.linkedin.com/in/oitzik/"]').first()).toBeAttached();
  await expect(page.locator('a[href="https://github.com/itzikorfa"]').first()).toBeAttached();
});

test('no horizontal scroll at 360px', async ({ page }, info) => {
  test.skip(info.project.name !== 'small');
  await page.goto('/');
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(360);
});

test('tap targets', async ({ page }, info) => {
  test.skip(info.project.name !== 'iphone');
  await page.goto('/');
  const targets = page.locator('nav.commands a, .contact-links a');
  const n = await targets.count();
  expect(n).toBeGreaterThanOrEqual(8);
  for (let i = 0; i < n; i++) {
    const box = await targets.nth(i).boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('reduced motion skips typing', async ({ page }) => {
    await page.goto('/');
    await page.locator('nav.commands').getByRole('link', { name: 'blog', exact: true }).click();
    await expect(page.locator('#blog .cmd')).toHaveText('ls blog/', { timeout: 100 });
  });
});

test('Person JSON-LD', async ({ page }) => {
  await page.goto('/');
  const raw = await page.locator('script[type="application/ld+json"]').first().textContent();
  const data = JSON.parse(raw!);
  expect(data['@type']).toBe('Person');
  expect(data.name).toBe('Yizhak (Itzik) Orfanian');
  expect(data.jobTitle).toBe('Senior Software Developer');
  expect(data.worksFor.name).toBe('Check Point Software Technologies');
  expect(data.sameAs).toEqual(
    expect.arrayContaining(['https://www.linkedin.com/in/oitzik/', 'https://github.com/itzikorfa']),
  );
});
