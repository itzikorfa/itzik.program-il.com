// Pure logic for visitor-suggested favorites. No AWS, no network: easy to test.
import { createHmac, createHash, timingSafeEqual } from 'node:crypto';

export const SITE = 'https://itzik.program-il.com';
export const TOKEN_TTL_SECONDS = 24 * 60 * 60;

const LIMITS = { url: 300, title: 100, why: 200, name: 50, email: 254 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Newlines/tabs → space; strip other control and bidi/zero-width characters; collapse spaces. */
function clean(v) {
  if (typeof v !== 'string') return null;
  return v
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩﻿]/g, '')
    .replace(/ {2,}/g, ' ')
    .trim();
}

function checkUrl(url) {
  if (!url) return 'Enter a link.';
  if (url.length > LIMITS.url) return `Links can be at most ${LIMITS.url} characters.`;
  let u;
  try { u = new URL(url); } catch { return 'Enter a full link, starting with https://'; }
  if (u.protocol !== 'https:') return 'Only https:// links are accepted.';
  if (u.username || u.password) return 'Links with a username or password are not accepted.';
  return null;
}

/** `repo` for https://github.com/<owner>/<repo>[/...], otherwise `site`. */
export function kindOf(url) {
  try {
    const u = new URL(url);
    if (u.hostname !== 'github.com') return 'site';
    return u.pathname.split('/').filter(Boolean).length >= 2 ? 'repo' : 'site';
  } catch {
    return 'site';
  }
}

/** Returns { ok: true, value } or { ok: false, errors: { field: message } }. */
export function validateSuggestion(input) {
  const src = input && typeof input === 'object' ? input : {};
  const v = {
    url: clean(src.url) ?? '',
    title: clean(src.title) ?? '',
    why: clean(src.why ?? '') ?? '',
    name: clean(src.name ?? '') ?? '',
    email: (clean(src.email) ?? '').toLowerCase(),
  };
  const errors = {};
  const urlErr = checkUrl(v.url);
  if (urlErr) errors.url = urlErr;
  if (!v.title) errors.title = 'Enter a title.';
  else if (v.title.length > LIMITS.title) errors.title = `Titles can be at most ${LIMITS.title} characters.`;
  if (v.why.length > LIMITS.why) errors.why = `Keep it under ${LIMITS.why} characters.`;
  if (v.name.length > LIMITS.name) errors.name = `Names can be at most ${LIMITS.name} characters.`;
  if (!EMAIL_RE.test(v.email) || v.email.length > LIMITS.email) errors.email = 'Enter a valid email address.';
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { ...v, kind: kindOf(v.url) } };
}

const b64 = (s) => Buffer.from(s).toString('base64url');
const mac = (data, secret) => createHmac('sha256', secret).update(data).digest('base64url');
const idOf = (sig) => createHash('sha256').update(sig).digest('hex').slice(0, 12);

/** Signed, expiring token carrying the suggestion. The email is deliberately left out. */
export function signToken(s, secret, now = Math.floor(Date.now() / 1000)) {
  const payload = { url: s.url, title: s.title, why: s.why, name: s.name, kind: s.kind, iat: now, exp: now + TOKEN_TTL_SECONDS };
  const body = b64(JSON.stringify(payload));
  return `${body}.${mac(body, secret)}`;
}

/** { ok: true, value, id } | { ok: false, reason: 'invalid' | 'expired' } */
export function verifyToken(token, secret, now = Math.floor(Date.now() / 1000)) {
  if (typeof token !== 'string') return { ok: false, reason: 'invalid' };
  const parts = token.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return { ok: false, reason: 'invalid' };
  const [body, sig] = parts;
  const want = Buffer.from(mac(body, secret));
  const got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return { ok: false, reason: 'invalid' };
  let value;
  try { value = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')); } catch { return { ok: false, reason: 'invalid' }; }
  if (!value || typeof value.exp !== 'number' || now > value.exp) return { ok: false, reason: 'expired' };
  return { ok: true, value, id: idOf(sig) };
}

/** The file a pull request adds. JSON strings are valid YAML scalars, so quoting is always safe. */
export function favoriteFile(s, id, date = new Date()) {
  const day = date.toISOString().slice(0, 10);
  const lines = [`title: ${JSON.stringify(s.title)}`, `url: ${JSON.stringify(s.url)}`, `date: ${day}`, `kind: ${s.kind}`];
  if (s.why) lines.push(`why: ${JSON.stringify(s.why)}`);
  if (s.name) lines.push(`suggestedBy: ${JSON.stringify(s.name)}`);
  return { path: `src/content/favorites/${day}-${id}.yaml`, content: lines.join('\n') + '\n' };
}

export function confirmEmail(s, token) {
  const link = `${SITE}/favorites/confirm/#${token}`;
  return {
    subject: `Confirm your link suggestion: ${s.title}`,
    text: [
      'Hi,',
      '',
      'Someone (hopefully you) suggested this link for the favorites list on itzik.program-il.com:',
      '',
      `  ${s.title}`,
      `  ${s.url}`,
      '',
      'To confirm, open this link and press Confirm (it works for 24 hours):',
      '',
      `  ${link}`,
      '',
      "If you didn't suggest anything, just ignore this email. Nothing will happen.",
      '',
      'Your email address was only used to send this message. It is not stored or published.',
      '',
      'Itzik',
    ].join('\n'),
  };
}
