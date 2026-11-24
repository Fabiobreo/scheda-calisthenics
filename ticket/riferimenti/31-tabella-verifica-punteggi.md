# Tabella di verifica dei punteggi v2

Generata da `node scripts/tabella-punteggi.mjs` con il motore di `src/lib/levels/v2` (ticket 31). Non modificarla a mano.

**Per Michael**: ogni riga è un record inserito nell’app. Rifai il conto con la tua formula e segnala le righe che non tornano.

Come leggerla:

- **Peso**: peso corporeo dentro il record. "—" quando la formula non lo usa (il risultato è uguale per tutti).
- **Valore**: quello che l’utente scrive (ripetizioni, secondi, kg di zavorra o di massimale), all’inizio, a metà e alla
  fine del livello. I kg sono arrotondati per eccesso al decimo, ripetizioni e secondi sono interi: per questo a 70 e
  80 kg "inizio" e "fine" non danno sempre 1% e 100% esatti.
- **G**: solo per i kg, il valore normalizzato della formula: `(peso + zavorra) × (60/peso)^esponente`, oppure
  `massimale × (60/peso)^esponente` per panca e military.
- **% livello**: il risultato della formula del livello (0 se non raggiunto, da 1 a 100).
- **Punti livello**: % × punti massimi del livello, non arrotondati.
- **Punti catena**: quello che vale il record per tutta la catena, arrotondato all’intero: livelli sotto pieni + punti del
  livello raggiunto. Alla **fine** di un livello a carico il record entra già nel livello successivo all’1%: i punti della
  catena contano anche quell’1% (es. trazioni a 60 kg con 27 kg: livello C pieno = 300, più 1% del livello D = 301).

Fasce dei livelli con nome:

| | Base | Intermedio | Avanzato | Elite | Titano | Leggenda |
|---|---|---|---|---|---|---|
| Fondamentali tirata | 0–100 | 101–200 | 201–500 | 501–800 | 801–1100 | 1101–1400 |
| Fondamentali spinta | 0–100 | 101–200 | 201–500 | 501–800 | 801–1100 | 1101–1400 |
| Skill tirata | 0–200 | 201–500 | 501–666 | 667–800 | 801–1100 | 1101–1400 |
| Skill spinta | 0–100 | 101–500 | 501–684 | 685–850 | 851–1100 | 1101–1400 |
| Handbalance | 0–100 | 101–200 | 201–500 | 501–800 | 801–1100 | 1101–1400 |
| Complessivo | 0–300 | 301–800 | 801–2500 | 2501–4000 | 4001–5500 | 5501–7000 |

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

### Front lever (800 punti)

**Livello A — Tuck front lever 1–10 s** · Base · 200 punti (da 0 a 200 nella catena) · voce "Tuck"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 s | 10% | 20 | 20 |
| 60 kg | metà | 6 s | 60% | 120 | 120 |
| 60 kg | fine | 10 s | 100% | 200 | 200 |
| 70 kg | inizio | 1 s | 11,67% | 23,33 | 23 |
| 70 kg | metà | 5 s | 58,33% | 116,67 | 117 |
| 70 kg | fine | 9 s | 100% | 200 | 200 |
| 80 kg | inizio | 1 s | 13,33% | 26,67 | 27 |
| 80 kg | metà | 5 s | 66,67% | 133,33 | 133 |
| 80 kg | fine | 8 s | 100% | 200 | 200 |

**Livello B — Tuck advanced front lever 1–10 s** · Intermedio · 150 punti (da 200 a 350 nella catena) · voce "Tuck advanced"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 s | 10% | 15 | 215 |
| 60 kg | metà | 6 s | 60% | 90 | 290 |
| 60 kg | fine | 10 s | 100% | 150 | 350 |
| 70 kg | inizio | 1 s | 11,67% | 17,5 | 218 |
| 70 kg | metà | 5 s | 58,33% | 87,5 | 288 |
| 70 kg | fine | 9 s | 100% | 150 | 350 |
| 80 kg | inizio | 1 s | 13,33% | 20 | 220 |
| 80 kg | metà | 5 s | 66,67% | 100 | 300 |
| 80 kg | fine | 8 s | 100% | 150 | 350 |

**Livello C — One leg front lever 1–10 s** · Intermedio · 150 punti (da 350 a 500 nella catena) · voce "One leg"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 s | 10% | 15 | 365 |
| 60 kg | metà | 6 s | 60% | 90 | 440 |
| 60 kg | fine | 10 s | 100% | 150 | 500 |
| 70 kg | inizio | 1 s | 11,67% | 17,5 | 368 |
| 70 kg | metà | 5 s | 58,33% | 87,5 | 438 |
| 70 kg | fine | 9 s | 100% | 150 | 500 |
| 80 kg | inizio | 1 s | 13,33% | 20 | 370 |
| 80 kg | metà | 5 s | 66,67% | 100 | 450 |
| 80 kg | fine | 8 s | 100% | 150 | 500 |

**Livello D — Straddle front lever 1–10 s** · Avanzato · 33 punti (da 500 a 533 nella catena) · voce "Straddle"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 s | 10% | 3,3 | 503 |
| 60 kg | metà | 6 s | 60% | 19,8 | 520 |
| 60 kg | fine | 10 s | 100% | 33 | 533 |
| 70 kg | inizio | 1 s | 11,67% | 3,85 | 504 |
| 70 kg | metà | 5 s | 58,33% | 19,25 | 519 |
| 70 kg | fine | 9 s | 100% | 33 | 533 |
| 80 kg | inizio | 1 s | 13,33% | 4,4 | 504 |
| 80 kg | metà | 5 s | 66,67% | 22 | 522 |
| 80 kg | fine | 8 s | 100% | 33 | 533 |

**Livello E — Half lay front lever 1–10 s** · Avanzato · 33 punti (da 533 a 566 nella catena) · voce "Half lay"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 s | 10% | 3,3 | 536 |
| 60 kg | metà | 6 s | 60% | 19,8 | 553 |
| 60 kg | fine | 10 s | 100% | 33 | 566 |
| 70 kg | inizio | 1 s | 11,67% | 3,85 | 537 |
| 70 kg | metà | 5 s | 58,33% | 19,25 | 552 |
| 70 kg | fine | 9 s | 100% | 33 | 566 |
| 80 kg | inizio | 1 s | 13,33% | 4,4 | 537 |
| 80 kg | metà | 5 s | 66,67% | 22 | 555 |
| 80 kg | fine | 8 s | 100% | 33 | 566 |

**Livello F — Full front lever 1–10 s** · Elite · 34 punti (da 566 a 600 nella catena) · voce "Full"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 s | 10% | 3,4 | 569 |
| 60 kg | metà | 6 s | 60% | 20,4 | 586 |
| 60 kg | fine | 10 s | 100% | 34 | 600 |
| 70 kg | inizio | 1 s | 11,67% | 3,97 | 570 |
| 70 kg | metà | 5 s | 58,33% | 19,83 | 586 |
| 70 kg | fine | 9 s | 100% | 34 | 600 |
| 80 kg | inizio | 1 s | 13,33% | 4,53 | 571 |
| 80 kg | metà | 5 s | 66,67% | 22,67 | 589 |
| 80 kg | fine | 8 s | 100% | 34 | 600 |

**Livello G — Wide full front lever 1–10 s** · Titano · 100 punti (da 600 a 700 nella catena) · voce "Wide full"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 s | 10% | 10 | 610 |
| 60 kg | metà | 6 s | 60% | 60 | 660 |
| 60 kg | fine | 10 s | 100% | 100 | 700 |
| 70 kg | inizio | 1 s | 11,67% | 11,67 | 612 |
| 70 kg | metà | 5 s | 58,33% | 58,33 | 658 |
| 70 kg | fine | 9 s | 100% | 100 | 700 |
| 80 kg | inizio | 1 s | 13,33% | 13,33 | 613 |
| 80 kg | metà | 5 s | 66,67% | 66,67 | 667 |
| 80 kg | fine | 8 s | 100% | 100 | 700 |

**Livello H — Victorian 1–10 s** · Leggenda · 100 punti (da 700 a 800 nella catena) · voce "Victorian"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 s | 10% | 10 | 710 |
| 60 kg | metà | 6 s | 60% | 60 | 760 |
| 60 kg | fine | 10 s | 100% | 100 | 800 |
| 70 kg | inizio | 1 s | 11,67% | 11,67 | 712 |
| 70 kg | metà | 5 s | 58,33% | 58,33 | 758 |
| 70 kg | fine | 9 s | 100% | 100 | 800 |
| 80 kg | inizio | 1 s | 13,33% | 13,33 | 713 |
| 80 kg | metà | 5 s | 66,67% | 66,67 | 767 |
| 80 kg | fine | 8 s | 100% | 100 | 800 |

### Front lever touch (300 punti)

**Livello A — Tuck advanced front lever touch 1–10 s** · Avanzato · 25 punti (da 0 a 25 nella catena) · voce "Tuck advanced"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 s | 10% | 2,5 | 3 |
| 60 kg | metà | 6 s | 60% | 15 | 15 |
| 60 kg | fine | 10 s | 100% | 25 | 25 |
| 70 kg | inizio | 1 s | 11,67% | 2,92 | 3 |
| 70 kg | metà | 5 s | 58,33% | 14,58 | 15 |
| 70 kg | fine | 9 s | 100% | 25 | 25 |
| 80 kg | inizio | 1 s | 13,33% | 3,33 | 3 |
| 80 kg | metà | 5 s | 66,67% | 16,67 | 17 |
| 80 kg | fine | 8 s | 100% | 25 | 25 |

**Livello B — One leg front lever touch 1–10 s** · Avanzato · 25 punti (da 25 a 50 nella catena) · voce "One leg"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 s | 10% | 2,5 | 28 |
| 60 kg | metà | 6 s | 60% | 15 | 40 |
| 60 kg | fine | 10 s | 100% | 25 | 50 |
| 70 kg | inizio | 1 s | 11,67% | 2,92 | 28 |
| 70 kg | metà | 5 s | 58,33% | 14,58 | 40 |
| 70 kg | fine | 9 s | 100% | 25 | 50 |
| 80 kg | inizio | 1 s | 13,33% | 3,33 | 28 |
| 80 kg | metà | 5 s | 66,67% | 16,67 | 42 |
| 80 kg | fine | 8 s | 100% | 25 | 50 |

**Livello C — Straddle front lever touch 1–10 s** · Elite · 25 punti (da 50 a 75 nella catena) · voce "Straddle"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 s | 10% | 2,5 | 53 |
| 60 kg | metà | 6 s | 60% | 15 | 65 |
| 60 kg | fine | 10 s | 100% | 25 | 75 |
| 70 kg | inizio | 1 s | 11,67% | 2,92 | 53 |
| 70 kg | metà | 5 s | 58,33% | 14,58 | 65 |
| 70 kg | fine | 9 s | 100% | 25 | 75 |
| 80 kg | inizio | 1 s | 13,33% | 3,33 | 53 |
| 80 kg | metà | 5 s | 66,67% | 16,67 | 67 |
| 80 kg | fine | 8 s | 100% | 25 | 75 |

**Livello D — Half lay front lever touch 1–10 s** · Elite · 25 punti (da 75 a 100 nella catena) · voce "Half lay"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 s | 10% | 2,5 | 78 |
| 60 kg | metà | 6 s | 60% | 15 | 90 |
| 60 kg | fine | 10 s | 100% | 25 | 100 |
| 70 kg | inizio | 1 s | 11,67% | 2,92 | 78 |
| 70 kg | metà | 5 s | 58,33% | 14,58 | 90 |
| 70 kg | fine | 9 s | 100% | 25 | 100 |
| 80 kg | inizio | 1 s | 13,33% | 3,33 | 78 |
| 80 kg | metà | 5 s | 66,67% | 16,67 | 92 |
| 80 kg | fine | 8 s | 100% | 25 | 100 |

**Livello E — Full front lever touch 1–5 s** · Titano · 100 punti (da 100 a 200 nella catena) · voce "Full"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 s | 20% | 20 | 120 |
| 60 kg | metà | 3 s | 60% | 60 | 160 |
| 60 kg | fine | 5 s | 100% | 100 | 200 |
| 70 kg | inizio | 1 s | 23,33% | 23,33 | 123 |
| 70 kg | metà | 3 s | 70% | 70 | 170 |
| 70 kg | fine | 5 s | 100% | 100 | 200 |
| 80 kg | inizio | 1 s | 26,67% | 26,67 | 127 |
| 80 kg | metà | 3 s | 80% | 80 | 180 |
| 80 kg | fine | 4 s | 100% | 100 | 200 |

**Livello F — Wide full front lever touch 1–10 s** · Leggenda · 100 punti (da 200 a 300 nella catena) · voce "Wide full"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 s | 10% | 10 | 210 |
| 60 kg | metà | 6 s | 60% | 60 | 260 |
| 60 kg | fine | 10 s | 100% | 100 | 300 |
| 70 kg | inizio | 1 s | 11,67% | 11,67 | 212 |
| 70 kg | metà | 5 s | 58,33% | 58,33 | 258 |
| 70 kg | fine | 9 s | 100% | 100 | 300 |
| 80 kg | inizio | 1 s | 13,33% | 13,33 | 213 |
| 80 kg | metà | 5 s | 66,67% | 66,67 | 267 |
| 80 kg | fine | 8 s | 100% | 100 | 300 |

### Front lever pull ups (300 punti)

**Livello A — Tuck advanced front lever pull ups 1–5 rip.** · Avanzato · 25 punti (da 0 a 25 nella catena) · voce "Tuck advanced"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 rip. | 20% | 5 | 5 |
| 60 kg | metà | 3 rip. | 60% | 15 | 15 |
| 60 kg | fine | 5 rip. | 100% | 25 | 25 |
| 70 kg | inizio | 1 rip. | 27,22% | 6,81 | 7 |
| 70 kg | metà | 3 rip. | 81,67% | 20,42 | 20 |
| 70 kg | fine | 4 rip. | 100% | 25 | 25 |
| 80 kg | inizio | 1 rip. | 35,56% | 8,89 | 9 |
| 80 kg | metà | 2 rip. | 71,11% | 17,78 | 18 |
| 80 kg | fine | 3 rip. | 100% | 25 | 25 |

**Livello B — One leg front lever pull ups 1–5 rip.** · Avanzato · 25 punti (da 25 a 50 nella catena) · voce "One leg"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 rip. | 20% | 5 | 30 |
| 60 kg | metà | 3 rip. | 60% | 15 | 40 |
| 60 kg | fine | 5 rip. | 100% | 25 | 50 |
| 70 kg | inizio | 1 rip. | 27,22% | 6,81 | 32 |
| 70 kg | metà | 3 rip. | 81,67% | 20,42 | 45 |
| 70 kg | fine | 4 rip. | 100% | 25 | 50 |
| 80 kg | inizio | 1 rip. | 35,56% | 8,89 | 34 |
| 80 kg | metà | 2 rip. | 71,11% | 17,78 | 43 |
| 80 kg | fine | 3 rip. | 100% | 25 | 50 |

**Livello C — Straddle front lever pull ups 1–5 rip.** · Elite · 50 punti (da 50 a 100 nella catena) · voce "Straddle"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 rip. | 20% | 10 | 60 |
| 60 kg | metà | 3 rip. | 60% | 30 | 80 |
| 60 kg | fine | 5 rip. | 100% | 50 | 100 |
| 70 kg | inizio | 1 rip. | 27,22% | 13,61 | 64 |
| 70 kg | metà | 3 rip. | 81,67% | 40,83 | 91 |
| 70 kg | fine | 4 rip. | 100% | 50 | 100 |
| 80 kg | inizio | 1 rip. | 35,56% | 17,78 | 68 |
| 80 kg | metà | 2 rip. | 71,11% | 35,56 | 86 |
| 80 kg | fine | 3 rip. | 100% | 50 | 100 |

**Livello D — Half lay front lever pull ups 1–5 rip.** · Titano · 50 punti (da 100 a 150 nella catena) · voce "Half lay"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 rip. | 20% | 10 | 110 |
| 60 kg | metà | 3 rip. | 60% | 30 | 130 |
| 60 kg | fine | 5 rip. | 100% | 50 | 150 |
| 70 kg | inizio | 1 rip. | 27,22% | 13,61 | 114 |
| 70 kg | metà | 3 rip. | 81,67% | 40,83 | 141 |
| 70 kg | fine | 4 rip. | 100% | 50 | 150 |
| 80 kg | inizio | 1 rip. | 35,56% | 17,78 | 118 |
| 80 kg | metà | 2 rip. | 71,11% | 35,56 | 136 |
| 80 kg | fine | 3 rip. | 100% | 50 | 150 |

**Livello E — Full front lever pull ups 1–5 rip.** · Titano · 50 punti (da 150 a 200 nella catena) · voce "Full"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 rip. | 20% | 10 | 160 |
| 60 kg | metà | 3 rip. | 60% | 30 | 180 |
| 60 kg | fine | 5 rip. | 100% | 50 | 200 |
| 70 kg | inizio | 1 rip. | 27,22% | 13,61 | 164 |
| 70 kg | metà | 3 rip. | 81,67% | 40,83 | 191 |
| 70 kg | fine | 4 rip. | 100% | 50 | 200 |
| 80 kg | inizio | 1 rip. | 35,56% | 17,78 | 168 |
| 80 kg | metà | 2 rip. | 71,11% | 35,56 | 186 |
| 80 kg | fine | 3 rip. | 100% | 50 | 200 |

**Livello F — Wide full front lever pull ups 1–5 rip.** · Leggenda · 100 punti (da 200 a 300 nella catena) · voce "Wide full"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 rip. | 20% | 20 | 220 |
| 60 kg | metà | 3 rip. | 60% | 60 | 260 |
| 60 kg | fine | 5 rip. | 100% | 100 | 300 |
| 70 kg | inizio | 1 rip. | 27,22% | 27,22 | 227 |
| 70 kg | metà | 3 rip. | 81,67% | 81,67 | 282 |
| 70 kg | fine | 4 rip. | 100% | 100 | 300 |
| 80 kg | inizio | 1 rip. | 35,56% | 35,56 | 236 |
| 80 kg | metà | 2 rip. | 71,11% | 71,11 | 271 |
| 80 kg | fine | 3 rip. | 100% | 100 | 300 |

## Skill spinta

### Planche (534 punti)

**Livello A — Tuck planche 1–10 s** · Base · 100 punti (da 0 a 100 nella catena) · voce "Tuck"

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

**Livello B — Tuck advanced planche 1–10 s** · Intermedio · 134 punti (da 100 a 234 nella catena) · voce "Tuck advanced"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 s | 10% | 13,4 | 113 |
| 60 kg | metà | 6 s | 60% | 80,4 | 180 |
| 60 kg | fine | 10 s | 100% | 134 | 234 |
| 70 kg | inizio | 1 s | 11,67% | 15,63 | 116 |
| 70 kg | metà | 5 s | 58,33% | 78,17 | 178 |
| 70 kg | fine | 9 s | 100% | 134 | 234 |
| 80 kg | inizio | 1 s | 13,33% | 17,87 | 118 |
| 80 kg | metà | 5 s | 66,67% | 89,33 | 189 |
| 80 kg | fine | 8 s | 100% | 134 | 234 |

**Livello C — One leg planche 1–10 s** · Avanzato · 50 punti (da 234 a 284 nella catena) · voce "One leg"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 s | 10% | 5 | 239 |
| 60 kg | metà | 6 s | 60% | 30 | 264 |
| 60 kg | fine | 10 s | 100% | 50 | 284 |
| 70 kg | inizio | 1 s | 11,67% | 5,83 | 240 |
| 70 kg | metà | 5 s | 58,33% | 29,17 | 263 |
| 70 kg | fine | 9 s | 100% | 50 | 284 |
| 80 kg | inizio | 1 s | 13,33% | 6,67 | 241 |
| 80 kg | metà | 5 s | 66,67% | 33,33 | 267 |
| 80 kg | fine | 8 s | 100% | 50 | 284 |

**Livello D — Straddle planche 1–10 s** · Elite · 50 punti (da 284 a 334 nella catena) · voce "Straddle"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 s | 10% | 5 | 289 |
| 60 kg | metà | 6 s | 60% | 30 | 314 |
| 60 kg | fine | 10 s | 100% | 50 | 334 |
| 70 kg | inizio | 1 s | 11,67% | 5,83 | 290 |
| 70 kg | metà | 5 s | 58,33% | 29,17 | 313 |
| 70 kg | fine | 9 s | 100% | 50 | 334 |
| 80 kg | inizio | 1 s | 13,33% | 6,67 | 291 |
| 80 kg | metà | 5 s | 66,67% | 33,33 | 317 |
| 80 kg | fine | 8 s | 100% | 50 | 334 |

**Livello E — Full planche 1–10 s** · Titano · 100 punti (da 334 a 434 nella catena) · voce "Full"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 s | 10% | 10 | 344 |
| 60 kg | metà | 6 s | 60% | 60 | 394 |
| 60 kg | fine | 10 s | 100% | 100 | 434 |
| 70 kg | inizio | 1 s | 11,67% | 11,67 | 346 |
| 70 kg | metà | 5 s | 58,33% | 58,33 | 392 |
| 70 kg | fine | 9 s | 100% | 100 | 434 |
| 80 kg | inizio | 1 s | 13,33% | 13,33 | 347 |
| 80 kg | metà | 5 s | 66,67% | 66,67 | 401 |
| 80 kg | fine | 8 s | 100% | 100 | 434 |

**Livello F — Maltese 1–10 s** · Leggenda · 100 punti (da 434 a 534 nella catena) · voce "Maltese"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 s | 10% | 10 | 444 |
| 60 kg | metà | 6 s | 60% | 60 | 494 |
| 60 kg | fine | 10 s | 100% | 100 | 534 |
| 70 kg | inizio | 1 s | 11,67% | 11,67 | 446 |
| 70 kg | metà | 5 s | 58,33% | 58,33 | 492 |
| 70 kg | fine | 9 s | 100% | 100 | 534 |
| 80 kg | inizio | 1 s | 13,33% | 13,33 | 447 |
| 80 kg | metà | 5 s | 66,67% | 66,67 | 501 |
| 80 kg | fine | 8 s | 100% | 100 | 534 |

### Planche push ups (433 punti)

**Livello A — Tuck planche push ups 1–5 rip.** · Intermedio · 133 punti (da 0 a 133 nella catena) · voce "Tuck"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 rip. | 20% | 26,6 | 27 |
| 60 kg | metà | 3 rip. | 60% | 79,8 | 80 |
| 60 kg | fine | 5 rip. | 100% | 133 | 133 |
| 70 kg | inizio | 1 rip. | 27,22% | 36,21 | 36 |
| 70 kg | metà | 3 rip. | 81,67% | 108,62 | 109 |
| 70 kg | fine | 4 rip. | 100% | 133 | 133 |
| 80 kg | inizio | 1 rip. | 35,56% | 47,29 | 47 |
| 80 kg | metà | 2 rip. | 71,11% | 94,58 | 95 |
| 80 kg | fine | 3 rip. | 100% | 133 | 133 |

**Livello B — Tuck advanced planche push ups 1–5 rip.** · Avanzato · 100 punti (da 133 a 233 nella catena) · voce "Tuck advanced"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 rip. | 20% | 20 | 153 |
| 60 kg | metà | 3 rip. | 60% | 60 | 193 |
| 60 kg | fine | 5 rip. | 100% | 100 | 233 |
| 70 kg | inizio | 1 rip. | 27,22% | 27,22 | 160 |
| 70 kg | metà | 3 rip. | 81,67% | 81,67 | 215 |
| 70 kg | fine | 4 rip. | 100% | 100 | 233 |
| 80 kg | inizio | 1 rip. | 35,56% | 35,56 | 169 |
| 80 kg | metà | 2 rip. | 71,11% | 71,11 | 204 |
| 80 kg | fine | 3 rip. | 100% | 100 | 233 |

**Livello C — One leg planche push ups 1–5 rip.** · Elite · 50 punti (da 233 a 283 nella catena) · voce "One leg"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 rip. | 20% | 10 | 243 |
| 60 kg | metà | 3 rip. | 60% | 30 | 263 |
| 60 kg | fine | 5 rip. | 100% | 50 | 283 |
| 70 kg | inizio | 1 rip. | 27,22% | 13,61 | 247 |
| 70 kg | metà | 3 rip. | 81,67% | 40,83 | 274 |
| 70 kg | fine | 4 rip. | 100% | 50 | 283 |
| 80 kg | inizio | 1 rip. | 35,56% | 17,78 | 251 |
| 80 kg | metà | 2 rip. | 71,11% | 35,56 | 269 |
| 80 kg | fine | 3 rip. | 100% | 50 | 283 |

**Livello D — Straddle planche push ups 1–5 rip.** · Titano · 50 punti (da 283 a 333 nella catena) · voce "Straddle"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 rip. | 20% | 10 | 293 |
| 60 kg | metà | 3 rip. | 60% | 30 | 313 |
| 60 kg | fine | 5 rip. | 100% | 50 | 333 |
| 70 kg | inizio | 1 rip. | 27,22% | 13,61 | 297 |
| 70 kg | metà | 3 rip. | 81,67% | 40,83 | 324 |
| 70 kg | fine | 4 rip. | 100% | 50 | 333 |
| 80 kg | inizio | 1 rip. | 35,56% | 17,78 | 301 |
| 80 kg | metà | 2 rip. | 71,11% | 35,56 | 319 |
| 80 kg | fine | 3 rip. | 100% | 50 | 333 |

**Livello E — Full planche push ups 1–5 rip.** · Leggenda · 100 punti (da 333 a 433 nella catena) · voce "Full"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 rip. | 20% | 20 | 353 |
| 60 kg | metà | 3 rip. | 60% | 60 | 393 |
| 60 kg | fine | 5 rip. | 100% | 100 | 433 |
| 70 kg | inizio | 1 rip. | 27,22% | 27,22 | 360 |
| 70 kg | metà | 3 rip. | 81,67% | 81,67 | 415 |
| 70 kg | fine | 4 rip. | 100% | 100 | 433 |
| 80 kg | inizio | 1 rip. | 35,56% | 35,56 | 369 |
| 80 kg | metà | 2 rip. | 71,11% | 71,11 | 404 |
| 80 kg | fine | 3 rip. | 100% | 100 | 433 |

### Planche press (433 punti)

**Livello A — Tuck planche press 1–3 rip.** · Intermedio · 133 punti (da 0 a 133 nella catena) · voce "Tuck"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 rip. | 33,33% | 44,33 | 44 |
| 60 kg | metà | 2 rip. | 66,67% | 88,67 | 89 |
| 60 kg | fine | 3 rip. | 100% | 133 | 133 |
| 70 kg | inizio | 1 rip. | 45,37% | 60,34 | 60 |
| 70 kg | metà | 2 rip. | 90,74% | 120,69 | 121 |
| 70 kg | fine | 3 rip. | 100% | 133 | 133 |
| 80 kg | inizio | 1 rip. | 59,26% | 78,81 | 79 |
| 80 kg | metà = fine | 2 rip. | 100% | 133 | 133 |

**Livello B — Tuck advanced planche press 1–3 rip.** · Avanzato · 34 punti (da 133 a 167 nella catena) · voce "Tuck advanced"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 rip. | 33,33% | 11,33 | 144 |
| 60 kg | metà | 2 rip. | 66,67% | 22,67 | 156 |
| 60 kg | fine | 3 rip. | 100% | 34 | 167 |
| 70 kg | inizio | 1 rip. | 45,37% | 15,43 | 148 |
| 70 kg | metà | 2 rip. | 90,74% | 30,85 | 164 |
| 70 kg | fine | 3 rip. | 100% | 34 | 167 |
| 80 kg | inizio | 1 rip. | 59,26% | 20,15 | 153 |
| 80 kg | metà = fine | 2 rip. | 100% | 34 | 167 |

**Livello C — One leg planche press 1–3 rip.** · Elite · 66 punti (da 167 a 233 nella catena) · voce "One leg"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 rip. | 33,33% | 22 | 189 |
| 60 kg | metà | 2 rip. | 66,67% | 44 | 211 |
| 60 kg | fine | 3 rip. | 100% | 66 | 233 |
| 70 kg | inizio | 1 rip. | 45,37% | 29,94 | 197 |
| 70 kg | metà | 2 rip. | 90,74% | 59,89 | 227 |
| 70 kg | fine | 3 rip. | 100% | 66 | 233 |
| 80 kg | inizio | 1 rip. | 59,26% | 39,11 | 206 |
| 80 kg | metà = fine | 2 rip. | 100% | 66 | 233 |

**Livello D — Straddle planche press 1–3 rip.** · Titano · 100 punti (da 233 a 333 nella catena) · voce "Straddle"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 rip. | 33,33% | 33,33 | 266 |
| 60 kg | metà | 2 rip. | 66,67% | 66,67 | 300 |
| 60 kg | fine | 3 rip. | 100% | 100 | 333 |
| 70 kg | inizio | 1 rip. | 45,37% | 45,37 | 278 |
| 70 kg | metà | 2 rip. | 90,74% | 90,74 | 324 |
| 70 kg | fine | 3 rip. | 100% | 100 | 333 |
| 80 kg | inizio | 1 rip. | 59,26% | 59,26 | 292 |
| 80 kg | metà = fine | 2 rip. | 100% | 100 | 333 |

**Livello E — Full planche press 1–3 rip.** · Leggenda · 100 punti (da 333 a 433 nella catena) · voce "Full"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| 60 kg | inizio | 1 rip. | 33,33% | 33,33 | 366 |
| 60 kg | metà | 2 rip. | 66,67% | 66,67 | 400 |
| 60 kg | fine | 3 rip. | 100% | 100 | 433 |
| 70 kg | inizio | 1 rip. | 45,37% | 45,37 | 378 |
| 70 kg | metà | 2 rip. | 90,74% | 90,74 | 424 |
| 70 kg | fine | 3 rip. | 100% | 100 | 433 |
| 80 kg | inizio | 1 rip. | 59,26% | 59,26 | 392 |
| 80 kg | metà = fine | 2 rip. | 100% | 100 | 433 |

## Handbalance

### HSPU (700 punti, esponente 0,75)

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

**Livello D — HSPU 1–10 rip.** · Elite · 150 punti (da 250 a 400 nella catena) · voce "HSPU liberi"

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

**Livello E — HSPU 5%–30% PC** · Titano · 150 punti (da 400 a 550 nella catena) · voce "HSPU zavorrati"

| Peso | Punto | Valore | G | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|---|
| 60 kg | inizio | 3 kg | 63 | 1% | 1,5 | 402 |
| 60 kg | metà | 10,5 kg | 70,5 | 50% | 75 | 475 |
| 60 kg | fine | 18 kg | 78 | 100% | 150 | 552 |
| 70 kg | inizio | 0,8 kg | 63,07 | 1% | 1,5 | 402 |
| 70 kg | metà | 9,2 kg | 70,55 | 50,35% | 75,53 | 476 |
| 70 kg | fine | 17,6 kg | 78,04 | 100% | 150 | 552 |
| 80 kg | inizio | 0,1 kg | 64,55 | 10,37% | 15,55 | 416 |
| 80 kg | metà | 7,5 kg | 70,52 | 50,12% | 75,19 | 475 |
| 80 kg | fine | 16,8 kg | 78,01 | 100% | 150 | 552 |

**Livello F — HSPU 30%–65% PC** · Leggenda · 150 punti (da 550 a 700 nella catena) · voce "HSPU zavorrati"

| Peso | Punto | Valore | G | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|---|
| 60 kg | inizio | 18 kg | 78 | 1% | 1,5 | 552 |
| 60 kg | metà | 28,5 kg | 88,5 | 50% | 75 | 625 |
| 60 kg | fine | 39 kg | 99 | 100% | 150 | 700 |
| 70 kg | inizio | 17,6 kg | 78,04 | 1% | 1,5 | 552 |
| 70 kg | metà | 29,4 kg | 88,55 | 50,23% | 75,34 | 625 |
| 70 kg | fine | 41,2 kg | 99,06 | 100% | 150 | 700 |
| 80 kg | inizio | 16,8 kg | 78,01 | 1% | 1,5 | 552 |
| 80 kg | metà | 29,9 kg | 88,57 | 50,34% | 75,51 | 626 |
| 80 kg | fine | 42,9 kg | 99,05 | 100% | 150 | 700 |

### Verticale e OAHS (700 punti)

**Livello A — Verticale a muro 1–60 s** · Base · 50 punti (da 0 a 50 nella catena) · voce "Verticale a muro"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| — | inizio | 1 s | 1,67% | 0,83 | 1 |
| — | metà | 31 s | 51,67% | 25,83 | 26 |
| — | fine | 60 s | 100% | 50 | 50 |

**Livello B — Verticale 1–15 s** · Intermedio · 50 punti (da 50 a 100 nella catena) · voce "Verticale"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| — | inizio | 1 s | 6,67% | 3,33 | 53 |
| — | metà | 8 s | 53,33% | 26,67 | 77 |
| — | fine | 15 s | 100% | 50 | 102 |

**Livello C — Verticale 15–60 s** · Avanzato · 150 punti (da 100 a 250 nella catena) · voce "Verticale"

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

**Livello G — OAHS straddle 1–10 s** · Titano · 150 punti (da 400 a 550 nella catena) · voce "OAHS straddle"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| — | inizio | 1 s | 10% | 15 | 415 |
| — | metà | 6 s | 60% | 90 | 490 |
| — | fine | 10 s | 100% | 150 | 550 |

**Livello H — OAHS 1–10 s** · Leggenda · 150 punti (da 550 a 700 nella catena) · voce "OAHS"

| Peso | Punto | Valore | % livello | Punti livello | Punti catena |
|---|---|---|---|---|---|
| — | inizio | 1 s | 10% | 15 | 565 |
| — | metà | 6 s | 60% | 90 | 640 |
| — | fine | 10 s | 100% | 150 | 700 |
