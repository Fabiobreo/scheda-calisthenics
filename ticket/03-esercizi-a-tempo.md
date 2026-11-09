# 03 — Esercizi a tempo (secondi) oltre a ripetizioni e peso

- **Punto PDF**: non richiesto esplicitamente, ma necessario per i punti 1 (skill nel catalogo) e 5 (record in secondi).
- **Figura professionale**: sviluppatore full-stack; un UX designer per il logger (inserire i secondi durante
  l'allenamento, con le mani occupate).
- **Dipende da**: 02 (colonna `measure` del catalogo). **Sblocca**: 08, 10, 13.
- **Stima**: L

## Contesto

Oggi ogni serie è `{ weight, reps }` ([types.ts](../src/data/types.ts) `WorkSet`, `entries.sets` jsonb), lo schema della
scheda è serie × ripetizioni × peso, e record e grafici ragionano solo su peso e ripetizioni
([stats.ts](../src/lib/stats.ts)). Planche, front lever, verticale, bandiera, back lever, plank, L-sit si misurano in
**secondi**: oggi non si possono registrare in modo corretto, e il sistema di livelli (05) ne ha bisogno.

## Cosa fare

1. Ogni esercizio ha una **misura**: `reps` (ripetizioni, con peso facoltativo) o `time` (secondi, con peso
   facoltativo). Per il catalogo la decide la voce; per i personalizzati la sceglie l'utente alla creazione.
2. `WorkSet` diventa `{ weight, reps }` oppure `{ weight, seconds }` (o entrambi i campi con uno a 0). Migration che non
   tocca le registrazioni esistenti (sono tutte a ripetizioni) e vincolo sul jsonb aggiornato.
3. Schema della scheda: "3 × 15 s" oltre a "3 × 8".
4. Logger: campo secondi; valutare un cronometro integrato (avvio/stop) per le tenute.
5. Record: miglior serie = più peso, a parità più secondi.
6. Grafici: metrica "secondi (miglior tenuta)" e "secondi totali".
7. Versioni vecchie dell'app: non devono rompersi leggendo una serie a tempo (valutare se nasconderle o mostrarle come 0
   ripetizioni).

## Criteri di accettazione

- Posso programmare "Straddle planche 4 × 8 s", registrarla e vederla nel grafico in secondi.
- I record e i grafici degli esercizi a ripetizioni non cambiano.
- Test unitari per record e serie con esercizi a tempo.

## Domande aperte

1. **Bloccante** — Cronometro integrato nel logger nella prima versione o solo inserimento a mano?
2. Un esercizio personalizzato può cambiare misura dopo essere stato usato? (Consiglio: no, se ha registrazioni.)
3. Serve anche la misura "distanza" o "tempo + ripetizioni" (es. front lever pull up con tenuta finale)? Per ora proposta:
   no.

## Stato

**Fatto il 9 novembre 2026** (migration `0011_timed_sets.sql`, test in `supabase/tests/database/measure.test.sql` e
`src/lib/timed.test.ts`).

Decisioni:

1. **Cronometro completo già ora** nel logger: tasto ▶ su ogni serie a tempo, schermo intero con preparazione
   (No / 3 / 5 / 10 s, ricordata), bip e vibrazione al via, nei 3 secondi prima dell'obiettivo e all'obiettivo,
   pulsante "Stop" grande metà schermo, schermo che non si spegne (Wake Lock). L'obiettivo sono i secondi già scritti
   nella serie (dallo schema del giorno); con "Ferma da solo" (attivo di serie, ricordato) la serie finisce lì e parte
   il recupero. I secondi si possono sempre scrivere anche a mano.
2. Un personalizzato **cambia misura solo finché non ha registrazioni** (lo blocca anche il database); gli schemi già
   in programma seguono con lo stesso numero.
3. **Niente misure miste** (distanza, tempo + ripetizioni): solo ripetizioni o secondi, entrambi con peso facoltativo.
4. Registrazioni e schemi già esistenti degli esercizi del catalogo a tempo (es. "Plank 3 × 60 rip.") sono
   **diventati secondi** con lo stesso numero.
5. I personalizzati esistenti sono **tutti a ripetizioni** (compresi "Planche" e "Front lever" diventati personalizzati
   col ticket 02). Chi non li ha mai registrati può passarli a secondi da Esercizi.

Scelte fatte durante il lavoro (da rivedere se non vanno bene):

- Versioni vecchie dell'app: nelle righe a tempo `reps` **ripete i secondi** invece di valere 0. Così la versione
  vecchia mostra "4 × 8" (com'era prima di questo ticket) e, se modifica o copia una riga, i trigger riportano il
  numero nei secondi: niente perdita di dati. L'app nuova legge solo `seconds`. Quando le versioni vecchie non ci
  saranno più si potrà mettere `reps = 0` nelle righe a tempo.
- Record a tempo: più peso, a parità di peso più secondi (come chiesto). In Record si legge "8 s" a corpo libero,
  "5 kg × 8 s" con zavorra.
- Grafici: per un esercizio a tempo le metriche sono **Miglior tenuta**, **Secondi totali** e **Peso**; restano nella
  stessa posizione di Peso / Rip. totali / Volume, così passando da un esercizio all'altro la scelta ha lo stesso
  ruolo. "Ripetizioni per tipo" non conta le tenute (lo dice sotto il titolo). Il Registro mostra "N s di tenuta"
  accanto alle ripetizioni del giorno.
- Trainer: nelle schede modello e nei giorni dell'atleta, per un nome personalizzato nuovo sceglie lui ripetizioni
  o secondi; per una voce del catalogo (o un esercizio che l'atleta ha già) la misura è fissa. Assegnando la scheda,
  i personalizzati creati per l'atleta nascono con quella misura.
- Secondi per serie: da 1 a 3600 (le ripetizioni restano fino a 1000 negli schemi).

Note per chi viene dopo:

- La misura effettiva è `exercises.measure`; per le voci del catalogo la copia il trigger `exercises_measure`. Se una
  migration futura cambia la misura di una voce o collega dei personalizzati a una voce a tempo, deve **convertire
  prima** le loro serie (`normalize_sets`) e riallineare `exercises.measure`: il trigger blocca il cambio di misura
  dei personalizzati con registrazioni.
- `coach_add_plan_item` ha un parametro in più, `p_seconds`, facoltativo; `ensure_athlete_exercise` uno in più,
  `p_measure`.
- Una versione vecchia dell'app da trainer che copia le settimane di una scheda modello trasforma in ripetizioni i
  nomi personalizzati a tempo copiati (le voci del catalogo no). Caso raro, accettato.
- Il cronometro è provato nel browser del computer; vibrazione e Wake Lock vanno visti su un telefono vero (iPhone
  non vibra da web).
