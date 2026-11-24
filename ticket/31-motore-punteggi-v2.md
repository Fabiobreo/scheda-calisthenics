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

## Stato

**Fatto il 24 novembre 2026**, in una cartella a parte: il motore attuale resta com'è e l'app continua a usarlo.

**Cosa c'è**

- [`src/lib/levels/v2/rules.ts`](../src/lib/levels/v2/rules.ts): solo dati. `BANDS` (6 fasce per le 5 categorie e per il
  complessivo), `REF_KG`, `EXPONENTS`, `ESP_SKILL_SECONDI`, `ESP_SKILL_RIPETIZIONI`, `LIMITS`, `CHAINS` (14 catene, 83
  livelli con lettera, nome, fascia, punti massimi e formula come dato; 64 voci inseribili con misura, tipo di carico,
  livelli coperti, `usesBodyweight`). I tipi di formula sono i 6 della tabella sopra; la `window` ha tre condizioni
  perché nel PDF sono tre: `G >= soglia`, `C2 > 0`, `E(C2 > 0; G >= soglia)`.
- [`src/lib/levels/v2/engine.ts`](../src/lib/levels/v2/engine.ts): puro. `scoreRecord`, `scoreChain`, `scoreCategory`,
  `levelSummary`, `availableEntries`, `validateRecord`, `stageLimits`, `validateBodyweight`, più `levelPercent` (la
  formula di un livello senza i limiti di inserimento) e `bandPosition` (fascia e % per un punteggio).
- [`src/lib/levels/v2/engine.test.ts`](../src/lib/levels/v2/engine.test.ts): 139 test. Ogni livello di ogni catena a
  60 kg a inizio e fine (numeri scritti a mano dal PDF, non letti dalle regole), gli esempi del PDF (10 s a 60 kg, 7,5 s
  a 80 kg, 12 s a 50 kg, pull ups 5/4/3 ripetizioni a 60/70/80 kg), somme a 1400, ampiezza delle fasce, livelli sotto
  pieni, record che non regredisce, arrotondamento, bordi delle fasce, voci che spariscono, validazione.
- [`scripts/tabella-punteggi.mjs`](../scripts/tabella-punteggi.mjs) → `node scripts/tabella-punteggi.mjs` scrive
  [`riferimenti/31-tabella-verifica-punteggi.md`](riferimenti/31-tabella-verifica-punteggi.md): 666 righe, per ogni
  livello a 60, 70 e 80 kg il valore a inizio, metà e fine, il valore normalizzato G, la % del livello, i punti del
  livello e i punti della catena. Va rigenerata dopo ogni cambio a `rules.ts`.

**Verifica**: `npm test` 371 verdi (i 232 di prima più i 139 nuovi), `tsc -b` e `npm run build` puliti.

**Non fatto qui, di proposito**

- Il punto 3 (presentazione, `levelView.ts`) e la rimozione del motore vecchio: le pagine passano al motore nuovo nel 34,
  i dati nel 32. Fino ad allora `src/lib/levels/index.ts` esporta ancora il motore vecchio; il nuovo si importa da
  `src/lib/levels/v2`.
- Il test di coerenza col database (`db.test.ts`) guarda ancora `level_stages` del motore vecchio: `stageLimits()` del v2
  è pronto per la migration del 32 (in più dice `minExclusive` e `usesBodyweight`).
- La tabella non è stata ancora mandata a Michael né controllata da lui.

**Scelte di implementazione** (dove il PDF e il 30 non dicono)

1. **% dentro la fascia**: la fascia parte dalla fine della precedente, non dal suo primo punteggio: 100 → Base 100%,
   101 → Intermedio 1%, 200 → Intermedio 100%. La % è intera e per difetto, così 100% compare solo a fascia piena.
2. **Zavorra massima** 400 kg, come il massimale: il PDF non dà un limite. I kg ammettono i decimali.
3. **Identificativi delle voci**: dove esistevano sono quelli di oggi (`zavorra`, `tuck`, `advanced-tuck`, `one-leg`,
   `straddle`, `half-lay`, `full`, `wide`, `victorian`, `maltese`), per rendere più semplice la conversione del 32.
4. **Ordine delle categorie**: quello del 30 (tirata, spinta, skill tirata, skill spinta, handbalance).
5. `validateRecord(record, records)` rifiuta una voce già piena solo se gli si passano i record; senza, lo storico resta
   correggibile (30, decisione 6).

## Punti da far vedere a Michael

Nessuna formula è stata cambiata: dove il PDF si può leggere in due modi è stata presa la lettura letterale. Questi sono
i punti in cui la formula dà un risultato che la tabella dei livelli non fa aspettare.

1. **Panca e military: qualsiasi carico entra nel primo livello a carico.** La tabella dice "da 35% del peso corporeo",
   ma la formula ha come condizione `C2>0`, non `G>=21`: una panca da 10 kg vale l'1% del livello B, quindi anche i
   **50 punti pieni dei push up** (livello A) senza averli mai fatti. Per il military vale solo l'1% del livello A
   (0,33 punti). Il muscle up B ha la stessa condizione, ma lì la tabella dice "da 0%" e torna.
2. **Zavorra sotto la soglia = 0 punti, non il livello sotto pieno.** Trazioni zavorrate sotto il 15% (a 60 kg: meno di
   9 kg), dip zavorrati sotto il 15%, OAP zavorrato e HSPU zavorrati sotto il 5% (meno di 3 kg): la formula dà 0 e il
   record non vale niente, nemmeno i livelli a ripetizioni che stanno sotto. Chi fa una trazione con 5 kg prende 0 punti
   da quel record, mentre 10 trazioni a corpo libero ne valgono 200.
3. **Le percentuali della tabella dei livelli valgono solo a 60 kg.** Con la normalizzazione, "trazioni dal 15% al 45%"
   a 80 kg diventa da 7,7 a 30,5 kg (dal 10% al 38%), e il muscle up B a 80 kg parte già al 10,5% con 0,1 kg. È l'effetto
   voluto dell'esponente, ma nell'app non va scritto "15% del peso corporeo". Si vede riga per riga nella tabella.
4. **Persone molto pesanti a zavorra 0.** Dove la condizione è solo `G>=soglia`, il peso corporeo da solo supera la
   soglia: con zavorra 0 si entra nel livello C delle trazioni da 137 kg, nel livello C dei dip da 153 kg e nel livello F
   degli HSPU da 172 kg (lì il livello E chiede `C2>0` e il F no). Sono dentro la validazione 30–250 kg.
5. **Un punto di salto tra due livelli a carico.** Alla fine di un livello il successivo vale già 1% (`MAX(1; 0)`): con
   27 kg a 60 kg le trazioni valgono 301, non 300. Lo stesso per la verticale a 15 s (30, interpretazione 2).
6. **Persone leggere nelle skill.** Con gli esponenti 1,0 e 2,0, a 50 kg servono 12 s invece di 10 (lo dice il PDF) e
   8 ripetizioni invece di 5 nei pull ups e nei planche push ups; nei planche press 5 invece di 3. Il nome del livello
   ("da 1 a 5 ripetizioni") vale a 60 kg.
7. **% dentro il livello** (scelta 1 qui sopra): 101 punti = Intermedio 1%, per difetto. Se invece Michael intende
   un'altra cosa, è una riga in `bandPosition`.
