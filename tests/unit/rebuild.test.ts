import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, copyFileSync, chmodSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

describe('rebuild.sh', () => {
  it('fails with a clear message when no webhook URL is configured', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'rebuild-'));
    copyFileSync('rebuild.sh', path.join(dir, 'rebuild.sh'));
    chmodSync(path.join(dir, 'rebuild.sh'), 0o755);
    const env = { PATH: process.env.PATH ?? '' };
    const r = spawnSync('./rebuild.sh', { cwd: dir, env, encoding: 'utf8' });
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('Set AMPLIFY_WEBHOOK_URL or create .rebuild-url');
  });

  it('posts to the URL in .rebuild-url', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'rebuild-'));
    copyFileSync('rebuild.sh', path.join(dir, 'rebuild.sh'));
    chmodSync(path.join(dir, 'rebuild.sh'), 0o755);
    // Fake curl that records its arguments.
    writeFileSync(path.join(dir, 'curl'), '#!/bin/sh\necho "$@" > "$(dirname "$0")/curl.args"\n', { mode: 0o755 });
    writeFileSync(path.join(dir, '.rebuild-url'), 'https://example.invalid/hook\n');
    const r = spawnSync('./rebuild.sh', { cwd: dir, env: { PATH: `${dir}:${process.env.PATH}` }, encoding: 'utf8' });
    expect(r.status).toBe(0);
    const args = readFileSync(path.join(dir, 'curl.args'), 'utf8');
    expect(args).toContain('-X POST');
    expect(args).toContain('https://example.invalid/hook');
  });
});
