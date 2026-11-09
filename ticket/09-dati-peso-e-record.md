# 09 — Dati: peso corporeo e record di livello

- **Punto PDF**: 5 (peso corporeo editabile in qualsiasi momento; record personali registrati nel tempo)
- **Figura professionale**: sviluppatore backend Postgres/Supabase (migration, RLS, test pgTAP).
- **Dipende da**: 05 (decisioni su storico e peso), 08 (forma degli input). **Sblocca**: 10, 15.
- **Stima**: M

## Contesto

- [profiles](../supabase/migrations/0005_profiles.sql) ha solo `display_name` e `is_trainer`: niente peso corporeo.
- I "record personali" di oggi sono calcolati dalla miglior serie delle registrazioni
  ([stats.ts](../src/lib/stats.ts) `personalBest`), mostrati nella Scheda. I record del sistema di livelli sono un'altra
  cosa: progressione + secondi/ripetizioni/kg per 15 sotto-esercizi fissi.
- Regole di accesso: i dati sono dell'atleta; il trainer collegato legge (`is_coach_of`).

## Cosa fare

1. **Peso corporeo con storico**: tabella `body_weights (user_id, date, kg)` — una riga per giorno, l'ultima è il peso
   attuale. Lo storico serve se il punteggio usa il peso del giorno del record (05, domanda 13) e per un futuro grafico del
   peso.
2. **Record di livello**: tabella `level_records (id, user_id, sub_id, stage, value, unit, date, note, created_at)`,
   dove `sub_id` è il sotto-esercizio (es. `planche`), `stage` la progressione/fase (`straddle`, `wide`, …), `value` i
   secondi/ripetizioni/kg. Vincoli `check` sui valori ammessi coerenti col 08.
3. RLS: l'utente legge/scrive i suoi; il trainer collegato legge soltanto (stessa logica di `entries`).
4. `delete_own_account` ed export dei dati devono includere le tabelle nuove.
5. Repo + hook React Query (`useBodyWeight`, `useLevelRecords`, mutazioni) in `src/data/`.
6. Seed locale: l'atleta di prova con peso e qualche record, per vedere subito la Home piena.
7. Test pgTAP: isolamento tra utenti, lettura del trainer, vincoli.

## Criteri di accettazione

- Migration provata con `npx supabase db reset` e `npx supabase test db`.
- Un utente non vede peso e record di un altro; il trainer collegato li vede, quello scollegato no.
- Eliminando l'account spariscono anche peso e record.

## Domande aperte

1. ~~Peso corporeo: storico o un solo valore?~~ **Deciso (05)**: storico; ogni record si calcola col peso del suo
   giorno. Solo l'atleta inserisce peso e record, il trainer legge.
2. I record di livello possono essere **dedotti dagli allenamenti** registrati (es. registro "Straddle planche 8 s" → il
   record si aggiorna da solo)? Consiglio: v1 inserimento a mano in Home, v2 proposta automatica ("Hai fatto 8 s di
   straddle: aggiorno il record?").
3. Il record ha bisogno di una prova (video/foto) per un futuro trainer che lo "verifica"? Per ora proposta no.
4. Unità del peso: solo kg? (Il documento dice kg.)

## Stato

**Fatto il 9 novembre 2026** (migration `0012_levels.sql`, test `supabase/tests/database/levels.test.sql`,
`src/lib/levels/bodyweight.test.ts`, `src/lib/levels/db.test.ts`). Nessun cambio visibile nell'app oltre all'export
dei dati: lo schermo per inserire peso e record è il ticket 10.

Decisioni (9 novembre 2026):

1. **Peso del giorno del record**: l'ultimo peso inserito fino a quel giorno; se il record è più vecchio di ogni peso, il
   primo inserito dopo. Il calcolo lo fa l'app (`bodyweightOn`): correggere un peso ricalcola i record.
2. I record si inseriscono **a mano** nella v1 (niente deduzione dagli allenamenti; in v2 una proposta "aggiorno il
   record?").
3. Record e peso possono avere una **data passata, mai futura**.
4. Niente prova (video/foto), solo **kg**.

Come è fatto:

- `body_weights (user_id, date, kg)`: chiave `(user_id, date)`, un peso per giorno (si corregge con un upsert);
  20–300 kg.
- `level_stages (sub_id, stage, min_value, max_value, whole)`: le 56 progressioni dei 14 sotto-esercizi coi limiti
  del 08. `level_records` ha una FK su `(sub_id, stage)` e un trigger che controlla il valore (nei limiti, intero per
  ripetizioni/secondi) e la data (al più domani, per i fusi orari). La colonna `unit` del ticket non c'è: l'unità
  dipende dalla progressione.
- Il test `src/lib/levels/db.test.ts` legge le migration e fallisce se `level_stages` non coincide con `rules.ts`:
  **cambiare un limite delle regole vuol dire scrivere anche una migration** che aggiorna `level_stages` (e, se si
  toglie una progressione, decidere cosa fare dei record esistenti: la FK lo impedisce finché ce ne sono).
- RLS: l'atleta legge e scrive i suoi; il trainer collegato legge soltanto (`my_athletes()`), chi non è collegato non
  vede nulla. L'eliminazione dell'account cancella tutto a cascata.
- App: `Repo` + `supabaseRepo` (`listBodyWeights`, `setBodyWeight`, `deleteBodyWeight`, `listLevelRecords`,
  `createLevelRecord`, `updateLevelRecord`, `deleteLevelRecord`), hook in `src/data/hooks.ts` (`useBodyWeights`,
  `useLevelRecords`, `useLevel` = riepilogo calcolato col motore, e le mutazioni). I record arrivano in ordine di data
  e d'inserimento: a parità di punti vince il più vecchio.
- Export dei dati (Account): aggiunti `bodyWeights` e `levelRecords`.
- Seed: l'atleta di prova ha 3 pesi e 14 record (livello 48, verticale già in ELITE).
- Versioni vecchie dell'app: tabelle nuove, non le toccano.

Prove fatte: migration applicata con `supabase migration up` sul database locale con i dati esistenti (nessuna perdita:
registrazioni, esercizi, programma e profili invariati); pgTAP 166 (30 nuovi), unitari 125; repo provato nell'app locale
(upsert del peso, record creato/modificato/eliminato, valore fuori limite rifiutato dal database).
