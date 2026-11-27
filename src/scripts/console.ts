// Browser side of the console. Every piece of text goes in with textContent; links come from runCommand only.
import { runCommand, complete, type ConsoleContext, type Line } from '../lib/console-commands';

const HISTORY_KEY = 'console-history';
const OPEN_KEY = 'console-open';
const MAX_HISTORY = 50;

const read = (store: () => Storage, key: string): string | null => { try { return store().getItem(key); } catch { return null; } };
const write = (store: () => Storage, key: string, v: string) => { try { store().setItem(key, v); } catch { /* storage blocked: fine */ } };

export function initConsole() {
  const root = document.querySelector<HTMLElement>('[data-console]');
  const dataEl = document.getElementById('console-data');
  if (!root || !dataEl) return;
  const toggle = root.querySelector<HTMLButtonElement>('.console-toggle')!;
  const out = root.querySelector<HTMLElement>('.console-out')!;
  const form = root.querySelector<HTMLFormElement>('.console-form')!;
  const input = form.querySelector<HTMLInputElement>('input')!;
  const data = JSON.parse(dataEl.textContent ?? '{}') as Omit<ConsoleContext, 'path' | 'history'>;
  const phone = window.matchMedia('(max-width: 640px)').matches;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let history: string[] = [];
  try { history = JSON.parse(read(() => sessionStorage, HISTORY_KEY) ?? '[]'); } catch { history = []; }
  if (!Array.isArray(history)) history = [];
  let cursor = -1;

  const setOpen = (open: boolean, remember = true) => {
    root.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close the console' : 'Open the console');
    if (remember) write(() => localStorage, OPEN_KEY, open ? '1' : '0');
  };

  const print = (lines: Line[]) => {
    for (const l of lines) {
      const div = document.createElement('div');
      div.className = `line ${l.kind ?? 'out'}`;
      if (l.href) {
        const a = document.createElement('a');
        a.href = l.href;
        a.textContent = l.text;
        if (/^https:\/\//.test(l.href)) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
        div.append(a);
      } else {
        div.textContent = l.text;
      }
      out.append(div);
    }
    out.scrollTop = out.scrollHeight;
  };

  const echo = (text: string) => {
    const div = document.createElement('div');
    div.className = 'line cmd';
    const p = document.createElement('span');
    p.className = 'console-p';
    p.textContent = 'itzik@program-il:~$ ';
    div.append(p, document.createTextNode(text));
    out.append(div);
  };

  const ctx = (): ConsoleContext => ({ ...data, path: location.pathname, history });

  const exec = (raw: string) => {
    const cmd = raw.trim().slice(0, 500);
    if (!cmd) return;
    history = [...history.filter((h, i) => !(i === history.length - 1 && h === cmd)), cmd].slice(-MAX_HISTORY);
    write(() => sessionStorage, HISTORY_KEY, JSON.stringify(history));
    cursor = -1;
    echo(cmd);
    const { lines, action } = runCommand(cmd, ctx());
    print(lines);
    if (!action) return;
    switch (action.type) {
      case 'clear': out.replaceChildren(); break;
      case 'navigate': location.href = action.href; break;
      case 'open': window.open(action.href, '_blank', 'noopener,noreferrer'); break;
      case 'back': if (history.length > 1 && document.referrer) window.history.back(); else location.href = '/'; break;
      case 'scroll': {
        const el = document.getElementById(action.id);
        if (!el) { location.href = `/#${action.id}`; break; }
        window.history.pushState(null, '', `#${action.id}`);
        if (phone) setOpen(false, false); // let the section show on a small screen
        el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
        break;
      }
    }
  };

  form.addEventListener('submit', (e) => { e.preventDefault(); const v = input.value; input.value = ''; exec(v); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' && !e.shiftKey && input.value.trim()) { // empty input: Tab moves focus as usual
      e.preventDefault();
      const r = complete(input.value, ctx());
      if (r.draft) input.value = r.draft;
      else if (r.options) { echo(input.value); print([{ text: r.options.join('  '), kind: 'muted' }]); }
    } else if (e.key === 'ArrowUp' && history.length) {
      e.preventDefault();
      cursor = cursor < 0 ? history.length - 1 : Math.max(0, cursor - 1);
      input.value = history[cursor];
    } else if (e.key === 'ArrowDown' && cursor >= 0) {
      e.preventDefault();
      cursor += 1;
      if (cursor >= history.length) { cursor = -1; input.value = ''; } else input.value = history[cursor];
    }
  });
  toggle.addEventListener('click', () => {
    const open = !root.classList.contains('open');
    setOpen(open);
    if (open) input.focus();
  });
  root.querySelectorAll<HTMLButtonElement>('.console-chips button').forEach((b) =>
    b.addEventListener('click', () => exec(b.dataset.cmd ?? '')));

  print([{ text: 'type help to see what you can do' + (phone ? ', or tap a command.' : '.'), kind: 'muted' }]);
  const remembered = read(() => localStorage, OPEN_KEY);
  setOpen(remembered === null ? !phone : remembered === '1', false);
  root.hidden = false;
}
