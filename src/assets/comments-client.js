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
  // Track time since comments UI became ready (anti-bot: time-on-page)
  const pageReadyAt = Date.now();
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

      // Require minimal time on page before allowing submit (20s)
      try {
        const elapsed = Date.now() - pageReadyAt;
        const minMs = 2000;
        if (elapsed < minMs) {
          const wait = Math.ceil((minMs - elapsed) / 1000);
          if (statusEl) statusEl.textContent = `Prosím, počkaj aspoň ${wait}s pred odoslaním komentára.`;
          return;
        }
      } catch {}

      // Simple client-side throttle (per slug): max 1 comment / 60s
      try {
        const now = Date.now();
        const k = 'cm:last:' + slug;
        const last = Number(localStorage.getItem(k) || '0');
        if (now - last < 60_000) {
          const wait = Math.ceil((60_000 - (now - last)) / 1000);
          if (statusEl) statusEl.textContent = `To je príliš rýchle ;) - pred odoslaním ďalšieho komentára chvíľu počkaj.`;
          return;
        }
      } catch {}
      const payload = {
        slug: fd.get('slug'),
        name: (fd.get('name') || '').toString().trim(),
        email: (fd.get('email') || '').toString().trim(),
        message: (fd.get('message') || '').toString().trim(),
      };
      // Basic client validation mirroring DB constraints
      if (!payload.name || payload.name.length < 2) {
        if (statusEl) statusEl.textContent = 'Meno musí mať aspoň 2 znaky.';
        return;
      }
      // Require email present and reasonably valid
      if (!payload.email) {
        if (statusEl) statusEl.textContent = 'E‑mail je povinný.';
        return;
      }
      try {
        const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(payload.email);
        if (!emailOk) {
          if (statusEl) statusEl.textContent = 'Zadaj platný e‑mail.';
          return;
        }
      } catch {}
      if (!payload.message || payload.message.length < 3) {
        if (statusEl) statusEl.textContent = 'Komentár musí mať aspoň 3 znaky.';
        return;
      }
      try {
        // Disable button while sending to avoid dupes
        if (btn) {
          btn.disabled = true;
          btn.setAttribute('aria-disabled', 'true');
        }
        // Send to server endpoint that handles verification + insert
        const res = await fetch('/api/comments/submit.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, hp_field: fd.get('hp_field') || '' }),
        });
        let ok = false;
        try {
          const j = await res.json();
          ok = !!(j && j.ok);
        } catch {}
        if (!res.ok || !ok) {
          if (statusEl) statusEl.textContent = 'Komentár sa nepodarilo odoslať. Skús neskôr.';
          throw new Error('Submit failed ' + res.status);
        }
        if (statusEl) statusEl.textContent = 'Skontroluj e‑mail a potvrď komentár. Vďaka!';
        form.reset();
        // Record last successful submit time for client-side throttling
        try { localStorage.setItem('cm:last:' + slug, String(Date.now())); } catch {}
      } catch (e) {
        if (statusEl) statusEl.textContent = 'Chyba pri odosielaní. Skús neskôr.';
        console.error('[comments] submit error', e);
      }
      finally {
        if (btn) {
          btn.disabled = false;
          btn.removeAttribute('aria-disabled');
        }
      }
    });
  }
});
