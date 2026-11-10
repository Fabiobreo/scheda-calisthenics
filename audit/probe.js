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

  // carattere visivo (sezione H): vanno misurati a pagina ferma, in cima, dopo ~1,5 s dall'apertura (animazioni finite)
  const shown = (el) => {
    const b = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return b.width > 0 && b.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && parseFloat(cs.opacity) > 0;
  };
  // H2: parole nella prima schermata, fuori dalla navigazione (la pagina "a colpo d'occhio")
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let foldWords = 0;
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement;
    if (!el || el.closest('nav, .sr-only, script, style, [aria-hidden="true"]') || !shown(el)) continue;
    const r = document.createRange();
    r.selectNodeContents(n);
    const b = r.getBoundingClientRect();
    if (b.height === 0 || b.top >= innerHeight || b.bottom <= 0) continue;
    foldWords += n.textContent.trim().split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
  }
  // H3: dati disegnati invece che scritti: grafici con un nome (role="img", svg con aria-label) da almeno 40 px, più i
  // segni dell'app che disegnano un numero (anello, serie a blocchetti, pallini della settimana)
  const drawnData = [...document.querySelectorAll('[role="img"], svg[aria-label], .ring, .blocks, .dots')].filter((el) => {
    const b = el.getBoundingClientRect();
    const graphic = el.matches('.blocks, .dots') || (b.width >= 40 && b.height >= 40);
    return shown(el) && graphic && !el.closest('nav');
  }).length;
  // H5: righe di esercizio (programma, Oggi, record, elenco) con un pittogramma
  const exRows = [...document.querySelectorAll('.pitem, .today-list li, .rrow, .ex-list .entry')].filter(shown);
  const exRowsWithIcon = exRows.filter((el) => el.querySelector('svg')).length;

  return {
    url: location.pathname,
    foldWords,
    drawnData,
    exRows: exRows.length,
    exRowsWithIcon,
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
