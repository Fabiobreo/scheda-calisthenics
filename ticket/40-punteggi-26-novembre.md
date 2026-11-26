# 40 — Punteggi del 26 novembre: skill e handbalance (aggiorna il 30)

- **Fonte**: `Correzioni punteggi 26_11.pdf` di Michael (26 novembre 2026, 10 pagine), `risposta claude.pdf` (la nota con
  cui Michael risponde alle obiezioni sulla prima bozza) e il suo messaggio dello stesso giorno con le fasce del
  punteggio utente.
- **Figura professionale**: TypeScript (logica + test) + backend per la migration.
- **Dipende da**: 30, 31, 32, 38. **Stima**: M.
- **Stato**: fatto il 26/11, non ancora unito né rilasciato. Migration `0019` provata su PGlite (`scripts/prova-migration-0019.mjs`), **non** su Supabase.

Il ticket 30 resta la specifica dei **fondamentali** (tirata e spinta), che il PDF nuovo non tocca. Questo ticket
sostituisce il 30 per skill tirata, skill spinta, handbalance e punteggio complessivo.

## Cosa cambia

| Tema | Prima (30) | Ora |
|---|---|---|
| Skill tirata e spinta | 0–1400, sei fasce da Base | **0–1300, cinque fasce da Intermedio** (il Base dei fondamentali è il prerequisito) |
| Fasce delle skill | tirata 200/500/666/800/1100/1400, spinta 100/500/684/850/1100/1400 | **uguali per le due**: Intermedio 0–100, Avanzato 101–400, Elite 401–700, Titano 701–1000, Leggenda 1001–1300 |
| Planche | parte da Tuck (A) | parte da **Frog stand** (A, 1–10 s, 100 punti): le altre voci scalano di una lettera, il Maltese è G |
| Front lever touch, Full | T = 5 s | **T = 10 s** come tutte le tenute |
| Punti dei livelli delle skill | vedi 30 | tutti nuovi, tabella sotto |
| Handbalance | HSPU 700 + Verticale 700 | **HSPU 755 + Verticale e OAHS 645** (HSPU zavorrati 175 e 180, OAHS straddle 125, OAHS full 120) |
| HSPU zavorrati | `G = (PC + zavorra) × D`, finestre 63–78 e 78–99 | **`H = (zavorra / 60) × D`**, finestre 5%–30% e 30%–65% (vedi "Da far confermare") |
| Punteggio complessivo | 0–7000 | **0–6800** |
| Fasce del complessivo | 300/800/2500/4000/5500/7000 | **300/800/2300/3800/5300/6800** (Michael, 26/11) |

Non cambiano: la regola delle catene (chi entra in un livello ha pieni quelli sotto della stessa catena, niente
eredità tra catene), le formule delle skill (`100 × valore × (PC/60)^esp / T`, esponente 1 per i secondi e 2 per le
ripetizioni), la validazione (secondi 1–60, ripetizioni 1–50, peso 30–250 kg, zavorra > 0), l'arrotondamento.

### Punti per livello

| Catena | Livelli (fascia · punti) | Totale |
|---|---|---|
| Front lever | Tuck (Int · 100) · Tuck advanced (Av · 45) · One leg (Av · 55) · Straddle (El · 40) · Half lay (El · 45) · Full (Ti · 45) · Wide full (Ti · 70) · Victorian alle parallele (Le · 120) | 520 |
| Front lever touch | Tuck advanced (Av · 55) · One leg (Av · 65) · Straddle (El · 55) · Half lay (El · 65) · Full (Ti · 60) · Wide full (Le · 80) | 380 |
| Front lever pull ups | Tuck advanced (Av · 80) · One leg (El · 35) · Straddle (El · 60) · Half lay (Ti · 50) · Full (Ti · 75) · Wide full (Le · 100) | 400 |
| Planche | Frog stand (Int · 100) · Tuck (Av · 80) · Tuck advanced (El · 45) · One leg (El · 55) · Straddle (Ti · 70) · Full (Le · 50) · Maltese (Le · 100) | 500 |
| Planche push ups | Tuck (Av · 100) · Tuck advanced (El · 60) · One leg (El · 75) · Straddle (Ti · 80) · Full (Le · 70) | 385 |
| Planche press (T = 3) | Tuck (Av · 120) · Tuck advanced (El · 65) · One leg (Ti · 60) · Straddle (Ti · 90) · Full (Le · 80) | 415 |
| HSPU | Pike a terra (Ba · 50) · Pike su rialzo (Int · 50) · A muro (Av · 150) · Liberi (El · 150) · Zavorrati 5–30% (Ti · 175) · Zavorrati 30–65% (Le · 180) | 755 |
| Verticale e OAHS | A muro (Ba · 50) · Libera 1–15 s (Int · 50) · Libera 15–60 s (Av · 150) · OAHS 5, 3, 1 dita (El · 50 l'uno) · OAHS straddle (Ti · 125) · OAHS full (Le · 120) | 645 |

Controllato da un test: in ogni categoria i punti dei livelli di una fascia sommano all'ampiezza della fascia.

## Cosa è stato fatto

- `src/lib/levels/v2/rules.ts`: punti, fasce e catene nuove; `CATEGORY_MAX` per categoria, `TOTAL_MAX` 6800, formula
  `ratio` per gli HSPU zavorrati, **`RULES_VERSION` 2** (al primo avvio ogni app riscrive i suoi punti sul server).
- `engine.ts`: la formula `ratio`; il resto del motore non cambia (come chiede la nota di Michael).
- `levelView.ts`: il pentagono cerca la fascia per nome (le skill non hanno Base) e una categoria a 0 punti non alza il
  contorno, altrimenti chi inizia vedrebbe il pentagono in scala Intermedio; foglio "I livelli" con cinque righe per
  le skill.
- Migration `0019_punteggi_26_11.sql`: voce `planche / frog-stand` in `level_stages`, soglie nuove di `level_band`.
- Test aggiornati coi valori del PDF (esempi di normalizzazione compresi) e tabella di verifica rigenerata
  (`ticket/riferimenti/31-tabella-verifica-punteggi.md`, 675 righe).

I record esistenti restano validi (sono salvati per voce, non per lettera): cambiano solo i punti che valgono.

## Da far confermare a Michael

1. **HSPU zavorrati**: il PDF nuovo scrive `H8 = (C2/F2) × D10`, cioè conta solo la zavorra. A 60 kg non cambia niente;
   a pesi diversi sì: a 80 kg prima bastavano 0,1 kg per entrare nel livello (già al 10%), ora ne servono 3,8 e il
   livello F finisce a 48,4 kg. Implementato com'è scritto nel PDF.
2. **Skill a 0 punti**: chi non ha record nelle skill risulta "Intermedio 0%" (la scala parte da lì). Va bene o
   preferisce una scritta diversa finché non c'è il primo record?
3. **Lettere dei livelli**: nel PDF dei punteggi A è il livello più facile, nelle correzioni grafiche del 25/11 chiede
   A per il più difficile. In pagina vale la seconda (ticket 41); regole e tabella di verifica seguono il PDF.
4. **Frog stand nel catalogo degli esercizi**: oggi esiste solo come record di livello, non come esercizio da mettere
   in scheda. Va aggiunto?
