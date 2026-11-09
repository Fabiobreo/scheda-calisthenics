# 14 — Grafici: restyling coerente col pentagono

- **Punto PDF**: 10 ("la rappresentazione dei grafici è troppo piatta; adottare lo stesso stile del grafico a
  pentagono per avere coerenza in tutta l'app")
- **Figura professionale**: **data-viz designer** (stile e leggibilità) + sviluppatore frontend.
- **Dipende da**: 06 (token), 10 (pentagono), 13 (nuova struttura dei grafici). **Sblocca**: —
- **Stima**: M

## Contesto

[charts.tsx](../src/components/charts.tsx): grafici SVG fatti a mano (linea con area, barre impilate, sparkline), colori
piatti da `styles.css`.

## Cosa fare

1. Stessa grammatica visiva del pentagono: linee con bagliore leggero, area sfumata, punti luminosi sull'ultimo valore,
   griglia sottile, sfondo con texture topografica discreta.
2. Colore elite (arancio) per evidenziare i record personali sul grafico.
3. Interazione: toccare/trascinare sul grafico per leggere data e valore (oggi solo tocco sui punti).
4. Restare SVG fatto a mano (leggero e già testato) salvo motivi forti per una libreria.
5. Leggibilità prima dell'effetto: il bagliore non deve ridurre il contrasto di assi e testi; `prefers-reduced-motion`.

## Criteri di accettazione

- Grafici di Grafici e Home visivamente dello stesso sistema (approvazione del designer).
- Prestazioni: nessun calo visibile scorrendo la lista delle mini-schede su un telefono di fascia media.

## Domande aperte

1. Vuoi animazioni di ingresso nei grafici o solo nella Home?
2. Il grafico "Ripetizioni per tipo" ha ancora senso dopo il 01, o lo sostituiamo con qualcosa di più utile (es.
   distribuzione del lavoro per macro categoria, legata al livello)?

## Stato

**Fatto il 9 novembre 2026** (solo app, nessuna migration), dopo il design system (06). Codice in
[charts.tsx](../src/components/charts.tsx), regola del record in `recordIndex` di [periods.ts](../src/lib/periods.ts)
(4 test nuovi), stile in `styles.css` (classi `g-*`).

Decisioni dell'utente (9 novembre 2026):

1. **Animazioni solo nella Home**: i grafici appaiono subito (si cambia periodo ed esercizio spesso).
2. **"Ripetizioni per tipo" resta**, con il nuovo stile (Volume viola). Sostituirlo con il lavoro per macro categoria
   sarebbe un ticket a parte, da decidere col coach.

Come è fatto:

- Stessa grammatica del pentagono: griglia tratteggiata e sottile con la linea dello zero piena, **area sfumata** dal
  ciano al trasparente, **linea con bagliore** (copia sfocata sotto, solo nel grafico grande), **ultimo valore** con
  alone.
- **Record personale in ambra** con alone ed etichetta "RECORD": il punto più recente che vale quanto la miglior
  sessione di sempre. Se il record è fuori dal periodo non si segna; nei gruppi per settimana o mese solo per peso e
  tenuta (il punto è un massimo), non per le medie. Nelle mini-schede un puntino ambra, senza bagliore.
- **Toccare o trascinare** per leggere: un fumetto sopra il punto (sotto se manca spazio) con valore, unità e data,
  linea verticale e punto evidenziato; sotto restano lettura e sessioni come nel 13. Col mouse si sceglie premendo e
  trascinando; col dito il punto si sceglie al rilascio del tocco o trascinando in orizzontale, così chi scorre la
  pagina in verticale passando sul grafico non cambia la selezione (`touch-action: pan-y`).
- Barre per tipo con una linea del colore della scheda tra i segmenti.
- Contrasto: assi e testi in `--muted` (7:1), il bagliore non passa sotto i testi.

Prove fatte: unitari 172 (4 nuovi), pgTAP 166, `tsc -b` e `vite build` OK. Nell'app locale a 375 px con l'atleta di
prova: grafico grande con record, tocco e trascinamento col mouse (fumetto, lettura, sessioni del punto), "Ripetizioni
per tipo", mini-schede; nessuno scorrimento orizzontale.

Note per chi viene dopo:

- **Non provato col dito su un telefono vero**: la logica tocco/scorrimento va verificata lì (trascinare in orizzontale
  sul grafico, scorrere in verticale passandoci sopra).
- Prestazioni: un solo filtro di sfocatura per pagina (grafico grande); con molte mini-schede su telefono di fascia media
  non misurato.
