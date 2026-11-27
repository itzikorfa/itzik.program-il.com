# Interactive console: Design (short)

Status: approved 2026-11-27 ("lets go"). Mock: https://claude.ai/artifact/F3RamDyh38rSrTaScC6E1v

## Intent
Make the terminal look real: visitors can type commands (`help`, `ls blog/`, `cat <post>`, `contact`…) as well as tap.
Remove the fake window title bar (three coloured dots + `itzik@program-il: ~`).

## Decisions (owner)
- Title bar removed.
- Console on every page. Desktop: docked at the bottom, open. Phones (≤640px): a tap-to-open bar.
- Tap command bar stays. One switch turns the console off: `CONSOLE_ENABLED` in `src/config/site.ts`.
- Must be easy to revert.

## Approaches
1. **Small hand-written script + pure command module (chosen).** No dependencies, tiny, testable.
2. A terminal library (xterm.js): real terminal emulation, but ~300 KB, poor on phones and for screen readers.
3. Commands only on a separate `/console` page: no layout risk, but hidden away; not what was asked.

## Design
- `src/lib/console-commands.ts` (pure, unit-tested): `runCommand(input, ctx)` returns output lines and an optional
  action (`scroll` to a section, `navigate`, `open` in a new tab, `back`, `clear`); `complete(draft, ctx)` for Tab.
  Context = published posts (built into the page as JSON), profile, current path, history.
- `src/components/Console.astro` + `src/scripts/console.ts`: markup and DOM wiring. All output via `textContent`
  (visitor text is never HTML). Links only from the site's own data.
- Sticky at the bottom of the window (no overlap with the footer at the end of the page). Output is a `role="log"`
  live region; the input has a label; Enter runs, Tab completes, ↑ ↓ history.
- History kept in `sessionStorage` (survives `cat` navigation); open/closed state remembered in `localStorage`.
  Both wrapped in try/catch; the console works without them.
- Without JavaScript the console stays hidden (`hidden` attribute) and the site is unchanged.
- Commands: help, whoami, about, ls [blog/ projects/ favorites/], cat <post>|about.md|reading.txt, projects, blog,
  reading, favorites, contact, suggest, open linkedin|github|rss|llms, email, cd ~ | cd .. | cd <section>, pwd,
  history, date, echo, clear, plus jokes (sudo, rm, exit). Unknown → `command not found: x. type help`.
- Drafts are never listed or opened (posts come from the published list).
