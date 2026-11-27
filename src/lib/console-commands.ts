// The console's commands. Pure: no DOM, so every command is unit-tested.
// Output is plain text; links come only from the site's own data, never from what the visitor typed.

export type LineKind = 'out' | 'err' | 'muted' | 'heading' | 'link';
export interface Line { text: string; kind?: LineKind; href?: string }
export type Action =
  | { type: 'scroll'; id: string }
  | { type: 'navigate'; href: string }
  | { type: 'open'; href: string }
  | { type: 'back' }
  | { type: 'clear' };
export interface Result { lines: Line[]; action?: Action }

export interface ConsoleContext {
  path: string;
  history: string[];
  posts: { slug: string; title: string; date: string }[];
  profile: { name: string; title: string; tagline: string; location: string };
  links: { linkedin: string; github: string; email: string };
}

const MAX_INPUT = 500;
const SECTIONS = ['projects', 'blog', 'reading', 'favorites', 'contact'];
export const COMMANDS = [
  'help', 'whoami', 'about', 'ls', 'cat', 'cd', 'pwd', 'projects', 'blog', 'reading', 'favorites', 'contact',
  'suggest', 'open', 'email', 'history', 'date', 'echo', 'clear',
];
const OPEN_NAMES = ['linkedin', 'github', 'rss', 'llms'];
const LS_DIRS = ['blog/', 'projects/', 'favorites/'];

const out = (text: string, kind: LineKind = 'out', href?: string): Line => (href ? { text, kind, href } : { text, kind });
const err = (text: string): Line => ({ kind: 'err', text });
const dir = (s: string) => s.replace(/\/+$/, '').toLowerCase();

function postLines(ctx: ConsoleContext): Line[] {
  if (ctx.posts.length === 0) return [out('no posts yet', 'muted')];
  return [
    ...ctx.posts.map((p) => out(`${p.date}  ${p.slug}  ${p.title}`, 'link', `/blog/${p.slug}/`)),
    out('open one with: cat <name>', 'muted'),
  ];
}

function help(): Line[] {
  return [
    out('available commands:', 'heading'),
    out('  whoami                  who I am'),
    out('  about                   the about page'),
    out('  ls [blog/ projects/]    list sections or posts'),
    out('  cat <post>              open a post (Tab completes the name)'),
    out('  projects  blog  reading  favorites  contact'),
    out('                          jump to a section'),
    out('  suggest                 suggest a link for favorites'),
    out('  open linkedin|github|rss|llms'),
    out('  email                   my email address'),
    out('  cd ~   cd ..   pwd      move around'),
    out('  history  date  echo  clear'),
    out('Tab completes · ↑ ↓ history', 'muted'),
  ];
}

export function runCommand(input: string, ctx: ConsoleContext): Result {
  const raw = input.slice(0, MAX_INPUT).trim();
  if (!raw) return { lines: [] };
  const [first, ...rest] = raw.split(/\s+/);
  const cmd = first.toLowerCase();
  const arg = rest.join(' ');
  const argLower = arg.toLowerCase();

  switch (cmd) {
    case 'help':
    case '?':
      return { lines: help() };
    case 'whoami':
      return { lines: [out(ctx.profile.name, 'heading'), out(`${ctx.profile.title} · ${ctx.profile.tagline} · ${ctx.profile.location}`)] };
    case 'about':
      return { lines: [out('→ opening about', 'muted')], action: { type: 'navigate', href: '/about/' } };
    case 'ls': {
      if (!arg) return { lines: [out('about.md  blog/  projects/  reading.txt  favorites/  contact', 'link')] };
      const d = dir(arg);
      if (d === 'blog') return { lines: postLines(ctx) };
      if (SECTIONS.includes(d)) return { lines: [out(`→ ${d}`, 'muted')], action: { type: 'scroll', id: d } };
      return { lines: [err(`ls: ${arg}: no such directory`)] };
    }
    case 'blog':
      return { lines: postLines(ctx), action: { type: 'scroll', id: 'blog' } };
    case 'projects':
    case 'reading':
    case 'favorites':
      return { lines: [out(`→ ${cmd}`, 'muted')], action: { type: 'scroll', id: cmd } };
    case 'contact':
      return {
        lines: [
          out(`linkedin  ${ctx.links.linkedin.replace(/^https:\/\/(www\.)?/, '')}`, 'link', ctx.links.linkedin),
          out(`github    ${ctx.links.github.replace(/^https:\/\//, '')}`, 'link', ctx.links.github),
          out(`email     ${ctx.links.email}`, 'link', `mailto:${ctx.links.email}`),
        ],
        action: { type: 'scroll', id: 'contact' },
      };
    case 'cat': {
      if (!arg) return { lines: [err('cat: which post? try: ls blog/')] };
      if (argLower === 'about.md') return { lines: [out('→ opening about', 'muted')], action: { type: 'navigate', href: '/about/' } };
      if (argLower === 'reading.txt') return { lines: [out('→ reading', 'muted')], action: { type: 'scroll', id: 'reading' } };
      const slug = argLower.replace(/\.md$/, '');
      const post = ctx.posts.find((p) => p.slug === slug);
      if (!post) return { lines: [err(`cat: ${arg}: no such post. try: ls blog/`)] };
      return { lines: [out(`→ opening ${post.title}`, 'muted')], action: { type: 'navigate', href: `/blog/${post.slug}/` } };
    }
    case 'cd': {
      if (!arg || arg === '~' || arg === '/' || arg === '~/') return { lines: [], action: { type: 'navigate', href: '/' } };
      if (arg === '..') return { lines: [], action: { type: 'back' } };
      const d = dir(arg.replace(/^~\//, ''));
      if (SECTIONS.includes(d)) return { lines: [], action: { type: 'scroll', id: d } };
      if (d === 'about') return { lines: [], action: { type: 'navigate', href: '/about/' } };
      return { lines: [err(`cd: ${arg}: no such directory`)] };
    }
    case 'pwd':
      return { lines: [out(`~${ctx.path}`)] };
    case 'suggest':
    case './suggest-link':
      return { lines: [out('→ opening the suggest form', 'muted')], action: { type: 'navigate', href: '/favorites/suggest/' } };
    case 'open': {
      const targets: Record<string, string> = { linkedin: ctx.links.linkedin, github: ctx.links.github, rss: '/rss.xml', llms: '/llms.txt' };
      const href = targets[argLower];
      if (!href) return { lines: [err('open: try linkedin, github, rss or llms')] };
      return { lines: [out(`→ opening ${argLower}`, 'muted')], action: { type: 'open', href } };
    }
    case 'email':
      return { lines: [out(ctx.links.email, 'link', `mailto:${ctx.links.email}`)] };
    case 'history':
      return { lines: ctx.history.map((h, i) => out(`${String(i + 1).padStart(4)}  ${h}`, 'muted')) };
    case 'date':
      return { lines: [out(new Date().toString())] };
    case 'echo':
      return { lines: [out(arg)] };
    case 'clear':
      return { lines: [], action: { type: 'clear' } };
    case 'sudo':
      return { lines: [out('nice try. this incident will be reported to /dev/null', 'heading')] };
    case 'rm':
      return { lines: [out('rm: permission denied. this site is static, nothing to delete :)', 'heading')] };
    case 'exit':
    case 'logout':
      return { lines: [out('there is no exit. there is only help.', 'heading')] };
    default:
      return { lines: [err(`command not found: ${cmd}. type help`)] };
  }
}

/** Tab completion: a single match fills the draft; several are returned as options. */
export function complete(draft: string, ctx: ConsoleContext): { draft?: string; options?: string[] } {
  const parts = draft.replace(/^\s+/, '').split(' ');
  const [head, ...tail] = parts;
  let pool: string[];
  let last: string;
  if (parts.length === 1) { pool = COMMANDS; last = head; }
  else if (head === 'cat') { pool = [...ctx.posts.map((p) => p.slug), 'about.md', 'reading.txt']; last = tail.join(' '); }
  else if (head === 'open') { pool = OPEN_NAMES; last = tail.join(' '); }
  else if (head === 'ls' || head === 'cd') { pool = LS_DIRS; last = tail.join(' '); }
  else return {};
  const hits = pool.filter((x) => x.startsWith(last.toLowerCase()));
  if (hits.length === 1) return { draft: parts.length === 1 ? `${hits[0]} ` : `${head} ${hits[0]}` };
  if (hits.length > 1) return { options: hits };
  return {};
}
