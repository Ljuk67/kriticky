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
      // (^|non-letter) (term + optional letters) (word boundary)
      regs.push({ raw: w, re: new RegExp(`(?:^|[^A-Za-zÀ-ž])(${escapeRegex(w)}[A-Za-zÀ-ž]*)\\b`, 'i') });
    }
    // Acronyms: standalone, uppercase only; no trailing letters
    for (const a of acronyms){
      regs.push({ raw: a, re: new RegExp(`(?:^|[^A-Za-zÀ-ž])(${escapeRegex(a)})(?![A-Za-zÀ-ž])`) });
    }
    return regs;
  }

  function shouldSkip(node){
    if (!node || !node.parentElement) return true;
    if (node.parentElement.closest('.fn, .no-footnotes')) return true;
    if (node.parentElement.closest('a')) return true;
    if (node.parentElement.closest('h1,h2,h3,h4,h5,h6')) return true; // never annotate headings
    const p = node.parentElement;
    if (EXCLUDE.has(p.tagName)) return true;
    return false;
  }

  function annotateInNode(node, term, note){
    const text = node.nodeValue;
    for (const { re } of term.regexes){
      const m = re.exec(text);
      if (!m) continue;
      const whole = m[0];
      const inner = m[1];
      const startInner = m.index + whole.indexOf(inner);
      const before = text.slice(0, startInner);
      const match = inner;
      const after = text.slice(startInner + match.length);
      const span = document.createElement('span');
      span.className = 'fn';
      const more = term.moreUrl ? ` <a href="${term.moreUrl}">Viac info &gt;&gt;</a>` : '';
      span.setAttribute('data-footnote', note + more);
      span.textContent = match;
      const frag = document.createDocumentFragment();
      if (before) frag.appendChild(document.createTextNode(before));
      frag.appendChild(span);
      if (after) frag.appendChild(document.createTextNode(after));
      node.parentNode.replaceChild(frag, node);
      return true;
    }
    return false;
  }

  async function run(){
    try{
      const res = await fetch(TERMS_URL, { cache: 'no-store' });
      if (!res.ok) return;
      const entries = await res.json();
      const terms = entries.map((e)=> ({
        note: e.note,
        max: Number.isFinite(e.maxPerPage) ? e.maxPerPage : 1,
        used: 0,
        regexes: buildRegexes(e)
      }));
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
        for (const term of terms){
          if (term.used >= term.max) continue;
          if (annotateInNode(node, term, term.note)){
            term.used++; total++;
            break; // tree changed; continue outer walker loop
          }
        }
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
