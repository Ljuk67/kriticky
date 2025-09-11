// Supabase comments client: fetch + submit
const url = import.meta.env.PUBLIC_SUPABASE_URL;
const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function fmtDate(iso) {
  try { return new Date(iso).toLocaleString('sk-SK'); } catch { return iso; }
}

function ready(fn) {
  if (document.readyState === 'complete' || document.readyState === 'interactive') fn();
  else document.addEventListener('DOMContentLoaded', fn);
}

ready(() => {
  const listEl = document.getElementById('comments-list');
  const form = document.getElementById('comment-form');
  const statusEl = document.getElementById('form-status');
  const slug = listEl?.dataset.slug || '';

  if (!url || !key) {
    if (statusEl) statusEl.textContent = 'Komentáre sú dočasne vypnuté.';
    return;
  }

  const headers = {
    apikey: key,
    Authorization: 'Bearer ' + key,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  async function fetchComments() {
    if (!listEl || !slug) return;
    try {
      const q = new URL(url + '/rest/v1/comments');
      q.searchParams.set('select', 'id,name,message,created_at');
      q.searchParams.set('slug', 'eq.' + slug);
      q.searchParams.set('is_approved', 'eq.true');
      q.searchParams.set('order', 'created_at.asc');
      const res = await fetch(q, { headers });
      const data = await res.json();
      const items = Array.isArray(data) ? data : [];
      if (!items.length) {
        listEl.innerHTML = '<p class="muted">Zatiaľ žiadne komentáre.</p>';
        return;
      }
      listEl.innerHTML = items.map((i) => (
        '<div class="comment">'
        + '<div class="meta"><strong>' + escapeHtml(i.name) + '</strong> · '
        + '<time datetime="' + i.created_at + '">' + fmtDate(i.created_at) + '</time></div>'
        + '<div class="body">' + escapeHtml(i.message) + '</div>'
        + '</div>'
      )).join('');
    } catch (e) {
      if (listEl) listEl.innerHTML = '<p class="error">Nepodarilo sa načítať komentáre.</p>';
    }
  }

  fetchComments();

  if (form) {
    // Block native navigation
    form.addEventListener('submit', (e) => { e.preventDefault(); e.stopPropagation(); });
    const btn = form.querySelector('button[type="button"]') || form.querySelector('button');
    btn?.addEventListener('click', async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      if (!url || !key) return;
      if (statusEl) statusEl.textContent = '';

      const fd = new FormData(form);
      if ((fd.get('hp_field') || '').toString().trim()) {
        if (statusEl) statusEl.textContent = 'Ďakujeme.';
        form.reset();
        return;
      }
      const payload = {
        slug: fd.get('slug'),
        name: (fd.get('name') || '').toString().trim(),
        email: (fd.get('email') || '').toString().trim() || null,
        message: (fd.get('message') || '').toString().trim(),
        is_approved: false,
      };
      if (!payload.name || !payload.message) {
        if (statusEl) statusEl.textContent = 'Vyplň meno a komentár.';
        return;
      }
      try {
        const res = await fetch(url + '/rest/v1/comments', {
          method: 'POST',
          headers: { ...headers, Prefer: 'return=representation' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const body = await res.text().catch(() => '');
          throw new Error('HTTP ' + res.status + ' ' + body);
        }
        if (statusEl) statusEl.textContent = 'Ďakujeme, komentár čaká na schválenie.';
        form.reset();
        fetchComments();
      } catch (e) {
        if (statusEl) statusEl.textContent = 'Chyba pri odosielaní. Skús neskôr.';
        console.error('[comments] submit error', e);
      }
    });
  }
});

