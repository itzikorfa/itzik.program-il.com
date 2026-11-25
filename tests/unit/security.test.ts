import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { jsonLdString } from '../../src/lib/jsonld';
import { isHttpUrl } from '../../src/lib/url';

describe('JSON-LD escaping', () => {
  it('cannot break out of the script tag', () => {
    const out = jsonLdString({ headline: 'x</script><script>alert(1)</script>' });
    expect(out).not.toContain('<');
    expect(JSON.parse(out).headline).toBe('x</script><script>alert(1)</script>');
  });
});

describe('reading links', () => {
  it('only http(s) URLs are allowed', () => {
    expect(isHttpUrl('https://example.com/a')).toBe(true);
    expect(isHttpUrl('http://example.com')).toBe(true);
    expect(isHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isHttpUrl('data:text/html,hi')).toBe(false);
    expect(isHttpUrl('not a url')).toBe(false);
  });
});

describe('/admin page', () => {
  const html = readFileSync('public/admin/index.html', 'utf8');
  it('pins the CMS script with subresource integrity', () => {
    expect(html).toMatch(/<script src="https:\/\/unpkg\.com\/@sveltia\/cms@[\d.]+\/dist\/sveltia-cms\.js" integrity="sha384-[A-Za-z0-9+/=]+" crossorigin="anonymous"><\/script>/);
  });
  it('points the CMS at its config explicitly', () => {
    expect(html).toContain('<link href="/admin/config.yml" type="application/yaml" rel="cms-config-url">');
  });
});

describe('Amplify security headers', () => {
  // Amplify reads custom headers from customHttp.yml (headers in amplify.yml are ignored).
  const cfg = parse(readFileSync('customHttp.yml', 'utf8'));
  const all = cfg.customHeaders.find((h: { pattern: string }) => h.pattern === '**/*').headers;
  const get = (k: string) => all.find((h: { key: string }) => h.key === k)?.value;
  it('sets HSTS, framing and sniffing protections', () => {
    expect(get('Strict-Transport-Security')).toBe('max-age=31536000; includeSubDomains');
    expect(get('X-Frame-Options')).toBe('DENY');
    expect(get('Content-Security-Policy')).toBe("frame-ancestors 'none'");
    expect(get('X-Content-Type-Options')).toBe('nosniff');
    expect(get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(get('Permissions-Policy')).toBe('camera=(), microphone=(), geolocation=()');
  });
});

describe('amplify.yml', () => {
  it('no longer carries headers (they live in customHttp.yml)', () => {
    expect(parse(readFileSync('amplify.yml', 'utf8')).customHeaders).toBeUndefined();
  });
});
