# Tabella di verifica dei punteggi v2

Generata da `node scripts/tabella-punteggi.mjs` con il motore di `src/lib/levels/v2` (ticket 31). Non modificarla a mano.

**Per Michael**: ogni riga è un record inserito nell’app. Rifai il conto con la tua formula e segnala le righe che non tornano.

Skill tirata, skill spinta e handbalance seguono `Correzioni punteggi 26_11.pdf`; i fondamentali il PDF del 22 novembre.
Le lettere dei livelli sono quelle dei PDF (**A = il più facile**): nell’app si leggono al contrario (A = il più difficile).

Come leggerla:

- **Peso**: peso corporeo dentro il record. "—" quando la formula non lo usa (il risultato è uguale per tutti).
- **Valore**: quello che l’utente scrive (ripetizioni, secondi, kg di zavorra o di massimale), all’inizio, a metà e alla
  fine del livello. I kg sono arrotondati per eccesso al decimo, ripetizioni e secondi sono interi: per questo a 70 e
  80 kg "inizio" e "fine" non danno sempre 1% e 100% esatti.
- **G**: solo per i kg, il valore normalizzato della formula: `(peso + zavorra) × (60/peso)^esponente`, oppure
  `massimale × (60/peso)^esponente` per panca e military.
- **H**: solo per gli HSPU zavorrati (PDF del 26 novembre), la zavorra come percentuale dei 60 kg di riferimento:
  `(zavorra / 60) × (60/peso)^0,75`. Il peso del corpo non entra nella somma.
- **% livello**: il risultato della formula del livello (0 se non raggiunto, da 1 a 100).
- **Punti livello**: % × punti massimi del livello, non arrotondati.
- **Punti catena**: quello che vale il record per tutta la catena, arrotondato all’intero: livelli sotto pieni + punti del
  livello raggiunto. Alla **fine** di un livello a carico il record entra già nel livello successivo all’1%: i punti della
  catena contano anche quell’1% (es. trazioni a 60 kg con 27 kg: livello C pieno = 300, più 1% del livello D = 301).

Fasce dei livelli con nome (le skill non hanno Base: partono da Intermedio):

| | Base | Intermedio | Avanzato | Elite | Titano | Leggenda |
|---|---|---|---|---|---|---|
| Fondamentali tirata | 0–100 | 101–200 | 201–500 | 501–800 | 801–1100 | 1101–1400 |
| Fondamentali spinta | 0–100 | 101–200 | 201–500 | 501–800 | 801–1100 | 1101–1400 |
| Skill tirata | — | 0–100 | 101–400 | 401–700 | 701–1000 | 1001–1300 |
| Skill spinta | — | 0–100 | 101–400 | 401–700 | 701–1000 | 1001–1300 |
| Handbalance | 0–100 | 101–200 | 201–500 | 501–800 | 801–1100 | 1101–1400 |
| Complessivo | 0–300 | 301–800 | 801–2300 | 2301–3800 | 3801–5300 | 5301–6800 |

## Fondamentali tirata

### Trazioni (600 punti, esponente 0,83)

**Livello A — Australian pull up 1–15 rip.** · Base · 100 punti (da 0 a 100 nella catena) · voce "Australian pull up"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| — | inizio | 1 rip. | 6,67% | 6,67 | 7 |
| — | metà | 8 rip. | 53,33% | 53,33 | 53 |
| — | fine | 15 rip. | 100% | 100 | 100 |

**Livello B — Trazioni 1–10 rip.** · Intermedio · 100 punti (da 100 a 200 nella catena) · voce "Trazioni a ripetizioni"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 rip. | 10% | 10 | 110 |
| 60 kg | metà | 6 rip. | 60% | 60 | 160 |
| 60 kg | fine | 10 rip. | 100% | 100 | 200 |
| 70 kg | inizio | 1 rip. | 10,27% | 10,27 | 110 |
| 70 kg | metà | 6 rip. | 61,59% | 61,59 | 162 |
| 70 kg | fine | 10 rip. | 100% | 100 | 200 |
| 80 kg | inizio | 1 rip. | 10,5% | 10,5 | 111 |
| 80 kg | metà | 6 rip. | 63,01% | 63,01 | 163 |
| 80 kg | fine | 10 rip. | 100% | 100 | 200 |

**Livello C — Trazioni 15%–45% PC** · Avanzato · 100 punti (da 200 a 300 nella catena) · voce "Trazioni zavorrate"

| Peso | Punto | Valore | G | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|---|
| 60 kg | inizio | 9 kg | 69 | 1% | 1 | 201 |
| 60 kg | metà | 18 kg | 78 | 50% | 50 | 250 |
| 60 kg | fine | 27 kg | 87 | 100% | 100 | 301 |
| 70 kg | inizio | 8,5 kg | 69,07 | 1% | 1 | 201 |
| 70 kg | metà | 18,7 kg | 78,05 | 50,26% | 50,26 | 250 |
| 70 kg | fine | 28,9 kg | 87,02 | 100% | 100 | 301 |
| 80 kg | inizio | 7,7 kg | 69,07 | 1% | 1 | 201 |
| 80 kg | metà | 19,1 kg | 78,05 | 50,28% | 50,28 | 250 |
| 80 kg | fine | 30,5 kg | 87,03 | 100% | 100 | 301 |

**Livello D — Trazioni 45%–75% PC** · Elite · 100 punti (da 300 a 400 nella catena) · voce "Trazioni zavorrate"

| Peso | Punto | Valore | G | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|---|
| 60 kg | inizio | 27 kg | 87 | 1% | 1 | 301 |
| 60 kg | metà | 36 kg | 96 | 50% | 50 | 350 |
| 60 kg | fine | 45 kg | 105 | 100% | 100 | 401 |
| 70 kg | inizio | 28,9 kg | 87,02 | 1% | 1 | 301 |
| 70 kg | metà | 39,2 kg | 96,09 | 50,47% | 50,47 | 350 |
| 70 kg | fine | 49,4 kg | 105,06 | 100% | 100 | 401 |
| 80 kg | inizio | 30,5 kg | 87,03 | 1% | 1 | 301 |
| 80 kg | metà | 41,9 kg | 96,01 | 50,04% | 50,04 | 350 |
| 80 kg | fine | 53,4 kg | 105,06 | 100% | 100 | 401 |

**Livello E — Trazioni 75%–107% PC** · Titano · 100 punti (da 400 a 500 nella catena) · voce "Trazioni zavorrate"

| Peso | Punto | Valore | G | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|---|
| 60 kg | inizio | 45 kg | 105 | 1% | 1 | 401 |
| 60 kg | metà | 54,6 kg | 114,6 | 50% | 50 | 450 |
| 60 kg | fine | 64,2 kg | 124,2 | 100% | 100 | 501 |
| 70 kg | inizio | 49,4 kg | 105,06 | 1% | 1 | 401 |
| 70 kg | metà | 60,3 kg | 114,65 | 50,27% | 50,27 | 450 |
| 70 kg | fine | 71,2 kg | 124,24 | 100% | 100 | 501 |
| 80 kg | inizio | 53,4 kg | 105,06 | 1% | 1 | 401 |
| 80 kg | metà | 65,6 kg | 114,67 | 50,38% | 50,38 | 450 |
| 80 kg | fine | 77,7 kg | 124,2 | 100% | 100 | 501 |

**Livello F — Trazioni 107%–130% PC** · Leggenda · 100 punti (da 500 a 600 nella catena) · voce "Trazioni zavorrate"

| Peso | Punto | Valore | G | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|---|
| 60 kg | inizio | 64,2 kg | 124,2 | 1% | 1 | 501 |
| 60 kg | metà | 71,1 kg | 131,1 | 50% | 50 | 550 |
| 60 kg | fine | 78 kg | 138 | 100% | 100 | 600 |
| 70 kg | inizio | 71,2 kg | 124,24 | 1% | 1 | 501 |
| 70 kg | metà | 79 kg | 131,11 | 50,04% | 50,04 | 550 |
| 70 kg | fine | 86,9 kg | 138,06 | 100% | 100 | 600 |
| 80 kg | inizio | 77,7 kg | 124,2 | 1% | 1 | 501 |
| 80 kg | metà | 86,5 kg | 131,13 | 50,25% | 50,25 | 550 |
| 80 kg | fine | 95,3 kg | 138,06 | 100% | 100 | 600 |

### Muscle up (400 punti, esponente 0,95)

**Livello A — Muscle up 1–5 rip.** · Avanzato · 50 punti (da 0 a 50 nella catena) · voce "Muscle up a ripetizioni"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| — | inizio | 1 rip. | 20% | 10 | 10 |
| — | metà | 3 rip. | 60% | 30 | 30 |
| — | fine | 5 rip. | 100% | 50 | 50 |

**Livello B — Muscle up 0%–15% PC** · Avanzato · 50 punti (da 50 a 100 nella catena) · voce "Muscle up zavorrato"

| Peso | Punto | Valore | G | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|---|
| 60 kg | inizio | 0,1 kg | 60,1 | 1,11% | 0,56 | 51 |
| 60 kg | metà | 4,5 kg | 64,5 | 50% | 25 | 75 |
| 60 kg | fine | 9 kg | 69 | 100% | 50 | 101 |
| 70 kg | inizio | 0,1 kg | 60,55 | 6,12% | 3,06 | 53 |
| 70 kg | metà | 4,7 kg | 64,52 | 50,27% | 25,13 | 75 |
| 70 kg | fine | 9,9 kg | 69,02 | 100% | 50 | 101 |
| 80 kg | inizio | 0,1 kg | 60,95 | 10,5% | 5,25 | 55 |
| 80 kg | metà | 4,8 kg | 64,52 | 50,24% | 25,12 | 75 |
| 80 kg | fine | 10,7 kg | 69,01 | 100% | 50 | 101 |

**Livello C — Muscle up 15%–35% PC** · Elite · 100 punti (da 100 a 200 nella catena) · voce "Muscle up zavorrato"

| Peso | Punto | Valore | G | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|---|
| 60 kg | inizio | 9 kg | 69 | 1% | 1 | 101 |
| 60 kg | metà | 15 kg | 75 | 50% | 50 | 150 |
| 60 kg | fine | 21 kg | 81 | 100% | 100 | 201 |
| 70 kg | inizio | 9,9 kg | 69,02 | 1% | 1 | 101 |
| 70 kg | metà | 16,9 kg | 75,06 | 50,52% | 50,52 | 151 |
| 70 kg | fine | 23,8 kg | 81,02 | 100% | 100 | 201 |
| 80 kg | inizio | 10,7 kg | 69,01 | 1% | 1 | 101 |
| 80 kg | metà | 18,6 kg | 75,02 | 50,18% | 50,18 | 150 |
| 80 kg | fine | 26,5 kg | 81,03 | 100% | 100 | 201 |

**Livello D — Muscle up 35%–57% PC** · Titano · 100 punti (da 200 a 300 nella catena) · voce "Muscle up zavorrato"

| Peso | Punto | Valore | G | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|---|
| 60 kg | inizio | 21 kg | 81 | 1% | 1 | 201 |
| 60 kg | metà | 27,6 kg | 87,6 | 50% | 50 | 250 |
| 60 kg | fine | 34,2 kg | 94,2 | 100% | 100 | 301 |
| 70 kg | inizio | 23,8 kg | 81,02 | 1% | 1 | 201 |
| 70 kg | metà | 31,5 kg | 87,67 | 50,55% | 50,55 | 251 |
| 70 kg | fine | 39,1 kg | 94,24 | 100% | 100 | 301 |
| 80 kg | inizio | 26,5 kg | 81,03 | 1% | 1 | 201 |
| 80 kg | metà | 35,2 kg | 87,65 | 50,39% | 50,39 | 250 |
| 80 kg | fine | 43,9 kg | 94,27 | 100% | 100 | 301 |

**Livello E — Muscle up 57%–65% PC** · Leggenda · 100 punti (da 300 a 400 nella catena) · voce "Muscle up zavorrato"

| Peso | Punto | Valore | G | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|---|
| 60 kg | inizio | 34,2 kg | 94,2 | 1% | 1 | 301 |
| 60 kg | metà | 36,6 kg | 96,6 | 50% | 50 | 350 |
| 60 kg | fine | 39 kg | 99 | 100% | 100 | 400 |
| 70 kg | inizio | 39,1 kg | 94,24 | 1% | 1 | 301 |
| 70 kg | metà | 41,9 kg | 96,66 | 51,18% | 51,18 | 351 |
| 70 kg | fine | 44,7 kg | 99,07 | 100% | 100 | 400 |
| 80 kg | inizio | 43,9 kg | 94,27 | 1,49% | 1,49 | 301 |
| 80 kg | metà | 47 kg | 96,63 | 50,62% | 50,62 | 351 |
| 80 kg | fine | 50,2 kg | 99,06 | 100% | 100 | 400 |

### OAP (400 punti, esponente 0,85)

**Livello A — OAP assistenza mano-avambraccio 1–3 rip.** · Avanzato · 50 punti (da 0 a 50 nella catena) · voce "OAP assistenza mano-avambraccio"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 rip. | 33,33% | 16,67 | 17 |
| 60 kg | metà | 2 rip. | 66,67% | 33,33 | 33 |
| 60 kg | fine | 3 rip. | 100% | 50 | 50 |
| 70 kg | inizio | 1 rip. | 57,51% | 28,75 | 29 |
| 70 kg | metà | 2 rip. | 91,62% | 45,81 | 46 |
| 70 kg | fine | 3 rip. | 100% | 50 | 50 |
| 80 kg | inizio | 1 rip. | 78,9% | 39,45 | 39 |
| 80 kg | metà = fine | 2 rip. | 100% | 50 | 50 |

**Livello B — OAP assistenza mano-bicipite 1–3 rip.** · Avanzato · 50 punti (da 50 a 100 nella catena) · voce "OAP assistenza mano-bicipite"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 rip. | 33,33% | 16,67 | 67 |
| 60 kg | metà | 2 rip. | 66,67% | 33,33 | 83 |
| 60 kg | fine | 3 rip. | 100% | 50 | 100 |
| 70 kg | inizio | 1 rip. | 57,51% | 28,75 | 79 |
| 70 kg | metà | 2 rip. | 91,62% | 45,81 | 96 |
| 70 kg | fine | 3 rip. | 100% | 50 | 100 |
| 80 kg | inizio | 1 rip. | 78,9% | 39,45 | 89 |
| 80 kg | metà = fine | 2 rip. | 100% | 50 | 100 |

**Livello C — OAP assistenza mano-spalla 1–3 rip.** · Elite · 100 punti (da 100 a 200 nella catena) · voce "OAP assistenza mano-spalla"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 rip. | 33,33% | 33,33 | 133 |
| 60 kg | metà | 2 rip. | 66,67% | 66,67 | 167 |
| 60 kg | fine | 3 rip. | 100% | 100 | 200 |
| 70 kg | inizio | 1 rip. | 57,51% | 57,51 | 158 |
| 70 kg | metà | 2 rip. | 91,62% | 91,62 | 192 |
| 70 kg | fine | 3 rip. | 100% | 100 | 200 |
| 80 kg | inizio | 1 rip. | 78,9% | 78,9 | 179 |
| 80 kg | metà = fine | 2 rip. | 100% | 100 | 200 |

**Livello D — OAP 1–3 rip.** · Titano · 100 punti (da 200 a 300 nella catena) · voce "OAP a ripetizioni"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 rip. | 33,33% | 33,33 | 233 |
| 60 kg | metà | 2 rip. | 66,67% | 66,67 | 267 |
| 60 kg | fine | 3 rip. | 100% | 100 | 300 |
| 70 kg | inizio | 1 rip. | 57,51% | 57,51 | 258 |
| 70 kg | metà | 2 rip. | 91,62% | 91,62 | 292 |
| 70 kg | fine | 3 rip. | 100% | 100 | 300 |
| 80 kg | inizio | 1 rip. | 78,9% | 78,9 | 279 |
| 80 kg | metà = fine | 2 rip. | 100% | 100 | 300 |

**Livello E — OAP 5%–30% PC** · Leggenda · 100 punti (da 300 a 400 nella catena) · voce "OAP zavorrato"

| Peso | Punto | Valore | G | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|---|
| 60 kg | inizio | 3 kg | 63 | 1% | 1 | 301 |
| 60 kg | metà | 10,5 kg | 70,5 | 50% | 50 | 350 |
| 60 kg | fine | 18 kg | 78 | 100% | 100 | 400 |
| 70 kg | inizio | 1,9 kg | 63,07 | 1% | 1 | 301 |
| 70 kg | metà | 10,4 kg | 70,53 | 50,18% | 50,18 | 350 |
| 70 kg | fine | 19 kg | 78,07 | 100% | 100 | 400 |
| 80 kg | inizio | 0,5 kg | 63,04 | 1% | 1 | 301 |
| 80 kg | metà | 10,1 kg | 70,55 | 50,37% | 50,37 | 350 |
| 80 kg | fine | 19,7 kg | 78,07 | 100% | 100 | 400 |

## Fondamentali spinta

### Dip (484 punti, esponente 0,85)

**Livello A — Bench dip 1–20 rip.** · Base · 50 punti (da 0 a 50 nella catena) · voce "Bench dip"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| — | inizio | 1 rip. | 5% | 2,5 | 3 |
| — | metà | 11 rip. | 55% | 27,5 | 28 |
| — | fine | 20 rip. | 100% | 50 | 50 |

**Livello B — Dip 1–15 rip.** · Intermedio · 34 punti (da 50 a 84 nella catena) · voce "Dip a ripetizioni"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 rip. | 6,67% | 2,27 | 52 |
| 60 kg | metà | 8 rip. | 53,33% | 18,13 | 68 |
| 60 kg | fine | 15 rip. | 100% | 34 | 84 |
| 70 kg | inizio | 1 rip. | 6,82% | 2,32 | 52 |
| 70 kg | metà | 8 rip. | 54,58% | 18,56 | 69 |
| 70 kg | fine | 15 rip. | 100% | 34 | 84 |
| 80 kg | inizio | 1 rip. | 6,96% | 2,37 | 52 |
| 80 kg | metà | 8 rip. | 55,69% | 18,93 | 69 |
| 80 kg | fine | 15 rip. | 100% | 34 | 84 |

**Livello C — Dip 15%–65% PC** · Avanzato · 100 punti (da 84 a 184 nella catena) · voce "Dip zavorrati"

| Peso | Punto | Valore | G | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|---|
| 60 kg | inizio | 9 kg | 69 | 1% | 1 | 85 |
| 60 kg | metà | 24 kg | 84 | 50% | 50 | 134 |
| 60 kg | fine | 39 kg | 99 | 100% | 100 | 185 |
| 70 kg | inizio | 8,7 kg | 69,04 | 1% | 1 | 85 |
| 70 kg | metà | 25,8 kg | 84,04 | 50,12% | 50,12 | 134 |
| 70 kg | fine | 42,9 kg | 99,04 | 100% | 100 | 185 |
| 80 kg | inizio | 8,2 kg | 69,07 | 1% | 1 | 85 |
| 80 kg | metà | 27,3 kg | 84,02 | 50,08% | 50,08 | 134 |
| 80 kg | fine | 46,5 kg | 99,06 | 100% | 100 | 185 |

**Livello D — Dip 65%–107% PC** · Elite · 100 punti (da 184 a 284 nella catena) · voce "Dip zavorrati"

| Peso | Punto | Valore | G | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|---|
| 60 kg | inizio | 39 kg | 99 | 1% | 1 | 185 |
| 60 kg | metà | 51,6 kg | 111,6 | 50% | 50 | 234 |
| 60 kg | fine | 64,2 kg | 124,2 | 100% | 100 | 285 |
| 70 kg | inizio | 42,9 kg | 99,04 | 1% | 1 | 185 |
| 70 kg | metà | 57,3 kg | 111,67 | 50,26% | 50,26 | 234 |
| 70 kg | fine | 71,6 kg | 124,21 | 100% | 100 | 285 |
| 80 kg | inizio | 46,5 kg | 99,06 | 1% | 1 | 185 |
| 80 kg | metà | 62,6 kg | 111,67 | 50,26% | 50,26 | 234 |
| 80 kg | fine | 78,7 kg | 124,27 | 100% | 100 | 285 |

**Livello E — Dip 107%–152% PC** · Titano · 100 punti (da 284 a 384 nella catena) · voce "Dip zavorrati"

| Peso | Punto | Valore | G | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|---|
| 60 kg | inizio | 64,2 kg | 124,2 | 1% | 1 | 285 |
| 60 kg | metà | 77,7 kg | 137,7 | 50% | 50 | 334 |
| 60 kg | fine | 91,2 kg | 151,2 | 100% | 100 | 385 |
| 70 kg | inizio | 71,6 kg | 124,21 | 1% | 1 | 285 |
| 70 kg | metà | 87 kg | 137,72 | 50,07% | 50,07 | 334 |
| 70 kg | fine | 102,4 kg | 151,23 | 100% | 100 | 385 |
| 80 kg | inizio | 78,7 kg | 124,27 | 1% | 1 | 285 |
| 80 kg | metà | 95,9 kg | 137,74 | 50,16% | 50,16 | 334 |
| 80 kg | fine | 113,1 kg | 151,21 | 100% | 100 | 385 |

**Livello F — Dip 152%–200% PC** · Leggenda · 100 punti (da 384 a 484 nella catena) · voce "Dip zavorrati"

| Peso | Punto | Valore | G | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|---|
| 60 kg | inizio | 91,2 kg | 151,2 | 1% | 1 | 385 |
| 60 kg | metà | 105,6 kg | 165,6 | 50% | 50 | 434 |
| 60 kg | fine | 120 kg | 180 | 100% | 100 | 484 |
| 70 kg | inizio | 102,4 kg | 151,23 | 1% | 1 | 385 |
| 70 kg | metà | 118,8 kg | 165,61 | 50,05% | 50,05 | 434 |
| 70 kg | fine | 135,2 kg | 180 | 100% | 100 | 484 |
| 80 kg | inizio | 113,1 kg | 151,21 | 1% | 1 | 385 |
| 80 kg | metà | 131,5 kg | 165,62 | 50,07% | 50,07 | 434 |
| 80 kg | fine | 149,9 kg | 180,03 | 100% | 100 | 484 |

### Panca piana (483 punti, esponente 0,9)

**Livello A — Push up 1–20 rip.** · Base · 50 punti (da 0 a 50 nella catena) · voce "Push up"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| — | inizio | 1 rip. | 5% | 2,5 | 3 |
| — | metà | 11 rip. | 55% | 27,5 | 28 |
| — | fine | 20 rip. | 100% | 50 | 50 |

**Livello B — Panca piana 35%–88% PC** · Intermedio · 33 punti (da 50 a 83 nella catena) · voce "Panca piana massimale"

| Peso | Punto | Valore | G | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|---|
| 60 kg | inizio | 21 kg | 21 | 1% | 0,33 | 50 |
| 60 kg | metà | 36,9 kg | 36,9 | 50% | 16,5 | 67 |
| 60 kg | fine | 52,8 kg | 52,8 | 100% | 33 | 84 |
| 70 kg | inizio | 24,2 kg | 21,07 | 1% | 0,33 | 50 |
| 70 kg | metà | 42,4 kg | 36,91 | 50,02% | 16,51 | 67 |
| 70 kg | fine | 60,7 kg | 52,84 | 100% | 33 | 84 |
| 80 kg | inizio | 27,3 kg | 21,07 | 1% | 0,33 | 50 |
| 80 kg | metà | 47,9 kg | 36,97 | 50,23% | 16,58 | 67 |
| 80 kg | fine | 68,5 kg | 52,87 | 100% | 33 | 84 |

**Livello C — Panca piana 88%–120% PC** · Avanzato · 100 punti (da 83 a 183 nella catena) · voce "Panca piana massimale"

| Peso | Punto | Valore | G | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|---|
| 60 kg | inizio | 52,8 kg | 52,8 | 1% | 1 | 84 |
| 60 kg | metà | 62,4 kg | 62,4 | 50% | 50 | 133 |
| 60 kg | fine | 72 kg | 72 | 100% | 100 | 184 |
| 70 kg | inizio | 60,7 kg | 52,84 | 1% | 1 | 84 |
| 70 kg | metà | 71,7 kg | 62,41 | 50,06% | 50,06 | 133 |
| 70 kg | fine | 82,8 kg | 72,07 | 100% | 100 | 184 |
| 80 kg | inizio | 68,5 kg | 52,87 | 1% | 1 | 84 |
| 80 kg | metà | 80,9 kg | 62,45 | 50,24% | 50,24 | 133 |
| 80 kg | fine | 93,3 kg | 72,02 | 100% | 100 | 184 |

**Livello D — Panca piana 120%–158% PC** · Elite · 100 punti (da 183 a 283 nella catena) · voce "Panca piana massimale"

| Peso | Punto | Valore | G | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|---|
| 60 kg | inizio | 72 kg | 72 | 1% | 1 | 184 |
| 60 kg | metà | 83,4 kg | 83,4 | 50% | 50 | 233 |
| 60 kg | fine | 94,8 kg | 94,8 | 100% | 100 | 284 |
| 70 kg | inizio | 82,8 kg | 72,07 | 1% | 1 | 184 |
| 70 kg | metà | 95,9 kg | 83,48 | 50,34% | 50,34 | 233 |
| 70 kg | fine | 109 kg | 94,88 | 100% | 100 | 284 |
| 80 kg | inizio | 93,3 kg | 72,02 | 1% | 1 | 184 |
| 80 kg | metà | 108,1 kg | 83,44 | 50,18% | 50,18 | 233 |
| 80 kg | fine | 122,9 kg | 94,87 | 100% | 100 | 284 |

**Livello E — Panca piana 158%–199% PC** · Titano · 100 punti (da 283 a 383 nella catena) · voce "Panca piana massimale"

| Peso | Punto | Valore | G | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|---|
| 60 kg | inizio | 94,8 kg | 94,8 | 1% | 1 | 284 |
| 60 kg | metà | 107,1 kg | 107,1 | 50% | 50 | 333 |
| 60 kg | fine | 119,4 kg | 119,4 | 100% | 100 | 384 |
| 70 kg | inizio | 109 kg | 94,88 | 1% | 1 | 284 |
| 70 kg | metà | 123,1 kg | 107,15 | 50,22% | 50,22 | 333 |
| 70 kg | fine | 137,2 kg | 119,43 | 100% | 100 | 384 |
| 80 kg | inizio | 122,9 kg | 94,87 | 1% | 1 | 284 |
| 80 kg | metà | 138,8 kg | 107,14 | 50,16% | 50,16 | 333 |
| 80 kg | fine | 154,7 kg | 119,41 | 100% | 100 | 384 |

**Livello F — Panca piana 199%–260% PC** · Leggenda · 100 punti (da 383 a 483 nella catena) · voce "Panca piana massimale"

| Peso | Punto | Valore | G | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|---|
| 60 kg | inizio | 119,4 kg | 119,4 | 1% | 1 | 384 |
| 60 kg | metà | 137,7 kg | 137,7 | 50% | 50 | 433 |
| 60 kg | fine | 156 kg | 156 | 100% | 100 | 483 |
| 70 kg | inizio | 137,2 kg | 119,43 | 1% | 1 | 384 |
| 70 kg | metà | 158,2 kg | 137,71 | 50,02% | 50,02 | 433 |
| 70 kg | fine | 179,3 kg | 156,07 | 100% | 100 | 483 |
| 80 kg | inizio | 154,7 kg | 119,41 | 1% | 1 | 384 |
| 80 kg | metà | 178,4 kg | 137,71 | 50,01% | 50,01 | 433 |
| 80 kg | fine | 202,2 kg | 156,08 | 100% | 100 | 483 |

### Military (433 punti, esponente 0,9)

**Livello A — Military 35%–55% PC** · Intermedio · 33 punti (da 0 a 33 nella catena) · voce "Military massimale"

| Peso | Punto | Valore | G | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|---|
| 60 kg | inizio | 21 kg | 21 | 1% | 0,33 | 0 |
| 60 kg | metà | 27 kg | 27 | 50% | 16,5 | 17 |
| 60 kg | fine | 33 kg | 33 | 100% | 33 | 34 |
| 70 kg | inizio | 24,2 kg | 21,07 | 1% | 0,33 | 0 |
| 70 kg | metà | 31,1 kg | 27,07 | 50,59% | 16,7 | 17 |
| 70 kg | fine | 38 kg | 33,08 | 100% | 33 | 34 |
| 80 kg | inizio | 27,3 kg | 21,07 | 1% | 0,33 | 0 |
| 80 kg | metà | 35 kg | 27,02 | 50,13% | 16,54 | 17 |
| 80 kg | fine | 42,8 kg | 33,04 | 100% | 33 | 34 |

**Livello B — Military 55%–77% PC** · Avanzato · 100 punti (da 33 a 133 nella catena) · voce "Military massimale"

| Peso | Punto | Valore | G | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|---|
| 60 kg | inizio | 33 kg | 33 | 1% | 1 | 34 |
| 60 kg | metà | 39,6 kg | 39,6 | 50% | 50 | 83 |
| 60 kg | fine | 46,2 kg | 46,2 | 100% | 100 | 134 |
| 70 kg | inizio | 38 kg | 33,08 | 1% | 1 | 34 |
| 70 kg | metà | 45,5 kg | 39,61 | 50,04% | 50,04 | 83 |
| 70 kg | fine | 53,1 kg | 46,22 | 100% | 100 | 134 |
| 80 kg | inizio | 42,8 kg | 33,04 | 1% | 1 | 34 |
| 80 kg | metà | 51,4 kg | 39,68 | 50,57% | 50,57 | 84 |
| 80 kg | fine | 59,9 kg | 46,24 | 100% | 100 | 134 |

**Livello C — Military 77%–102% PC** · Elite · 100 punti (da 133 a 233 nella catena) · voce "Military massimale"

| Peso | Punto | Valore | G | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|---|
| 60 kg | inizio | 46,2 kg | 46,2 | 1% | 1 | 134 |
| 60 kg | metà | 53,7 kg | 53,7 | 50% | 50 | 183 |
| 60 kg | fine | 61,2 kg | 61,2 | 100% | 100 | 234 |
| 70 kg | inizio | 53,1 kg | 46,22 | 1% | 1 | 134 |
| 70 kg | metà | 61,7 kg | 53,71 | 50,05% | 50,05 | 183 |
| 70 kg | fine | 70,4 kg | 61,28 | 100% | 100 | 234 |
| 80 kg | inizio | 59,9 kg | 46,24 | 1% | 1 | 134 |
| 80 kg | metà | 69,6 kg | 53,72 | 50,16% | 50,16 | 183 |
| 80 kg | fine | 79,3 kg | 61,21 | 100% | 100 | 234 |

**Livello D — Military 102%–128% PC** · Titano · 100 punti (da 233 a 333 nella catena) · voce "Military massimale"

| Peso | Punto | Valore | G | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|---|
| 60 kg | inizio | 61,2 kg | 61,2 | 1% | 1 | 234 |
| 60 kg | metà | 69 kg | 69 | 50% | 50 | 283 |
| 60 kg | fine | 76,8 kg | 76,8 | 100% | 100 | 334 |
| 70 kg | inizio | 70,4 kg | 61,28 | 1% | 1 | 234 |
| 70 kg | metà | 79,3 kg | 69,03 | 50,18% | 50,18 | 283 |
| 70 kg | fine | 88,3 kg | 76,86 | 100% | 100 | 334 |
| 80 kg | inizio | 79,3 kg | 61,21 | 1% | 1 | 234 |
| 80 kg | metà | 89,4 kg | 69,01 | 50,04% | 50,04 | 283 |
| 80 kg | fine | 99,5 kg | 76,8 | 100% | 100 | 334 |

**Livello E — Military 128%–135% PC** · Leggenda · 100 punti (da 333 a 433 nella catena) · voce "Military massimale"

| Peso | Punto | Valore | G | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|---|
| 60 kg | inizio | 76,8 kg | 76,8 | 1% | 1 | 334 |
| 60 kg | metà | 78,9 kg | 78,9 | 50% | 50 | 383 |
| 60 kg | fine | 81 kg | 81 | 100% | 100 | 433 |
| 70 kg | inizio | 88,3 kg | 76,86 | 1,46% | 1,46 | 334 |
| 70 kg | metà | 90,7 kg | 78,95 | 51,2% | 51,2 | 384 |
| 70 kg | fine | 93,1 kg | 81,04 | 100% | 100 | 433 |
| 80 kg | inizio | 99,5 kg | 76,8 | 1% | 1 | 334 |
| 80 kg | metà | 102,3 kg | 78,96 | 51,53% | 51,53 | 385 |
| 80 kg | fine | 105 kg | 81,05 | 100% | 100 | 433 |

## Skill tirata

### Front lever (520 punti)

**Livello A — Tuck front lever 1–10 s** · Intermedio · 100 punti (da 0 a 100 nella catena) · voce "Tuck"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 s | 10% | 10 | 10 |
| 60 kg | metà | 6 s | 60% | 60 | 60 |
| 60 kg | fine | 10 s | 100% | 100 | 100 |
| 70 kg | inizio | 1 s | 11,67% | 11,67 | 12 |
| 70 kg | metà | 5 s | 58,33% | 58,33 | 58 |
| 70 kg | fine | 9 s | 100% | 100 | 100 |
| 80 kg | inizio | 1 s | 13,33% | 13,33 | 13 |
| 80 kg | metà | 5 s | 66,67% | 66,67 | 67 |
| 80 kg | fine | 8 s | 100% | 100 | 100 |

**Livello B — Tuck advanced front lever 1–10 s** · Avanzato · 45 punti (da 100 a 145 nella catena) · voce "Tuck advanced"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 s | 10% | 4,5 | 105 |
| 60 kg | metà | 6 s | 60% | 27 | 127 |
| 60 kg | fine | 10 s | 100% | 45 | 145 |
| 70 kg | inizio | 1 s | 11,67% | 5,25 | 105 |
| 70 kg | metà | 5 s | 58,33% | 26,25 | 126 |
| 70 kg | fine | 9 s | 100% | 45 | 145 |
| 80 kg | inizio | 1 s | 13,33% | 6 | 106 |
| 80 kg | metà | 5 s | 66,67% | 30 | 130 |
| 80 kg | fine | 8 s | 100% | 45 | 145 |

**Livello C — One leg front lever 1–10 s** · Avanzato · 55 punti (da 145 a 200 nella catena) · voce "One leg"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 s | 10% | 5,5 | 151 |
| 60 kg | metà | 6 s | 60% | 33 | 178 |
| 60 kg | fine | 10 s | 100% | 55 | 200 |
| 70 kg | inizio | 1 s | 11,67% | 6,42 | 151 |
| 70 kg | metà | 5 s | 58,33% | 32,08 | 177 |
| 70 kg | fine | 9 s | 100% | 55 | 200 |
| 80 kg | inizio | 1 s | 13,33% | 7,33 | 152 |
| 80 kg | metà | 5 s | 66,67% | 36,67 | 182 |
| 80 kg | fine | 8 s | 100% | 55 | 200 |

**Livello D — Straddle front lever 1–10 s** · Elite · 40 punti (da 200 a 240 nella catena) · voce "Straddle"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 s | 10% | 4 | 204 |
| 60 kg | metà | 6 s | 60% | 24 | 224 |
| 60 kg | fine | 10 s | 100% | 40 | 240 |
| 70 kg | inizio | 1 s | 11,67% | 4,67 | 205 |
| 70 kg | metà | 5 s | 58,33% | 23,33 | 223 |
| 70 kg | fine | 9 s | 100% | 40 | 240 |
| 80 kg | inizio | 1 s | 13,33% | 5,33 | 205 |
| 80 kg | metà | 5 s | 66,67% | 26,67 | 227 |
| 80 kg | fine | 8 s | 100% | 40 | 240 |

**Livello E — Half lay front lever 1–10 s** · Elite · 45 punti (da 240 a 285 nella catena) · voce "Half lay"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 s | 10% | 4,5 | 245 |
| 60 kg | metà | 6 s | 60% | 27 | 267 |
| 60 kg | fine | 10 s | 100% | 45 | 285 |
| 70 kg | inizio | 1 s | 11,67% | 5,25 | 245 |
| 70 kg | metà | 5 s | 58,33% | 26,25 | 266 |
| 70 kg | fine | 9 s | 100% | 45 | 285 |
| 80 kg | inizio | 1 s | 13,33% | 6 | 246 |
| 80 kg | metà | 5 s | 66,67% | 30 | 270 |
| 80 kg | fine | 8 s | 100% | 45 | 285 |

**Livello F — Full front lever 1–10 s** · Titano · 45 punti (da 285 a 330 nella catena) · voce "Full"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 s | 10% | 4,5 | 290 |
| 60 kg | metà | 6 s | 60% | 27 | 312 |
| 60 kg | fine | 10 s | 100% | 45 | 330 |
| 70 kg | inizio | 1 s | 11,67% | 5,25 | 290 |
| 70 kg | metà | 5 s | 58,33% | 26,25 | 311 |
| 70 kg | fine | 9 s | 100% | 45 | 330 |
| 80 kg | inizio | 1 s | 13,33% | 6 | 291 |
| 80 kg | metà | 5 s | 66,67% | 30 | 315 |
| 80 kg | fine | 8 s | 100% | 45 | 330 |

**Livello G — Wide full front lever 1–10 s** · Titano · 70 punti (da 330 a 400 nella catena) · voce "Wide full"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 s | 10% | 7 | 337 |
| 60 kg | metà | 6 s | 60% | 42 | 372 |
| 60 kg | fine | 10 s | 100% | 70 | 400 |
| 70 kg | inizio | 1 s | 11,67% | 8,17 | 338 |
| 70 kg | metà | 5 s | 58,33% | 40,83 | 371 |
| 70 kg | fine | 9 s | 100% | 70 | 400 |
| 80 kg | inizio | 1 s | 13,33% | 9,33 | 339 |
| 80 kg | metà | 5 s | 66,67% | 46,67 | 377 |
| 80 kg | fine | 8 s | 100% | 70 | 400 |

**Livello H — Victorian alle parallele 1–10 s** · Leggenda · 120 punti (da 400 a 520 nella catena) · voce "Victorian alle parallele"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 s | 10% | 12 | 412 |
| 60 kg | metà | 6 s | 60% | 72 | 472 |
| 60 kg | fine | 10 s | 100% | 120 | 520 |
| 70 kg | inizio | 1 s | 11,67% | 14 | 414 |
| 70 kg | metà | 5 s | 58,33% | 70 | 470 |
| 70 kg | fine | 9 s | 100% | 120 | 520 |
| 80 kg | inizio | 1 s | 13,33% | 16 | 416 |
| 80 kg | metà | 5 s | 66,67% | 80 | 480 |
| 80 kg | fine | 8 s | 100% | 120 | 520 |

### Front lever touch (380 punti)

**Livello A — Tuck advanced front lever touch 1–10 s** · Avanzato · 55 punti (da 0 a 55 nella catena) · voce "Tuck advanced"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 s | 10% | 5,5 | 6 |
| 60 kg | metà | 6 s | 60% | 33 | 33 |
| 60 kg | fine | 10 s | 100% | 55 | 55 |
| 70 kg | inizio | 1 s | 11,67% | 6,42 | 6 |
| 70 kg | metà | 5 s | 58,33% | 32,08 | 32 |
| 70 kg | fine | 9 s | 100% | 55 | 55 |
| 80 kg | inizio | 1 s | 13,33% | 7,33 | 7 |
| 80 kg | metà | 5 s | 66,67% | 36,67 | 37 |
| 80 kg | fine | 8 s | 100% | 55 | 55 |

**Livello B — One leg front lever touch 1–10 s** · Avanzato · 65 punti (da 55 a 120 nella catena) · voce "One leg"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 s | 10% | 6,5 | 62 |
| 60 kg | metà | 6 s | 60% | 39 | 94 |
| 60 kg | fine | 10 s | 100% | 65 | 120 |
| 70 kg | inizio | 1 s | 11,67% | 7,58 | 63 |
| 70 kg | metà | 5 s | 58,33% | 37,92 | 93 |
| 70 kg | fine | 9 s | 100% | 65 | 120 |
| 80 kg | inizio | 1 s | 13,33% | 8,67 | 64 |
| 80 kg | metà | 5 s | 66,67% | 43,33 | 98 |
| 80 kg | fine | 8 s | 100% | 65 | 120 |

**Livello C — Straddle front lever touch 1–10 s** · Elite · 55 punti (da 120 a 175 nella catena) · voce "Straddle"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 s | 10% | 5,5 | 126 |
| 60 kg | metà | 6 s | 60% | 33 | 153 |
| 60 kg | fine | 10 s | 100% | 55 | 175 |
| 70 kg | inizio | 1 s | 11,67% | 6,42 | 126 |
| 70 kg | metà | 5 s | 58,33% | 32,08 | 152 |
| 70 kg | fine | 9 s | 100% | 55 | 175 |
| 80 kg | inizio | 1 s | 13,33% | 7,33 | 127 |
| 80 kg | metà | 5 s | 66,67% | 36,67 | 157 |
| 80 kg | fine | 8 s | 100% | 55 | 175 |

**Livello D — Half lay front lever touch 1–10 s** · Elite · 65 punti (da 175 a 240 nella catena) · voce "Half lay"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 s | 10% | 6,5 | 182 |
| 60 kg | metà | 6 s | 60% | 39 | 214 |
| 60 kg | fine | 10 s | 100% | 65 | 240 |
| 70 kg | inizio | 1 s | 11,67% | 7,58 | 183 |
| 70 kg | metà | 5 s | 58,33% | 37,92 | 213 |
| 70 kg | fine | 9 s | 100% | 65 | 240 |
| 80 kg | inizio | 1 s | 13,33% | 8,67 | 184 |
| 80 kg | metà | 5 s | 66,67% | 43,33 | 218 |
| 80 kg | fine | 8 s | 100% | 65 | 240 |

**Livello E — Full front lever touch 1–10 s** · Titano · 60 punti (da 240 a 300 nella catena) · voce "Full"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 s | 10% | 6 | 246 |
| 60 kg | metà | 6 s | 60% | 36 | 276 |
| 60 kg | fine | 10 s | 100% | 60 | 300 |
| 70 kg | inizio | 1 s | 11,67% | 7 | 247 |
| 70 kg | metà | 5 s | 58,33% | 35 | 275 |
| 70 kg | fine | 9 s | 100% | 60 | 300 |
| 80 kg | inizio | 1 s | 13,33% | 8 | 248 |
| 80 kg | metà | 5 s | 66,67% | 40 | 280 |
| 80 kg | fine | 8 s | 100% | 60 | 300 |

**Livello F — Wide full front lever touch 1–10 s** · Leggenda · 80 punti (da 300 a 380 nella catena) · voce "Wide full"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 s | 10% | 8 | 308 |
| 60 kg | metà | 6 s | 60% | 48 | 348 |
| 60 kg | fine | 10 s | 100% | 80 | 380 |
| 70 kg | inizio | 1 s | 11,67% | 9,33 | 309 |
| 70 kg | metà | 5 s | 58,33% | 46,67 | 347 |
| 70 kg | fine | 9 s | 100% | 80 | 380 |
| 80 kg | inizio | 1 s | 13,33% | 10,67 | 311 |
| 80 kg | metà | 5 s | 66,67% | 53,33 | 353 |
| 80 kg | fine | 8 s | 100% | 80 | 380 |

### Front lever pull ups (400 punti)

**Livello A — Tuck advanced front lever pull ups 1–5 rip.** · Avanzato · 80 punti (da 0 a 80 nella catena) · voce "Tuck advanced"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 rip. | 20% | 16 | 16 |
| 60 kg | metà | 3 rip. | 60% | 48 | 48 |
| 60 kg | fine | 5 rip. | 100% | 80 | 80 |
| 70 kg | inizio | 1 rip. | 27,22% | 21,78 | 22 |
| 70 kg | metà | 3 rip. | 81,67% | 65,33 | 65 |
| 70 kg | fine | 4 rip. | 100% | 80 | 80 |
| 80 kg | inizio | 1 rip. | 35,56% | 28,44 | 28 |
| 80 kg | metà | 2 rip. | 71,11% | 56,89 | 57 |
| 80 kg | fine | 3 rip. | 100% | 80 | 80 |

**Livello B — One leg front lever pull ups 1–5 rip.** · Elite · 35 punti (da 80 a 115 nella catena) · voce "One leg"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 rip. | 20% | 7 | 87 |
| 60 kg | metà | 3 rip. | 60% | 21 | 101 |
| 60 kg | fine | 5 rip. | 100% | 35 | 115 |
| 70 kg | inizio | 1 rip. | 27,22% | 9,53 | 90 |
| 70 kg | metà | 3 rip. | 81,67% | 28,58 | 109 |
| 70 kg | fine | 4 rip. | 100% | 35 | 115 |
| 80 kg | inizio | 1 rip. | 35,56% | 12,44 | 92 |
| 80 kg | metà | 2 rip. | 71,11% | 24,89 | 105 |
| 80 kg | fine | 3 rip. | 100% | 35 | 115 |

**Livello C — Straddle front lever pull ups 1–5 rip.** · Elite · 60 punti (da 115 a 175 nella catena) · voce "Straddle"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 rip. | 20% | 12 | 127 |
| 60 kg | metà | 3 rip. | 60% | 36 | 151 |
| 60 kg | fine | 5 rip. | 100% | 60 | 175 |
| 70 kg | inizio | 1 rip. | 27,22% | 16,33 | 131 |
| 70 kg | metà | 3 rip. | 81,67% | 49 | 164 |
| 70 kg | fine | 4 rip. | 100% | 60 | 175 |
| 80 kg | inizio | 1 rip. | 35,56% | 21,33 | 136 |
| 80 kg | metà | 2 rip. | 71,11% | 42,67 | 158 |
| 80 kg | fine | 3 rip. | 100% | 60 | 175 |

**Livello D — Half lay front lever pull ups 1–5 rip.** · Titano · 50 punti (da 175 a 225 nella catena) · voce "Half lay"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 rip. | 20% | 10 | 185 |
| 60 kg | metà | 3 rip. | 60% | 30 | 205 |
| 60 kg | fine | 5 rip. | 100% | 50 | 225 |
| 70 kg | inizio | 1 rip. | 27,22% | 13,61 | 189 |
| 70 kg | metà | 3 rip. | 81,67% | 40,83 | 216 |
| 70 kg | fine | 4 rip. | 100% | 50 | 225 |
| 80 kg | inizio | 1 rip. | 35,56% | 17,78 | 193 |
| 80 kg | metà | 2 rip. | 71,11% | 35,56 | 211 |
| 80 kg | fine | 3 rip. | 100% | 50 | 225 |

**Livello E — Full front lever pull ups 1–5 rip.** · Titano · 75 punti (da 225 a 300 nella catena) · voce "Full"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 rip. | 20% | 15 | 240 |
| 60 kg | metà | 3 rip. | 60% | 45 | 270 |
| 60 kg | fine | 5 rip. | 100% | 75 | 300 |
| 70 kg | inizio | 1 rip. | 27,22% | 20,42 | 245 |
| 70 kg | metà | 3 rip. | 81,67% | 61,25 | 286 |
| 70 kg | fine | 4 rip. | 100% | 75 | 300 |
| 80 kg | inizio | 1 rip. | 35,56% | 26,67 | 252 |
| 80 kg | metà | 2 rip. | 71,11% | 53,33 | 278 |
| 80 kg | fine | 3 rip. | 100% | 75 | 300 |

**Livello F — Wide full front lever pull ups 1–5 rip.** · Leggenda · 100 punti (da 300 a 400 nella catena) · voce "Wide full"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 rip. | 20% | 20 | 320 |
| 60 kg | metà | 3 rip. | 60% | 60 | 360 |
| 60 kg | fine | 5 rip. | 100% | 100 | 400 |
| 70 kg | inizio | 1 rip. | 27,22% | 27,22 | 327 |
| 70 kg | metà | 3 rip. | 81,67% | 81,67 | 382 |
| 70 kg | fine | 4 rip. | 100% | 100 | 400 |
| 80 kg | inizio | 1 rip. | 35,56% | 35,56 | 336 |
| 80 kg | metà | 2 rip. | 71,11% | 71,11 | 371 |
| 80 kg | fine | 3 rip. | 100% | 100 | 400 |

## Skill spinta

### Planche (500 punti)

**Livello A — Frog stand 1–10 s** · Intermedio · 100 punti (da 0 a 100 nella catena) · voce "Frog stand"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 s | 10% | 10 | 10 |
| 60 kg | metà | 6 s | 60% | 60 | 60 |
| 60 kg | fine | 10 s | 100% | 100 | 100 |
| 70 kg | inizio | 1 s | 11,67% | 11,67 | 12 |
| 70 kg | metà | 5 s | 58,33% | 58,33 | 58 |
| 70 kg | fine | 9 s | 100% | 100 | 100 |
| 80 kg | inizio | 1 s | 13,33% | 13,33 | 13 |
| 80 kg | metà | 5 s | 66,67% | 66,67 | 67 |
| 80 kg | fine | 8 s | 100% | 100 | 100 |

**Livello B — Tuck planche 1–10 s** · Avanzato · 80 punti (da 100 a 180 nella catena) · voce "Tuck"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 s | 10% | 8 | 108 |
| 60 kg | metà | 6 s | 60% | 48 | 148 |
| 60 kg | fine | 10 s | 100% | 80 | 180 |
| 70 kg | inizio | 1 s | 11,67% | 9,33 | 109 |
| 70 kg | metà | 5 s | 58,33% | 46,67 | 147 |
| 70 kg | fine | 9 s | 100% | 80 | 180 |
| 80 kg | inizio | 1 s | 13,33% | 10,67 | 111 |
| 80 kg | metà | 5 s | 66,67% | 53,33 | 153 |
| 80 kg | fine | 8 s | 100% | 80 | 180 |

**Livello C — Tuck advanced planche 1–10 s** · Elite · 45 punti (da 180 a 225 nella catena) · voce "Tuck advanced"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 s | 10% | 4,5 | 185 |
| 60 kg | metà | 6 s | 60% | 27 | 207 |
| 60 kg | fine | 10 s | 100% | 45 | 225 |
| 70 kg | inizio | 1 s | 11,67% | 5,25 | 185 |
| 70 kg | metà | 5 s | 58,33% | 26,25 | 206 |
| 70 kg | fine | 9 s | 100% | 45 | 225 |
| 80 kg | inizio | 1 s | 13,33% | 6 | 186 |
| 80 kg | metà | 5 s | 66,67% | 30 | 210 |
| 80 kg | fine | 8 s | 100% | 45 | 225 |

**Livello D — One leg planche 1–10 s** · Elite · 55 punti (da 225 a 280 nella catena) · voce "One leg"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 s | 10% | 5,5 | 231 |
| 60 kg | metà | 6 s | 60% | 33 | 258 |
| 60 kg | fine | 10 s | 100% | 55 | 280 |
| 70 kg | inizio | 1 s | 11,67% | 6,42 | 231 |
| 70 kg | metà | 5 s | 58,33% | 32,08 | 257 |
| 70 kg | fine | 9 s | 100% | 55 | 280 |
| 80 kg | inizio | 1 s | 13,33% | 7,33 | 232 |
| 80 kg | metà | 5 s | 66,67% | 36,67 | 262 |
| 80 kg | fine | 8 s | 100% | 55 | 280 |

**Livello E — Straddle planche 1–10 s** · Titano · 70 punti (da 280 a 350 nella catena) · voce "Straddle"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 s | 10% | 7 | 287 |
| 60 kg | metà | 6 s | 60% | 42 | 322 |
| 60 kg | fine | 10 s | 100% | 70 | 350 |
| 70 kg | inizio | 1 s | 11,67% | 8,17 | 288 |
| 70 kg | metà | 5 s | 58,33% | 40,83 | 321 |
| 70 kg | fine | 9 s | 100% | 70 | 350 |
| 80 kg | inizio | 1 s | 13,33% | 9,33 | 289 |
| 80 kg | metà | 5 s | 66,67% | 46,67 | 327 |
| 80 kg | fine | 8 s | 100% | 70 | 350 |

**Livello F — Full planche 1–10 s** · Leggenda · 50 punti (da 350 a 400 nella catena) · voce "Full"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 s | 10% | 5 | 355 |
| 60 kg | metà | 6 s | 60% | 30 | 380 |
| 60 kg | fine | 10 s | 100% | 50 | 400 |
| 70 kg | inizio | 1 s | 11,67% | 5,83 | 356 |
| 70 kg | metà | 5 s | 58,33% | 29,17 | 379 |
| 70 kg | fine | 9 s | 100% | 50 | 400 |
| 80 kg | inizio | 1 s | 13,33% | 6,67 | 357 |
| 80 kg | metà | 5 s | 66,67% | 33,33 | 383 |
| 80 kg | fine | 8 s | 100% | 50 | 400 |

**Livello G — Maltese 1–10 s** · Leggenda · 100 punti (da 400 a 500 nella catena) · voce "Maltese"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 s | 10% | 10 | 410 |
| 60 kg | metà | 6 s | 60% | 60 | 460 |
| 60 kg | fine | 10 s | 100% | 100 | 500 |
| 70 kg | inizio | 1 s | 11,67% | 11,67 | 412 |
| 70 kg | metà | 5 s | 58,33% | 58,33 | 458 |
| 70 kg | fine | 9 s | 100% | 100 | 500 |
| 80 kg | inizio | 1 s | 13,33% | 13,33 | 413 |
| 80 kg | metà | 5 s | 66,67% | 66,67 | 467 |
| 80 kg | fine | 8 s | 100% | 100 | 500 |

### Planche push ups (385 punti)

**Livello A — Tuck planche push ups 1–5 rip.** · Avanzato · 100 punti (da 0 a 100 nella catena) · voce "Tuck"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 rip. | 20% | 20 | 20 |
| 60 kg | metà | 3 rip. | 60% | 60 | 60 |
| 60 kg | fine | 5 rip. | 100% | 100 | 100 |
| 70 kg | inizio | 1 rip. | 27,22% | 27,22 | 27 |
| 70 kg | metà | 3 rip. | 81,67% | 81,67 | 82 |
| 70 kg | fine | 4 rip. | 100% | 100 | 100 |
| 80 kg | inizio | 1 rip. | 35,56% | 35,56 | 36 |
| 80 kg | metà | 2 rip. | 71,11% | 71,11 | 71 |
| 80 kg | fine | 3 rip. | 100% | 100 | 100 |

**Livello B — Tuck advanced planche push ups 1–5 rip.** · Elite · 60 punti (da 100 a 160 nella catena) · voce "Tuck advanced"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 rip. | 20% | 12 | 112 |
| 60 kg | metà | 3 rip. | 60% | 36 | 136 |
| 60 kg | fine | 5 rip. | 100% | 60 | 160 |
| 70 kg | inizio | 1 rip. | 27,22% | 16,33 | 116 |
| 70 kg | metà | 3 rip. | 81,67% | 49 | 149 |
| 70 kg | fine | 4 rip. | 100% | 60 | 160 |
| 80 kg | inizio | 1 rip. | 35,56% | 21,33 | 121 |
| 80 kg | metà | 2 rip. | 71,11% | 42,67 | 143 |
| 80 kg | fine | 3 rip. | 100% | 60 | 160 |

**Livello C — One leg planche push ups 1–5 rip.** · Elite · 75 punti (da 160 a 235 nella catena) · voce "One leg"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 rip. | 20% | 15 | 175 |
| 60 kg | metà | 3 rip. | 60% | 45 | 205 |
| 60 kg | fine | 5 rip. | 100% | 75 | 235 |
| 70 kg | inizio | 1 rip. | 27,22% | 20,42 | 180 |
| 70 kg | metà | 3 rip. | 81,67% | 61,25 | 221 |
| 70 kg | fine | 4 rip. | 100% | 75 | 235 |
| 80 kg | inizio | 1 rip. | 35,56% | 26,67 | 187 |
| 80 kg | metà | 2 rip. | 71,11% | 53,33 | 213 |
| 80 kg | fine | 3 rip. | 100% | 75 | 235 |

**Livello D — Straddle planche push ups 1–5 rip.** · Titano · 80 punti (da 235 a 315 nella catena) · voce "Straddle"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 rip. | 20% | 16 | 251 |
| 60 kg | metà | 3 rip. | 60% | 48 | 283 |
| 60 kg | fine | 5 rip. | 100% | 80 | 315 |
| 70 kg | inizio | 1 rip. | 27,22% | 21,78 | 257 |
| 70 kg | metà | 3 rip. | 81,67% | 65,33 | 300 |
| 70 kg | fine | 4 rip. | 100% | 80 | 315 |
| 80 kg | inizio | 1 rip. | 35,56% | 28,44 | 263 |
| 80 kg | metà | 2 rip. | 71,11% | 56,89 | 292 |
| 80 kg | fine | 3 rip. | 100% | 80 | 315 |

**Livello E — Full planche push ups 1–5 rip.** · Leggenda · 70 punti (da 315 a 385 nella catena) · voce "Full"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 rip. | 20% | 14 | 329 |
| 60 kg | metà | 3 rip. | 60% | 42 | 357 |
| 60 kg | fine | 5 rip. | 100% | 70 | 385 |
| 70 kg | inizio | 1 rip. | 27,22% | 19,06 | 334 |
| 70 kg | metà | 3 rip. | 81,67% | 57,17 | 372 |
| 70 kg | fine | 4 rip. | 100% | 70 | 385 |
| 80 kg | inizio | 1 rip. | 35,56% | 24,89 | 340 |
| 80 kg | metà | 2 rip. | 71,11% | 49,78 | 365 |
| 80 kg | fine | 3 rip. | 100% | 70 | 385 |

### Planche press (415 punti)

**Livello A — Tuck planche press 1–3 rip.** · Avanzato · 120 punti (da 0 a 120 nella catena) · voce "Tuck"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 rip. | 33,33% | 40 | 40 |
| 60 kg | metà | 2 rip. | 66,67% | 80 | 80 |
| 60 kg | fine | 3 rip. | 100% | 120 | 120 |
| 70 kg | inizio | 1 rip. | 45,37% | 54,44 | 54 |
| 70 kg | metà | 2 rip. | 90,74% | 108,89 | 109 |
| 70 kg | fine | 3 rip. | 100% | 120 | 120 |
| 80 kg | inizio | 1 rip. | 59,26% | 71,11 | 71 |
| 80 kg | metà = fine | 2 rip. | 100% | 120 | 120 |

**Livello B — Tuck advanced planche press 1–3 rip.** · Elite · 65 punti (da 120 a 185 nella catena) · voce "Tuck advanced"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 rip. | 33,33% | 21,67 | 142 |
| 60 kg | metà | 2 rip. | 66,67% | 43,33 | 163 |
| 60 kg | fine | 3 rip. | 100% | 65 | 185 |
| 70 kg | inizio | 1 rip. | 45,37% | 29,49 | 149 |
| 70 kg | metà | 2 rip. | 90,74% | 58,98 | 179 |
| 70 kg | fine | 3 rip. | 100% | 65 | 185 |
| 80 kg | inizio | 1 rip. | 59,26% | 38,52 | 159 |
| 80 kg | metà = fine | 2 rip. | 100% | 65 | 185 |

**Livello C — One leg planche press 1–3 rip.** · Titano · 60 punti (da 185 a 245 nella catena) · voce "One leg"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 rip. | 33,33% | 20 | 205 |
| 60 kg | metà | 2 rip. | 66,67% | 40 | 225 |
| 60 kg | fine | 3 rip. | 100% | 60 | 245 |
| 70 kg | inizio | 1 rip. | 45,37% | 27,22 | 212 |
| 70 kg | metà | 2 rip. | 90,74% | 54,44 | 239 |
| 70 kg | fine | 3 rip. | 100% | 60 | 245 |
| 80 kg | inizio | 1 rip. | 59,26% | 35,56 | 221 |
| 80 kg | metà = fine | 2 rip. | 100% | 60 | 245 |

**Livello D — Straddle planche press 1–3 rip.** · Titano · 90 punti (da 245 a 335 nella catena) · voce "Straddle"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 rip. | 33,33% | 30 | 275 |
| 60 kg | metà | 2 rip. | 66,67% | 60 | 305 |
| 60 kg | fine | 3 rip. | 100% | 90 | 335 |
| 70 kg | inizio | 1 rip. | 45,37% | 40,83 | 286 |
| 70 kg | metà | 2 rip. | 90,74% | 81,67 | 327 |
| 70 kg | fine | 3 rip. | 100% | 90 | 335 |
| 80 kg | inizio | 1 rip. | 59,26% | 53,33 | 298 |
| 80 kg | metà = fine | 2 rip. | 100% | 90 | 335 |

**Livello E — Full planche press 1–3 rip.** · Leggenda · 80 punti (da 335 a 415 nella catena) · voce "Full"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 rip. | 33,33% | 26,67 | 362 |
| 60 kg | metà | 2 rip. | 66,67% | 53,33 | 388 |
| 60 kg | fine | 3 rip. | 100% | 80 | 415 |
| 70 kg | inizio | 1 rip. | 45,37% | 36,3 | 371 |
| 70 kg | metà | 2 rip. | 90,74% | 72,59 | 408 |
| 70 kg | fine | 3 rip. | 100% | 80 | 415 |
| 80 kg | inizio | 1 rip. | 59,26% | 47,41 | 382 |
| 80 kg | metà = fine | 2 rip. | 100% | 80 | 415 |

## Handbalance

### HSPU (755 punti, esponente 0,75)

**Livello A — Pike push up a terra 1–15 rip.** · Base · 50 punti (da 0 a 50 nella catena) · voce "Pike push up a terra"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 rip. | 6,67% | 3,33 | 3 |
| 60 kg | metà | 8 rip. | 53,33% | 26,67 | 27 |
| 60 kg | fine | 15 rip. | 100% | 50 | 50 |
| 70 kg | inizio | 1 rip. | 6,93% | 3,46 | 3 |
| 70 kg | metà | 8 rip. | 55,43% | 27,71 | 28 |
| 70 kg | fine | 15 rip. | 100% | 50 | 50 |
| 80 kg | inizio | 1 rip. | 7,16% | 3,58 | 4 |
| 80 kg | metà | 8 rip. | 57,31% | 28,66 | 29 |
| 80 kg | fine | 14 rip. | 100% | 50 | 50 |

**Livello B — Pike push up su rialzo 1–10 rip.** · Intermedio · 50 punti (da 50 a 100 nella catena) · voce "Pike push up su rialzo"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 rip. | 10% | 5 | 55 |
| 60 kg | metà | 6 rip. | 60% | 30 | 80 |
| 60 kg | fine | 10 rip. | 100% | 50 | 100 |
| 70 kg | inizio | 1 rip. | 10,39% | 5,2 | 55 |
| 70 kg | metà | 6 rip. | 62,36% | 31,18 | 81 |
| 70 kg | fine | 10 rip. | 100% | 50 | 100 |
| 80 kg | inizio | 1 rip. | 10,75% | 5,37 | 55 |
| 80 kg | metà | 6 rip. | 64,47% | 32,24 | 82 |
| 80 kg | fine | 10 rip. | 100% | 50 | 100 |

**Livello C — HSPU a muro 1–5 rip.** · Avanzato · 150 punti (da 100 a 250 nella catena) · voce "HSPU a muro"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 rip. | 20% | 30 | 130 |
| 60 kg | metà | 3 rip. | 60% | 90 | 190 |
| 60 kg | fine | 5 rip. | 100% | 150 | 250 |
| 70 kg | inizio | 1 rip. | 20,79% | 31,18 | 131 |
| 70 kg | metà | 3 rip. | 62,36% | 93,54 | 194 |
| 70 kg | fine | 5 rip. | 100% | 150 | 250 |
| 80 kg | inizio | 1 rip. | 21,49% | 32,24 | 132 |
| 80 kg | metà | 3 rip. | 64,47% | 96,71 | 197 |
| 80 kg | fine | 5 rip. | 100% | 150 | 250 |

**Livello D — HSPU liberi 1–10 rip.** · Elite · 150 punti (da 250 a 400 nella catena) · voce "HSPU liberi"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 rip. | 10% | 15 | 265 |
| 60 kg | metà | 6 rip. | 60% | 90 | 340 |
| 60 kg | fine | 10 rip. | 100% | 150 | 400 |
| 70 kg | inizio | 1 rip. | 10,39% | 15,59 | 266 |
| 70 kg | metà | 6 rip. | 62,36% | 93,54 | 344 |
| 70 kg | fine | 10 rip. | 100% | 150 | 400 |
| 80 kg | inizio | 1 rip. | 10,75% | 16,12 | 266 |
| 80 kg | metà | 6 rip. | 64,47% | 96,71 | 347 |
| 80 kg | fine | 10 rip. | 100% | 150 | 400 |

**Livello E — HSPU liberi zavorrati 5%–30% PC** · Titano · 175 punti (da 400 a 575 nella catena) · voce "HSPU liberi zavorrati"

| Peso | Punto | Valore | H | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|---|
| 60 kg | inizio | 3 kg | 5% | 1% | 1,75 | 402 |
| 60 kg | metà | 10,5 kg | 17,5% | 50% | 87,5 | 488 |
| 60 kg | fine | 18 kg | 30% | 100% | 175 | 577 |
| 70 kg | inizio | 3,4 kg | 5,05% | 1% | 1,75 | 402 |
| 70 kg | metà | 11,8 kg | 17,52% | 50,08% | 87,64 | 488 |
| 70 kg | fine | 20,3 kg | 30,14% | 100% | 175 | 577 |
| 80 kg | inizio | 3,8 kg | 5,1% | 1% | 1,75 | 402 |
| 80 kg | metà | 13,1 kg | 17,6% | 50,38% | 88,17 | 488 |
| 80 kg | fine | 22,4 kg | 30,09% | 100% | 175 | 577 |

**Livello F — HSPU liberi zavorrati 30%–65% PC** · Leggenda · 180 punti (da 575 a 755 nella catena) · voce "HSPU liberi zavorrati"

| Peso | Punto | Valore | H | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|---|
| 60 kg | inizio | 18 kg | 30% | 1% | 1,8 | 577 |
| 60 kg | metà | 28,5 kg | 47,5% | 50% | 90 | 665 |
| 60 kg | fine | 39 kg | 65% | 100% | 180 | 755 |
| 70 kg | inizio | 20,3 kg | 30,14% | 1% | 1,8 | 577 |
| 70 kg | metà | 32 kg | 47,51% | 50,03% | 90,05 | 665 |
| 70 kg | fine | 43,8 kg | 65,03% | 100% | 180 | 755 |
| 80 kg | inizio | 22,4 kg | 30,09% | 1% | 1,8 | 577 |
| 80 kg | metà | 35,4 kg | 47,55% | 50,14% | 90,26 | 665 |
| 80 kg | fine | 48,4 kg | 65,01% | 100% | 180 | 755 |

### Verticale e OAHS (645 punti)

**Livello A — Verticale a muro 1–60 s** · Base · 50 punti (da 0 a 50 nella catena) · voce "Verticale a muro"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| — | inizio | 1 s | 1,67% | 0,83 | 1 |
| — | metà | 31 s | 51,67% | 25,83 | 26 |
| — | fine | 60 s | 100% | 50 | 50 |

**Livello B — Verticale libera 1–15 s** · Intermedio · 50 punti (da 50 a 100 nella catena) · voce "Verticale libera"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| — | inizio | 1 s | 6,67% | 3,33 | 53 |
| — | metà | 8 s | 53,33% | 26,67 | 77 |
| — | fine | 15 s | 100% | 50 | 102 |

**Livello C — Verticale libera 15–60 s** · Avanzato · 150 punti (da 100 a 250 nella catena) · voce "Verticale libera"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| — | inizio | 15 s | 1% | 1,5 | 102 |
| — | metà | 38 s | 51,11% | 76,67 | 177 |
| — | fine | 60 s | 100% | 150 | 250 |

**Livello D — OAHS assistito 5 dita 1–10 s** · Elite · 50 punti (da 250 a 300 nella catena) · voce "OAHS assistito 5 dita"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| — | inizio | 1 s | 10% | 5 | 255 |
| — | metà | 6 s | 60% | 30 | 280 |
| — | fine | 10 s | 100% | 50 | 300 |

**Livello E — OAHS assistito 3 dita 1–10 s** · Elite · 50 punti (da 300 a 350 nella catena) · voce "OAHS assistito 3 dita"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| — | inizio | 1 s | 10% | 5 | 305 |
| — | metà | 6 s | 60% | 30 | 330 |
| — | fine | 10 s | 100% | 50 | 350 |

**Livello F — OAHS assistito 1 dito 1–10 s** · Elite · 50 punti (da 350 a 400 nella catena) · voce "OAHS assistito 1 dito"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| — | inizio | 1 s | 10% | 5 | 355 |
| — | metà | 6 s | 60% | 30 | 380 |
| — | fine | 10 s | 100% | 50 | 400 |

**Livello G — OAHS straddle 1–10 s** · Titano · 125 punti (da 400 a 525 nella catena) · voce "OAHS straddle"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| — | inizio | 1 s | 10% | 12,5 | 413 |
| — | metà | 6 s | 60% | 75 | 475 |
| — | fine | 10 s | 100% | 125 | 525 |

**Livello H — OAHS full 1–10 s** · Leggenda · 120 punti (da 525 a 645 nella catena) · voce "OAHS full"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| — | inizio | 1 s | 10% | 12 | 537 |
| — | metà | 6 s | 60% | 72 | 597 |
| — | fine | 10 s | 100% | 120 | 645 |
