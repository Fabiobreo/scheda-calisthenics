# 30 — Specifica dei punteggi v2 (sostituisce il 05)

- **Fonte**: `Correzioni punteggi.pdf` di Michael (22 novembre 2026, 15 pagine) e le sue risposte del 24 novembre.
- **Figura professionale**: product owner + coach (Michael). Ticket di decisione: il risultato è questo documento.
- **Dipende da**: nulla. **Sblocca**: 31, 32, 34, 38.
- **Stima**: S (ma bloccante per 31).

## Cosa cambia rispetto al 05

| Tema | Oggi (05) | Nuovo |
|---|---|---|
| Scala di una macro categoria | 0–200 (100 base + 100 ELITE) | **0–1400 punti** |
| Livello generale | media delle 5 categorie, 0–200 | **somma** delle 5 categorie, 0–7000 |
| Livelli con nome | base / ELITE | **Base, Intermedio, Avanzato, Elite, Titano, Leggenda**, con fasce diverse per categoria |
| Sotto-esercizio | progressioni con tabelle scritte a mano | **catena** di livelli A–H, ognuno con punti massimi e una formula che dà la % di completamento |
| Peso corporeo | storico a parte, 20–300 kg, serve solo ai record in kg | **inserito dentro il record** quando la formula lo usa, 30–250 kg, normalizza quasi tutto (riferimento 60 kg, esponente per esercizio); niente storico |
| Record in kg | zavorra / PC | `(PC + zavorra) × (60/PC)^esp` (panca e military: `massimale × (60/PC)^esp`) |
| Arrotondamento | per difetto | **all'intero più vicino**, solo sui punti finali |
| Numero mostrato | il valore 0–200 | la **percentuale dentro il livello in cui ti trovi** (risposta di Michael del 24/11) |

## Le regole (come le implementa il 31)

1. Ogni formula dà la **% di completamento di un livello**: 0 se non raggiunto, 1–100 se raggiunto.
   Punti del livello = % / 100 × punti massimi del livello.
2. **Livello attuale di una catena** = il più alto con % ≥ 1. **Punti della catena** = punti pieni di tutti i livelli sotto
   + punti calcolati del livello attuale. Chi entra al livello C ha A e B pieni.
3. Conta il **migliore di sempre** (il record non regredisce).
4. **Punti di una macro categoria** = somma delle sue catene (max 1400). **Punteggio complessivo** = somma delle 5 (max 7000).
5. Il livello con nome si ricava dai punti con le **fasce della categoria** (o con quelle del complessivo): sono tutte
   diverse, vedi sotto.
6. Costanti in un solo punto: peso di riferimento 60, esponenti (trazioni 0,83 · muscle up 0,95 · OAP 0,85 · dip 0,85 ·
   panca 0,9 · military 0,9 · HSPU 0,75), `ESP_SKILL_SECONDI` 1,0, `ESP_SKILL_RIPETIZIONI` 2,0.
7. Validazione: peso corporeo 30–250 kg, ripetizioni intere 1–50, secondi interi 1–60, zavorra ≥ 0, massimale > 0 e
   ≤ 400 kg. Fuori range: messaggio di errore, nessun calcolo.
8. Formule usate **esattamente come scritte** nel PDF (soglie e divisori compresi).

### Fasce

| | Base | Intermedio | Avanzato | Elite | Titano | Leggenda |
|---|---|---|---|---|---|---|
| Fondamentali tirata / spinta, Handbalance | 0–100 | 101–200 | 201–500 | 501–800 | 801–1100 | 1101–1400 |
| Skill tirata | 0–200 | 201–500 | 501–666 | 667–800 | 801–1100 | 1101–1400 |
| Skill spinta | 0–100 | 101–500 | 501–684 | 685–850 | 851–1100 | 1101–1400 |
| Complessivo | 0–300 | 301–800 | 801–2500 | 2501–4000 | 4001–5500 | 5501–7000 |

Controllato: in ogni categoria la somma dei punti dei livelli di ciascuna fascia coincide con l'ampiezza della fascia, e il
totale fa 1400.

### Catene e voci inseribili

Una **voce** è ciò che l'utente sceglie nel menu a tendina: un esercizio con un solo tipo di valore. Una voce può coprire
più livelli (la zavorra delle trazioni copre C–F: il livello lo decide la formula).

| Categoria | Catena | Voci (livelli · punti) |
|---|---|---|
| Fond. tirata | Trazioni | Australian pull up (A · 100) · Trazioni a ripetizioni (B · 100) · Trazioni zavorrate kg (C–F · 100 l'uno) |
| | Muscle up | Muscle up a ripetizioni (A · 50) · Muscle up zavorrato kg (B 50, C–E 100) |
| | OAP | Assistenza mano-avambraccio (A · 50) · mano-bicipite (B · 50) · mano-spalla (C · 100) · OAP rip. (D · 100) · OAP zavorrato kg (E · 100) |
| Fond. spinta | Dip | Bench dip (A · 50) · Dip a ripetizioni (B · 34) · Dip zavorrati kg (C–F · 100) |
| | Panca piana | Push up (A · 50) · Panca massimale kg (B 33, C–F 100) |
| | Military | Military massimale kg (A 33, B–E 100) |
| Handbalance | HSPU | Pike push up a terra (A · 50) · Pike su rialzo (B · 50) · HSPU a muro (C · 150) · HSPU liberi rip. (D · 150) · HSPU zavorrati kg (E–F · 150) |
| | Verticale e OAHS | Verticale a muro s (A · 50) · Verticale s (B 50, C 150) · OAHS assistito 5 dita (D · 50) · 3 dita (E · 50) · 1 dito (F · 50) · OAHS straddle (G · 150) · OAHS (H · 150) |
| Skill tirata | Front lever | Tuck (A · 200) · Tuck advanced (B · 150) · One leg (C · 150) · Straddle (D · 33) · Half lay (E · 33) · Full (F · 34) · Wide full (G · 100) · Victorian (H · 100) |
| | Front lever touch | Tuck advanced (A · 25) · One leg (B · 25) · Straddle (C · 25) · Half lay (D · 25) · Full, T = 5 s (E · 100) · Wide full (F · 100) |
| | Front lever pull ups | Tuck advanced (A · 25) · One leg (B · 25) · Straddle (C · 50) · Half lay (D · 50) · Full (E · 50) · Wide full (F · 100) |
| Skill spinta | Planche | Tuck (A · 100) · Tuck advanced (B · 134) · One leg (C · 50) · Straddle (D · 50) · Full (E · 100) · Maltese (F · 100) |
| | Planche push ups | Tuck (A · 133) · Tuck advanced (B · 100) · One leg (C · 50) · Straddle (D · 50) · Full (E · 100) |
| | Planche press | Tuck (A · 133) · Tuck advanced (B · 34) · One leg (C · 66) · Straddle (D · 100) · Full (E · 100) |

Le formule di ogni livello sono nel PDF (pagine 3–15) e vanno copiate tali e quali nel 31.

## Decisioni prese

| # | Tema | Decisione |
|---|---|---|
| 1 | Numero mostrato (Michael, 24/11) | Dai punti si ricava il livello; il numero che si vede è la **% dentro quel livello**: `(punti − inizio fascia) / (fine − inizio)`. Vale per ogni categoria e per il complessivo (il cerchio "Totale"). |
| 2 | Record esistenti (Fabio e Michael, 24/11) | **Si convertono** (tabella nel 32). Chi non ha equivalente va al livello subito sotto, pieno, o si elimina. Oggi i record sono solo quelli di prova di Michael. |
| 3 | Avatar (Michael, 24/11) | Per ora **un busto solo**, quello del mockup. L'avatar che cambia salendo di livello si farà più avanti (34). |
| 4 | Home social (Fabio, 24/11) | Vera, come **ultima fase** (38, 39). |
| 5 | Pentagono (Michael, 24/11) | Il contorno è la fine del livello più alto raggiunto tra le 5 categorie. Ogni asse va da 0 alla fine di quel livello *per la sua categoria* (Avanzato = 500, 500, 666, 684, 500 punti). Accanto a ogni vertice la % nel livello della categoria. |
| 6 | Menu a tendina (Michael, 24/11) | Una voce per riga della tabella sopra; le voci a carico coprono più livelli con un solo valore, e **i punti si assegnano con gli intervalli scritti nel PDF**. Una voce sparisce quando tutti i suoi livelli sono pieni, anche se li ha riempiti un record più alto. Lo storico resta visibile e correggibile. |
| 7 | Planche (Michael, 24/11) | Half lay e Wide planche sono **tolte apposta**. |
| 8 | Record ammessi (Michael, 24/11) | **Solo quelli delle liste**: Front lever touch e pull ups in Tuck non esistono più. |
| 9 | Peso corporeo (Michael, 24/11) | Si chiede **solo nei record la cui formula lo usa**, dentro il record. Non esiste più un peso "del profilo" né il suo storico. Non lo chiedono: australian, bench dip, push up, muscle up a ripetizioni, verticale a muro, verticale, tutte le OAHS. |
| 10 | Ripetizioni oltre il completamento (Michael, 24/11) | Si possono inserire (limite 1–50) e valgono 100%. |
| 11 | OAP assistiti con peso basso (Michael, 24/11) | Formula lasciata com'è: sotto i 50 kg non ci sono utenti reali. La validazione resta 30–250 kg come nel PDF. |
| 12 | Verifica dei calcoli (Michael, 24/11) | Non c'è un foglio Excel: **le verifiche le fa Michael** sull'app. Il 31 gli prepara una tabella di casi. |

## Interpretazioni adottate

1. **Arrotondamento**: si arrotondano i punti di ogni catena; la categoria è la somma di interi, il complessivo anche.
2. **Verticale a 15 s**: livello B al 100% e livello C all'1% (lo dicono le formule).
3. **Trainer**: continua a vedere livello e record dell'atleta in sola lettura.
4. **Gambe e core** restano fuori dal livello.

## Stato

**Confermata da Michael il 24 novembre 2026.** Nessuna domanda aperta: il 31 può partire.
