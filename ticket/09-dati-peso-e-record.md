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
