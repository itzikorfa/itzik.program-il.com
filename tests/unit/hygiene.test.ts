import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { FORBIDDEN, hasPrivatePatternsFile } from '../forbidden';

const tracked = () =>
  execSync('git ls-files', { encoding: 'utf8' }).split('\n').filter(Boolean);

describe('repo hygiene', () => {
  it('gitignore excludes CV and private patterns', () => {
    const lines = readFileSync('.gitignore', 'utf8').split('\n').map((l) => l.trim());
    expect(lines).toContain('*.doc');
    expect(lines).toContain('*.docx');
    expect(lines).toContain('.private-patterns');
  });

  it('private patterns loaded locally', () => {
    if (!hasPrivatePatternsFile) return;
    expect(FORBIDDEN.length).toBeGreaterThanOrEqual(4);
  });

  it('no private data tracked', () => {
    const files = tracked();
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      expect(f).not.toMatch(/\.docx?$/i);
      if (f === 'tests/forbidden.ts' || !existsSync(f)) continue;
      const text = readFileSync(f, 'utf8');
      for (const re of FORBIDDEN) expect(text, `${f} matches ${re}`).not.toMatch(re);
    }
  });

  it('content collections are tracked', () => {
    const files = tracked();
    expect(files).toContain('src/content.config.ts');
    expect(files).toContain('src/content/blog/hello-world.md');
  });
});
