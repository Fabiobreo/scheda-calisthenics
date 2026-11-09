// Sonda dell'audit: incollala nella console (o lanciala con uno strumento che esegue JS nella pagina)
// su ogni schermata, a viewport 375×812. Restituisce le metriche automatiche della sezione A di AUDIT.md.
// Versioni fissate perché i numeri restino confrontabili tra un audit e l'altro.
(async () => {
  if (!window.axe) {
    await new Promise((ok, ko) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js';
      s.onload = ok;
      s.onerror = ko;
      document.head.appendChild(s);
    });
  }
  const r = await window.axe.run(document, { resultTypes: ['violations'] });
  const byImpact = { critical: 0, serious: 0, moderate: 0, minor: 0 };
  const rules = {};
  for (const v of r.violations) {
    byImpact[v.impact] += v.nodes.length;
    rules[v.id] = v.nodes.length;
  }

  // bersagli di tocco: elementi interattivi visibili più piccoli di 44×44 (Apple HIG) e di 24×24 (WCAG 2.5.8)
  const sel = 'a[href],button,input,select,textarea,[role=button],[tabindex]:not([tabindex="-1"])';
  const vis = [...document.querySelectorAll(sel)].filter((el) => {
    const b = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return b.width > 0 && b.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
  });
  // caselle e radio dentro un'etichetta: si toccano anche dall'etichetta, quindi conta lei
  const target = (el) => {
    const lab = (el.type === 'checkbox' || el.type === 'radio') && (el.closest('label') || (el.id && document.querySelector(`label[for="${el.id}"]`)));
    return (lab || el).getBoundingClientRect();
  };
  const small44 = vis.filter((el) => {
    const b = target(el);
    return b.width < 44 || b.height < 44;
  });
  const small24 = vis.filter((el) => {
    const b = target(el);
    return b.width < 24 || b.height < 24;
  });

  // testo sotto i 12px (leggibilità in palestra, a braccio teso)
  const tiny = [...document.querySelectorAll('body *')].filter((el) => {
    if (!el.childNodes.length || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) return false;
    const b = el.getBoundingClientRect();
    return b.width > 0 && parseFloat(getComputedStyle(el).fontSize) < 12;
  }).length;

  return {
    url: location.pathname,
    viewport: `${innerWidth}x${innerHeight}`,
    axe: byImpact,
    axeRules: rules,
    interactive: vis.length,
    tapUnder44: small44.length,
    tapUnder24: small24.length,
    tapUnder44Pct: Math.round((small44.length / Math.max(vis.length, 1)) * 100),
    textUnder12px: tiny,
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
    h1: document.querySelectorAll('h1').length,
    title: document.title,
  };
})();
