import { describe, it, expect } from 'vitest';
import { runCommand, complete, type ConsoleContext } from '../../src/lib/console-commands';

const ctx = (over: Partial<ConsoleContext> = {}): ConsoleContext => ({
  path: '/',
  history: [],
  posts: [
    { slug: 'how-this-site-is-built', title: 'How this site is built', date: '2026-11-27' },
    { slug: 'hello-world', title: 'Hello, world', date: '2026-11-25' },
  ],
  profile: { name: 'Yizhak (Itzik) Orfanian', title: 'Senior Software Developer', tagline: 'Cloud Security & AI', location: 'Israel' },
  links: { linkedin: 'https://www.linkedin.com/in/oitzik/', github: 'https://github.com/itzikorfa', email: 'hi@program-il.com' },
  ...over,
});
const text = (r: ReturnType<typeof runCommand>) => r.lines.map((l) => l.text).join('\n');

describe('runCommand', () => {
  it('help lists the commands', () => {
    const t = text(runCommand('help', ctx()));
    for (const c of ['whoami', 'ls', 'cat', 'contact', 'suggest', 'open', 'clear']) expect(t).toContain(c);
  });

  it('is case- and space-tolerant', () => {
    expect(text(runCommand('  HELP  ', ctx()))).toContain('available commands');
  });

  it('empty input does nothing', () => {
    expect(runCommand('   ', ctx())).toEqual({ lines: [] });
  });

  it('whoami prints the profile', () => {
    const t = text(runCommand('whoami', ctx()));
    expect(t).toContain('Yizhak (Itzik) Orfanian');
    expect(t).toContain('Senior Software Developer · Cloud Security & AI');
  });

  it('ls lists sections; ls blog/ and blog list posts newest first with links', () => {
    expect(text(runCommand('ls', ctx()))).toContain('blog/');
    for (const cmd of ['ls blog/', 'ls blog', 'blog']) {
      const r = runCommand(cmd, ctx());
      expect(r.lines[0]).toMatchObject({ text: expect.stringContaining('how-this-site-is-built'), href: '/blog/how-this-site-is-built/' });
      expect(r.lines[1].href).toBe('/blog/hello-world/');
    }
  });

  it('blog also scrolls to the blog section', () => {
    expect(runCommand('blog', ctx()).action).toEqual({ type: 'scroll', id: 'blog' });
    expect(runCommand('ls blog/', ctx()).action).toBeUndefined();
  });

  it('cat opens a published post, with or without .md', () => {
    expect(runCommand('cat hello-world', ctx()).action).toEqual({ type: 'navigate', href: '/blog/hello-world/' });
    expect(runCommand('cat hello-world.md', ctx()).action).toEqual({ type: 'navigate', href: '/blog/hello-world/' });
    expect(runCommand('cat about.md', ctx()).action).toEqual({ type: 'navigate', href: '/about/' });
    expect(runCommand('cat reading.txt', ctx()).action).toEqual({ type: 'scroll', id: 'reading' });
  });

  it('cat of an unknown post is an error and never navigates', () => {
    const r = runCommand('cat secret-draft', ctx());
    expect(r.action).toBeUndefined();
    expect(r.lines[0]).toMatchObject({ kind: 'err', text: expect.stringContaining('no such post') });
    expect(runCommand('cat', ctx()).lines[0].kind).toBe('err');
  });

  it.each([
    ['projects', 'projects'], ['ls projects/', 'projects'], ['reading', 'reading'],
    ['favorites', 'favorites'], ['ls favorites/', 'favorites'], ['contact', 'contact'],
    ['cd blog', 'blog'], ['cd projects/', 'projects'],
  ])('%s scrolls to #%s', (cmd, id) => {
    expect(runCommand(cmd, ctx()).action).toEqual({ type: 'scroll', id });
  });

  it('contact also prints the links', () => {
    const r = runCommand('contact', ctx());
    expect(r.lines.map((l) => l.href)).toEqual(['https://www.linkedin.com/in/oitzik/', 'https://github.com/itzikorfa', 'mailto:hi@program-il.com']);
  });

  it('about and suggest navigate', () => {
    expect(runCommand('about', ctx()).action).toEqual({ type: 'navigate', href: '/about/' });
    expect(runCommand('suggest', ctx()).action).toEqual({ type: 'navigate', href: '/favorites/suggest/' });
  });

  it('open opens known links in a new tab only', () => {
    expect(runCommand('open github', ctx()).action).toEqual({ type: 'open', href: 'https://github.com/itzikorfa' });
    expect(runCommand('open linkedin', ctx()).action).toEqual({ type: 'open', href: 'https://www.linkedin.com/in/oitzik/' });
    expect(runCommand('open rss', ctx()).action).toEqual({ type: 'open', href: '/rss.xml' });
    expect(runCommand('open llms', ctx()).action).toEqual({ type: 'open', href: '/llms.txt' });
    const bad = runCommand('open javascript:alert(1)', ctx());
    expect(bad.action).toBeUndefined();
    expect(bad.lines[0].kind).toBe('err');
  });

  it('email prints a mailto link', () => {
    expect(runCommand('email', ctx()).lines[0]).toMatchObject({ text: 'hi@program-il.com', href: 'mailto:hi@program-il.com' });
  });

  it('cd ~ goes home, cd .. goes back, pwd prints the path', () => {
    expect(runCommand('cd ~', ctx()).action).toEqual({ type: 'navigate', href: '/' });
    expect(runCommand('cd', ctx()).action).toEqual({ type: 'navigate', href: '/' });
    expect(runCommand('cd ..', ctx()).action).toEqual({ type: 'back' });
    expect(text(runCommand('pwd', ctx({ path: '/about/' })))).toBe('~/about/');
    expect(runCommand('cd nowhere', ctx()).lines[0].kind).toBe('err');
  });

  it('history, echo, date, clear', () => {
    expect(text(runCommand('history', ctx({ history: ['help', 'ls'] })))).toMatch(/1\s+help\n\s*2\s+ls/);
    expect(text(runCommand('echo <b>hi</b>', ctx()))).toBe('<b>hi</b>');
    expect(text(runCommand('date', ctx()))).toMatch(/\d{4}/);
    expect(runCommand('clear', ctx()).action).toEqual({ type: 'clear' });
  });

  it('jokes and unknown commands', () => {
    expect(text(runCommand('sudo rm -rf /', ctx()))).toMatch(/nice try/);
    expect(text(runCommand('rm -rf /', ctx()))).toMatch(/permission denied/);
    expect(text(runCommand('exit', ctx()))).toMatch(/no exit/);
    const r = runCommand('hack', ctx());
    expect(r.lines[0]).toEqual({ kind: 'err', text: 'command not found: hack. type help' });
  });

  it('truncates absurdly long input', () => {
    const r = runCommand('echo ' + 'x'.repeat(5000), ctx());
    expect(r.lines[0].text.length).toBeLessThanOrEqual(500);
  });

  it('only ever produces site, https or mailto links', () => {
    const all = ['help', 'ls', 'blog', 'contact', 'email', 'whoami'].flatMap((c) => runCommand(c, ctx()).lines);
    for (const l of all) if (l.href) expect(l.href).toMatch(/^(\/|https:\/\/|mailto:)/);
  });
});

describe('complete', () => {
  it('completes a unique command with a trailing space', () => {
    expect(complete('who', ctx())).toEqual({ draft: 'whoami ' });
  });
  it('lists options when ambiguous', () => {
    expect(complete('c', ctx()).options).toEqual(expect.arrayContaining(['cat', 'cd', 'clear', 'contact']));
  });
  it('completes post names after cat, and link names after open', () => {
    expect(complete('cat hel', ctx())).toEqual({ draft: 'cat hello-world' });
    expect(complete('open gi', ctx())).toEqual({ draft: 'open github' });
    expect(complete('ls bl', ctx())).toEqual({ draft: 'ls blog/' });
  });
  it('returns nothing when nothing matches', () => {
    expect(complete('zzz', ctx())).toEqual({});
  });
});
