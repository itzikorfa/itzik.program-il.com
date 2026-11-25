import { test, expect } from '@playwright/test';
import { FORBIDDEN } from '../forbidden';

test('llms.txt', async ({ request }) => {
  const res = await request.get('/llms.txt');
  expect(res.status()).toBe(200);
  const txt = await res.text();
  expect(txt.startsWith('# Yizhak (Itzik) Orfanian\n')).toBe(true);
  expect(txt).toMatch(/^> .+/m);
  expect(txt).toContain('## Blog');
  expect(txt).toContain('https://itzik.program-il.com/blog/hello-world.md');
  expect(txt).toContain('## Projects');
  expect(txt).toContain('## Links');
  expect(txt).toContain('https://www.linkedin.com/in/oitzik/');
  expect(txt).toContain('https://github.com/itzikorfa');
  expect(txt).not.toContain('draft-post');
  for (const re of FORBIDDEN) expect(txt).not.toMatch(re);
});

test('llms-full.txt', async ({ request }) => {
  const txt = await (await request.get('/llms-full.txt')).text();
  expect(txt).toContain('This is where I write about cloud security');
  expect(txt).not.toContain('This draft must not appear');
  for (const re of FORBIDDEN) expect(txt).not.toMatch(re);
});

test('robots.txt served', async ({ request }) => {
  const txt = await (await request.get('/robots.txt')).text();
  expect(txt).toContain('User-agent: GPTBot');
  expect(txt).toContain('Disallow: /admin/');
});
