// Supabase comments client: fetch + submit using DOM-provided config

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
  const url = (listEl?.dataset.supabaseUrl || '').trim();
  const key = (listEl?.dataset.supabaseKey || '').trim();

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
      // Fallback: add apikey as URL param in case some environments strip custom headers
      q.searchParams.set('apikey', key);
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
      // Basic client validation mirroring DB constraints
      if (!payload.name || payload.name.length < 2) {
        if (statusEl) statusEl.textContent = 'Meno musí mať aspoň 2 znaky.';
        return;
      }
      if (!payload.message || payload.message.length < 3) {
        if (statusEl) statusEl.textContent = 'Komentár musí mať aspoň 3 znaky.';
        return;
      }
      try {
        const res = await fetch(url + '/rest/v1/comments?apikey=' + encodeURIComponent(key), {
          method: 'POST',
          // Do not request returning rows to avoid SELECT RLS on the inserted row
          headers: { ...headers },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          // Try to parse JSON error from PostgREST for clearer feedback
          let bodyText = '';
          try {
            const txt = await res.text();
            bodyText = txt;
            const j = JSON.parse(txt);
            if (j && j.message) bodyText = j.message;
          } catch {}
          throw new Error('HTTP ' + res.status + (bodyText ? ': ' + bodyText : ''));
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
