# 38 — Punteggi sul server, profilo pubblico e classifiche

- **Fonte**: `GraficaPDF` pagina 5 (Home), mockup "Home" (Classifica: Media / Handbalance / Skill spinta…; Amici,
  Provincia, Regione, Italia, Mondo), risposte di Michael del 24 novembre.
- **Figura professionale**: backend (Postgres, RLS, prestazioni) + product owner (privacy).
- **Dipende da**: 31, 32. **Sblocca**: 39.
- **Stima**: L.

## Contesto

Oggi non esiste niente di sociale: l'unico legame tra persone è trainer–atleta (0007). Il livello **non è salvato**: lo
calcola l'app dai record. Una classifica ha bisogno dei punti di tutti sul server. `profiles` ha nome, `is_trainer`,
figura dell'avatar; niente provincia o regione.

## Cosa fare

1. **Punti sul server** — tabella `level_scores (user_id, total, ft, fs, st, ss, hb, rules_version, updated_at)`:
   la scrive l'app dell'utente ogni volta che il suo livello cambia (dopo un record, dopo la sincronizzazione offline,
   all'avvio se `rules_version` è vecchia). RLS: ognuno scrive solo la sua riga; vincoli 0–1400 e 0–7000.
   Perché non calcolare sul server: le formule vivrebbero in due posti (TypeScript e SQL) e i record sono comunque
   dichiarati dall'utente, quindi il server non garantirebbe niente di più. Se un giorno servirà (gare, premi) si
   sposta lo stesso motore in una Edge Function.
2. **Luogo e visibilità del profilo** — in `profiles`: `country` (ISO), `province` (sigla, solo per l'Italia), `region`
   (derivata dalla provincia), `is_private boolean`.
   - **Alla registrazione** l'utente indica il suo luogo: nazione e, se Italia, provincia da elenco (107 province,
     niente posizione GPS). Chi è già iscritto lo indica la prima volta che apre la Home; si cambia da Account.
   - **Profilo pubblico o privato come su Instagram** (39): pubblico = chiunque può seguirlo e lo vede nelle
     classifiche col suo nome; privato = lo si segue solo dopo richiesta accettata, e fuori da chi lo segue la sua
     riga non compare (resta contato nella posizione degli altri e vede la propria).
   - Nelle classifiche si mostra **il nome dell'utente** per intero.
3. **Classifiche** — funzione `ranking(scope, metric)`:
   - `scope`: **amici** (le persone che seguo, più me), **provincia**, **regione**, **nazione**, **mondo**;
     `metric`: punteggio generale o una delle 5 categorie;
   - chi non è in Italia non ha provincia e regione: quei due riquadri mostrano "—";
   - restituisce posizione dell'utente, numero di partecipanti e le righe intorno (prime 3 + vicini), non l'elenco
     intero; `security definer` con solo i campi pubblici; indici su `(province, total)`, `(region, total)`,
     `(country, total)`, `total` e per categoria.
4. **Motore**: `levelSummary` espone i 6 numeri da salvare; test che `level_scores` segua i record (anche dopo una
   eliminazione).
5. **Privacy** (collegato ad A05, ancora aperto): informativa aggiornata prima di accendere le classifiche pubbliche;
   minori; cancellazione dell'account = riga tolta dalle classifiche.
6. Test pgTAP: RLS (nessuno legge record o peso di altri, solo i punti), posizioni corrette, profilo non pubblico
   invisibile fuori dagli amici.

## Criteri di accettazione

- Posizione e totale partecipanti corretti per i 5 ambiti e le 6 metriche su dati di prova.
- Un profilo privato non compare col nome a chi non lo segue in Provincia/Regione/Nazione/Mondo.
- La registrazione non si completa senza il luogo; chi è già iscritto lo inserisce al primo ingresso in Home.
- Classifica nazionale sotto 200 ms con 50.000 righe di prova.

## Decisioni (Michael, 24 novembre 2026)

1. La prima pastiglia della classifica si chiama **"Generale"** (nel mockup "Media"): è il punteggio complessivo
   dell'utente, cioè la somma delle 5 categorie (0–7000), ed è chiaro che riguarda tutto il profilo.
2. Ambiti: **amici, provincia, regione, nazione, mondo**; il luogo si indica alla registrazione.
3. Profili pubblici o privati come su Instagram.
4. Si mostra il nome dell'utente.

5. **Chi si iscrive parte privato** (Fabio, 25/11): `is_private` vale `true` per i profili nuovi e per quelli già
   esistenti; si diventa pubblici dalle impostazioni dell'account. Niente passo di scelta alla registrazione.
6. **Titolare del trattamento: Fabio Brea** (Fabio, 25/11), come persona. Va scritto nell'informativa (A05).

## Domande aperte

1. Il **contatto** da scrivere nell'informativa per le richieste sui dati (email): manca ancora. (Fabio, bloccante
   per il rilascio, non per lo sviluppo) Con nome e provincia visibili l'informativa va pubblicata prima di accendere
   le classifiche.

## Stato

**Fatto il 25 novembre 2026** sul ramo `claude/ticket-38-classifiche-bd3b16`. Niente push, niente merge, **nessuna
migration applicata a un database Supabase** (né remoto né locale: vedi "Verifica"). Da rilasciare insieme alle
migration `0015` e `0016`: l'app nuova legge colonne di `profiles` che esistono solo dopo la `0017`.

**Cosa c'è**

- [`supabase/migrations/0017_rankings.sql`](../supabase/migrations/0017_rankings.sql):
  - `provinces` (107 righe: sigla, nome, regione), leggibile da tutti;
  - `profiles`: `country` (due lettere), `province` (solo con `country = 'IT'`, chiave esterna su `provinces`),
    `region` (la scrive un trigger dalla provincia, qualunque cosa mandi il client), `is_private` **`true` per i
    profili nuovi e per quelli esistenti**; un profilo pubblico deve avere il nome (vincolo);
  - `create_profile` legge nazione e provincia dai metadati della registrazione; valori mancanti o sbagliati restano
    vuoti, la registrazione non fallisce;
  - `level_scores (user_id, total, ft, fs, st, ss, hb, rules_version, updated_at)` più una copia di luogo e
    visibilità del profilo, tenuta allineata dai trigger (serve agli indici: non possono stare a cavallo di due
    tabelle). Vincoli 0–1400, 0–7000 e **complessivo = somma delle 5 categorie**. RLS: ognuno legge e scrive solo la
    sua riga. Un'app con regole più vecchie non sovrascrive punti scritti con regole più nuove;
  - `follows (follower, followee, status, created_at)`: **solo la tabella**, in sola lettura per i due interessati
    (vedi scelta 2);
  - `ranking(ambito, metrica)` e `ranking_overview(metrica)`, `security definer`, solo per chi ha fatto l'accesso:
    posizione, partecipanti, i miei punti e le righe (prime 3 visibili + 2 sopra e 2 sotto di me), di ogni riga solo
    posizione, nome, punti e identificativo. Indici su `(province, total)`, `(region, total)`, `(country, total)`,
    `total` e uno per categoria;
  - eliminando l'account spariscono punti e righe di `follows` (a cascata).
- Test del database: [`rankings.test.sql`](../supabase/tests/database/rankings.test.sql) (72 test pgTAP: i 5 ambiti e
  le 6 metriche, pari merito, profili privati invisibili a chi non li segue ma contati, richiesta in attesa che non
  basta, chi non è in Italia, chi non ha punti, RLS su punti / profili / record / `follows`, vincoli, copia di luogo e
  visibilità, registrazione coi metadati, chi non ha fatto l'accesso, eliminazione dell'account) e
  [`scripts/prova-migration-0017.mjs`](../scripts/prova-migration-0017.mjs).
- Motore: `RULES_VERSION` in `rules.ts` e `levelScores(summary)` in `engine.ts`, che dà i 6 numeri da salvare (gli
  stessi che si vedono nell'app).
- App:
  - [`scoreSync.ts`](../src/data/scoreSync.ts) + `useScoreSync` ([hooks.ts](../src/data/hooks.ts)): i punti sul
    server seguono i record. Si riscrivono dopo un record nuovo, corretto o eliminato (fino a tornare a zero), dopo
    l'invio dei salvataggi fatti offline e all'avvio se la versione delle regole salvata è più vecchia. Si scrive
    solo con la rete, senza niente in coda e con record e punti appena riletti dal server;
  - registrazione ([AuthScreen.tsx](../src/features/auth/AuthScreen.tsx)): "Nazione" (Italia già scelta) e
    "Provincia"; senza il luogo "Crea account" non parte. Nessun passo sulla visibilità: una riga dice che il profilo
    nasce privato, col link all'informativa;
  - Account, scheda "Luogo e classifiche": nazione, provincia (la regione si legge sotto), interruttore "Profilo
    pubblico" con conferma che dice che cosa diventa visibile, link a Classifiche e all'informativa;
  - pagina [Classifiche](../src/features/classifiche/ClassificheView.tsx) (`/classifiche`, si apre da Account):
    pastiglie Generale / Handbalance / Skill spinta / Fondamentali spinta / Skill tirata / Fondamentali tirata, 5
    riquadri (Amici, Provincia, Regione, Nazione, Mondo) con "#4 su 12" o "—", foglio della classifica con prime 3,
    vicini, la mia riga evidenziata e il segno "⋯" dove le righe saltano. `RankingBoard` è il blocco che il 39 mette
    nella Home;
  - [informativa sulla privacy](../src/features/privacy/PrivacyView.tsx) (`/privacy`, si legge anche senza account):
    titolare **Fabio Brea**, dati, scopi, chi vede cosa, dove stanno, diritti;
  - elenco di province e nazioni in [`places.ts`](../src/lib/places.ts) (i nomi delle nazioni li dà il browser in
    italiano); un test controlla che le province coincidano con la tabella del database.

**L'email di contatto dell'informativa manca ancora** (domanda aperta 1). Non è stata inventata: si legge da
`VITE_PRIVACY_EMAIL` (`.env.example`, variabili di Vercel). Finché non c'è:

- l'informativa dice che l'indirizzo non è ancora stato indicato;
- **"Profilo pubblico" resta spento per tutti** ("I profili pubblici si potranno attivare quando l'informativa sulla
  privacy sarà completa"): nome e luogo non diventano visibili prima che l'informativa dica a chi scrivere. È un
  blocco dell'app, non del database (vedi scelta 6).

**Verifica**

- `npx vitest run` 345 verdi (17 file; nuovi `places.test.ts`, `scoreSync.test.ts`, `rankingView.test.ts`),
  `npx tsc -b` e `npm run build` puliti. JS iniziale 94,5 KB gzip per `index`; Classifiche (2,5 KB), campi del luogo
  (2,7 KB) e informativa si scaricano a parte.
- **Supabase non disponibile su questa macchina** (manca Docker): `supabase db reset` e `supabase test db` **non sono
  stati eseguiti**, e la `0017` non è mai girata su un Postgres di Supabase. Al loro posto
  `node scripts/prova-migration-0017.mjs` (PGlite, Postgres in WebAssembly):
  - migration 0001–0017 applicate senza errori; due account "di prima" restano privati, senza luogo, coi record
    intatti;
  - `rankings.test.sql` 72 su 72, `levels.test.sql` 43 su 43;
  - 50.000 account di prova (90% in Italia sulle 107 province, 4 su 5 privati, 5% senza punti): posizione,
    partecipanti e righe di `ranking()` uguali a un conto fatto a parte per 6 utenti × 5 ambiti × 6 metriche
    (180 classifiche); classifica nazionale tra 5 e 30 ms secondo la posizione (criterio: 200 ms), riepilogo dei 5
    ambiti tra 13 e 115 ms.
  Limiti di questa prova: schema `auth`, ruoli e pgTAP sono imitazioni scritte nello script; i tempi sono di PGlite,
  non di Supabase; gli altri file di `supabase/tests` e il `seed.sql` non sono stati eseguiti. **Da fare prima del
  rilascio**, dove c'è Docker: `supabase db reset && supabase test db`, e rimisurare i tempi.
- **Browser, con un finto Supabase in memoria** (un piccolo server locale che risponde al posto di Supabase, porta
  5188 per l'app: nessuna richiesta è arrivata a un database vero, niente è stato scritto su Supabase). Dati finti: un
  profilo, tre record, classifiche inventate. A 390×844:
  - registrazione: senza provincia "Scegli la provincia." e nessuna richiesta; con Milano la richiesta porta
    `{ country: 'IT', province: 'MI' }` e sotto il menu compare "Regione: Lombardia";
  - all'ingresso l'app scrive una volta sola i punti (348 + 322 + 200 = 870) e non li riscrive;
  - Classifiche senza luogo: scheda "Dove ti alleni?", Provincia / Regione / Nazione con "—"; salvato il luogo i
    riquadri si riempiono (Milano, Lombardia, Italia); foglio della nazione con prime 3, "⋯", vicini, pari merito e
    riga "tu"; Esc chiude e il fuoco torna sul riquadro; nessuno scorrimento orizzontale, nessun bersaglio sotto 44 px;
  - Account senza `VITE_PRIVACY_EMAIL`: interruttore spento col motivo; con un indirizzo di prova: conferma, poi
    `is_private: false` e testo aggiornato;
  - informativa con e senza indirizzo; 1280×800: i 5 riquadri in una riga.
- **Non visto**: niente di tutto questo con un database vero (posizioni reali, RLS dal client, il trigger della
  registrazione con GoTrue vero, l'email di conferma); l'offline (punti riscritti dopo l'invio della coda) è coperto
  solo dai test della decisione, non provato nel browser; VoiceOver / TalkBack veri.

**Scelte dove il ticket non dice** (da far vedere a Fabio e Michael)

1. **I punti li scrive l'app, non il server**, come dice il punto 1 del ticket: le formule restano solo in
   `src/lib/levels/v2`. Non esiste quindi SQL che duplica il motore, né una verifica "TypeScript = SQL" da fare. Il
   database controlla limiti e somma, non che i punti corrispondano ai record: chi sa usare le API può scriversi
   7000 punti. Se serviranno classifiche "garantite" (gare, premi) va portato il motore in una Edge Function.
2. **`follows` nasce qui**, ma solo come tabella: l'ambito "amici" e la visibilità dei privati ne hanno bisogno.
   Seguire, accettare, rifiutare, bloccare restano del 39. Fino ad allora "Amici" è sempre "#1 su 1".
   "Amici" = chi seguo io con richiesta accettata (è la proposta del 39, domanda 1): essere seguiti non basta.
3. **Partecipa chi ha almeno un punto.** Chi non ha record non conta nei partecipanti e non ha posizione ("—").
   In una categoria in cui si hanno 0 punti si è ultimi a pari merito, non esclusi.
4. **Pari merito**: stessa posizione (1, 1, 3). Tra pari l'ordine delle righe è fisso ma arbitrario.
5. **Righe**: prime 3 *visibili* e 2 visibili sopra e 2 sotto. I privati non seguiti si capiscono dai salti di
   posizione (1, 2, 4) e dal "⋯": si sa che c'è qualcuno, non chi.
6. **Profili pubblici spenti finché manca l'email dell'informativa.** È una mia lettura di "bloccante per il
   rilascio": così il resto si può rilasciare senza esporre nomi. Se preferite un altro interruttore, è una riga in
   `src/lib/privacy.ts`.
7. **Chi è già iscritto** non viene fermato da una schermata: trova "Dove ti alleni?" in cima a Classifiche e la
   scheda in Account. Il ticket dice "al primo ingresso in Home", che arriva col 39.
8. **Classifiche è una pagina a sé**, raggiunta da Account, non una voce della barra: la barra cambia col 39.
9. **Ordine delle pastiglie**: Generale, poi le categorie nell'ordine delle schede di Livello (HB, SS, FS, ST, FT).
10. **Nazione**: elenco ISO completo, Italia per prima; alla registrazione è già scelta Italia. Province: le 107
    dell'elenco ISTAT con "Sud Sardegna" (la riforma sarda del 2025 non è recepita).
11. **Il trainer collegato** legge anche nazione, provincia e visibilità dell'atleta (la policy esistente dà tutto il
    profilo). Scritto nell'informativa.
12. **Informativa**: il testo è una bozza scritta da me a partire da quello che l'app fa davvero. Va riletta da
    Fabio (e, per stare tranquilli, da chi se ne intende) prima del rilascio. Cita Supabase e Vercel come fornitori,
    senza dire in che paese stanno i server: non lo so.

**Non fatto, di proposito**

- **Minori** (punto 5): non c'è una decisione e l'app non chiede l'età. Va deciso (in Italia il consenso digitale
  vale dai 14 anni) prima di accendere i profili pubblici.
- Home, cerca persone, seguire, novità: 39.
- `profiles.avatar_body` resta com'è.
- `seed.sql` non dà un luogo agli account di sviluppo: si imposta da Account.
