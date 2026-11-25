// Progressive enhancement: when a command button is tapped, "type" that section's command.
// All text is already in the HTML; with reduced motion nothing is animated.
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function type(el: HTMLElement) {
  const full = el.dataset.full ?? el.textContent ?? '';
  el.dataset.full = full;
  el.textContent = '';
  el.classList.add('typing');
  let i = 0;
  const tick = () => {
    el.textContent = full.slice(0, ++i);
    if (i < full.length) setTimeout(tick, 45);
    else setTimeout(() => el.classList.remove('typing'), 600);
  };
  tick();
}

document.querySelectorAll<HTMLAnchorElement>('nav.commands a[data-section]').forEach((a) => {
  a.addEventListener('click', (event) => {
    const section = document.getElementById(a.dataset.section ?? '');
    if (!section) return; // e.g. on another page: let the browser follow the link home
    // Scroll explicitly so a second tap during a smooth scroll retargets instead of stopping short.
    event.preventDefault();
    history.pushState(null, '', `#${section.id}`);
    section.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    const cmd = section.querySelector<HTMLElement>('.cmd');
    if (cmd && !reduce) type(cmd);
  });
});
