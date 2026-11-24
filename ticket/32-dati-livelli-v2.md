# 32 — Dati dei livelli v2: peso nel record, via lo storico del peso, conversione dei record

- **Fonte**: [30](30-specifica-punteggi-v2.md), decisioni 2, 8 e 9.
- **Figura professionale**: backend (Postgres/Supabase, RLS, migration).
- **Dipende da**: 31 (elenco definitivo di catene e voci). **Sblocca**: 34.
- **Stima**: M.

## Contesto

[0012_levels.sql](../supabase/migrations/0012_levels.sql): `level_stages (sub_id, stage, min, max, whole)` con i limiti,
`level_records (sub_id, stage, value, date)` con chiave esterna su `level_stages` e trigger di controllo,
`body_weights (user_id, date, kg)` con vincolo 20–300. Il peso di un record oggi è quello del suo giorno, cercato
nello storico (`bodyweightOn` in [bodyweight.ts](../src/lib/levels/bodyweight.ts)). La coda offline (27) salva record e
peso con `createLevelRecord` / `setBodyWeight`. Oggi i record in produzione sono solo quelli di prova di Michael.

## Cosa fare

1. **Migration `0015_levels_v2.sql`**:
   - `level_records.bodyweight_kg numeric(5,2)` (vuoto ammesso: serve solo alle voci che lo usano), riempito per i
     record esistenti col peso del loro giorno (stessa regola di `bodyweightOn`); vincolo 30–250.
   - `level_stages`: nuove righe per tutte le voci del 30, coi limiti nuovi (rip. 1–50, secondi 1–60, kg 0–400 o
     > 0–400) e una colonna `uses_bodyweight`; il trigger rifiuta un record senza peso se la voce lo richiede.
   - **Conversione** dei record esistenti, poi cancellazione delle voci vecchie:
     | Oggi (`sub_id / stage`) | Diventa |
     |---|---|
     | trazioni, muscle-up, dip, hspu `/ zavorra` | stessa catena, voce zavorrata (stesso significato: sola zavorra) |
     | military, panca-piana `/ bilanciere` | voce massimale |
     | oap `/ gomito, bicipite, spalla, oap` | OAP A, B, C, D |
     | planche `/ tuck, advanced-tuck, one-leg, straddle, full, maltese` | Planche A–F |
     | planche `/ half-lay` | Straddle al massimo (10 s) |
     | planche `/ wide` | Full al massimo (10 s) |
     | planche-push-up, planche-press `/ half-lay` | Straddle al massimo |
     | front-lever `/ …, wide, victorian` | Front lever A–H |
     | front-lever-touch, front-lever-pull-up `/ tuck` | **eliminato** (30, decisione 8) |
     | front-lever-touch, front-lever-pull-up `/ advanced-tuck … wide` | A–F |
     | verticale `/ verticale` | Verticale (valori oltre 60 s portati a 60) |
     | verticale `/ straddle-mono-braccio, full-mono-braccio` | OAHS straddle (G), OAHS (H) |
     | hspu `/ libera` | HSPU liberi (D) |
   - **`body_weights` si elimina** (30, decisione 9: il peso esiste solo dentro i record), con le sue policy e il
     trigger, dopo aver copiato i pesi nei record.
   - `check_level_record` aggiornato; stesse policy RLS sui record.
2. **App**:
   - `LevelRecordRow` e `LevelRecordInput` con `bodyweightKg`; `supabaseRepo`, coda offline e cache persistita
     aggiornati (le scritture in coda fatte con la versione vecchia si scartano con un avviso, non si ripetono
     all'infinito).
   - Via: `useBodyWeights`, `useSetBodyWeight`, `useDeleteBodyWeight`, `bodyweight.ts`,
     [WeightSheet.tsx](../src/features/home/WeightSheet.tsx), il peso nella vista del trainer e in Account, il passo del
     peso nel primo accesso (28). `useLevel` legge solo i record.
3. **Test**: `db.test.ts` (limiti del motore = `level_stages`), pgTAP `levels.test.sql` e `measure.test.sql`, `seed.sql`.
4. **Rilascio**: migration e app insieme. Una PWA vecchia ancora in cache scriverebbe voci che non esistono più (errore di
   chiave esterna): il service worker si aggiorna al primo avvio, il messaggio d'errore deve dire "aggiorna l'app".

## Criteri di accettazione

- Dopo la migration i record di Michael ci sono tutti tranne quelli elencati come eliminati, ognuno col suo peso dove
  serve.
- Non esiste più nessun punto dell'app che chieda o mostri un peso fuori dal foglio del record.
- `npm run migrate` idempotente; test pgTAP verdi.

## Stato

**Fatto il 24 novembre 2026** sul ramo `claude/ticket-32-dati-v2-903f79`. Niente push, niente merge, **nessuna migration
applicata a un database Supabase** (né remoto né locale: vedi "Verifica").

**Cosa c'è**

- [`supabase/migrations/0015_levels_v2.sql`](../supabase/migrations/0015_levels_v2.sql):
  - `level_records.bodyweight_kg numeric(5,2)`, vuoto ammesso, vincolo 30–250; riempito col peso del giorno del
    record (stessa regola di `bodyweightOn`: l'ultimo fino a quel giorno, se no il primo dopo), poi tolto dove la voce
    non lo usa;
  - conversione dei record secondo la tabella qui sopra (`updated_at`, data e nota non cambiano);
  - `level_stages` riscritta con le 64 voci del motore v2 e due colonne nuove, `min_exclusive` e `uses_bodyweight`
    (i nomi `sub_id` e `stage` restano: `sub_id` è la catena, `stage` la voce);
  - `check_level_record` aggiornato: voce esistente, valore nei limiti (kg > 0), peso obbligatorio se la voce lo usa
    e **azzerato in silenzio** se non lo usa, data non nel futuro. I due errori che può ricevere un'app vecchia
    rimasta in cache (voce che non esiste più, record senza peso) dicono di aggiornare l'app;
  - `body_weights` eliminata con le sue due policy, il trigger e `check_body_weight()`.
  - RLS: le policy dei record ("own level records", "trainer reads athlete level records") e delle voci non
    cambiano; il trainer legge il peso perché è una colonna del record. Nessun'altra funzione leggeva queste
    tabelle (`delete_own_account` cancella l'utente e va a cascata).
- Test:
  - [`db.test.ts`](../src/lib/levels/db.test.ts) confronta `level_stages` (ultimo `insert` delle migration) con
    `stageLimits()` del v2, comprese `minExclusive` e `usesBodyweight`;
  - [`conversion.test.ts`](../src/lib/levels/conversion.test.ts) (nuovo): ogni progressione del motore vecchio ha una
    sorte scritta nella migration e finisce su una voce del v2, la tabella del ticket riga per riga, il ponte qui sotto;
  - [`levels.test.sql`](../supabase/tests/database/levels.test.sql) riscritto (43 test): voci, peso obbligatorio / fuori
    limiti / non salvato, kg > 0, voci tolte, RLS, trainer, eliminazione dell'account;
  - [`offline.test.ts`](../src/data/offline.test.ts): salvataggi di versione vecchia scartati;
  - [`scripts/prova-migration-0015.mjs`](../scripts/prova-migration-0015.mjs) (nuovo): esegue davvero le migration
    0001–0015 su un Postgres in memoria (PGlite), con 42 record nel formato vecchio che coprono ogni riga della
    tabella, e poi `levels.test.sql`. PGlite non è tra le dipendenze del progetto: come lanciarlo è scritto in testa
    allo script.
- App:
  - `LevelRecordRow` / `LevelRecordInput` con `bodyweightKg`; `supabaseRepo` legge e scrive `bodyweight_kg`;
  - via `BodyWeight`, `listBodyWeights` / `setBodyWeight` / `deleteBodyWeight`, `useBodyWeights`, `useSetBodyWeight`,
    `useDeleteBodyWeight`, `bodyweight.ts` col suo test, `WeightSheet.tsx`, il riquadro del peso in Home (anche nella
    vista del trainer), il peso nell'export di Account e nei testi, il passo "Il tuo peso" del primo accesso (ora 3
    passi). `useLevel` legge solo i record;
  - coda offline: ogni salvataggio porta `v` (`QUEUE_FORMAT = 2`). Quelli rimasti in coda da una versione vecchia
    (`setBodyWeight`, `deleteBodyWeight`, `createLevelRecord` e `updateLevelRecord` senza `v`) non si inviano: si
    tolgono al primo invio con l'avviso "Era stato salvato con una versione vecchia dell'app: inseriscilo di nuovo".
    Allenamenti ed eliminazioni di record restano validi. La cache persistita si scarta già da sola a ogni versione
    nuova (`buster`).

**Il confine col ticket 34** (la pagina Livello non è stata riscritta)

`HomeView`, `RecordSheet`, `levelView`, `LevelStrip`, `App`, `AccountView`, `AtletiView` usano ancora il **motore
vecchio** (`src/lib/levels/rules.ts` + `engine.ts`): numeri 0–200, zona ELITE, avatar a 20 stadi. Per farli lavorare
sui dati nuovi c'è un ponte provvisorio, [`src/lib/levels/legacy.ts`](../src/lib/levels/legacy.ts), da cancellare nel 34:

- in lettura `useLevel` rinomina le 7 voci che hanno cambiato nome (`massimale` → `bilanciere` per panca e military,
  `avambraccio` → `gomito`, `oap/ripetizioni` → `oap`, `oahs-straddle`, `oahs`, `liberi`) e passa al motore vecchio
  il peso scritto nel record. `useLevelRecords` (avvisi del trainer, export) dà le voci v2 così come sono;
- in scrittura `RecordSheet` propone solo le progressioni vecchie che sono ancora voci del database, salva
  l'identificativo v2, chiede il **peso corporeo dentro il foglio** quando la voce lo usa (precompilato con l'ultimo
  inserito) e controlla valore e peso anche coi limiti del v2 (zavorra > 0, secondi ≤ 60, peso 30–250).

Cosa quindi **non funziona come nel v2** finché non c'è il 34:

1. I punteggi mostrati sono quelli vecchi (0–200), non i punti v2: il rilascio va fatto insieme al 34, come già scritto
   nell'indice.
2. Le voci nate col v2 (australian, trazioni/dip/muscle up a ripetizioni, bench dip, push up, pike, HSPU a muro,
   verticale a muro, OAHS assistite, OAP zavorrato) **non si possono inserire** dalla pagina vecchia; se ci sono (es.
   il push up del `seed.sql`) non contano nel livello vecchio, nello storico compaiono col loro identificativo e si
   possono solo eliminare.
3. Planche half lay e wide, planche push ups / press half lay, front lever touch / pull ups tuck non compaiono più tra
   le progressioni.
4. I limiti del campo sono ancora quelli vecchi dove sono più stretti (es. planche 1–10 s invece di 1–60).
5. Un record convertito senza peso (vedi scelta 3) mostra "manca il peso" e vale il minimo della sua fase, come prima.

Restano inutilizzate in `styles.css` le classi `.weight` e `.bw-in` e quelle del foglio del peso: non le ho tolte per
non entrare in conflitto col ramo del 33.

**Verifica**

- `npm test` 375 verdi (16 file), `npx tsc -b` e `npm run build` puliti.
- **Supabase locale non disponibile** su questa macchina (Docker non installato): `supabase db reset` e
  `supabase test db` **non sono stati eseguiti**. Al loro posto `node scripts/prova-migration-0015.mjs` (PGlite,
  Postgres in WebAssembly): migration 0001–0015 applicate senza errori, 39 record convertiti e 3 eliminati come da
  tabella, `body_weights` e il suo controllo spariti, policy invariate, `levels.test.sql` 43 su 43. Limiti di questa
  prova: schema `auth`, ruoli e pgTAP sono imitazioni scritte nello script, non quelli di Supabase; gli altri file di
  `supabase/tests` e il `seed.sql` nuovo non sono stati eseguiti. **Da fare prima del rilascio**, dove c'è Docker:
  `supabase db reset && supabase test db`.
- Non provato nel browser: l'app nuova ha bisogno della colonna `bodyweight_kg`, cioè di un database con la 0015.
- `measure.test.sql`, citato al punto 3, non ha niente su livelli o peso: non è cambiato.

**Scelte dove il ticket e il motore non dicono** (lettura più prudente; le prime tre **confermate il 24 novembre 2026**)

1. **Zavorra 0** (prima ammessa come "corpo libero, non conta"): nel v2 non è un valore valido (30, decisione 14) e
   non ha un equivalente → il record **si elimina**. Non l'ho trasformato in un record a ripetizioni: sarebbe un dato
   inventato.
2. **Planche push ups e planche press half lay → "Straddle al massimo"**: il ticket dà il numero solo per la planche
   (10 s). Ho usato il valore che completa il livello a 60 kg: **5 ripetizioni** (push ups) e **3** (press). Sotto i
   60 kg di peso corporeo non è il 100% del livello (la formula normalizza sul peso), ed è così anche per i 10 s della
   planche: non ho alzato il valore per compensare.
3. **Record che usa il peso ma non ne trova uno** nello storico (nessun peso inserito, oppure peso tra 20 e 30 o tra
   250 e 300 kg, limiti vecchi): il record **resta, senza peso**; il motore v2 lo ignora finché l'atleta non lo
   corregge aggiungendo il peso (il database rifiuta ogni altra modifica a quel record finché manca). La migration
   scrive un avviso con quanti sono. Non ho eliminato né aggiustato niente.
4. **Peso mandato per una voce che non lo usa**: il database non rifiuta, lo azzera (così cambiare voce a un record
   non fallisce per un peso rimasto).
5. **Record rimasto su una voce sconosciuta** dopo la conversione: la migration si ferma (chiave esterna) invece di
   cancellarlo. Con le 56 progressioni della 0012 non può succedere: lo controlla `conversion.test.ts`.
6. Il ticket chiedeva limiti dei kg "0–400 o > 0–400": col motore attuale sono **tutti > 0** (30, decisione 14).
