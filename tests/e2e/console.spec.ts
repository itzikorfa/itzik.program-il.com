import { test, expect, type Page } from '@playwright/test';

const input = (page: Page) => page.getByRole('textbox', { name: 'Type a command' });
const output = (page: Page) => page.getByRole('log', { name: 'Console output' });

/** Opens the console if it is folded (phones start folded), then runs a command. */
async function run(page: Page, cmd: string) {
  const bar = page.getByRole('button', { name: /open the console/i });
  if (await bar.isVisible()) await bar.click();
  await input(page).fill(cmd);
  await input(page).press('Enter');
}

test('the old window title bar is gone', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.titlebar')).toHaveCount(0);
});

test('help lists the commands', async ({ page }) => {
  await page.goto('/');
  await run(page, 'help');
  await expect(output(page)).toContainText('available commands');
  await expect(output(page)).toContainText('itzik@program-il:~$ help');
  await expect(input(page)).toHaveValue('');
});

test('section commands scroll to the section', async ({ page }) => {
  await page.goto('/');
  await run(page, 'favorites');
  await expect(page.locator('#favorites')).toBeInViewport();
  await expect(page).toHaveURL(/#favorites$/);
});

test('cat opens a published post; drafts stay hidden', async ({ page }) => {
  await page.goto('/');
  await run(page, 'cat draft-post');
  await expect(output(page)).toContainText('no such post');
  await run(page, 'cat hello-world');
  await expect(page).toHaveURL(/\/blog\/hello-world\/$/);
});

test('ls blog/ lists posts as links, without drafts', async ({ page }) => {
  await page.goto('/');
  await run(page, 'ls blog/');
  await expect(output(page).locator('a[href="/blog/hello-world/"]')).toBeVisible();
  await expect(output(page)).not.toContainText('draft-post');
});

test('Tab completes and arrow up recalls history', async ({ page }) => {
  await page.goto('/');
  await run(page, 'whoami');
  await input(page).fill('cat hel');
  await input(page).press('Tab');
  await expect(input(page)).toHaveValue('cat hello-world');
  await input(page).fill('');
  await input(page).press('ArrowUp');
  await expect(input(page)).toHaveValue('whoami');
});

test('typed text is shown as text, never as HTML', async ({ page }) => {
  await page.goto('/');
  await run(page, 'echo <img src=x onerror=alert(1)>');
  await expect(output(page)).toContainText('<img src=x onerror=alert(1)>');
  await expect(output(page).locator('img')).toHaveCount(0);
});

test('unknown commands explain what to do', async ({ page }) => {
  await page.goto('/');
  await run(page, 'hack');
  await expect(output(page)).toContainText('command not found: hack. type help');
});

test('clear empties the output', async ({ page }) => {
  await page.goto('/');
  await run(page, 'help');
  await run(page, 'clear');
  await expect(output(page)).not.toContainText('available commands');
});

test('works on other pages too: cd ~ goes home', async ({ page }) => {
  await page.goto('/about/');
  await run(page, 'cd ~');
  await expect(page).toHaveURL(/\/$/);
});

test('history survives moving between pages', async ({ page }) => {
  await page.goto('/');
  await run(page, 'cat hello-world');
  await expect(page).toHaveURL(/hello-world/);
  const bar = page.getByRole('button', { name: /open the console/i });
  if (await bar.isVisible()) await bar.click();
  await input(page).press('ArrowUp');
  await expect(input(page)).toHaveValue('cat hello-world');
});

test('open github opens a new tab', async ({ page, context }) => {
  await page.goto('/');
  await page.route('https://github.com/**', (r) => r.fulfill({ status: 200, body: 'ok' }));
  const [tab] = await Promise.all([context.waitForEvent('page'), run(page, 'open github')]);
  expect(tab.url()).toBe('https://github.com/itzikorfa');
});

test('no sideways scrolling with the console open', async ({ page }) => {
  await page.goto('/');
  await run(page, 'ls blog/');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test.describe('desktop', () => {
  test.skip(({ isMobile }) => isMobile, 'desktop only');
  test('console is open at the bottom of the screen', async ({ page }) => {
    await page.goto('/');
    await expect(input(page)).toBeVisible();
    await expect(input(page)).toBeInViewport();
  });
  test('can be folded away, and stays folded after a reload', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /close the console/i }).click();
    await expect(input(page)).toBeHidden();
    await page.reload();
    await expect(input(page)).toBeHidden();
    await expect(page.getByRole('button', { name: /open the console/i })).toBeVisible();
  });
});

test.describe('phones', () => {
  test.skip(({ isMobile }) => !isMobile, 'phones only');
  test('starts as a small bar and opens on tap', async ({ page }) => {
    await page.goto('/');
    const bar = page.getByRole('button', { name: /open the console/i });
    await expect(bar).toBeVisible();
    await expect(bar).toHaveAttribute('aria-expanded', 'false');
    await expect(input(page)).toBeHidden();
    const box = (await bar.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeLessThanOrEqual(64);
    await bar.click();
    await expect(input(page)).toBeVisible();
    await expect(page.getByRole('button', { name: /close the console/i })).toHaveAttribute('aria-expanded', 'true');
  });
  test('tap-to-run buttons run commands', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /open the console/i }).click();
    await page.locator('.console-chips').getByRole('button', { name: 'whoami', exact: true }).click();
    await expect(output(page)).toContainText('Senior Software Developer');
  });
  test('the open console leaves room for the page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /open the console/i }).click();
    const h = await page.locator('.console').evaluate((el) => el.getBoundingClientRect().height);
    const vh = page.viewportSize()!.height;
    expect(h).toBeLessThanOrEqual(vh * 0.6);
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('the console stays hidden and the site works as before', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.console')).toBeHidden();
    await expect(page.locator('#projects')).toBeVisible();
  });
});
