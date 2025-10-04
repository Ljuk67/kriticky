// Auto-annotate footnotes based on a maintainable list in /footnotes-terms.json
// Skips code/links/etc. and only annotates up to maxPerPage occurrences per term.
(function(){
  if (typeof document === 'undefined') return;
  const TERMS_URL = '/footnotes-terms.json';
  const EXCLUDE = new Set(['A','CODE','PRE','SCRIPT','STYLE','BUTTON','INPUT','TEXTAREA']);
  const MAX_TOTAL = 64; // safety guard

  function escapeRegex(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  function buildRegexes(entry){
    const words = [entry.term].concat(entry.aliases || []);
    const acronyms = entry.acronyms || [];
    const regs = [];
    // Word forms: allow inflectional endings; avoid Unicode property escapes for broad support
    for (const w of words){
      // Allow flexible whitespace between words in aliases (incl. NBSP)
      const pat = escapeRegex(w).replace(/\\\s/g, '\\s').replace(/\s+/g, '\\s+');
      // (^|non-letter) (term + optional letters) (word boundary)
      regs.push({ raw: w, re: new RegExp(`(?:^|[^A-Za-zÀ-ž])(${pat}[A-Za-zÀ-ž]*)\\b`, 'i') });
    }
    // Acronyms: standalone, uppercase only; no trailing letters
    for (const a of acronyms){
      regs.push({ raw: a, re: new RegExp(`(?:^|[^A-Za-zÀ-ž])(${escapeRegex(a)})(?![A-Za-zÀ-ž])`) });
    }
    return regs;
  }

  function normKey(s){ return (s || '').toString(); }

  function shouldSkip(node){
    if (!node || !node.parentElement) return true;
    if (node.parentElement.closest('.fn, .no-footnotes')) return true;
    if (node.parentElement.closest('a')) return true;
    if (node.parentElement.closest('h1,h2,h3,h4,h5,h6')) return true; // never annotate headings
    const p = node.parentElement;
    if (EXCLUDE.has(p.tagName)) return true;
    return false;
  }

  function annotateManyInNode(node, terms, limit) {
    let current = node;
    let count = 0;
    while (current && current.nodeType === Node.TEXT_NODE && (limit == null || count < limit)) {
      const text = current.nodeValue || '';
      let best = null;
      for (const term of terms) {
        if (term.used >= term.max) continue;
        for (const { re } of term.regexes) {
          re.lastIndex = 0;
          const m = re.exec(text);
          if (!m) continue;
          const whole = m[0];
          const inner = m[1];
          const startInner = m.index + whole.indexOf(inner);
          if (
            best === null ||
            startInner < best.start ||
            (startInner === best.start && inner.length > best.inner.length)
          ) {
            best = { term, start: startInner, inner };
          }
        }
      }
      if (!best) break;
      // Split current text node into before | match | after
      const afterStart = best.start + best.inner.length;
      const matchNode = current.splitText(best.start); // current now "before", matchNode is match+after
      const afterNode = matchNode.splitText(best.inner.length); // matchNode is match, afterNode is after
      const span = document.createElement('span');
      span.className = 'fn';
      const more = best.term.moreUrl ? ` <a href="${best.term.moreUrl}">Viac info &gt;&gt;</a>` : '';
      span.setAttribute('data-footnote', best.term.note + more);
      if (best.term.key) span.setAttribute('data-fn-key', best.term.key);
      span.textContent = best.inner;
      matchNode.parentNode.replaceChild(span, matchNode);
      best.term.used++;
      count++;
      // Continue scanning the remainder of the original text
      current = afterNode;
    }
    return count;
  }

  async function run(){
    try{
      const res = await fetch(TERMS_URL, { cache: 'no-store' });
      if (!res.ok) return;
      const entries = await res.json();
      const terms = entries.map((e)=> ({
        key: normKey(e.key || e.term),
        note: e.note,
        moreUrl: e.moreUrl,
        max: Number.isFinite(e.maxPerPage) ? e.maxPerPage : 1,
        used: 0,
        regexes: buildRegexes(e)
      }));
      // Initialize used counts based on existing annotations (persist across runs)
      try {
        for (const t of terms) {
          if (!t.key) continue;
          const sel = `.fn[data-fn-key="${CSS && CSS.escape ? CSS.escape(t.key) : t.key}"]`;
          t.used = document.querySelectorAll(sel).length;
        }
      } catch {}
      if (!terms.length) return;

      const rootNodes = Array.from(document.querySelectorAll('.prose, main'));
      let total = 0;
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode(n){ return n.nodeValue && n.nodeValue.trim().length ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT; }
      });
      while (walker.nextNode()){
        const node = walker.currentNode;
        if (total >= MAX_TOTAL) break;
        if (shouldSkip(node)) continue;
        total += annotateManyInNode(node, terms, MAX_TOTAL - total);
      }
    }catch(e){ /* ignore */ }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
  // Also run again after window load and small delays (late content)
  window.addEventListener('load', ()=>{ run(); setTimeout(run, 500); setTimeout(run, 1500); });
  // Re-run when password gate overlay is removed
  try {
    const mo = new MutationObserver((mutations)=>{
      for (const m of mutations){
        m.removedNodes && m.removedNodes.forEach((n)=>{ if (n && n.id === 'km-gate') run(); });
      }
    });
    mo.observe(document.body || document.documentElement, { childList: true, subtree: true });
  } catch {}
})();
