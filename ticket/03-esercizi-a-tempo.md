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
