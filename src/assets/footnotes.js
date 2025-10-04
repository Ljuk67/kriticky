// Lightweight footnotes: turns any element with [data-footnote]
// into a tappable/hoverable inline footnote with an accessible popover.
// Usage in Markdown/HTML: <span class="fn" data-footnote="Your explanation here">term</span>

(function(){
  if (typeof document === 'undefined') return;
  const OPEN_CLASS = 'is-open';
  const SEL = '[data-footnote]';
  let openEl = null;
  let openPop = null;
  let sticky = false; // when true, keep popover open until outside click

  function closeAll(){
    if (openEl) { openEl.classList.remove(OPEN_CLASS); }
    if (openPop) {
      openPop.style.opacity = '0';
      openPop.style.pointerEvents = 'none';
    }
    openEl = null;
    openPop = null;
    sticky = false;
  }
  function open(el){
    if (openEl === el) return;
    closeAll();
    el.classList.add(OPEN_CLASS);
    openEl = el;
    const pop = el._fnPopover;
    if (pop) {
      const r = el.getBoundingClientRect();
      const top = Math.round(r.bottom + 8);
      pop.style.top = top + 'px';
      pop.style.opacity = '1';
      pop.style.pointerEvents = 'auto';
      openPop = pop;
    }
  }
  function toggle(el){
    if (openEl === el && sticky) { closeAll(); return; }
    // set sticky on click; hover will not set sticky
    sticky = true;
    open(el);
  }
  function ensureFocusable(el){
    const tag = el.tagName.toLowerCase();
    const focusableTags = ['a','button','input','textarea','select','summary'];
    if (!focusableTags.includes(tag) && !el.hasAttribute('tabindex')) {
      el.setAttribute('tabindex','0');
    }
  }

  function buildPopover(el){
    const note = el.getAttribute('data-footnote') || '';
    const pop = document.createElement('div');
    pop.className = 'fn-popover';
    // add a close button (handy on mobile)
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'fn-close';
    close.setAttribute('aria-label', 'Zavrieť poznámku');
    close.textContent = '×';
    close.addEventListener('click', ()=> closeAll());
    const content = document.createElement('div');
    content.className = 'fn-content';
    content.innerHTML = note; // controlled content from repo
    pop.appendChild(close);
    pop.appendChild(content);
    pop.style.position = 'fixed';
    pop.style.left = '50%';
    pop.style.transform = 'translate(-50%, 0)';
    pop.style.opacity = '0';
    pop.style.pointerEvents = 'none';
    document.body.appendChild(pop);
    el._fnPopover = pop;
    el.classList.add('has-popover');
  }

  function bind(el){
    if (!el || el.dataset.fnBound === '1') return;
    // Ensure focusable and role
    const tag = el.tagName.toLowerCase();
    const focusableTags = ['a','button','input','textarea','select','summary'];
    if (!focusableTags.includes(tag) && !el.hasAttribute('tabindex')) el.setAttribute('tabindex','0');
    el.setAttribute('role','note');
    // Build popover once
    if (!el._fnPopover) buildPopover(el);
    // Events
    el.addEventListener('click', (e)=>{
      if (el.tagName.toLowerCase() === 'a') e.preventDefault();
      toggle(el);
    });
    el.addEventListener('mouseenter', ()=> open(el));
    el.addEventListener('mouseleave', (e)=>{
      const to = e.relatedTarget;
      if (openPop && to && (to === openPop || openPop.contains(to))) return; // moving into popover
      if (!sticky) closeAll();
    });
    // Keep open when hovering the popover, close when leaving both
    const pop = el._fnPopover;
    if (pop){
      pop.addEventListener('mouseenter', ()=> open(el));
      pop.addEventListener('mouseleave', (e)=>{
        const to = e.relatedTarget;
        if (to && (to === el || el.contains(to))) return; // back to trigger
        if (!sticky) closeAll();
      });
    }
    el.addEventListener('keydown', (e)=>{
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(el); }
      if (e.key === 'Escape') { closeAll(); el.blur(); }
    });
    el.dataset.fnBound = '1';
  }

  function init(){
    document.querySelectorAll(SEL).forEach(bind);
    // Observe for dynamically added footnotes (auto-annotation)
    const mo = new MutationObserver((mutations)=>{
      for (const m of mutations){
        if (m.type === 'childList'){
          m.addedNodes.forEach((n)=>{
            if (!(n instanceof Element)) return;
            if (n.matches && n.matches(SEL)) bind(n);
            n.querySelectorAll && n.querySelectorAll(SEL).forEach(bind);
          });
        }
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    document.addEventListener('click', (e)=>{
      if (!openEl) return;
      if (!(e.target instanceof Element)) return;
      // Allow interactions on trigger and the popover without closing
      if (e.target.closest(SEL) === openEl) return;
      if (openPop && e.target.closest('.fn-popover') === openPop) return;
      closeAll();
    });
    document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') closeAll(); });
    window.addEventListener('scroll', ()=>{ if (openEl && !sticky) closeAll(); }, { passive: true });
    window.addEventListener('resize', ()=>{ if (openEl && !sticky) closeAll(); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
