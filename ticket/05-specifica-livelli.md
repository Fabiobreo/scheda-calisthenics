# 05 — Specifica del sistema di livelli

- **Punti PDF**: 5, 6
- **Figura professionale**: product owner insieme a un **coach/esperto di calisthenics** (meglio se con esperienza di
  streetlifting per i carichi). È un ticket di decisione: il risultato è questo documento approvato, non codice.
- **Dipende da**: nulla. **Sblocca**: 08, 09, 10, 11.
- **Stato**: domande chiuse l'8 novembre 2026. Restano da rivedere le **definizioni dei movimenti** e le
  **interpretazioni adottate** (in fondo), poi il ticket è approvato.

## Decisioni (8 novembre 2026)

| # | Tema | Decisione |
|---|------|-----------|
| 1 | Record in kg di Trazioni, Muscle up, Dip, HSPU elite | È la **sola zavorra** aggiunta, non peso corporeo + zavorra. |
| 2 | Corpo libero senza zavorra | **Vale 0**: i fondamentali misurano la forza con carico. |
| 3 | Formula OAP base | `ripetizioni × 5 + Y` con Y = 0 (gomito), 25 (bicipite), 50 (spalla). |
| 4 | Formule elite Muscle up e Panca | `((R − PC/3) × 100) / (PC/3)` e `((R − 1,6·PC) × 100) / (0,6·PC)`. |
| 5 | Military e Panca | Record = peso sul bilanciere, bilanciere incluso. Military **in piedi**, senza spinta delle gambe. |
| 6 | Dip elite fino a 2 × PC | **Voluto**. |
| 7 | Nome dell'elite del Front lever touch | **Wide front lever touch**. |
| 8 | Salti nelle tabelle (61, 82, 23→25) | **Voluti**: le tabelle si implementano come scritte. |
| 9 | Hand stand push up | **In libera**, ampiezza completa. |
| 11 | Oltre il massimo (es. 15 s di Tuck) | **Non si può inserire**: il campo si ferma al massimo e l'app suggerisce la progressione successiva. |
| 12 | Record peggiore del precedente | Conta il **migliore di sempre**. I record sbagliati si correggono o si cancellano. |
| 13 | Peso corporeo che cambia | Ogni record si calcola col **peso del giorno del record** (serve lo storico del peso, ticket 09). |
| 14 | Arrotondamento | **Per difetto** (99,6 → 99) su percentuali, categorie e livello. |
| 15 | Formule nascoste | Basta **non mostrarle nell'interfaccia**: il calcolo resta nell'app. |
| 16 | Cambio dell'avatar | **Ogni 10 livelli**: 20 stadi (10 fino a 100, 10 nella zona ELITE). |
| 17 | Chi inserisce i record | **Solo l'atleta**; il trainer li vede in sola lettura. |
| 18 | Gambe e Core | **Fuori dal livello**: restano nel catalogo e nei grafici. |

## Le regole

Notazione: **PC** = peso corporeo (kg) del giorno del record, **R** = record inserito, `lim(x)` = x limitato tra 0 e 1.
Ogni sotto-esercizio ha una parte **base** (0–100%) e una parte **ELITE** (101–200%), con gli stessi punti massimi.
La somma dei sotto-esercizi di una macro categoria fa 100 (base) + 100 (elite) = **0–200**.
Il **livello generale** è la media delle 5 macro categorie (0–200), arrotondata per difetto.

### Fondamentali tirata (Trazioni 34 · Muscle up 33 · OAP 33)

| Esercizio | Input | Base | Elite (sbloccata a base 100%) |
|-----------|-------|------|-------------------------------|
| Trazioni | zavorra kg, 1 rip. | `34 · lim(R / PC)` | `34 · lim((R − PC) / (0,3·PC))` |
| Muscle up | zavorra kg, 1 rip. | `33 · lim(R / (PC/3))` | `33 · lim((R − PC/3) / (PC/3))` |
| OAP | progressione + rip. | vedi sotto | rip. 3…10 → 4, 8, 12, 16, 20, 24, 28, 33 |

OAP base (valore 0–100, punti = `33 · valore / 100`):

| Progressione | 1 rip. | 2 | 3 | 4 | 5 |
|--------------|--------|---|---|---|---|
| Assistito mano al gomito | 5 | 10 | 15 | 20 | 25 |
| Assistito mano al bicipite | 30 | 35 | 40 | 45 | 50 |
| Assistito mano alla spalla | 55 | 60 | 65 | 70 | 75 |
| OAP | 85 | 100 | — | — | — |

### Fondamentali spinta (Dip 34 · Military 33 · Panca piana 33)

| Esercizio | Input | Base | Elite |
|-----------|-------|------|-------|
| Dip | zavorra kg, 1 rip. | `34 · lim(R / PC)` | `34 · lim((R − PC) / PC)` |
| Military (in piedi) | bilanciere kg, 1 rip. | `33 · lim(R / PC)` | `33 · lim((R − PC) / (0,4·PC))` |
| Panca piana | bilanciere kg, 1 rip. | `33 · lim(R / (1,6·PC))` | `33 · lim((R − 1,6·PC) / (0,6·PC))` |

### Skill spinta (Planche 50 · Planche push up 25 · Planche press 25)

- **Planche**: progressione + secondi (1–10). Valori 0–100: Tuck 2…20 (2/s), Advanced tuck 22…40, One leg 42…60,
  Straddle 61…70 (1/s), Half lay 71…80, Full 82…100 (2/s). Punti = `50 · valore / 100`.
  Elite: **Wide planche** 1–10 s → 2, 4, 7, 9, 11, 14, 16, 18, 21, 25 (+50); poi **Maltese** stessa tabella (+75).
- **Planche push up**: progressione + 1–2 rip. → Tuck 2/4, Adv. tuck 6/8, One leg 10/12, Straddle 14/16, Half lay 18/20,
  Full 22/25. Elite (sbloccata con 2 rip. Full): Full 3…10 rip. → 3, 6, 9, 12, 15, 18, 21, 25 (+25).
- **Planche press**: progressione, 1 rip. → Tuck 4, Adv. tuck 8, One leg 12, Straddle 16, Half lay 20, Full 25.
  Elite (sbloccata con 1 rip. Full): Full 2…5 rip. → 6, 12, 18, 25 (+25).

### Skill tirata (Front lever 50 · Front lever pull up 25 · Front lever touch 25)

- **Front lever**: stesse tabelle della planche. Elite: **Wide front lever** (+50), poi **Victorian** (+75).
- **Front lever touch**: progressione + 1–4 s → Tuck 1…4, Adv. tuck 5…8, One leg 9…12, Straddle 13…16, Half lay 17…20,
  Full 21, 22, 23, 25. Elite (sbloccata con 4 s Full): **Wide front lever touch** 1–10 s → 2, 4, 7, 9, 11, 14, 16, 18,
  21, 25 (+25).
- **Front lever pull up**: progressione + 1–4 rip., stessi valori del touch. Elite (sbloccata con 4 rip. Full):
  **Wide front lever pull up** 1–10 rip., stessa tabella (+25).

### Handbalance (Verticale 60 · Hand stand push up 40)

- **Verticale**: 1–120 s → `60 · s / 120`. Elite: **Verticale straddle mono braccio** 1–10 s → 3/s (+60), poi
  **Verticale full mono braccio** 1–10 s → 3/s (+90).
- **Hand stand push up** (in libera): 1–10 rip. → 4/rip. Elite (sbloccata a 10 rip.): zavorra kg in 1 rip. →
  `40 · lim(R / (0,5·PC))` (+40).

### Visualizzazione

- L'utente **non vede** formule né punti: per ogni sotto-esercizio vede una **percentuale di completamento** (base in
  un colore, elite in un altro), per ogni macro categoria il valore su 100 o su 200, e il livello generale.
- Le versioni ELITE sono **nascoste** finché la soglia precedente non è completa. Con due fasi elite, la seconda compare
  solo dopo la prima.
- Valori inseribili solo entro i limiti della progressione; raggiunto il massimo, l'app suggerisce la successiva.

### Avatar

- Stadio = `floor(livello / 10)`, quindi 0–9 nella zona normale e 10–19 nella zona ELITE (20 stadi; il livello 200 resta
  nell'ultimo stadio).
- Aura: intensità che cresce verso 100 e diventa piena a 100. Scosse elettriche da 101, piene a 200 (dettagli nel 11).

## Definizioni dei movimenti (proposta da rivedere)

Testi brevi da mostrare nell'app accanto a ogni sotto-esercizio.

- **Trazioni**: presa prona, partenza a braccia tese, mento sopra la sbarra. Record = zavorra massima per 1 ripetizione.
- **Muscle up**: alla sbarra, dalla sospensione a braccia tese fino al sostegno a braccia tese sopra la sbarra, senza
  kipping. Record = zavorra massima per 1 ripetizione.
- **OAP (one arm pull up)**: trazione a un braccio, partenza a braccio teso, mento sopra la sbarra. Nelle propedeutiche
  la mano libera assiste afferrando il braccio che tira al gomito, al bicipite o alla spalla (più in alto = meno aiuto).
- **Dip**: alle parallele, dalle braccia tese fino a spalle sotto i gomiti, poi di nuovo a braccia tese. Record = zavorra
  massima per 1 ripetizione.
- **Military**: in piedi, bilanciere dalle clavicole sopra la testa a braccia tese, senza spinta delle gambe.
- **Panca piana**: bilanciere al petto e spinta a braccia tese, glutei sulla panca.
- **Planche**: corpo sospeso parallelo al suolo in appoggio sulle mani, braccia tese. Progressioni dalla più raccolta
  (Tuck) al corpo teso (Full).
- **Planche push up**: piegamento completo mantenendo la posizione di planche della progressione scelta.
- **Planche press**: dalla planche della progressione scelta si sale in verticale senza toccare terra coi piedi,
  braccia tese.
- **Front lever**: appesi alla sbarra, corpo orizzontale a pancia in su, braccia tese.
- **Front lever pull up**: dalla posizione di front lever si tira il corpo verso la sbarra mantenendolo orizzontale, e si
  torna a braccia tese.
- **Front lever touch**: in posizione di front lever si tira fino a portare la sbarra a contatto con il corpo
  (all'altezza dell'addome) e si tiene la posizione; si misurano i secondi di tenuta.
- **Wide** (planche, front lever, front lever pull up, front lever touch): stessa esecuzione con presa larga.
- **Maltese**: planche con le mani molto larghe e il corpo vicino al suolo. **Victorian**: tenuta a corpo teso sotto
  la sbarra, orizzontale e a pancia in giù, con le braccia tese lungo i fianchi.
- **Verticale**: in equilibrio sulle mani, corpo allineato, senza appoggi. Elite **mono braccio**: su una mano sola, a
  gambe divaricate (straddle) o unite (full).
- **Hand stand push up**: in verticale senza muro, testa fino a terra e risalita a braccia tese. Elite = zavorra massima
  per 1 ripetizione.

## Interpretazioni adottate (da confermare con un sì)

1. **Percentuale elite** = punti elite ottenuti / punti elite massimi del sotto-esercizio. Con due fasi (es. Wide planche
   e Maltese) la percentuale copre entrambe: Wide planche al massimo = 50%.
2. Un record nella seconda fase elite (es. Maltese 3 s) implica la prima completa: vale 75 + 7.
3. "Migliore di sempre" vuol dire il record che vale più punti, ciascuno calcolato col peso del suo giorno.
4. Per i record in kg, senza peso corporeo inserito il sotto-esercizio resta "da completare" e la Home chiede il peso.

## Casi di prova (diventano i test del ticket 08)

PC = 75 kg salvo dove indicato. "Mostrato" usa l'arrotondamento per difetto.

| Caso | Calcolo | Punti | Mostrato |
|------|---------|-------|----------|
| Trazioni, zavorra 0 | 34 · 0 | 0 | 0% |
| Trazioni, zavorra 30 kg | 34 · 30/75 | 13,6 | 40% |
| Trazioni, zavorra 75 kg | 34 · 1 | 34 | 100% → si sblocca ELITE (0%) |
| Trazioni, zavorra 90 kg | 34 + 34 · 15/22,5 | 56,67 | ELITE 66% |
| Trazioni, 30 kg con PC 75, poi il peso sale a 80 | resta 34 · 30/75 | 13,6 | 40% (peso del giorno del record) |
| Muscle up, zavorra 10 kg | 33 · 10/25 | 13,2 | 40% |
| Muscle up, zavorra 50 kg | 33 + 33 · 25/25 | 66 | ELITE 100% |
| OAP assistito gomito, 5 rip. | 33 · 25/100 | 8,25 | 25% |
| OAP assistito spalla, 3 rip. | 33 · 65/100 | 21,45 | 65% |
| OAP, 2 rip. | 33 · 100/100 | 33 | 100% → ELITE |
| OAP elite, 6 rip. | 33 + 16 | 49 | ELITE 48% |
| Dip, zavorra 75 kg | 34 | 34 | 100% → ELITE |
| Military 60 kg | 33 · 60/75 | 26,4 | 80% |
| Panca piana 100 kg | 33 · 100/120 | 27,5 | 83% |
| Panca piana 150 kg | 33 + 33 · 30/45 | 55 | ELITE 66% |
| Straddle planche 5 s | 50 · 65/100 | 32,5 | 65% |
| Full planche 10 s | 50 · 100/100 | 50 | 100% → Wide planche |
| Wide planche 4 s | 50 + 9 | 59 | ELITE 18% |
| Maltese 3 s | 75 + 7 | 82 | ELITE 64% |
| Planche press Full, 3 rip. | 25 + 12 | 37 | ELITE 48% |
| Front lever touch Full 4 s | 25 | 25 | 100% → Wide front lever touch |
| Wide front lever touch 5 s | 25 + 11 | 36 | ELITE 44% |
| Verticale 60 s | 60 · 60/120 | 30 | 50% |
| Verticale straddle mono braccio 4 s | 60 + 12 | 72 | ELITE 20% |
| Verticale full mono braccio 10 s | 90 + 30 | 120 | ELITE 100% |
| HSPU 6 rip. | 6 · 4 | 24 | 60% |
| HSPU elite, zavorra 20 kg | 40 + 40 · 20/37,5 | 61,33 | ELITE 53% |

Esempio di livello: Fondamentali tirata 60, Fondamentali spinta 70, Skill spinta 30, Skill tirata 25,
Handbalance 50 → (60+70+30+25+50)/5 = 47 → **livello 47**, avatar stadio 4.

## Criteri di accettazione

- Definizioni dei movimenti e interpretazioni adottate confermate (o corrette) da te o dal coach.
- Tabella dei casi di prova approvata.
