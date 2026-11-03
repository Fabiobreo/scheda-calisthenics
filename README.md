# Scheda Calisthenics

Registro allenamenti installabile sul telefono (PWA): programma settimanale, serie con peso e ripetizioni per ognuna,
timer di recupero, record personali e grafici di progresso. Dati nel cloud (Supabase) con login, sincronizzati tra dispositivi.

Stack: React 19 + TypeScript + Vite, TanStack Query, Supabase (Postgres + Auth + RLS), vite-plugin-pwa.

## Avvio in locale

Lo sviluppo usa una copia di Supabase sul tuo computer: database, login e API, separati dalla produzione.
Serve [Docker Desktop](https://www.docker.com/products/docker-desktop/) avviato.

```bash
npm install
npx supabase start      # la prima volta scarica le immagini; stampa URL e chiavi
```

Copia `.env.example` in `.env.local` e inserisci `API URL` e `anon key` (o *publishable key*) stampati da `supabase start`
(li rivedi con `npx supabase status`). Poi:

```bash
npm run dev
```

- **Account di prova** (dal seed [`supabase/seed.sql`](supabase/seed.sql), solo in locale): `atleta@scheda.test`
  con esercizi, storico e programma, e `trainer@scheda.test`. La password è scritta nel file di seed.
- **Studio** (tabelle, utenti, SQL): http://127.0.0.1:54323
- **Email** di conferma e reset password: http://127.0.0.1:54324 (nessuna mail esce davvero)
- `npx supabase db reset` ricrea il database da zero con tutte le migration e il seed: è anche il modo di provarle prima del deploy.
- `npx supabase stop` ferma tutto (i dati restano per il prossimo `start`).

## Test

```bash
npm test                 # test unitari (record, grafici, date, copia della settimana)
npx supabase test db     # test del database: isolamento tra utenti (RLS), vincoli, eliminazione account
```

I test del database stanno in [`supabase/tests/database/`](supabase/tests/database/) (pgTAP) e girano sul Supabase locale.
Ogni migration nuova va provata con `npx supabase db reset` e `npx supabase test db` prima del push:
in produzione viene applicata dal deploy.

## Progetto Supabase di produzione

1. Crea un progetto gratuito su [supabase.com](https://supabase.com).
2. Lo schema sta in [`supabase/migrations/`](supabase/migrations/) e lo applica il deploy (vedi "Migration automatiche").
3. In **Authentication → URL Configuration** imposta il *Site URL* all'indirizzo dove pubblichi l'app:
   serve per i link di conferma e reset password.

## Pubblicazione (Vercel)

1. Importa il repository su Vercel (preset Vite, rilevato da solo).
2. Aggiungi le variabili `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`, e `SUPABASE_DB_URL` (vedi sotto).
3. Deploy. `vercel.json` rimanda tutte le rotte a `index.html`.

### Migration automatiche

Nei deploy di **produzione** `npm run build` finisce con [`scripts/migrate.mjs`](scripts/migrate.mjs), che lancia
`supabase db push` e applica le migration di `supabase/migrations/` non ancora presenti nel database
(la cronologia sta in `supabase_migrations.schema_migrations`). Se una migration fallisce, fallisce il build e il codice
nuovo non viene pubblicato. Le anteprime e i build locali non toccano il database.

Per aggiungere una modifica allo schema basta un nuovo file `supabase/migrations/000N_nome.sql` nello stesso commit del codice.

Configurazione, una volta sola:

1. Supabase → **Connect** → *Session pooler*: copia la stringa di connessione (`postgresql://postgres.<ref>:<password>@aws-…pooler.supabase.com:5432/postgres`)
   e mettici la password del database (se ha caratteri speciali, codificali per URL). Serve il pooler perché l'host diretto è solo IPv6 e Vercel non ci arriva.
2. Su Vercel aggiungila come `SUPABASE_DB_URL`, solo per l'ambiente **Production**.
3. Solo per un database creato lanciando a mano `0001_init.sql`: esegui una volta [`supabase/mark_0001_applied.sql`](supabase/mark_0001_applied.sql)
   nel SQL Editor, così il deploy non prova a ricreare le tabelle.

Dal telefono: apri il sito → menu del browser → **Aggiungi a schermata Home**.

## Script

| Comando | Cosa fa |
| --- | --- |
| `npm run dev` | server di sviluppo |
| `npm test` | test unitari |
| `npx supabase test db` | test del database (serve `supabase start`) |
| `npm run build` | type-check + build di produzione con service worker |
| `npm run generate-pwa-assets` | rigenera le icone da `public/icon.svg` |

## Struttura

```
src/
  app/          sessione/login, toast, timer di recupero, shell e navigazione
  data/         tipi, interfaccia Repo, implementazioni Supabase e locale, hook React Query
  features/     scheda (record + programma), logger a serie, grafici, registro, esercizi, auth
  lib/          date, formattazione, statistiche (pure e testate)
supabase/migrations/  schema SQL
```

## Modello dati

- **profiles**: uno per utente, creato dal trigger alla registrazione; per ora il nome visualizzato.
  L'utente può eliminare il proprio account (`delete_own_account()`), e con lui spariscono tutti i suoi dati.
- **catalog_exercises**: catalogo comune a tutti gli utenti, in sola lettura (cambia solo con le migration).
  Id stabili e leggibili (`trazioni`, `dip`…), categoria (tirata, spinta, gambe, core, skill), tipo predefinito e sinonimi
  ("pull up", "chin up"…) per riconoscere i nomi scritti a mano.
- **coach_links** e **trainer_invites**: trainer e atleti. La modalità trainer è un flag del profilo (`is_trainer`),
  attivabile da chiunque. Il trainer genera un codice d'invito (uno per volta: rigenerarlo invalida il vecchio);
  l'atleta vede il nome del trainer e conferma (`preview_invite`, `accept_invite`). Da lì il trainer **legge**
  esercizi, registrazioni e programma dell'atleta (`is_coach_of` nelle policy), senza poterli modificare, finché uno
  dei due non chiude il collegamento (`end_coach_link`). Un solo trainer attivo per atleta. Collegamenti e codici
  cambiano solo tramite queste funzioni, mai con insert/update diretti.
- **exercises**: gli esercizi dell'utente, senza serie né ripetizioni. Ognuno è collegato a una voce del catalogo
  (`catalog_id`, al massimo una volta per utente; il nome viene dal catalogo) oppure è personalizzato (`name` proprio,
  unico per utente, maiuscole a parte). In più tipo (forza/volume/tecnico), flag `in_records` e archiviazione
  (archiviare conserva lo storico, eliminare lo cancella). Così "Trazioni" è un solo esercizio nei grafici, qualunque
  schema si usi, e lo stesso esercizio per atleti e trainer.
- **entries**: un esercizio svolto in una data, con `sets` = `[{ weight, reps }, ...]`, difficoltà e `kind`
  (`training` o `attempt` per i tentativi di record). Una data futura vuol dire allenamento in programma:
  compare nello storico come "In programma" ed entra in record e grafici solo quando arriva quel giorno.
- **plan_items**: esercizi programmati in una data del calendario (`date`), con `sets`/`reps`/`weight`/`rest_seconds`
  del giorno (obbligatori: lo schema sta solo qui). Un esercizio al massimo una volta per giorno. Nell'app si scorre
  settimana per settimana e una settimana si può copiare nelle successive.

I record personali non sono più una lista separata: sono calcolati dalla miglior serie singola
(più peso, a parità di peso più ripetizioni) tra allenamenti e tentativi degli esercizi segnati "nei record".
