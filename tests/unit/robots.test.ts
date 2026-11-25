import { describe, it, expect } from 'vitest';
import { buildRobots, AI_TRAINING_BOTS } from '../../src/config/site';

const group = (txt: string, agent: string) =>
  txt.split(/\n\s*\n/).find((g) => g.split('\n').includes(`User-agent: ${agent}`)) ?? '';

describe('buildRobots', () => {
  it('blocks training bots by default', () => {
    const txt = buildRobots({ indexable: true, allowTraining: false });
    for (const bot of ['GPTBot', 'ClaudeBot', 'Google-Extended', 'CCBot', ...AI_TRAINING_BOTS]) {
      expect(group(txt, bot), bot).toContain('Disallow: /');
    }
    const star = group(txt, '*');
    expect(star).toContain('Disallow: /admin/');
    expect(star).not.toMatch(/^Disallow: \/$/m);
    expect(txt).toContain('Sitemap: https://program-il.com/sitemap-index.xml');
  });

  it('training switch', () => {
    const txt = buildRobots({ indexable: true, allowTraining: true });
    for (const bot of AI_TRAINING_BOTS) expect(group(txt, bot), bot).toBe('');
    expect(txt).not.toMatch(/^Disallow: \/$/m);
    expect(group(txt, '*')).toContain('Disallow: /admin/');
  });

  it('staging blocks everything', () => {
    expect(buildRobots({ indexable: false, allowTraining: false })).toBe('User-agent: *\nDisallow: /\n');
    expect(buildRobots({ indexable: false, allowTraining: true })).toBe('User-agent: *\nDisallow: /\n');
  });
});
