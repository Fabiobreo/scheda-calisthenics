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
2. In **SQL Editor** esegui il contenuto di [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql)
   (tabelle `exercises`, `entries`, `plan_items` con Row Level Security: ognuno vede solo i propri dati).
3. Copia `.env.example` in `.env.local` e inserisci URL e anon key (Project Settings → API).
4. In **Authentication → URL Configuration** imposta il *Site URL* all'indirizzo dove pubblichi l'app
   (per lo sviluppo anche `http://localhost:5173` tra i *Redirect URLs*): serve per i link di conferma e reset password.

## Pubblicazione (Vercel)

1. Importa il repository su Vercel (preset Vite, rilevato da solo).
2. Aggiungi le variabili `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
3. Deploy. `vercel.json` rimanda tutte le rotte a `index.html`.

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

- **exercises**: catalogo con obiettivo (serie × rip. × kg), tipo (forza/volume/tecnico), recupero in secondi,
  flag `in_records` e archiviazione (archiviare conserva lo storico, eliminare lo cancella).
- **entries**: un esercizio svolto in una data, con `sets` = `[{ weight, reps }, ...]`, difficoltà e `kind`
  (`training` o `attempt` per i tentativi di record).
- **plan_items**: esercizi assegnati a ogni giorno della settimana (0 = lunedì).

I record personali non sono più una lista separata: sono calcolati dalla miglior serie singola
(più peso, a parità di peso più ripetizioni) tra allenamenti e tentativi degli esercizi segnati "nei record".
