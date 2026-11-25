// Client side of the favorites suggestion flow. All visitor text is written with textContent, never HTML.
const FIELDS = ['url', 'title', 'why', 'name', 'email'] as const;
const NETWORK_ERROR = "Couldn't reach the server. Check your connection and try again.";

async function post(api: string, path: string, body: unknown) {
  const res = await fetch(`${api}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data: data as { error?: string; errors?: Record<string, string>; status?: string } };
}

export function initSuggest() {
  const form = document.querySelector<HTMLFormElement>('#suggest-form');
  const status = document.querySelector<HTMLElement>('#suggest-status');
  if (!form || !status || !form.dataset.api) return;
  const api = form.dataset.api;
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    for (const f of FIELDS) {
      form.querySelector(`[data-error-for="${f}"]`)!.textContent = '';
      form.elements.namedItem(f) instanceof HTMLInputElement && (form.elements.namedItem(f) as HTMLInputElement).removeAttribute('aria-invalid');
    }
    const fd = new FormData(form);
    const body = Object.fromEntries([...FIELDS, 'website'].map((k) => [k, String(fd.get(k) ?? '')]));
    button.disabled = true;
    status.textContent = 'sending…';
    try {
      const { status: code, data } = await post(api, '/suggest', body);
      if (code === 202) {
        form.querySelector('fieldset')!.hidden = true;
        status.textContent = 'Check your inbox: we sent you a confirmation link. It works for 24 hours. (Not there? Look in spam.)';
        return;
      }
      if (code === 400 && data.errors) {
        status.textContent = 'Please fix the highlighted fields.';
        let first: HTMLInputElement | null = null;
        for (const [f, msg] of Object.entries(data.errors)) {
          const input = form.elements.namedItem(f);
          const slot = form.querySelector(`[data-error-for="${f}"]`);
          if (slot) slot.textContent = msg;
          if (input instanceof HTMLInputElement) { input.setAttribute('aria-invalid', 'true'); first ??= input; }
        }
        first?.focus();
        return;
      }
      status.textContent = data.error ?? 'Something went wrong. Please try again later.';
    } catch {
      status.textContent = NETWORK_ERROR;
    } finally {
      button.disabled = false;
    }
  });
}

type Suggestion = { url: string; title: string; why?: string; name?: string };

function decode(token: string): Suggestion | null {
  const [body, sig] = token.split('.');
  if (!body || !sig || token.split('.').length !== 2) return null;
  try {
    const json = atob(body.replace(/-/g, '+').replace(/_/g, '/'));
    const v = JSON.parse(new TextDecoder().decode(Uint8Array.from(json, (c) => c.charCodeAt(0))));
    return typeof v?.url === 'string' && typeof v?.title === 'string' ? v : null;
  } catch {
    return null;
  }
}

export function initConfirm() {
  const root = document.querySelector<HTMLElement>('#confirm');
  const status = document.querySelector<HTMLElement>('#confirm-status');
  if (!root || !status) return;
  const api = root.dataset.api ?? '';
  const token = decodeURIComponent(location.hash.slice(1));
  const s = token ? decode(token) : null;
  if (!s) {
    status.textContent = 'This confirmation link looks broken. Copy the whole link from the email, or suggest the link again.';
    return;
  }
  const set = (id: string, v?: string) => { document.getElementById(id)!.textContent = v || '(none)'; };
  set('confirm-title', s.title); set('confirm-url', s.url); set('confirm-why', s.why); set('confirm-name', s.name);
  document.getElementById('confirm-details')!.hidden = false;

  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = '$ confirm';
  status.before(button);
  button.addEventListener('click', async () => {
    button.disabled = true;
    status.textContent = 'confirming…';
    try {
      const { status: code, data } = await post(api, '/confirm', { token });
      if (code === 201 || code === 200) {
        history.replaceState(null, '', location.pathname); // drop the token from the address bar
        button.remove();
        status.textContent = code === 201
          ? 'Thanks! Your suggestion was sent for review. If it is approved, it will appear on the favorites list.'
          : 'This suggestion was already confirmed. It is waiting for review.';
        return;
      }
      status.textContent = data.error ?? 'Something went wrong. Please try again later.';
      if (code === 400 || code === 410) button.remove();
    } catch {
      status.textContent = NETWORK_ERROR;
    } finally {
      button.disabled = false;
    }
  });
}
