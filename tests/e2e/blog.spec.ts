import { test, expect } from '@playwright/test';

test('post page renders', async ({ page }) => {
  await page.goto('/blog/hello-world/');
  await expect(page.locator('h1')).toHaveText('Hello, world');
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article');
  const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
  expect(ld['@type']).toBe('BlogPosting');
  expect(ld.author.name).toBe('Yizhak (Itzik) Orfanian');
  expect(ld.datePublished).toMatch(/^2026-11-25/);
});

test('home lists latest posts', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#blog a[href="/blog/hello-world/"]')).toBeVisible();
});

test('markdown twin', async ({ request }) => {
  const res = await request.get('/blog/hello-world.md');
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('text/markdown');
  expect(await res.text()).toMatch(/^# Hello, world\n/);
});

test('rss lists published posts', async ({ request }) => {
  const res = await request.get('/rss.xml');
  expect(res.status()).toBe(200);
  expect(await res.text()).toContain('Hello, world');
});

test('draft is not published', async ({ page, request }) => {
  expect((await request.get('/blog/draft-post/')).status()).toBe(404);
  expect((await request.get('/blog/draft-post.md')).status()).toBe(404);
  for (const path of ['/', '/rss.xml', '/sitemap-0.xml', '/llms.txt', '/llms-full.txt']) {
    expect(await (await request.get(path)).text(), path).not.toContain('draft-post');
  }
  await page.goto('/');
  await expect(page.locator('body')).not.toContainText('Unfinished thoughts');
});
