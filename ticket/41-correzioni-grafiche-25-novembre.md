# 41 — Correzioni grafiche del 25 novembre

- **Fonte**: `Correzioni 25 novembre PDF.pdf` di Michael (5 pagine, coi mockup di Esercizi, Grafici, Scheda, Livello e
  Home come riferimento di misure e impaginazione).
- **Figura professionale**: frontend + UI designer.
- **Dipende da**: 33–39. **Stima**: M.
- **Stato**: fatto il 26/11, non ancora unito. Da far approvare a Michael.

## Note generali

| Richiesta | Fatto |
|---|---|
| Caratteri grandi come nei mockup | Scala ridotta in tutto `styles.css`: nome 24 px, titolo di pagina 18, nomi nelle righe 14, testi secondari 11–12, barra 10. I campi da scrivere restano a 16 px: sotto, l'iPhone ingrandisce la pagina quando li tocchi. |
| Lo sfondo sfuma prima delle prime schede | Foto più bassa (`min(430px, 56vh)`), fondo pieno all'84% della sua altezza. |
| Oro meno vivace | Token nuovi: `--gold #c9ab74`, `--gold-hi #e4d0a3`, `--gold-deep #8d7444`, `--gold-dim #b3a488`; bagliori dimezzati, bottoni a pillola senza alone. |
| Barra in basso con lo stesso oro tenue | Voce attiva in `--gold` (non più `--gold-hi`), riquadro più leggero. |

## Pagina per pagina

- **Esercizi**: una scheda per esercizio, "⋯" in un riquadro, numero di esercizi sotto il titolo, nota in una scheda a
  parte.
- **Grafici**: pagina ferma sul telefono (da 600 px di altezza in su; sotto torna a scorrere invece di tagliare); via
  la riga grigia sotto "Andamento" e la scritta RECORD sul grafico (resta il punto più chiaro); valori delle sessioni
  in bianco, in oro solo il record; periodo e metrica senza binario scuro e più bassi (30 px), il grafico prende lo
  spazio che resta; accanto a ogni sessione la differenza dalla precedente, come nel mockup.
- **Scheda**: numeri del calendario a 14 px; **niente più Forza / Volume / Tecnico** né in "Aggiungi", né in
  "Modifica", né nella riga dell'esercizio, né nel registratore (resta il tipo deciso dalla scheda o dall'esercizio; la
  vista del trainer non cambia); negli **esercizi a tempo niente casella del peso**, nel form e nel registratore.
- **Livello**: via i pittogrammi delle categorie; schede delle categorie più alte (fino a 78 px) come nel mockup;
  valori del pentagono in bianco; **lettere girate: A è il livello più difficile** di ogni catena
  (`shownLetter` in `levelView.ts`: si gira solo la scritta, le regole restano come nel PDF dei punteggi).
- **Home**: Classifica senza scheda, pastiglie staccate, i cinque riquadri in una riga; ogni novità è una scheda;
  "Cerca persone" spostato in fondo (nel mockup la Home apre con la Classifica).

## Scelte da far vedere a Michael

1. **Bersagli di tocco**: bottoni (38 e 32 px), righe delle sessioni in Grafici (30 px) e "×" (36 px) sono ora sotto i
   44 px dell'audit (A01): è il prezzo delle misure dei mockup. L'audit va rifatto.
2. **"Cerca persone" in fondo alla Home**: nel mockup non c'è; toglierlo del tutto lascerebbe la ricerca raggiungibile
   solo dalle novità vuote.
3. **Sottotitolo dei Grafici**: diceva anche "media per settimana" quando il periodo è lungo; tolto con la riga.
4. **Peso negli esercizi a tempo**: tolto ovunque, anche nelle schede del trainer. Le registrazioni vecchie con un peso
   lo conservano.
5. **Nome del luogo nei riquadri della classifica**: sul telefono non ci sta più (si legge nel titolo della classifica).
