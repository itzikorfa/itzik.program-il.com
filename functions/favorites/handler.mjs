// Lambda Function URL handler. All services are injected (see index.mjs), so this file is testable.
import { validateSuggestion, signToken, verifyToken, favoriteFile, confirmEmail, ownerEmail } from './core.mjs';
import { openFavoritePR } from './github.mjs';

const MAX_BODY = 4096;
const reply = (statusCode, data) => ({
  statusCode,
  headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  body: JSON.stringify(data),
});

function prBody(s) {
  return [
    'A visitor suggested a favorite link. **Email verified** (the address is not stored).',
    '',
    `- **Title:** ${s.title}`,
    `- **Link:** ${s.url}`,
    `- **Kind:** ${s.kind}`,
    `- **Why:** ${s.why || '(none)'}`,
    `- **Suggested by:** ${s.name || '(no name)'}`,
    '',
    'Edit the file in this pull request if you want to change anything, then **merge** to publish it,',
    'or **close** to reject it.',
  ].join('\n');
}

export function createHandler(deps) {
  const { secret, allowedOrigin, ownerEmail: owner, repo, getGithubToken, fetchImpl, limiter, sendEmail, now, log } = deps;

  async function suggest(input, ip) {
    if (typeof input?.website === 'string' && input.website.trim() !== '') {
      log({ route: 'suggest', outcome: 'honeypot' });
      return reply(202, { ok: true });
    }
    const v = validateSuggestion(input);
    if (!v.ok) {
      log({ route: 'suggest', outcome: 'invalid', fields: Object.keys(v.errors) });
      return reply(400, { errors: v.errors });
    }
    const rl = await limiter.check({ ip, email: v.value.email });
    if (!rl.ok) {
      log({ route: 'suggest', outcome: 'rate-limited', limit: rl.limit });
      return reply(429, { error: 'Too many suggestions right now. Please try again later.' });
    }
    const token = signToken(v.value, secret, now());
    try {
      await sendEmail({ to: v.value.email, ...confirmEmail(token) });
    } catch (e) {
      log({ route: 'suggest', outcome: 'email-failed', error: String(e?.name ?? 'Error') });
      return reply(502, { error: "We couldn't send the email. Please try again later." });
    }
    log({ route: 'suggest', outcome: 'sent', kind: v.value.kind });
    return reply(202, { ok: true });
  }

  async function confirm(input) {
    const t = verifyToken(input?.token, secret, now());
    if (!t.ok) {
      log({ route: 'confirm', outcome: t.reason });
      return t.reason === 'expired'
        ? reply(410, { error: 'This link has expired. Please suggest the link again.' })
        : reply(400, { error: 'This confirmation link is not valid.' });
    }
    const s = t.value;
    try {
      const r = await openFavoritePR({
        token: await getGithubToken(),
        repo,
        fetchImpl,
        branch: `suggest/${t.id}`,
        file: favoriteFile(s, t.id, new Date(now() * 1000)),
        title: `Favorite: ${s.title}`,
        body: prBody(s),
      });
      log({ route: 'confirm', outcome: r.status });
      if (r.status === 'created' && owner) {
        try { await sendEmail({ to: owner, ...ownerEmail(r.url) }); }
        catch (e) { log({ route: 'confirm', outcome: 'owner-email-failed', error: String(e?.name ?? 'Error') }); }
      }
      return r.status === 'created' ? reply(201, { status: 'created' }) : reply(200, { status: 'already' });
    } catch (e) {
      log({ route: 'confirm', outcome: 'github-failed', error: String(e?.message ?? e) });
      return reply(502, { error: 'Something went wrong on our side. Please try again in a few minutes.' });
    }
  }

  return async function handler(event) {
    const method = event?.requestContext?.http?.method;
    const path = event?.rawPath;
    if (path !== '/suggest' && path !== '/confirm') return reply(404, { error: 'Not found' });
    if (method !== 'POST') return reply(405, { error: 'Use POST' });
    if ((event.headers?.origin ?? '') !== allowedOrigin) return reply(403, { error: 'Forbidden' });

    const raw = event.isBase64Encoded ? Buffer.from(event.body ?? '', 'base64').toString('utf8') : (event.body ?? '');
    if (Buffer.byteLength(raw) > MAX_BODY) return reply(413, { error: 'Too large' });
    let input;
    try { input = JSON.parse(raw); } catch { return reply(400, { error: 'Invalid request' }); }

    return path === '/suggest' ? suggest(input, event.requestContext.http.sourceIp) : confirm(input);
  };
}
