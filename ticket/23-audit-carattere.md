# 23 — Sezione "carattere visivo" nell'audit

- **Fonte**: V03 nell'indice, avviato dall'utente il 10 novembre 2026, dopo i ticket 21 e 22.
- **Figura professionale**: UI designer.
- **Dipende da**: 21, 22. **Sblocca**: V04–V06 (interventi suggeriti dalla nuova sezione).
- **Stima**: S.

## Decisioni (10 novembre 2026)

- **Sezione H a parte, su 10**, come la G del coach: il totale su 100 resta confrontabile con lo storico.
- **Solo criteri misurabili**: conteggi della sonda e del codice, niente voti di gusto.

## Cosa è cambiato

- **[`audit/AUDIT.md`](../audit/AUDIT.md)**:
  - nuova sezione **H. Carattere visivo**, con sei voci (H1–H6), soglie, valori di oggi e cosa farebbe salire il punteggio;
  - una riga nella tabella dei punteggi;
  - la colonna "Carattere" nello storico;
  - nel metodo, la nota sul tempo di attesa prima di lanciare la sonda.
- **[`audit/probe.js`](../audit/probe.js)**: quattro nuove misure.
  - `foldWords`: parole nella prima schermata, fuori dalla navigazione.
  - `drawnData`: dati disegnati, cioè grafici con un nome più anello, blocchetti e pallini.
  - `exRows` ed `exRowsWithIcon`: righe di esercizio, e quante hanno il pittogramma.

## Stato

**Fatto il 10 novembre 2026.** Il risultato è **H = 6,0 / 10**:

| Voce | Punti |
|---|---:|
| H1 stati vuoti di una frase: 9 | 0 |
| H2 parole in prima schermata: 59,9 di media | 1 |
| H3 schermate con dati disegnati: 4 su 8 | 1 |
| H4 movimento | 2 |
| H5 pittogrammi | 1 |
| H6 ricompensa | 1 |

Ho misurato a 375 × 812 sulle 8 schermate di riferimento. Sulle tre del trainer axe è 0, e non ci sono bersagli sotto
44 px né testo sotto 12 px.

I punteggi da A a F (76,9) e del coach (5,4) non cambiano. Non ci sono modifiche al codice dell'app.

**Limite**: le misure H3 e H5 cercano classi dell'app (`.ring`, `.blocks`, `.dots`, `.pitem`…). Se le classi
cambiano nome, va aggiornata anche la sonda.
