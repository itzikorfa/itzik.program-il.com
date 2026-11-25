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

test('projects empty state', async ({ page }) => {
  // e2e builds run with GITHUB_API_OFFLINE=1 and the committed (empty) snapshot.
  await page.goto('/');
  await expect(page.locator('#projects')).toContainText('no projects tagged yet');
  await expect(page.locator('#projects')).not.toContainText('null');
  await expect(page.locator('#projects')).not.toContainText('undefined');
});

test('reading renders items', async ({ page }) => {
  // e2e builds swap in tests/fixtures/reading.yaml (2 items, one with very long strings).
  await page.goto('/');
  const items = page.locator('#reading li');
  await expect(items).toHaveCount(2);
  await expect(items.first()).toContainText('2026-11-20'); // newest first
  const link = page.locator('#reading a', { hasText: 'Short and sweet' });
  await expect(link).toHaveAttribute('href', 'https://example.com/short');
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', /noopener/);
  await expect(page.locator('#reading')).toContainText('A short note.');
});

test('404 page', async ({ page }) => {
  const res = await page.goto('/nope/');
  expect(res!.status()).toBe(404);
  await expect(page.locator('.notfound')).toContainText('command not found: nope');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  for (const s of SECTIONS) await expect(page.locator(`main a[href="/#${s}"]`)).toBeAttached();
});

test('prompt has a space before the command', async ({ page }) => {
  await page.goto('/');
  const text = (await page.locator('#about-cmd').innerText()).replace(/\s+/g, ' ').trim();
  expect(text).toMatch(/\$ whoami$/);
});

test('mobile command bar is one compact row', async ({ page }, info) => {
  test.skip(!['iphone', 'pixel', 'small'].includes(info.project.name));
  await page.goto('/');
  const nav = (await page.locator('nav.commands').boundingBox())!;
  expect(nav.height).toBeLessThanOrEqual(64);
});

test('canonical address is itzik.program-il.com', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://itzik.program-il.com/');
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', 'https://itzik.program-il.com/');
});
