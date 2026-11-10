# 29 — JS iniziale sotto i 160 KB: Scheda e fogli della Home caricati dopo

- **Fonte**: misura A4 di [`audit/AUDIT.md`](../audit/AUDIT.md), voce A12 dell'indice (code splitting). Avviato il 10
  novembre 2026 dopo l'unione dei ticket 25–28 su main.
- **Figura professionale**: frontend (bundle, caricamento).
- **Dipende da**: 18 (primo code splitting), 27 (offline: il service worker deve avere in cache anche i pezzi nuovi).
- **Stima**: S.

L'obiettivo: riportare il JS iniziale sotto i 160 KB gzip (A4 da 1 a 2) senza peggiorare la prima schermata, e senza
far aspettare chi apre la Scheda o un foglio.

## Decisioni (chieste prima di scrivere codice)

| Domanda | Scelta |
|---|---|
| Su quale base | main dopo l'unione del ramo del ticket 27 (`claude/a09-offline-84f582`): misura di partenza 161,7 KB. Al momento del lavoro main era già a quel commit (`9e50347`) |

## Cosa è cambiato

| Intervento | Dove | Come |
|---|---|---|
| **Scheda caricata dopo** | `app/App.tsx` | `SchedaView` passa a `lazy()`, come Grafici, Esercizi e Account. È la seconda voce della barra, non la prima schermata |
| **Fogli della Home caricati dopo** | `features/home/HomeView.tsx` | `RecordSheet` (tocco su un sotto-esercizio) e `WeightSheet` ("Storico" del peso) passano a `lazy()`, ognuno dentro un `Suspense` senza fallback |
| **Scaricati appena il browser è libero** | `lib/idle.ts` (`whenIdle`) | dopo il primo disegno, `requestIdleCallback` (su Safari un ritardo di 1,5 s) scarica Scheda e i due fogli. Chi tocca la barra o un record trova il pezzo già in memoria: nessuno scheletro in più. Il cambio di pagina passa da una transizione di React Router, quindi resta la pagina vecchia finché la nuova è pronta |

Effetto collaterale della divisione: il bundler mette il codice condiviso tra la Home e i pezzi nuovi (hook dei dati,
repository, regole dei livelli) in un pezzo a parte, `hooks-*.js`, che `index.html` precarica con `modulepreload`. Conta
nel JS iniziale ed è incluso nella misura.

## Stato

**Fatto il 10 novembre 2026**, sul ramo `claude/a4-js-iniziale`. Non unito a main.

**Audit A4**: JS iniziale da **161,7 a 156,5 KB** gzip, misurato come dice il passo 5 del metodo (`.js` che
`dist/index.html` carica subito):

| Pezzo | Prima | Dopo |
|---|---:|---:|
| `index-*.js` (script) | 127,36 | 101,81 |
| `toast-*.js` (modulepreload: React, auth-js, postgrest-js, ui) | 34,31 | 34,31 |
| `hooks-*.js` (modulepreload, nuovo) | — | 20,33 |
| **Totale** | **161,67** | **156,45** |

A4 da **1 a 2**. Sezione A da 12,9 a 13,9, totale da 87,9 a **88,9**. Margine sul limite: 3,5 KB.

Pezzi nuovi caricati dopo: `SchedaView` 4,26 KB, `RecordSheet` 2,27, `WeightSheet` 1,96, più tre piccoli pezzi
condivisi tra Scheda e la parte trainer (`WeekDays`, `SchemeForm`, `EntryItem`, 2,35 in tutto).

**Nota sul metodo**: la misura va fatta con `.env.local` presente. Senza, `lib/supabase.ts` lancia un errore all'avvio e
il bundler toglie auth-js e postgrest-js dalla build: `toast` scende a 8 KB e il totale sembra 135,7 KB.

**Verifica** sulla build di produzione (`vite preview`) col service worker, a 375 × 812, atleta e trainer del seed:

| Prova | Esito |
|---|---|
| rete dopo il primo disegno della Home | `SchedaView`, `RecordSheet`, `WeightSheet` e i pezzi condivisi scaricati da soli, senza toccare nulla |
| "Storico" del peso | il foglio si apre e si chiude |
| Fondamentali spinta → Dip | il foglio del record si apre con storico e modulo |
| service worker | i 19 `.js` di `dist/assets` sono tutti nella cache di precache, compresi i 7 nuovi |

**Sonda** (`audit/probe.js`) sulle 8 schermate di riferimento, animazioni chiuse prima della misura: axe 0, nessun
bersaglio sotto 44 px, nessun testo sotto 12 px, nessuno scorrimento orizzontale, un `h1`. Parole in prima schermata
36 / 53 / 71 / 49 / 53 / 41 / 51 / 38, dati disegnati 1 / 7 / 2 / 5 / 0 / 1 / 7 / 1: uguali al ticket 27 tranne la
pagina dell'atleta vista dal trainer (51 parole invece di 49), che dipende dai dati del giorno nel database locale
condiviso, non da questo ticket. **H resta 10,0**.

**Test**: 232 verdi, `tsc -b` e `npm run build` puliti.

**Non verificato**:
- l'offline completo con la rete spenta (la cache del service worker è stata controllata, il giro del ticket 27 no);
- su un telefono vero e su Safari, dove lo scaricamento anticipato parte con un ritardo fisso invece che a browser libero;
- la vista desktop a 1280 px.

**Limiti noti**:
- Chi tocca un record nei primissimi istanti, prima che il browser sia libero, aspetta lo scaricamento del foglio (pochi
  KB, senza scheletro).
- Per scendere ancora (A4 = 3 chiede ≤ 120 KB) i candidati sono il foglio del registratore (`Logger`, `HoldTimer`,
  `WorkoutSummary`, ~9 KB nel pezzo iniziale) e le parti di auth-js che l'app non usa (webauthn, web3, ~5 KB), che però
  arrivano da import statici della libreria.
