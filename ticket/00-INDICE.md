# Backlog — "Correzioni app calisthenics" (8 novembre 2026)

Fonte: il documento `Correzioni app calisthenics _261108_130435.pdf` (10 punti). Ogni punto è stato confrontato con il codice
attuale (commit `a17d525`, migration fino a `0008`, già in produzione) e diviso in ticket.

## Come leggere i ticket

Ogni file ha la stessa struttura:

- **Figura professionale**: chi dovrebbe fare il lavoro (o guidarlo) per farlo al meglio.
- **Dipende da / Sblocca**: l'ordine non è casuale, rispettalo o leggi il motivo.
- **Contesto**: cosa chiede il documento e cosa c'è oggi nel codice.
- **Cosa fare**: requisiti.
- **Criteri di accettazione**: quando il ticket si può dire chiuso.
- **Domande aperte**: vanno risposte *prima* di iniziare (quelle segnate **bloccante**) o durante.
- **Stima**: S (≤ 1 giorno), M (2–3 giorni), L (≈ 1 settimana), XL (più settimane o lavoro esterno).

## Scaletta e ordine

| # | Ticket | Punto PDF | Figura principale | Stima |
|---|--------|-----------|-------------------|-------|
| 01 | [Tipo (Forza/Volume/Tecnico) dalla scheda, non dall'esercizio](01-tipo-esercizio-nella-scheda.md) — fatto 8/11 | 2 | Full-stack (React + Postgres) | M |
| 02 | [Nuovo catalogo esercizi](02-nuovo-catalogo-esercizi.md) — fatto 9/11 | 1 | Coach di calisthenics + backend | M |
| 03 | [Esercizi a tempo (secondi) oltre a ripetizioni e peso](03-esercizi-a-tempo.md) — fatto 9/11 | 1, 5 (implicito) | Full-stack | L |
| 04 | [Eliminare il Registro senza perdere funzioni](04-eliminare-registro.md) — fatto 9/11 | 4 | UX designer + frontend | M |
| 05 | [Specifica del sistema di livelli](05-specifica-livelli.md) — approvato 9/11 | 5, 6 | Product owner + coach di calisthenics | S (ma bloccante) |
| 06 | [Identità visiva e design system](06-design-system.md) — fatto 9/11 | 9, 10 | UI / brand designer | L |
| 07 | [Navigazione in basso (tab bar)](07-navigazione-in-basso.md) — fatto 9/11 | 8 | UX mobile + frontend | S |
| 08 | [Motore di calcolo dei punteggi](08-motore-punteggi.md) — fatto 9/11 | 5, 6 | Sviluppatore TypeScript (logica + test) | M |
| 09 | [Dati: peso corporeo e record di livello](09-dati-peso-e-record.md) — fatto 9/11 | 5 | Backend (Postgres/Supabase, RLS) | M |
| 10 | [Home "Livello": profilo, pentagono, barre, record](10-home-livello.md) — fatto 9/11 | 5 | Frontend + UI designer | L |
| 11 | [Avatar che evolve con il livello](11-avatar.md) — fatto 9/11 (disegnato in codice) | 5, 6 | Illustratore / character designer + motion designer | XL |
| 12 | [Riepilogo compatto (avatar + livello) nelle altre sezioni](12-riepilogo-compatto.md) — fatto 9/11 | 7 | Frontend + UI designer | S |
| 13 | [Grafici: periodo selezionabile](13-grafici-periodo.md) — fatto 9/11 | 3 | Frontend + data-viz | M |
| 14 | [Grafici: restyling coerente col pentagono](14-grafici-restyling.md) — fatto 9/11 | 10 | Data-viz designer + frontend | M |
| 15 | [Il trainer vede il livello dell'atleta](15-trainer-vede-livello.md) — fatto 9/11 | — (coerenza) | Product owner + full-stack | S |
| 16 | [Ripresa del piano precedente: rispetto del piano e notifiche](16-rispetto-piano-notifiche.md) — fatto 9/11 | — (backlog) | Product owner | — |

### Perché quest'ordine

1. **01–04 sistemano le fondamenta** (modello dati e struttura) prima di costruirci sopra. 01 è un difetto vero
   (non si può avere "Trazioni" in forza e in volume); 02 e 03 cambiano catalogo e tipo di misura, che servono a livelli
   e grafici; 04 toglie una sezione: farlo prima evita di ridisegnarla.
2. **05 è un ticket di decisione, non di codice**: le formule del documento hanno alcune ambiguità (vedi lì) e finché non
   sono chiuse il motore (08) rischia di essere rifatto. Si può fare in parallelo a 01–04.
3. **06 (design) parte presto e in parallelo**: è lavoro di un designer, serve a 07, 10, 11, 12, 14. Costruire la Home
   con lo stile vecchio vorrebbe dire rifarla.
4. **07** è piccolo ma cambia lo scheletro dell'app: va fatto prima della Home, che diventa la prima scheda.
5. **08 → 09 → 10**: prima la logica pura e testata, poi i dati, poi lo schermo.
6. **11 (avatar)** ha tempi lunghi perché esterni (illustrazioni): va commissionato subito dopo 05/06, e la Home (10)
   parte con un segnaposto.
7. **12–14** sono rifiniture che dipendono da Home e design.
8. **15–16** completano la parte trainer, che resta il target di prodotto.

### Lavoro in parallelo possibile

- Designer: 06 → 11 (art direction) → 14
- Coach/PO: 05 e 02 (lista esercizi)
- Sviluppo: 01 → 03 → 04 → 07 → 08 → 09 → 10 → 12 → 13

## Domande trasversali (valgono per più ticket)

1. **Tema chiaro**: oggi l'app ha tema scuro e chiaro automatici. L'esempio del pentagono è scuro. Teniamo entrambi o
   l'app diventa solo scura? (06, 10, 14) — consiglio: solo scuro nella prima versione, è coerente con l'identità
   "seria e accattivante" e dimezza il lavoro di design. **Deciso il 9/11: solo scuro** (06).
2. **Lingua dei nomi**: nel catalogo convivono italiano e inglese ("Trazioni prone", "Push up", "Tuck planche").
   Va bene così (è come si parla in palestra) o vogliamo una regola? (02, 05)
3. **Trainer**: tutto ciò che è nuovo (livello, record, peso) il trainer lo vede in sola lettura come il resto? (15)
4. **Il piano "rispetto del piano e notifiche"** deciso il 3 novembre passa dopo questi lavori? (16)

---

# Backlog — Audit di prodotto (9 novembre 2026)

Fonte: [`audit/AUDIT.md`](../audit/AUDIT.md), con le metriche, le soglie e il modo di rifarlo. Punteggio al 9/11:
**36,7 / 100** (prodotto; **53,7** dopo il ticket 17, **63,9** dopo il 18, **71,9** dopo il 19, **76,9** dopo il 20, **80,9** dopo il 26) e **5,4 / 10** (valutazione da coach). Ogni riga qui sotto è un intervento della lista
"Cosa migliorerei" dell'audit: la colonna **Voci** dice quali misure dell'audit sposta, **Punti** quanto vale.
Quando un intervento è fatto si aggiorna la colonna Stato e, a fine blocco, si rifà l'audit e si scrive il nuovo
punteggio nello storico in fondo ad AUDIT.md.

| # | Intervento | Voci | Punti | Fatica | Ticket | Stato |
|---|---|---|---:|---|---|---|
| A01 | Bersagli di tocco ≥ 44 px | B3 | +5 | S | [17](17-audit-rapidi.md) | fatto 9/11 |
| A02 | Un `h1` e un titolo della pagina per schermata | B2, B5 | +5 | XS | [17](17-audit-rapidi.md) | fatto 9/11 |
| A03 | "Oggi" in cima alla Home, in Scheda il programma prima dei record | C1 | +5 | M | [19](19-oggi-e-account.md) | fatto 9/11 |
| A04 | Annulla nel toast dopo le × (Archivia e Scollega hanno già la conferma) | C4 | +2 | S | [17](17-audit-rapidi.md) | fatto 9/11 |
| A05 | Account completo: cambio password ed email, privacy e termini, supporto e versione | E1, E2, E3, E8 | +6 | M | [19](19-oggi-e-account.md) | in parte 9/11 (+3): password, email e versione fatti; privacy e termini rimandati (servono titolare e contatto); il supporto compare con `VITE_SUPPORT_EMAIL` |
| A06 | Vista desktop (tutta l'app su due colonne, trainer con elenco + dettaglio) | F1, D6 | +5 | L | [20](20-vista-desktop.md) | fatto 9/11 |
| A07 | Modalità sessione (prossimo esercizio, recupero automatico, riepilogo) | C3 | +3 | L | [25](25-modalita-sessione.md) | fatto 10/11 |
| A08 | Editor di schede veloce (griglia, aggiunta multipla, duplica giorno) | F2, F3 | +4 | L | [26](26-editor-schede.md) | fatto 10/11: aggiunta multipla con schema dal tipo e duplica giorno in schede modello e programma dell'atleta, griglia della settimana su desktop; F2 da ~123 a 39 tocchi |
| A09 | Offline vero (cache persistita e coda dei salvataggi) | A6 | +3 | L | — | da fare |
| A10 | Invito con il nome del trainer prima del login | C7 | +3 | S | [18](18-audit-rapidi-2.md) | fatto 9/11 |
| A11 | Testata con un solo avatar | D4 | +2 | XS | [17](17-audit-rapidi.md) | fatto 9/11 |
| A12 | Code splitting e `robots.txt` | A4, A3 | +2,1 | S | [18](18-audit-rapidi-2.md) | fatto 9/11 (JS iniziale 153 KB; per ≤ 120 KB serve altro lavoro) |
| A13 | Scheletri di caricamento | C5 | +2 | S | [18](18-audit-rapidi-2.md) | fatto 9/11 |
| A14 | Primo accesso guidato | C6 | +2 | M | — | da fare |
| A15 | Progressione automatica nelle schede modello | F6 | +2 | M | — | da fare |
| A16 | Etichette dei grafici a 12 px | B4 | +2 | XS | [17](17-audit-rapidi.md) | fatto 9/11 |
| A17 | Ricerca nel catalogo (i gruppi c'erano già) | E7 | +1,5 | S | [18](18-audit-rapidi-2.md) | fatto 9/11 |
| A18 | Storico del peso con mini-grafico | E10 | +1,5 | S | [18](18-audit-rapidi-2.md) | fatto 9/11 |
| A19 | Notifiche push | E6 | +1,5 | L | — | da fare |
| A20 | Accesso con magic link | E9 | +1,5 | S | — | rimandato il 9/11: prima serve un SMTP in produzione (il limite dell'email di Supabase bloccherebbe anche conferme e reset) |
| A21 | Risposta del trainer alla nota della sessione | F5 | +1 | M | — | da fare |
| A22 | Libreria di schede pronte | F7 | +1 | M | — | da fare |
| A23 | Pulizia stile (`style={{}}` in classi, regola CSS duplicata) | D2, D3 | +2 | S | [17](17-audit-rapidi.md), [18](18-audit-rapidi-2.md) | fatto 9/11 (restano 8 `style` con valori calcolati) |
| A24 | Email di accesso (conferma, reset, cambio email) in italiano: oggi sono i testi inglesi di Supabase | — (nuova, da misurare nel prossimo audit) | — | S | — | da fare (si fa insieme all'SMTP di A20) |

### Dalla valutazione da coach (G)

Non spostano il punteggio A–F ma il voto da coach; vanno decisi con l'utente prima del codice (toccano il ticket 05).

| # | Intervento | Area G | Stato |
|---|---|---|---|
| C01 | Ritarare la fase base dei fondamentali con le ripetizioni a corpo libero; panca e military facoltativi | Livelli | da decidere |
| C02 | RPE/RIR per serie, elastico come assistenza, lato sinistro/destro negli unilaterali | Registrazione | da fare |
| C03 | Superserie/circuiti, riscaldamento e mobilità, scarico, giorni di test | Programmazione | da fare |
| C04 | Progressioni mancanti nel catalogo (back lever, bandiera, archer, pseudo planche lean, preparazione spalle e polsi…) | Catalogo | da fare |
| C05 | Video di controllo tecnica allegato alla registrazione; segnale di dolore strutturato | Coach–atleta | da fare |

## Carattere visivo (dopo l'audit)

L'audit misura accessibilità, velocità e completezza, non quanto l'app trasmette energia: a novembre l'app risultava
"piatta" (schede tutte uguali, molto testo, dati scritti invece che disegnati, stati vuoti vuoti).

| # | Intervento | Ticket | Stato |
|---|---|---|---|
| V01 | Primo blocco: un protagonista per pagina, titoli piccoli, spiegazioni dietro "?", anello in Oggi, serie a blocchetti, striscia del tipo, settimana con i pallini, record con il progresso, tendenza e settimane di fila, stati vuoti con disegno e azione | [21](21-carattere-visivo.md) | fatto 9/11 |
| V02 | Secondo blocco: animazioni (ingresso delle pagine, spunta, blocchetti, anello, pentagono, numeri che salgono, nuovo record con scintille, record che lampeggia), pittogrammi per categoria negli esercizi, stati vuoti anche in Esercizi e Scheda | [22](22-animazioni-pittogrammi.md) | fatto 10/11 |
| V03 | Sezione "carattere visivo" nell'audit con criteri verificabili: H a parte su 10, oggi 6,0 | [23](23-audit-carattere.md) | fatto 10/11 |
| V04 | Stati vuoti con disegno e azione anche in Atleti, schede modello e Grafici filtrati (H1 +2) | [24](24-carattere-v04-v06.md) | fatto 10/11 |
| V05 | Un dato disegnato in Atleti, Esercizi e scheda modello (H3 +1) | [24](24-carattere-v04-v06.md) | fatto 10/11 |
| V06 | Meno testo in prima schermata in Atleti e Grafici, spiegazioni dietro "?" (H2 +1) | [24](24-carattere-v04-v06.md) | fatto 10/11 |
