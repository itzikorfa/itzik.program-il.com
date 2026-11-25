// Builds the site with test fixtures swapped in, then serves dist/ like a static host.
import { execSync } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { copyFileSync, existsSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';

const swaps = [
  // [fixture, target] — target is restored after the build.
  ['tests/fixtures/blog/draft-post.md', 'src/content/blog/draft-post.md'],
  ['tests/fixtures/blog/long-lines.md', 'src/content/blog/long-lines.md'],
  ['tests/fixtures/reading.yaml', 'src/content/reading.yaml'],
].filter(([fixture]) => existsSync(fixture));

const backups = swaps.map(([, target]) => [target, existsSync(target) ? readFileSync(target) : null]);
try {
  for (const [fixture, target] of swaps) copyFileSync(fixture, target);
  execSync('npx astro build', {
    stdio: 'inherit',
    env: { ...process.env, GITHUB_API_OFFLINE: '1', SITE_INDEXABLE: 'true' },
  });
} finally {
  for (const [target, data] of backups) (data === null ? rmSync(target) : writeFileSync(target, data));
}
// Minimal static server for dist/ (astro preview daemonizes itself when not attached to a TTY).
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8', '.svg': 'image/svg+xml', '.yml': 'text/yaml', '.png': 'image/png' };
const root = path.resolve('dist');
const resolveFile = (urlPath) => {
  const p = path.join(root, decodeURIComponent(urlPath));
  if (!p.startsWith(root)) return null;
  for (const c of [p, path.join(p, 'index.html'), p + '.html'])
    if (existsSync(c) && statSync(c).isFile()) return c;
  return null;
};
http.createServer((req, res) => {
  const urlPath = new URL(req.url, 'http://x').pathname;
  const f = resolveFile(urlPath);
  const target = f ?? path.join(root, '404.html');
  const status = f ? 200 : 404;
  if (!existsSync(target)) { res.writeHead(404).end('not found'); return; }
  res.writeHead(status, { 'Content-Type': TYPES[path.extname(target)] ?? 'application/octet-stream' });
  res.end(readFileSync(target));
}).listen(4321, () => console.log('serving dist on http://localhost:4321'));
