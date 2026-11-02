# Scheda Calisthenics

Registro allenamenti installabile sul telefono (PWA): programma settimanale, serie con peso e ripetizioni per ognuna,
timer di recupero, record personali e grafici di progresso. Dati nel cloud (Supabase) con login, sincronizzati tra dispositivi.

Stack: React 19 + TypeScript + Vite, TanStack Query, Supabase (Postgres + Auth + RLS), vite-plugin-pwa.

## Avvio in locale

```bash
npm install
npm run dev
```

Senza configurazione l'app parte in **modalità locale**: tutto funziona, ma i dati restano nel `localStorage` del browser.

## Collegare Supabase

1. Crea un progetto gratuito su [supabase.com](https://supabase.com).
2. Lo schema (tabelle `exercises`, `entries`, `plan_items` con Row Level Security: ognuno vede solo i propri dati) sta in
   [`supabase/migrations/`](supabase/migrations/) e lo applica il deploy (vedi "Migration automatiche").
   Per un database solo di sviluppo puoi anche eseguire i file, in ordine, nel **SQL Editor**.
3. Copia `.env.example` in `.env.local` e inserisci URL e anon key (Project Settings → API).
4. In **Authentication → URL Configuration** imposta il *Site URL* all'indirizzo dove pubblichi l'app
   (per lo sviluppo anche `http://localhost:5173` tra i *Redirect URLs*): serve per i link di conferma e reset password.

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
| `npm test` | test unitari (calcolo record, serie per grafici, formattazione) |
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

- **exercises**: catalogo dei movimenti, senza serie né ripetizioni: nome (unico per utente, maiuscole a parte),
  tipo (forza/volume/tecnico), flag `in_records` e archiviazione (archiviare conserva lo storico, eliminare lo cancella).
  Così "Trazioni" è un solo esercizio nei grafici, qualunque schema si usi.
- **entries**: un esercizio svolto in una data, con `sets` = `[{ weight, reps }, ...]`, difficoltà e `kind`
  (`training` o `attempt` per i tentativi di record). Una data futura vuol dire allenamento in programma:
  compare nello storico come "In programma" ed entra in record e grafici solo quando arriva quel giorno.
- **plan_items**: esercizi programmati in una data del calendario (`date`), con `sets`/`reps`/`weight`/`rest_seconds`
  del giorno (obbligatori: lo schema sta solo qui). Un esercizio al massimo una volta per giorno. Nell'app si scorre
  settimana per settimana e una settimana si può copiare nelle successive.

I record personali non sono più una lista separata: sono calcolati dalla miglior serie singola
(più peso, a parità di peso più ripetizioni) tra allenamenti e tentativi degli esercizi segnati "nei record".
