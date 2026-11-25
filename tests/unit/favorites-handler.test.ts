import { describe, it, expect, beforeEach } from 'vitest';
import { createHandler } from '../../functions/favorites/handler.mjs';
import { createRateLimiter } from '../../functions/favorites/ratelimit.mjs';
import { openFavoritePR } from '../../functions/favorites/github.mjs';
import { signToken, verifyToken } from '../../functions/favorites/core.mjs';

const SECRET = 'test-secret-0123456789abcdef';
const ORIGIN = 'https://itzik.program-il.com';
const NOW = 1_800_000_000;
const good = { url: 'https://github.com/withastro/astro', title: 'Astro', why: 'Fast', name: 'Dana', email: 'Dana@Example.com' };

function memIncr() {
  const counts = new Map<string, number>();
  const incr = async (key: string, max: number) => {
    const n = (counts.get(key) ?? 0) + 1;
    if (n > max) return false;
    counts.set(key, n);
    return true;
  };
  return { incr, counts };
}

/** Fake GitHub REST API: records calls, keeps branches and PRs in memory. */
function fakeGitHub() {
  const branches = new Set<string>();
  const files = new Map<string, string>();
  const pulls: { head: string; title: string; body: string; html_url: string }[] = [];
  const calls: { method: string; path: string; body?: any; auth?: string }[] = [];
  let down = false;
  const fetchImpl = async (url: string, init: any = {}) => {
    const method = init.method ?? 'GET';
    const path = new URL(url).pathname + new URL(url).search;
    const body = init.body ? JSON.parse(init.body) : undefined;
    calls.push({ method, path, body, auth: init.headers?.authorization });
    const res = (status: number, json: unknown) => new Response(JSON.stringify(json), { status });
    if (down) return res(503, { message: 'down' });
    if (method === 'GET' && path.endsWith('/git/ref/heads/main')) return res(200, { object: { sha: 'mainsha' } });
    if (method === 'POST' && path.endsWith('/git/refs')) {
      const name = body.ref.replace('refs/heads/', '');
      if (branches.has(name)) return res(422, { message: 'Reference already exists' });
      branches.add(name);
      return res(201, {});
    }
    if (method === 'PUT' && path.includes('/contents/')) {
      const key = `${body.branch}:${path}`;
      if (files.has(key)) return res(422, { message: '"sha" wasn\'t supplied.' });
      files.set(key, Buffer.from(body.content, 'base64').toString());
      return res(201, {});
    }
    if (method === 'GET' && path.includes('/pulls?')) {
      const head = new URL(url).searchParams.get('head')!.split(':')[1];
      return res(200, pulls.filter((p) => p.head === head));
    }
    if (method === 'POST' && path.endsWith('/pulls')) {
      const pr = { head: body.head, title: body.title, body: body.body, html_url: `https://github.com/x/pull/${pulls.length + 1}` };
      pulls.push(pr);
      return res(201, pr);
    }
    return res(404, { message: 'not found' });
  };
  return { fetchImpl, branches, files, pulls, calls, setDown: (v: boolean) => { down = v; } };
}

function setup() {
  const gh = fakeGitHub();
  const mem = memIncr();
  const sent: { to: string; subject: string; text: string }[] = [];
  const logs: unknown[] = [];
  let emailFails = false;
  const handler = createHandler({
    secret: SECRET,
    allowedOrigin: ORIGIN,
    repo: 'itzikorfa/itzik.program-il.com',
    getGithubToken: async () => 'gh-token',
    fetchImpl: gh.fetchImpl,
    limiter: createRateLimiter({ incr: mem.incr, secret: SECRET, now: () => NOW }),
    sendEmail: async (m: any) => { if (emailFails) throw new Error('ses down'); sent.push(m); },
    now: () => NOW,
    log: (x: unknown) => logs.push(x),
  });
  const call = (path: string, body: unknown, opts: { origin?: string; method?: string; ip?: string; raw?: string } = {}) =>
    handler({
      rawPath: path,
      headers: { origin: opts.origin ?? ORIGIN, 'content-type': 'application/json' },
      requestContext: { http: { method: opts.method ?? 'POST', sourceIp: opts.ip ?? '1.2.3.4' } },
      body: opts.raw ?? JSON.stringify(body),
      isBase64Encoded: false,
    });
  return { gh, mem, sent, logs, call, failEmail: () => { emailFails = true; } };
}
const json = (r: any) => JSON.parse(r.body);

describe('POST /suggest', () => {
  let t: ReturnType<typeof setup>;
  beforeEach(() => { t = setup(); });

  it('emails a confirmation link and replies 202', async () => {
    const r = await t.call('/suggest', good);
    expect(r.statusCode).toBe(202);
    expect(t.sent).toHaveLength(1);
    expect(t.sent[0].to).toBe('dana@example.com');
    const token = t.sent[0].text.match(/#(\S+)/)![1];
    expect(verifyToken(token, SECRET, NOW)).toMatchObject({ ok: true, value: { kind: 'repo', title: 'Astro' } });
  });

  it('never logs the email address', async () => {
    await t.call('/suggest', good);
    await t.call('/suggest', { ...good, email: 'bad' });
    expect(JSON.stringify(t.logs)).not.toMatch(/example\.com|dana/i);
  });

  it('pretends success but sends nothing when the honeypot is filled', async () => {
    const r = await t.call('/suggest', { ...good, website: 'http://spam' });
    expect(r.statusCode).toBe(202);
    expect(t.sent).toHaveLength(0);
  });

  it('returns field errors for bad input', async () => {
    const r = await t.call('/suggest', { ...good, url: 'javascript:alert(1)', email: 'x' });
    expect(r.statusCode).toBe(400);
    expect(Object.keys(json(r).errors).sort()).toEqual(['email', 'url']);
    expect(t.sent).toHaveLength(0);
  });

  it('limits one address to 3 emails a day and one IP to 5 an hour', async () => {
    for (let i = 0; i < 3; i++) expect((await t.call('/suggest', good, { ip: `9.9.9.${i}` })).statusCode).toBe(202);
    expect((await t.call('/suggest', good, { ip: '9.9.9.9' })).statusCode).toBe(429);
    for (let i = 0; i < 5; i++) expect((await t.call('/suggest', { ...good, email: `u${i}@x.io` }, { ip: '5.5.5.5' })).statusCode).toBe(202);
    expect((await t.call('/suggest', { ...good, email: 'u9@x.io' }, { ip: '5.5.5.5' })).statusCode).toBe(429);
    expect(t.sent).toHaveLength(8);
  });

  it('stores only hashed rate-limit keys', async () => {
    await t.call('/suggest', good);
    const keys = [...t.mem.counts.keys()].join(' ');
    expect(keys).not.toMatch(/example|dana|1\.2\.3\.4/i);
  });

  it('rejects other origins, GET, unknown paths, bad JSON and huge bodies', async () => {
    expect((await t.call('/suggest', good, { origin: 'https://evil.example' })).statusCode).toBe(403);
    expect((await t.call('/suggest', good, { method: 'GET' })).statusCode).toBe(405);
    expect((await t.call('/nope', good)).statusCode).toBe(404);
    expect((await t.call('/suggest', null, { raw: '{not json' })).statusCode).toBe(400);
    expect((await t.call('/suggest', null, { raw: JSON.stringify({ ...good, why: 'x'.repeat(5000) }) })).statusCode).toBe(413);
    expect(t.sent).toHaveLength(0);
  });

  it('replies 502 when email sending fails', async () => {
    t.failEmail();
    const r = await t.call('/suggest', good);
    expect(r.statusCode).toBe(502);
    expect(json(r).error).toMatch(/try again/i);
  });
});

describe('POST /confirm', () => {
  let t: ReturnType<typeof setup>;
  beforeEach(() => { t = setup(); });
  const token = () => signToken({ url: good.url, title: 'Astro', why: 'Fast', name: 'Dana', kind: 'repo' }, SECRET, NOW);

  it('opens one pull request with the favorite file and no email', async () => {
    const r = await t.call('/confirm', { token: token() });
    expect(r.statusCode).toBe(201);
    expect(json(r)).toEqual({ status: 'created' });
    expect(t.gh.pulls).toHaveLength(1);
    const pr = t.gh.pulls[0];
    expect(pr.title).toBe('Favorite: Astro');
    expect(pr.head).toMatch(/^suggest\/[0-9a-f]{12}$/);
    expect(pr.body).toContain(good.url);
    expect(pr.body).toMatch(/email verified/i);
    const [file] = [...t.gh.files.values()];
    expect(file).toContain('kind: repo');
    expect(JSON.stringify(t.gh.calls)).not.toMatch(/example\.com/);
    expect(t.gh.calls.every((c) => c.auth === 'Bearer gh-token')).toBe(true);
  });

  it('confirming twice opens only one pull request', async () => {
    const tk = token();
    await t.call('/confirm', { token: tk });
    const again = await t.call('/confirm', { token: tk });
    expect(again.statusCode).toBe(200);
    expect(json(again)).toEqual({ status: 'already' });
    expect(t.gh.pulls).toHaveLength(1);
  });

  it('finishes a half-done earlier attempt (branch exists, no PR yet)', async () => {
    const tk = token();
    const id = verifyToken(tk, SECRET, NOW).id;
    t.gh.branches.add(`suggest/${id}`);
    const r = await t.call('/confirm', { token: tk });
    expect(r.statusCode).toBe(201);
    expect(t.gh.pulls).toHaveLength(1);
  });

  it('rejects tampered and expired tokens without touching GitHub', async () => {
    const [, sig] = token().split('.');
    const evil = Buffer.from(JSON.stringify({ url: 'https://evil.example', title: 'x', kind: 'site', iat: NOW, exp: NOW + 9e9 })).toString('base64url');
    expect((await t.call('/confirm', { token: `${evil}.${sig}` })).statusCode).toBe(400);
    const old = signToken({ url: good.url, title: 'Astro', why: '', name: '', kind: 'repo' }, SECRET, NOW - 90_000);
    expect((await t.call('/confirm', { token: old })).statusCode).toBe(410);
    expect(t.gh.calls).toHaveLength(0);
  });

  it('replies 502 when GitHub is down', async () => {
    t.gh.setDown(true);
    const r = await t.call('/confirm', { token: token() });
    expect(r.statusCode).toBe(502);
    expect(json(r).error).toMatch(/try again/i);
  });
});

describe('openFavoritePR', () => {
  it('throws with the GitHub status on unexpected errors', async () => {
    const fetchImpl = async () => new Response('{"message":"Bad credentials"}', { status: 401 });
    await expect(openFavoritePR({ token: 't', repo: 'a/b', fetchImpl, branch: 'suggest/x', file: { path: 'p', content: 'c' }, title: 't', body: 'b' }))
      .rejects.toThrow(/401/);
  });
});
