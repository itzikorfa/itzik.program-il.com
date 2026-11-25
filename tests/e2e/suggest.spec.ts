import { test, expect, type Page } from '@playwright/test';
import { signToken } from '../../functions/favorites/core.mjs';

// serve.mjs builds with PUBLIC_FAVORITES_API=https://api.test; each test fakes that API with page.route.
const API = 'https://api.test';
const now = () => Math.floor(Date.now() / 1000);

async function fakeApi(page: Page, route: string, status: number, body: unknown) {
  const calls: any[] = [];
  await page.route(`${API}${route}`, async (r) => {
    calls.push(r.request().postDataJSON());
    await r.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  });
  return calls;
}

async function fill(page: Page) {
  await page.getByLabel('Link', { exact: true }).fill('https://github.com/withastro/astro');
  await page.getByLabel('Title', { exact: true }).fill('Astro');
  await page.getByLabel(/Why/).fill('Fast static sites');
  await page.getByLabel(/Your name/).fill('Dana');
  await page.getByLabel('Your email').fill('dana@example.com');
}

test.describe('suggest form', () => {
  test('sends the suggestion and tells the visitor to check their inbox', async ({ page }) => {
    const calls = await fakeApi(page, '/suggest', 202, { ok: true });
    await page.goto('/favorites/suggest/');
    await fill(page);
    await page.getByRole('button', { name: /submit/i }).click();
    await expect(page.getByRole('status')).toContainText('Check your inbox');
    expect(calls).toEqual([{ url: 'https://github.com/withastro/astro', title: 'Astro', why: 'Fast static sites', name: 'Dana', email: 'dana@example.com', website: '' }]);
  });

  test('shows the server field errors next to the fields', async ({ page }) => {
    await fakeApi(page, '/suggest', 400, { errors: { url: 'Only https:// links are accepted.', email: 'Enter a valid email address.' } });
    await page.goto('/favorites/suggest/');
    await fill(page);
    await page.getByRole('button', { name: /submit/i }).click();
    await expect(page.locator('[data-error-for="url"]')).toHaveText('Only https:// links are accepted.');
    await expect(page.locator('[data-error-for="email"]')).toHaveText('Enter a valid email address.');
    await expect(page.getByLabel('Link', { exact: true })).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByLabel('Link', { exact: true })).toBeFocused();
  });

  test('shows the rate-limit message', async ({ page }) => {
    await fakeApi(page, '/suggest', 429, { error: 'Too many suggestions right now. Please try again later.' });
    await page.goto('/favorites/suggest/');
    await fill(page);
    await page.getByRole('button', { name: /submit/i }).click();
    await expect(page.getByRole('status')).toContainText('Too many suggestions');
    await expect(page.getByRole('button', { name: /submit/i })).toBeEnabled();
  });

  test('explains a network failure', async ({ page }) => {
    await page.route(`${API}/suggest`, (r) => r.abort());
    await page.goto('/favorites/suggest/');
    await fill(page);
    await page.getByRole('button', { name: /submit/i }).click();
    await expect(page.getByRole('status')).toContainText("Couldn't reach the server");
  });

  test('has the privacy note and a hidden trap field', async ({ page }) => {
    await page.goto('/favorites/suggest/');
    await expect(page.locator('body')).toContainText('only used to send one confirmation link');
    await expect(page.locator('input[name="website"]')).not.toBeInViewport();
    await expect(page.locator('.hp')).toHaveAttribute('aria-hidden', 'true');
    await expect(page.locator('input[name="website"]')).toHaveAttribute('tabindex', '-1');
  });
});

test.describe('confirm page', () => {
  const token = () => signToken({ url: 'https://astro.build/', title: 'Astro <b>x</b>', why: 'Fast', name: 'Dana', kind: 'site' }, 'any-secret-for-display-only', now());

  test('shows the suggestion as text and confirms on click', async ({ page }) => {
    const calls = await fakeApi(page, '/confirm', 201, { status: 'created' });
    const t = token();
    await page.goto(`/favorites/confirm/#${t}`);
    await expect(page.locator('#confirm-title')).toHaveText('Astro <b>x</b>');
    await expect(page.locator('main a[href="https://astro.build/"]')).toHaveCount(0); // unreviewed link is not clickable
    expect(calls).toHaveLength(0); // nothing happens until the visitor clicks
    await page.getByRole('button', { name: /confirm/i }).click();
    await expect(page.getByRole('status')).toContainText('Thanks');
    expect(calls).toEqual([{ token: t }]);
    expect(page.url()).not.toContain(t.slice(0, 20)); // token removed from the address bar
  });

  test('says when it was already confirmed', async ({ page }) => {
    await fakeApi(page, '/confirm', 200, { status: 'already' });
    await page.goto(`/favorites/confirm/#${token()}`);
    await page.getByRole('button', { name: /confirm/i }).click();
    await expect(page.getByRole('status')).toContainText('already confirmed');
  });

  test('shows the expired message with a way to start again', async ({ page }) => {
    await fakeApi(page, '/confirm', 410, { error: 'This link has expired. Please suggest the link again.' });
    await page.goto(`/favorites/confirm/#${token()}`);
    await page.getByRole('button', { name: /confirm/i }).click();
    await expect(page.getByRole('status')).toContainText('expired');
    await expect(page.locator('a[href="/favorites/suggest/"]').first()).toBeVisible();
  });

  test('handles a missing or broken token without calling the API', async ({ page }) => {
    const calls = await fakeApi(page, '/confirm', 201, { status: 'created' });
    for (const hash of ['', '#garbage', '#a.b']) {
      await page.goto(`/favorites/confirm/${hash}`);
      await expect(page.getByRole('status')).toContainText('link looks broken');
      await expect(page.getByRole('button', { name: /confirm/i })).toHaveCount(0);
    }
    expect(calls).toHaveLength(0);
  });

  test('is not indexed by search engines', async ({ page }) => {
    await page.goto('/favorites/confirm/');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  });
});
