# 18 — Audit: interventi rapidi, secondo blocco (A10, A12, A13, A17, A18, A23)

- **Fonte**: [audit del 9 novembre 2026](../audit/AUDIT.md), interventi 10, 12, 13, 17, 18 e 23 della lista "Cosa migliorerei".
- **Figura professionale**: frontend + backend (una migration) + UX.
- **Dipende da**: 17. **Sblocca**: —
- **Stima**: S–M.
- **Punti attesi**: circa +10 (A3, A4, C5, C7, D2, E7, E10).

## Decisioni dell'utente (9 novembre 2026)

1. **A10**: chi ha un codice d'invito valido può vedere il **solo nome** del trainer prima dell'accesso.
2. **A20** (magic link): **rimandato** finché non c'è un SMTP in produzione; con il limite dell'email di Supabase
   rischierebbe di bloccare anche conferme e reset della password.
3. **A18**: lo storico del peso si apre **in un pannello dalla Home** (non in Grafici).

## Cosa fare e criteri di accettazione

| # | Intervento | Criterio (misurato come nell'audit) |
|---|---|---|
| A10 | Il link d'invito mostra il nome del trainer sulla schermata di accesso | aprendo `/invito/<codice>` senza account si legge chi invita |
| A12 | Code splitting e `robots.txt` | JS iniziale ≤ 160 KB gzip; Lighthouse SEO 100 |
| A13 | Scheletri di caricamento | nessun "Caricamento…" su schermo vuoto |
| A17 | Ricerca nel catalogo | si trova un esercizio scrivendone il nome o un sinonimo |
| A18 | Storico del peso con mini-grafico | dalla Home si vedono, aggiungono, correggono ed eliminano le pesate |
| A23 | Stili inline in classi | `style={{` nei `.tsx` ≤ 10 |

## Stato

**Fatto il 9 novembre 2026.** Audit rifatto: **53,7 → 63,9** (A 9,7 → 10,9; C 10 → 15; D 7 → 8; E 3 → 6).
Lighthouse 95 / 100 / 100 / 100. Test unitari 181 verdi, test del database 177 verdi (6 nuovi).

Come è fatto:

- **A10** — migration `0014_invite_public_name.sql`: `invite_trainer_name(code)` restituisce solo il nome visualizzato
  del trainer di un codice valido, eseguibile anche senza accesso; nessuna lettura dei codici, collegarsi resta possibile
  solo dopo l'accesso (test in `invite_public.test.sql`). La schermata di accesso aperta da un invito parte da
  "Registrati" e mostra "Marco ti ha invitato: vuole seguirti come tuo trainer"; con un codice non valido lo dice.
  Dopo l'accesso la domanda "Collegarti a Marco?" compare subito, senza dover toccare "Continua".
- **A12** — le schermate non necessarie all'apertura (Account, Atleti, schede modello, Esercizi, Grafici, accesso) si
  scaricano quando servono (`lazy()`). Il client Supabase è ridotto a `@supabase/auth-js` + `@supabase/postgrest-js`
  (`src/lib/supabase.ts`) con le stesse opzioni di `createClient` di supabase-js 2.109: **stessa chiave della sessione**
  nel localStorage, quindi chi era dentro resta dentro dopo l'aggiornamento (verificato: `sb-<progetto>-auth-token`).
  Storage, realtime e functions non servivano. JS iniziale **191 → 153 KB** gzip. Aggiunto `public/robots.txt`.
  `usePasswordRecovery` è passato in `app/session.tsx` (la schermata d'accesso non si carica più per chi è già dentro).
- **A13** — `Skeleton` in `components/ui.tsx`: forma della pagina con un riflesso che scorre (fermo con "riduci
  movimento"), al posto di tutti i "Caricamento…"; versione `inline` dentro le schede.
- **A17** — `SearchSelect` in `components/ui.tsx` (combobox ARIA: frecce, Invio, Esc): si scrive e l'elenco si
  restringe per nome, gruppo o sinonimo del catalogo ("pull up" trova le trazioni), senza accenti e maiuscole. In fondo
  alla pagina si apre verso l'alto. Usato dove si sceglie dal catalogo: Scheda (aggiungi esercizio), Esercizi (aggiungi),
  programma dell'atleta e schede modello del trainer. I menu corti (esercizi propri, progressioni) restano `<select>`.
- **A18** — `WeightSheet` (Home → "Storico" accanto al peso): grafico con la scala tra minimo e massimo, elenco con la
  differenza dalla pesata precedente, nuova pesata o correzione per una data, eliminazione con "Annulla". Il trainer lo
  vede in sola lettura.
- **A23** — spaziature e titoli in classi (`mt-8`…`mt-16`, `day-title`, `copy-title`, `between`, `span-all`); colori
  dei tipi come classi (`dot forza`, `g-bar volume`…); opacità dell'avatar da variabili CSS. Restano 8 `style` con
  valori calcolati (larghezze delle barre, timer, variabili dell'avatar).

Note per chi rifà l'audit: la misura del JS iniziale ora è la somma dei `.js` che `dist/index.html` carica subito
(vedi "Come si rifà l'audit", punto 5).
