# 17 — Audit: interventi rapidi (A01, A02, A04, A11, A16)

- **Fonte**: [audit del 9 novembre 2026](../audit/AUDIT.md), interventi 1, 2, 4, 11 e 16 della lista "Cosa migliorerei".
- **Figura professionale**: UI/UX designer + frontend.
- **Dipende da**: nulla. **Sblocca**: un audit che non perde punti su cose banali.
- **Stima**: S (circa un giorno in tutto).
- **Punti attesi**: +16 (B2 +3, B3 +5, B4 +2, B5 +2, C4 +2, D4 +2).

## Cosa fare

| # | Intervento | Criterio di accettazione (misurato come nell'audit) |
|---|---|---|
| A01 | Bersagli di tocco ≥ 44 px: pulsanti piccoli, link "Modifica", ×, giorni della settimana, controlli segmentati, cerchio dell'account | sonda: elementi sotto 44×44 ≤ 5 % sulle 8 schermate a 375 px |
| A02 | Un `h1` per schermata e `document.title` diverso per ogni schermata | sonda: axe *moderate* = 0, `h1` = 1; titolo diverso su tutte le 8 schermate |
| A04 | "Annulla" nel toast dopo ogni × (programma, record, schede modello, programma dell'atleta visto dal trainer); Archivia e Scollega hanno già la conferma | ogni azione distruttiva ha conferma o annulla |
| A11 | In testata un solo elemento d'identità dell'utente | un solo avatar/iniziale visibile in testata in tutte le schermate |
| A16 | Etichette dei grafici ad almeno 12 px | sonda: testi sotto 12 px = 0 |

## Stato

**Fatto il 9 novembre 2026.** Audit rifatto: **36,7 → 53,7** (B 8 → 20, C 8 → 10, D 4 → 7). Sonda sulle 8 schermate a
375 px: axe 0 violazioni, 0 bersagli sotto 44 px, 0 testi sotto 12 px, un `h1` e un titolo diverso per schermata.
Lighthouse invariato (94 / 100 / 100 / 91).

Come è fatto:

- **A01** — tutto in `styles.css`: `.btn` (anche `.small` e i link con l'aspetto di pulsante) alto almeno 44 px;
  `.link` con area di tocco di 44 px e margini negativi, così il layout non si sposta; `.x`, cerchio dell'account e
  occhio della password a 44 × 44; i sette giorni della settimana a 375 px sbordano di 12 px nel margine della scheda per
  stare a 44 px ciascuno; i link dentro un testo hanno un'area di tocco più alta senza cambiare la riga.
  La sonda misura caselle e radio sull'etichetta che le contiene (si toccano anche da lì).
- **A02** — `PageTitle` in `components/ui.tsx`: `h1` per gli screen reader e `document.title` ("Scheda · Scheda
  Calisthenics"; per atleta e scheda modello il nome). Livello e Grafici dell'atleta nella vista del trainer stanno in un
  `NestedView`, così non sovrascrivono titolo e `h1` della pagina dell'atleta. I sottotitoli `h4` sono diventati `h3`
  (ordine dei titoli).
- **A04** — il toast accetta un'azione (`toast(msg, { label, run })`), resta 6 s invece di 2,2. Annulla rimette: la
  riga del programma dell'atleta com'era (stessa posizione e nota), l'esercizio nei record, la riga del trainer nel
  calendario dell'atleta (in fondo al giorno, con schema e nota: il trainer scrive solo tramite la sua funzione), la riga
  della scheda modello.
- **A11** — il cerchio in alto a destra è l'avatar dell'utente (figura o iniziale) e porta ad Account; il riepilogo
  compatto (ticket 12) non ha più un avatar suo, e l'avatar accanto completa "avatar + livello".
- **A16** — etichette degli assi a 13 unità del grafico (circa 12 px su telefono), suggerimento ed etichetta del record a
  12 px, etichetta ELITE a 12 px.

Fuori dalla lista ma sistemato strada facendo: la regola CSS duplicata della barra in basso (A23, D3) e l'avatar ovale
nell'elenco atleti del trainer.
