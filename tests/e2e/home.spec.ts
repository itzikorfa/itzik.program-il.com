import { test, expect } from '@playwright/test';
import { FORBIDDEN } from '../forbidden';

const SECTIONS = ['projects', 'blog', 'reading', 'favorites', 'contact'] as const;
const ABOUT_TEXT = 'Mentor to junior developers';

test('shows name and title', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveText('Yizhak (Itzik) Orfanian');
  await expect(page.locator('body')).toContainText('Senior Software Developer');
});

test('command bar jumps to sections', async ({ page }) => {
  await page.goto('/');
  for (const s of SECTIONS) {
    // Real pointer click: locator.click() scrolls the target itself, which cancels the page's smooth scroll.
    const link = page.locator('nav.commands').getByRole('link', { name: s, exact: true });
    // On phones the command row swipes sideways: bring the command into the row's view first, like a swipe.
    await link.evaluate((el) => { const nav = el.parentElement!; nav.scrollLeft = el.offsetLeft - nav.offsetLeft - 8; });
    const box = (await link.boundingBox())!;
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page.locator(`#${s}`)).toBeInViewport();
  }
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('content visible without JS', async ({ page }) => {
    await page.goto('/');
    for (const s of ['whoami', ...SECTIONS]) await expect(page.locator(`#${s}`)).toBeVisible();
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
  await expect(page.locator('main a[href="/about/"]')).toBeAttached();
});

test('prompt has a space before the command', async ({ page }) => {
  await page.goto('/');
  const text = (await page.locator('#whoami-cmd').innerText()).replace(/\s+/g, ' ').trim();
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

test('ascii portrait is shown with a text description', async ({ page }) => {
  await page.goto('/');
  const portrait = page.locator('#whoami pre.portrait');
  await expect(portrait).toBeVisible();
  await expect(portrait).toHaveAttribute('role', 'img');
  await expect(portrait).toHaveAttribute('aria-label', /ASCII portrait of Yizhak \(Itzik\) Orfanian/);
  const box = (await portrait.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width); // fully on screen, no clipping
});

test('name is visible before scrolling on phones', async ({ page }, info) => {
  test.skip(!['iphone', 'pixel', 'small'].includes(info.project.name));
  await page.goto('/');
  const h1 = (await page.locator('h1').boundingBox())!;
  expect(h1.y + h1.height).toBeLessThanOrEqual(page.viewportSize()!.height * 0.5);
});

test('portrait text is not merged by font ligatures', async ({ page }) => {
  await page.goto('/');
  const lig = await page.locator('pre.portrait').evaluate((el) => getComputedStyle(el).fontVariantLigatures);
  expect(lig).toBe('none');
});

test('share preview image', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', 'https://itzik.program-il.com/og.png');
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
  const res = await request.get('/og.png');
  expect(res.status()).toBe(200);
});

test('about text lives on /about/, not the home page', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('body')).not.toContainText(ABOUT_TEXT);
  await page.locator('nav.commands').getByRole('link', { name: 'about', exact: true }).click();
  await expect(page).toHaveURL(/\/about\/$/);
  await expect(page.locator('h1')).toHaveText('Yizhak (Itzik) Orfanian');
  for (const t of ['10 years at Check Point', 'LangFlow', ABOUT_TEXT, 'experience/', 'education/', 'skills.json', 'certifications'])
    await expect(page.locator('main')).toContainText(t);
});

test('portrait is compact on desktop', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  await page.goto('/');
  const box = (await page.locator('pre.portrait').boundingBox())!;
  expect(box.width).toBeLessThanOrEqual(170);
  expect(box.height).toBeLessThanOrEqual(300);
});

test('portrait decodes into place on load', async ({ page }) => {
  await page.goto('/');
  const portrait = page.locator('pre.portrait');
  const final = await portrait.getAttribute('data-final-length');
  await expect(portrait).toHaveAttribute('data-animated', 'done', { timeout: 4000 });
  const text = await portrait.textContent();
  expect(String(text!.length)).toBe(final);
  expect(text).toContain('@');
});

test.describe('portrait with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('portrait is static', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('pre.portrait')).not.toHaveAttribute('data-animated', /.+/);
  });
});

test('on phones the portrait is a small picture beside the name', async ({ page }, info) => {
  test.skip(!['iphone', 'pixel', 'small'].includes(info.project.name));
  await page.goto('/');
  const portrait = (await page.locator('pre.portrait').boundingBox())!;
  const h1 = (await page.locator('h1').boundingBox())!;
  const firstContact = (await page.locator('#whoami .contact-links a').first().boundingBox())!;
  expect(portrait.width).toBeLessThanOrEqual(130);
  expect(portrait.height).toBeLessThanOrEqual(230);
  expect(portrait.x + portrait.width).toBeLessThanOrEqual(h1.x + 1); // left of the name
  expect(firstContact.y).toBeGreaterThanOrEqual(portrait.y + portrait.height - 1); // contacts below it
});
