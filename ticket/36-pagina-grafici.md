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

## Stato

**Fatto il 25 novembre 2026** sul ramo `claude/ticket-36-pagina-grafici-2f4e61` (solo app, nessuna migration). Niente
push, niente merge. Manca l'approvazione di Michael sulla pagina.

**Cosa c'è**

- **Pagina** ([GraficiView.tsx](../src/features/grafici/GraficiView.tsx)): titolo "Andamento" con sottotitolo
  (esercizio · metrica), periodo, metrica, esercizio, grafico, riga "Record" (coppa, data, valore), "Ultime 5 sessioni".
  Via "Tutti gli esercizi", "Ripetizioni per tipo", la riga "N sessioni · ±X%", "Mostra altre" e la riga col valore
  medio del periodo sotto il grafico.
- **Esercizi a tempo** ([stats.ts](../src/lib/stats.ts)): `METRICS_BY_MEASURE.time` = "Tenuta media" (`media`: media
  dei secondi di tutte le serie della giornata, a un decimale) e "Tenuta totale" (`secondi`: la somma). 10, 8 e 6 s
  danno 8 s e 24 s. "Miglior tenuta" (`tenuta`) e il peso per le tenute non ci sono più.
- **Record**: `recordPoint` (stats.ts) dà la sessione col valore più alto della metrica scelta, di sempre, nel giorno
  in cui è stata raggiunta la prima volta. Lo stesso giorno è nella riga "Record", nell'etichetta RECORD sul grafico
  (`recordIndex` in [periods.ts](../src/lib/periods.ts)) e nell'etichetta "Record" dell'elenco.
- **Ultime 5 sessioni**: una riga per giorno (data, eventuale "Record", valore della metrica), senza la differenza dalla
  sessione prima. La riga è un pulsante da 44 px e apre il foglio della sessione
  ([SessionSheet.tsx](../src/features/grafici/SessionSheet.tsx)): serie una per riga, tipo, tentativo, difficoltà, nota,
  "Modifica" (apre il registratore, dove si corregge o si elimina; il trainer non lo vede).
- **Grafico** ([charts.tsx](../src/components/charts.tsx)): `LineChart` si disegna in px veri nello spazio che ha
  (misura il contenitore), quindi le scritte restano di 12 px a ogni altezza. Il fumetto resta (valore in oro, data),
  si chiude toccando di nuovo lo stesso punto e non cambia più l'elenco. `TypeChart`, i mini grafici e la variante
  `mini` sono cancellati.
- **Meno bianco**: bianco solo il titolo, le date (riga del record, elenco, foglio) e il nome nella testata; valori,
  linea, area e voci scelte in oro; assi, sottotitolo e testi secondari in `--muted`.
- **Pagina fissa** (`.gr` in [styles.css](../src/styles.css)): la pagina è alta almeno quanto lo schermo e il grafico
  prende lo spazio che resta (`flex`, minimo 140 px); sotto, la pagina scorre. Come in Livello, qui il fondo non
  lascia lo spazio per il timer di recupero (torna se il timer è aperto). Su schermo largo una colonna centrata da
  640 px col grafico alto 320 px; nella vista del trainer grafico alto 240 px.
- **Stati vuoti** nello stile nuovo: nessun esercizio (con le due azioni), esercizio senza sessioni, nessuna sessione
  nel periodo ("Vedi tutto"); in quest'ultimo la riga del record resta.
- **Pulizia**: da `stats.ts` via `repsByType`, `TypeTotals`, `maxSeconds`; da `periods.ts` via `compare`,
  `aggregateTypes`, `PERIOD_NAME`, `PREVIOUS`, `prevFrom`; dal CSS via mini grafici, legenda, confronto, riga del
  valore, barre per tipo. `EntryItem` resta: lo usano Scheda e Atleti.

**Verifica**

- `npm test` 311 verdi (14 file), `npx tsc -b` e `npm run build` puliti. Test aggiornati: `stats.test.ts` (media e
  totale delle tenute, `recordPoint`; via `repsByType`), `periods.test.ts` (periodo senza `prevFrom`, tenute in media
  nei gruppi, `recordIndex` sul giorno del record; via `compare` e `aggregateTypes`), `timed.test.ts`.
- **Browser, solo con dati finti.** L'app locale non ha letto i dati veri: nel browser di prova non c'era una
  sessione aperta sull'origine del server di questo worktree e non avevo credenziali di prova. Ho provato la pagina
  con un modulo temporaneo (non committato) che metteva una sessione finta e rispondeva in memoria alle letture di
  Supabase: 5 esercizi inventati (due a tempo, uno a corpo libero, uno senza dati, uno col nome lungo), 23
  registrazioni. Nessuna richiesta è arrivata a Supabase. Visto così:
  - 390×844, 5 sessioni: altezza del documento 844 = schermo (nessuno scorrimento), grafico alto 159 px, ultima riga
    che finisce a 758 px, sopra la barra (764 px); nessuno scorrimento orizzontale;
  - 360×640: grafico al minimo di 140 px, la pagina scorre (documento 823 px), niente tagliato;
  - bersagli: uno script non trova pulsanti, scelte o link sotto 44 px nella pagina (righe, voci dei segmenti e
    scelta dell'esercizio alti 44 px);
  - contrasto degli assi: `--muted` #a29c90 su `--surface` #161618 = **6,6:1**, scritte di 12 px veri;
  - Plank con 10, 8 e 6 s: "Tenuta media" 8 s, "Tenuta totale" 24 s; due metriche sole;
  - fumetto sul punto, chiuso al secondo tocco; elenco invariato;
  - foglio della sessione (anche un giorno con due registrazioni, nota e tentativo), Esc lo chiude, "Modifica" apre il
    registratore sulla registrazione giusta (non ho salvato niente);
  - "1 anno" e "Tutto" (punti per settimana e per mese, sottotitolo "massimo per settimana"), esercizio a corpo libero
    col peso a zero ("Record: ancora nessuno"), i tre stati vuoti, 1280×800 in colonna centrata.
- **Non visto**: i dati veri di un account, la vista del trainer (`.gr.nested`, solo CSS), il trascinamento col dito
  (provato col clic), un telefono vero con le aree sicure.

**Scelte dove il ticket non dice** (da far vedere a Michael)

1. **360×640 scorre.** Il punto 6 dice che non si scorre nemmeno lì, ma con 5 righe da 44 px (220), periodo, metrica
   ed esercizio (circa 150) restano meno di 80 px per titolo, grafico e record. Ho tenuto i bersagli da 44 px e il
   minimo di 140 px: con 5 sessioni la pagina è fissa da circa 825 px di altezza in su, sotto scorre. A 390×844 il
   margine è di 19 px: una riga in più nella pagina la farebbe scorrere.
2. **Record di sempre, non del periodo**: la riga mostra il valore più alto della metrica tra tutte le sessioni, anche
   se cade fuori dal periodo scelto (sul grafico l'etichetta c'è solo se il giorno è nel periodo).
3. **Giorno del record = la prima volta** che il valore è stato raggiunto (come nei record personali). Prima il grafico
   segnava l'ultima sessione che lo eguagliava: ho cambiato `recordIndex` perché riga, grafico ed elenco dicano lo
   stesso giorno.
4. **Tenuta media sulla giornata**: se in un giorno ci sono più registrazioni dello stesso esercizio, la media è su
   tutte le serie del giorno. Nei periodi lunghi (punti per settimana o mese) le due tenute sono la media per sessione
   del gruppo; solo il peso prende il massimo.
5. **Metrica per posizione**: passando da un esercizio a ripetizioni a uno a tempo resta la posizione scelta; dalla
   terza ("Volume") si ricade su "Tenuta totale".
6. **Elenco per giorno e nel periodo**: le "ultime 5" sono le ultime 5 giornate dell'esercizio dentro il periodo
   scelto; con meno sessioni l'elenco è più corto e il grafico più alto.
7. **Foglio della sessione scritto apposta** invece di riusare `EntryItem`: stesse informazioni, serie una per riga e
   "Modifica" al posto di "Apri". L'etichetta "★ Record" di `EntryItem` (miglior serie) non c'è: nel foglio "Record"
   è quello della metrica scelta, per non avere due record diversi nella stessa pagina.
8. **Sottotitolo su una riga** (troncato se il nome è lungo: il nome intero è nella scelta sotto); con punti per
   settimana o mese aggiunge "massimo/media per settimana".
9. **"?" accanto al titolo**: tiene la spiegazione del tocco sul grafico; aperta, fa scorrere la pagina.
10. **Segmenti più stretti in questa pagina** (1 px di margine interno invece di 4, scelta da 44 px invece di 48) per
    stare nell'altezza: regole solo sotto `.gr`, i componenti di `ui.tsx` non sono toccati.

**Non fatto, di proposito**

- Sovrapposizione al mockup (proporzioni, ordine dentro le righe): da fare da chi ha i mockup.
- L'audit (H3, dati disegnati) cambia per scelta di prodotto: si rifà a fine fase 2.
