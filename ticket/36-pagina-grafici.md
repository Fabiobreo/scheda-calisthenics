# 36 — Pagina Grafici: un grafico, record, ultime 5 sessioni, pagina fissa

- **Fonte**: `GraficaPDF` pagina 2, mockup "Grafici", messaggio di Michael ("troppo bianco delle scritte", "toglierei le
  scritte grigie dei valori nelle ultime 5 sessioni").
- **Figura professionale**: frontend + data-viz.
- **Dipende da**: 33. **Sblocca**: —
- **Stima**: M.

## Contesto

[GraficiView.tsx](../src/features/grafici/GraficiView.tsx): scheda "Andamento" (periodo, metrica, esercizio, `LineChart`
con tocco e punto RECORD, riga grigia "N sessioni · ±X%", elenco di 5 sessioni con "Mostra altre" fatto di `EntryItem`
con serie, difficoltà e note), poi "Ripetizioni per tipo" (`TypeChart`) e "Tutti gli esercizi" (mini grafici). Metriche
in [stats.ts](../src/lib/stats.ts): a ripetizioni Peso / Rip. totali / Volume; a tempo Miglior tenuta / Secondi totali /
Peso.

## Cosa fare

1. **Si toglie**: "Tutti gli esercizi", "Ripetizioni per tipo" (con `TypeChart` e mini grafici), la riga
   "N sessioni · ±X%", "Mostra altre".
2. **Struttura** (dall'alto): titolo "Andamento" con sottotitolo (esercizio · metrica), periodo (4 sett. … Tutto),
   metrica, esercizio, grafico, riga **Record** (coppa, data, valore in oro), **Ultime 5 sessioni**.
3. **Esercizi a tempo**: due metriche (Michael, 24/11, corregge il PDF che ne chiedeva una):
   - **Tenuta media**: media dei secondi delle serie della sessione;
   - **Tenuta totale**: somma dei secondi di tutte le serie (secondi × serie).
   "Miglior tenuta" e "Peso" per gli esercizi a tempo escono da `METRICS_BY_MEASURE`. La riga **Record** mostra il
   valore più alto della metrica scelta, come per gli esercizi a peso.
4. **Ultime 5 sessioni**: riga = data, eventuale etichetta "Record", valore della metrica scelta. **Senza** la differenza
   grigia dalla sessione prima ("−10 kg", "Prima sessione"). Toccando una riga si apre il dettaglio della sessione
   (serie, note, modifica) in un foglio: oggi quelle informazioni sono in `EntryItem` e non devono sparire.
5. **Meno bianco**: bianco solo per titolo e data; valori in oro, etichette degli assi e testi secondari in `--muted`;
   linea e area in oro (token del 33). Verificare il contrasto degli assi.
6. **Pagina fissa**: il grafico prende lo spazio che resta (`flex: 1`, altezza minima 140 px) tra controlli ed elenco, così
   in 390×844 e 360×640 non si scorre. Sotto l'altezza minima la pagina scorre invece di tagliare. Su desktop una
   colonna centrata (le due colonne non servono più).
7. Il tocco sul grafico resta (fumetto con data e valore); toccando un punto l'elenco non cambia più.
8. Stato vuoto (nessuna sessione nel periodo) nello stile nuovo.

## Criteri di accettazione

- Nessuno scorrimento verticale a 390×844 con 5 sessioni.
- Esercizio a tempo: due metriche, "Tenuta media" e "Tenuta totale"; 3 serie da 10, 8 e 6 s danno 8 s e 24 s.
- Nell'elenco nessun testo grigio di differenza; dettaglio della sessione ancora raggiungibile.
- Test di `stats.ts` e `periods.ts` aggiornati.
