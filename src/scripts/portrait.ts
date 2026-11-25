// "Decode" the ASCII portrait on load: scrambled characters settle into the face, top to bottom.
// The final text is already in the HTML; with reduced motion (or no JS) it is simply shown as-is.
const GLYPHS = '.:-=+*#%@';
const DURATION_MS = 1500;
const SCRAMBLE_ROWS = 6; // rows still scrambling below the "settled" line

const el = document.querySelector<HTMLPreElement>('pre.portrait');
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (el && !reduce) {
  const final = el.textContent ?? '';
  const rows = final.split('\n');
  el.dataset.animated = 'running';
  const start = performance.now();
  const scramble = (line: string) =>
    line.replace(/[^ ]/g, () => GLYPHS[(Math.random() * GLYPHS.length) | 0]);

  const frame = (now: number) => {
    const settled = Math.floor(((now - start) / DURATION_MS) * (rows.length + SCRAMBLE_ROWS));
    if (settled >= rows.length + SCRAMBLE_ROWS) {
      el.textContent = final;
      el.dataset.animated = 'done';
      return;
    }
    el.textContent = rows
      .map((line, i) => (i < settled - SCRAMBLE_ROWS ? line : i < settled ? scramble(line) : ''))
      .join('\n');
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
