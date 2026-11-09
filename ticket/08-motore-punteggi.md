# 08 — Motore di calcolo dei punteggi

- **Punti PDF**: 5, 6
- **Figura professionale**: sviluppatore TypeScript attento alla logica e ai test (TDD: prima i casi di prova del 05,
  poi il codice).
- **Dipende da**: 05 (regole approvate), 02 (nomi). **Sblocca**: 09, 10, 11, 12, 15.
- **Stima**: M

## Contesto

Le regole stanno in [05-specifica-livelli.md](05-specifica-livelli.md). Oggi nel codice non esiste nulla di simile; la
logica pura sta in `src/lib/` con test vitest accanto (es. [stats.ts](../src/lib/stats.ts)).

## Cosa fare

1. `src/lib/levels/` con:
   - **definizione dichiarativa** delle regole (dati, non `if` sparsi): per ogni sotto-esercizio punti massimi, tipo di
     input (kg / progressione + secondi / progressione + ripetizioni / secondi / ripetizioni), tabelle, formule, fasi
     elite e condizioni di sblocco. Così cambiare una soglia è cambiare un numero.
   - `scoreSub(record, bodyweight)` → `{ points, percent, zone: 'base' | 'elite', phase, unlocked }`
   - `scoreCategory(records, bodyweight)` → 0–200
   - `overallLevel(categories)` → 0–200 (media)
   - `avatarStage(level)` → stadio dell'avatar + intensità di aura/scosse (0–1)
   - `availableOptions(sub, records)` → quali progressioni/fasi elite mostrare (le elite nascoste finché non sbloccate)
   - validazione degli input (limiti: secondi 1–10/1–120, ripetizioni, kg > 0).
2. Test: tutti i casi di prova approvati nel 05, più i bordi (0, soglia esatta, oltre il massimo, peso corporeo mancante).
3. Nessuna dipendenza da React o Supabase: lo stesso codice serve alla Home, al riepilogo compatto e alla vista trainer.

## Criteri di accettazione

- Copertura del 100% delle regole del 05, tutti i casi di prova verdi.
- Una soglia si cambia in un solo punto.
- Senza peso corporeo i sotto-esercizi a kg restano "da completare" senza errori (il peso è richiesto in Home).

## Domande aperte

1. Se in futuro le regole cambiano (nuove soglie), i livelli già raggiunti si ricalcolano con le regole nuove? (Consiglio:
   sì, il livello è sempre calcolato e mai salvato; in caso di cambi grossi si avvisa l'utente.)
2. Valutare se serve versionare le regole (es. "regole 2027") per mostrare storicamente il livello: per ora proposta no.

## Stato

**Fatto il 9 novembre 2026** (`src/lib/levels/`, test in `src/lib/levels/engine.test.ts`). Nessuna migration, nessun
cambio visibile nell'app: il motore lo usano i ticket 09, 10, 12, 15.

Decisioni (9 novembre 2026):

1. Le 4 **interpretazioni adottate** del 05 sono confermate, e anche le **definizioni dei movimenti** così come sono:
   il 05 è approvato.
2. **Livello** = media delle 5 categorie **già arrotondate per difetto** (quelle che si vedono sulle barre), poi per
   difetto. Es. 59, 59, 59, 59, 60 → 59.
3. Il livello è **sempre ricalcolato** dai record e mai salvato; niente versioni delle regole. Se un giorno le soglie
   cambiano in modo grosso, si avvisa l'utente con un messaggio.

Come è fatto:

- `rules.ts` contiene **solo dati**: categorie, 14 sotto-esercizi (il 09 diceva 15, ma il 05 ne elenca 14), fasi
  (0 = base, 1–2 = ELITE) coi punti massimi, progressioni con tabelle (esplicite o "x punti per unità") e i record in
  kg come `lim((R − offset·PC) / (span·PC))`. Cambiare una soglia = cambiare un numero lì. I testi delle definizioni
  stanno nello stesso file.
- `engine.ts`: `scoreRecord`, `scoreSub` (migliore di sempre), `scoreCategory`, `overallLevel`, `avatarStage`,
  `levelSummary` (tutto insieme per la Home), `availableOptions` (progressioni e limiti del campo), `suggestNext`
  (progressione successiva quando il valore è al massimo), `validateRecord`, `validateBodyweight`.
- Forma del record, pensata per il 09: `{ subId, stage, value, bodyweightKg }`. `bodyweightKg` è il peso del giorno del
  record (05, decisione 13): lo deve risolvere il 09 dallo storico del peso. La firma `scoreSub(record, bodyweight)`
  proposta nel ticket è diventata `scoreSub(subId, records)` perché ogni record porta il suo peso.
- Id usati (da tenere nel `check` del 09): sotto-esercizi `trazioni, muscle-up, oap, dip, military, panca-piana,
  planche, planche-push-up, planche-press, front-lever, front-lever-pull-up, front-lever-touch, verticale, hspu`;
  progressioni `tuck, advanced-tuck, one-leg, straddle, half-lay, full, wide, maltese, victorian` (planche/front lever),
  `gomito, bicipite, spalla, oap` (OAP), `zavorra` / `bilanciere` (kg), `verticale, straddle-mono-braccio,
  full-mono-braccio`, `libera` + `zavorra` (HSPU).

Scelte fatte durante il lavoro (da rivedere se non vanno bene):

- **Zona**: un sotto-esercizio al 100% esatto resta in zona base ma con l'ELITE sbloccata allo 0% (come nei casi di
  prova); diventa "elite" solo sopra. Categorie e livello sono ELITE da 101.
- Le tabelle che proseguono in elite con la stessa progressione (OAP 3–10 rip., Planche push up Full 3–10, Planche press
  Full 2–5) sono **la stessa progressione** col campo che si allunga quando l'ELITE si sblocca, non una voce in più.
- **Limiti**: zavorra da 0 kg (vale 0, decisione 2), bilanciere da 1 kg, al massimo 400 kg; ripetizioni e secondi interi
  entro la tabella; peso corporeo plausibile 20–300 kg (fuori = come mancante).
- **Peso mancante**: il record in kg vale 0 e il sotto-esercizio segnala `needsBodyweight` (la Home chiede il peso).
  Eccezione: HSPU zavorrato senza peso vale comunque la base completa (40), perché per arrivarci servono le 10 rip.
- Un valore oltre il massimo **non vale** (non si "taglia" al massimo): non si può inserire (decisione 11).
  `validateRecord(record, records)` blocca anche le fasi ELITE non ancora sbloccate; il calcolo invece accetta qualsiasi
  record valido (un Maltese dà per completa la Wide, interpretazione 2).
- A parità di punti il "migliore" è il primo record della lista: il 09 li passa in ordine di data.
