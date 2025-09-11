(() => {
  const PASS = '6767';
  const KEY = 'km_auth_ok';

  const unlocked = () => {
    try { return sessionStorage.getItem(KEY) === '1'; } catch { return false; }
  };
  const lock = () => {
    try { sessionStorage.removeItem(KEY); } catch {}
  };
  const unlock = () => {
    try { sessionStorage.setItem(KEY, '1'); } catch {}
  };

  if (unlocked()) return;

  // Create blocking overlay
  const style = document.createElement('style');
  style.textContent = `
    #km-gate{position:fixed;inset:0;background:#0b0d12;color:#e6e8eb;z-index:2147483647;display:flex;align-items:center;justify-content:center;font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,Helvetica,Arial,sans-serif}
    #km-box{width:min(92vw,440px);background:#141821;border:1px solid #263041;border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,.35);padding:20px}
    #km-title{margin:0 0 8px;font-size:20px}
    #km-note{margin:0 0 16px;font-size:14px;color:#9aa4b2}
    #km-form{display:flex;gap:8px}
    #km-input{flex:1;padding:10px 12px;border-radius:8px;border:1px solid #324055;background:#0f131a;color:#e6e8eb}
    #km-btn{padding:10px 14px;border-radius:8px;border:0;background:#3b82f6;color:#fff;cursor:pointer}
    #km-err{margin-top:10px;color:#f87171;font-size:13px;min-height:1.1em}
    #km-seo{position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden}
  `;
  const wrap = document.createElement('div');
  wrap.id = 'km-gate';
  wrap.innerHTML = `
    <div id="km-box" role="dialog" aria-modal="true" aria-labelledby="km-title">
      <h1 id="km-title">Dočasne uzamknuté</h1>
      <p id="km-note">Táto stránka je dočasne chránená heslom. Zadaj heslo pre prístup.</p>
      <form id="km-form">
        <input id="km-input" type="password" inputmode="numeric" autocomplete="off" placeholder="Zadaj heslo" aria-label="Heslo" />
        <button id="km-btn" type="submit">Odomknúť</button>
      </form>
      <div id="km-err" aria-live="polite"></div>
      <p id="km-seo">Nová stránka o kritickom myslení tu bude čoskoro.</p>
    </div>`;

  const submit = (e) => {
    e?.preventDefault();
    const val = input.value.trim();
    if (val === PASS) {
      unlock();
      // Remove overlay and proceed
      wrap.remove();
      style.remove();
      return;
    }
    err.textContent = 'Nesprávne heslo. Skús znova.';
    input.focus();
    input.select?.();
  };

  document.addEventListener('DOMContentLoaded', () => input.focus());

  document.documentElement.prepend(style);
  document.body ? document.body.appendChild(wrap) : document.addEventListener('readystatechange', () => { if (document.readyState === 'interactive' || document.readyState === 'complete') document.body.appendChild(wrap); });

  const form = wrap.querySelector('#km-form');
  const input = wrap.querySelector('#km-input');
  const err = wrap.querySelector('#km-err');
  form.addEventListener('submit', submit);
})();

