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
