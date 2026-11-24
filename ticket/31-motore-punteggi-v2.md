# 31 — Motore dei punteggi v2

- **Fonte**: [30](30-specifica-punteggi-v2.md).
- **Figura professionale**: sviluppatore TypeScript (logica pura + test).
- **Dipende da**: 30. **Sblocca**: 32, 34, 38.
- **Stima**: M.

## Contesto

Oggi [rules.ts](../src/lib/levels/rules.ts) descrive 14 sotto-esercizi con fasi base/ELITE e tabelle esplicite, e
[engine.ts](../src/lib/levels/engine.ts) le applica (`scoreRecord`, `scoreSub`, `scoreCategory`, `overallLevel`,
`avatarStage`, `levelSummary`, `availableOptions`, `suggestNext`, `validateRecord`, `stageLimits`). Il motore è puro e
il livello non si salva mai: questa impostazione resta. Cambiano i dati e il modo di sommare.

Chi usa il motore: `data/hooks.ts` (`useLevel`), `HomeView`, `RecordSheet`, `levelView.ts`, `LevelStrip`, `App.tsx`,
`AccountView`, `AtletiView`, `Pentagon`, `Avatar`, `lib/avatarFigure.ts`.

## Cosa fare

1. **`rules.ts` riscritto come dati**:
   - `BANDS`: i 6 livelli (`base … leggenda`) con le fasce per categoria e per il complessivo.
   - `REF_KG = 60`, `EXPONENTS` per catena, `ESP_SKILL_SECONDI`, `ESP_SKILL_RIPETIZIONI`, `LIMITS` (peso 30–250, rip.
     1–50, secondi 1–60, carico 400).
   - `CHAINS` (al posto di `SUBS`): id, nome, categoria, esponente, `levels[]` con lettera, nome, fascia di appartenenza
     e punti massimi, più la formula come dato. Bastano 6 tipi di formula:
     | Tipo | Formula (% del livello) | Dove |
     |---|---|---|
     | `reps` | `100/T × rip` (× `PC·D/60` se normalizzata), senza minimo 1 | australian, bench dip, push up, muscle up A, trazioni B, dip B, HSPU A–D |
     | `window` | `SE(G ≥ inizio; lim 1…100 di 100 × (G − inizio) / ampiezza)` con `G = (PC + zavorra) × D` o `massimale × D`; per il primo livello a carico la condizione è `carico > 0` | trazioni C–F, muscle up B–E, OAP E, dip C–F, panca B–F, military A–E, HSPU E–F |
     | `oap` | `100 × (PC × (1 + rip/30) × D − 60) / 6`, lim 1…100 | OAP A–D |
     | `hold` | `100 × s / T`, lim 1…100 | verticale a muro, verticale B, OAHS D–H |
     | `hold-window` | `SE(s ≥ 15; 100 × (s − 15) / 45)`, lim 1…100 | verticale C |
     | `skill` | `100 × v × (PC/60)^esp / T`, lim 1…100, esp = secondi o ripetizioni | front lever, planche e le loro catene |
     con `D = (60/PC)^esponente`. Soglie e divisori copiati dal PDF, numero per numero.
   - `entries[]` per catena: le voci inseribili (id, nome, misura `reps | seconds | kg`, tipo di carico, livelli coperti).
2. **`engine.ts`**:
   - `scoreRecord(record)`: record = `{ chainId, entry, value, bodyweightKg }`. Calcola la % di ogni livello coperto dalla
     voce, prende il più alto con % ≥ 1, restituisce punti = pieni dei livelli sotto + % × massimo. Ogni voce dichiara
     se la sua formula usa il peso (`usesBodyweight`): se lo usa e il peso manca o è fuori range il record non è valido;
     se non lo usa il peso non si chiede e non si salva (30, decisione 9).
   - `scoreChain`: il migliore di sempre; punti arrotondati all'intero; livello attuale (lettera) e % nel livello.
   - `scoreCategory`: somma delle catene; `band` (uno dei 6) e `percent` dentro la fascia (30, decisione 1).
   - `levelSummary`: 5 categorie, `total` (0–7000), `band` e `percent` del complessivo.
   - `availableEntries(chainId, records)`: voci con almeno un livello non pieno (30, interpretazione 3).
   - `validateRecord`, `stageLimits` (per il test di coerenza col database), `validateBodyweight`.
   - Via: `Zone`, `phase`, `unlocked`, `suggestNext`, `avatarStage` a 20 stadi, `overallLevel` come media.
3. **Presentazione** (`levelView.ts`): nome del livello, testo del record (`"Trazioni zavorrate 30 kg"`,
   `"Straddle · 5 s"`), scala del pentagono (30, interpretazione 5: raggio = punti / fine del livello più alto per quella
   categoria), celebrazioni ("Sei Avanzato in Skill spinta", "Livello complessivo: Elite").
4. **Test** (`engine.test.ts` riscritto, vitest):
   - un caso per ogni formula del PDF a 60 kg agli estremi (inizio = 1%, fine = 100%);
   - gli esempi scritti nel PDF: 10 s a 60 kg = 100%; a 80 kg bastano 7,5 s; a 50 kg ne servono 12; pull ups T = 5:
     5 rip. a 60 kg, 4 a 70 kg, 3 a 80 kg;
   - somma dei massimi = 1400 per categoria e ampiezza di ogni fascia = somma dei punti dei suoi livelli;
   - livelli sotto pieni, record che non regredisce, arrotondamento, fasce ai bordi (100 → Base 100%, 101 → Intermedio);
   - validazione fuori range.

## Criteri di accettazione

- `npm test` verde; nessuna formula nei componenti.
- **Tabella di verifica per Michael** (non ha un foglio Excel, controlla lui): uno script stampa, per ogni livello di
  ogni catena, peso, valore inserito, % del livello e punti a 60, 70 e 80 kg (inizio, metà e fine livello). Michael la
  confronta con i suoi conti e segnala le righe che non tornano.
- Cambiare un esponente o una soglia = cambiare un numero in `rules.ts`.
