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
