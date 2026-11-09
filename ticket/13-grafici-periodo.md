# 13 — Grafici: periodo selezionabile

- **Punto PDF**: 3 ("l'intervallo mostrato è solo una settimana; dare l'opzione di vedere l'andamento di ogni
  esercizio in qualsiasi periodo: un mese, un anno, ecc.")
- **Figura professionale**: sviluppatore frontend con competenza di data-viz.
- **Dipende da**: 01 (tipo dalle registrazioni), 03 (esercizi a tempo). **Sblocca**: 14.
- **Stima**: M

## Contesto

In [GraficiView.tsx](../src/features/grafici/GraficiView.tsx) e [stats.ts](../src/lib/stats.ts):

- il grafico "Andamento" mostra **tutte** le sessioni dell'esercizio (`series`), un punto per data, senza filtro;
- "Ripetizioni per tipo" mostra le **ultime 10 sessioni** (`repsByType(…, limit = 10)`): probabilmente è questo che
  sembra "una settimana";
- l'asse X ha solo 3 etichette; con molti mesi di dati i punti si affollano.

## Cosa fare

1. Selettore di periodo in alto, condiviso dai grafici della pagina: **4 settimane · 3 mesi · 6 mesi · 1 anno · Tutto**
   (+ intervallo personalizzato, vedi domande). Ricordato tra una visita e l'altra.
2. **Aggregazione** in base al periodo: per sessione fino a ~3 mesi, per settimana fino a 1 anno, per mese oltre
   (peso: massimo del periodo; ripetizioni/volume: somma o media per sessione — da decidere).
3. Asse X con etichette adatte al periodo (giorni, settimane, mesi).
4. Confronto col periodo precedente (es. "+12% rispetto ai 3 mesi prima").
5. Le mini-schede "Tutti gli esercizi" usano lo stesso periodo.
6. Test unitari per filtro e aggregazione.

## Criteri di accettazione

- Posso vedere l'andamento di un esercizio nell'ultimo mese, nell'ultimo anno e da sempre.
- Con un anno di dati il grafico resta leggibile.
- "Ripetizioni per tipo" rispetta il periodo scelto.

## Domande aperte

1. Serve l'intervallo personalizzato (data da–a) o bastano i periodi fissi? (Consiglio: fissi in v1.)
2. Per settimana/mese: il peso è il massimo del periodo; le ripetizioni sono il **totale** o la **media per sessione**?
3. Quali metriche vuoi davvero? Oggi: peso, ripetizioni totali, volume. Per le skill a tempo: miglior tenuta, secondi
   totali. Ne mancano (es. massimale stimato, frequenza)?
4. Vogliamo anche un grafico del **livello** e delle 5 categorie nel tempo qui in Grafici? (Lega col 10, domanda 4.)

## Stato

**Fatto il 9 novembre 2026** (solo app, nessuna migration). Logica in [periods.ts](../src/lib/periods.ts) con i test in
`periods.test.ts`; schermo in [GraficiView.tsx](../src/features/grafici/GraficiView.tsx), grafici in
[charts.tsx](../src/components/charts.tsx).

Decisioni dell'utente (9 novembre 2026):

1. **Solo periodi fissi**: 4 sett. · 3 mesi · 6 mesi · 1 anno · Tutto. Niente intervallo da–a in v1.
2. Nei gruppi per settimana o mese: **peso e miglior tenuta = massimo**; ripetizioni, secondi e volume = **media per
   sessione** (una sessione = un giorno con quell'esercizio, come già prima nel grafico).
3. Metriche invariate; in più **confronto col periodo precedente** e numero di sessioni. Grafico del livello nel tempo
   rimandato (serve uno storico del livello che oggi non c'è).

Come è fatto:

- Il periodo vale per tutta la pagina (grafico grande, elenco delle sessioni, "Ripetizioni per tipo", mini-schede) ed è
  ricordato nel browser (`grafici-periodo`); all'inizio è 3 mesi. "Ripetizioni per tipo" non è più limitato alle ultime
  10 sessioni.
- Raggruppamento: per sessione con 4 settimane e 3 mesi, per settimana (da lunedì) con 6 mesi e 1 anno; con "Tutto"
  dipende da quanto tempo coprono i dati dell'esercizio (fino a 3 mesi per sessione, fino a un anno per settimana,
  oltre per mese).
- Periodi: 4 settimane = gli ultimi 28 giorni con oggi; 3/6/12 mesi = dal giorno dopo la stessa data di n mesi fa. Il
  confronto usa il periodo uguale subito prima: "+20% rispetto ai 3 mesi prima" (verde se sale, rosso se scende);
  "nessuna sessione nei 3 mesi prima" se allora non c'era niente; nessuna percentuale se prima il valore era 0 (es. peso
  a corpo libero). Con "Tutto" non c'è confronto.
- Sotto il grafico: il valore del periodo ("15 kg · massimo, ultimi 3 mesi" o "11,6 rip. · media a sessione"), il
  numero di sessioni e il confronto. Le medie sono arrotondate a un decimale.
- Asse X: al più 4 date (la prima e l'ultima allineate ai bordi); "3 nov" per le sessioni, "nov 25" per settimane e mesi.
  "Ripetizioni per tipo" al più 5 date.
- Con molti punti i pallini si rimpiccioliscono (oltre 16) o spariscono (oltre 40) e il tocco sceglie il punto **più
  vicino** in orizzontale (prima servivano cerchi da toccare, inutilizzabili con 50 punti). Il punto scelto ha una
  linea tratteggiata; sotto restano le sessioni di quel giorno, settimana o mese ("massimo/media di N sessioni").
- Se l'esercizio ha dati ma non nel periodo: "Nessuna registrazione negli ultimi 3 mesi. Vedi tutto". Le mini-schede
  mostrano il valore del periodo con sotto "massimo" o "media a sessione", o "Nessun dato nel periodo".

Prove fatte: unitari 153 (20 nuovi), `tsc -b` e `vite build` OK. Nell'app locale a 375 px con l'atleta di prova più
182 sessioni di Trazioni su un anno e mezzo (poi tolte: DB rimesso com'era): tutti i periodi, raggruppamento per
settimana e mese, tocco su un punto, confronto, mini-schede, "Ripetizioni per tipo"; nessuno scorrimento orizzontale
(la barra dei periodi ha i pulsanti più stretti per starci).

Note per chi viene dopo:

- Il 14 (restyling) può cambiare solo l'aspetto: valori, gruppi ed etichette arrivano già pronti da `periods.ts`.
- Il trainer che guarda un atleta usa lo stesso periodo ricordato del suo profilo.
- Non provato su telefono vero (tocco sul grafico con il dito).
