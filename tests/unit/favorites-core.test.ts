import { describe, it, expect } from 'vitest';
import { parse } from 'yaml';
import {
  validateSuggestion, kindOf, signToken, verifyToken, favoriteFile, confirmEmail, TOKEN_TTL_SECONDS,
} from '../../functions/favorites/core.mjs';

const good = { url: 'https://astro.build/', title: 'Astro', why: 'Fast static sites', name: 'Dana', email: 'dana@example.com' };
const SECRET = 'test-secret-0123456789abcdef';
const NOW = 1_800_000_000;

describe('validateSuggestion', () => {
  it('accepts a good suggestion and trims fields', () => {
    const r = validateSuggestion({ ...good, title: '  Astro  ', why: '' });
    expect(r.ok).toBe(true);
    expect(r.value).toEqual({ url: 'https://astro.build/', title: 'Astro', why: '', name: 'Dana', email: 'dana@example.com', kind: 'site' });
  });

  it.each([
    ['javascript: url', { url: 'javascript:alert(1)' }, 'url'],
    ['plain http', { url: 'http://example.com' }, 'url'],
    ['credentials in url', { url: 'https://user:pass@example.com/' }, 'url'],
    ['url too long', { url: 'https://example.com/' + 'a'.repeat(300) }, 'url'],
    ['missing title', { title: '   ' }, 'title'],
    ['title too long', { title: 'x'.repeat(101) }, 'title'],
    ['why too long', { why: 'x'.repeat(201) }, 'why'],
    ['name too long', { name: 'x'.repeat(51) }, 'name'],
    ['bad email', { email: 'not-an-email' }, 'email'],
    ['email too long', { email: 'a'.repeat(250) + '@x.io' }, 'email'],
  ])('rejects %s', (_label, patch, field) => {
    const r = validateSuggestion({ ...good, ...patch });
    expect(r.ok).toBe(false);
    expect(r.errors).toHaveProperty(field);
  });

  it('strips control characters', () => {
    const r = validateSuggestion({ ...good, title: 'Ast\u0000ro‮', why: 'line\nbreak' });
    expect(r.value.title).toBe('Astro');
    expect(r.value.why).toBe('line break');
  });

  it('rejects non-string input without throwing', () => {
    expect(validateSuggestion({ url: 5, title: {}, email: [] }).ok).toBe(false);
    expect(validateSuggestion(null).ok).toBe(false);
  });
});

describe('kindOf', () => {
  it('tags GitHub repos as repo and everything else as site', () => {
    expect(kindOf('https://github.com/withastro/astro')).toBe('repo');
    expect(kindOf('https://github.com/withastro/astro/tree/main/docs')).toBe('repo');
    expect(kindOf('https://github.com/withastro')).toBe('site');
    expect(kindOf('https://github.com/')).toBe('site');
    expect(kindOf('https://gist.github.com/a/b')).toBe('site');
    expect(kindOf('https://astro.build/')).toBe('site');
  });
});

describe('tokens', () => {
  const s = { url: good.url, title: 'Astro', why: 'Fast', name: 'Dana', kind: 'site' };

  it('round-trips a suggestion and never contains the email', () => {
    const t = signToken({ ...s, email: 'dana@example.com' } as never, SECRET, NOW);
    expect(t).not.toContain('dana');
    expect(Buffer.from(t.split('.')[0], 'base64url').toString()).not.toContain('example.com');
    const r = verifyToken(t, SECRET, NOW + 60);
    expect(r).toEqual({ ok: true, value: { ...s, iat: NOW, exp: NOW + TOKEN_TTL_SECONDS }, id: expect.stringMatching(/^[0-9a-f]{12}$/) });
  });

  it('expires after 24 hours', () => {
    expect(TOKEN_TTL_SECONDS).toBe(86400);
    const t = signToken(s, SECRET, NOW);
    expect(verifyToken(t, SECRET, NOW + 86401)).toEqual({ ok: false, reason: 'expired' });
  });

  it('rejects a tampered payload, wrong secret and garbage', () => {
    const t = signToken(s, SECRET, NOW);
    const [, sig] = t.split('.');
    const evil = Buffer.from(JSON.stringify({ ...s, url: 'https://evil.example/', iat: NOW, exp: NOW + 86400 })).toString('base64url');
    expect(verifyToken(`${evil}.${sig}`, SECRET, NOW)).toEqual({ ok: false, reason: 'invalid' });
    expect(verifyToken(t, 'other-secret-0123456789abcdef', NOW)).toEqual({ ok: false, reason: 'invalid' });
    for (const g of ['', 'abc', 'a.b.c', '..', 5, null]) expect(verifyToken(g as never, SECRET, NOW).ok).toBe(false);
  });

  it('gives the same id for the same token and different ids for different tokens', () => {
    const a = signToken(s, SECRET, NOW);
    const b = signToken(s, SECRET, NOW + 1);
    expect(verifyToken(a, SECRET, NOW).id).toBe(verifyToken(a, SECRET, NOW).id);
    expect(verifyToken(a, SECRET, NOW).id).not.toBe(verifyToken(b, SECRET, NOW).id);
  });
});

describe('favoriteFile', () => {
  it('builds a dated YAML file the site schema can read, without email', () => {
    const f = favoriteFile({ url: good.url, title: 'Astro: "fast"', why: 'Fast # really', name: 'Dana', kind: 'site' }, 'abc123def456', new Date('2026-11-26T10:00:00Z'));
    expect(f.path).toBe('src/content/favorites/2026-11-26-abc123def456.yaml');
    expect(parse(f.content)).toEqual({ title: 'Astro: "fast"', url: good.url, date: '2026-11-26T10:00:00.000Z', kind: 'site', why: 'Fast # really', suggestedBy: 'Dana' });
    expect(f.content).not.toContain('@');
  });

  it('omits empty optional fields', () => {
    const f = favoriteFile({ url: good.url, title: 'Astro', why: '', name: '', kind: 'site' }, 'abc123def456', new Date('2026-11-26T10:00:00Z'));
    expect(parse(f.content)).toEqual({ title: 'Astro', url: good.url, date: '2026-11-26T10:00:00.000Z', kind: 'site' });
  });
});

describe('confirmEmail', () => {
  it('links to the confirm page and repeats nothing the visitor typed (no spam relay)', () => {
    const m = confirmEmail('TOKEN.SIG');
    expect(m.subject).toBe('Confirm your link suggestion');
    expect(m.text).toContain('https://itzik.program-il.com/favorites/confirm/#TOKEN.SIG');
    expect(m.text).not.toContain('astro');
    expect(m.text).toMatch(/24 hours/);
    expect(m.text).toMatch(/ignore this email/i);
  });
});
