# 24 — Carattere visivo, terzo blocco: stati vuoti, dati disegnati, meno testo

- **Fonte**: V04–V06 nell'indice, nati dalla sezione H dell'audit ([ticket 23](23-audit-carattere.md)). Avviati
  dall'utente il 10 novembre 2026.
- **Figura professionale**: UI designer + frontend.
- **Dipende da**: 21, 22, 23.
- **Stima**: M.

## Cosa è cambiato

| Intervento | Dove | Come |
|---|---|---|
| **V04** stati vuoti con disegno | pagina dell'atleta (non trovato, giorno senza programma), schede modello (elenco, non trovata, giorno vuoto, assegna senza atleti), Grafici (niente nel periodo, esercizio senza dati, ripetizioni per tipo) | `EmptyState`, quasi sempre nella variante `small`, con disegno (persone, cinque figure, grafico, settimane a blocchetti) e un'azione quando ce n'è una: "Crea la prima scheda", "Invita un atleta", "Vedi tutto", "Vai alla Scheda", "Torna ad Atleti". Nuovo disegno `EmptyWeeks` |
| **V05** dati disegnati | Atleti | `MiniRing`: anello del rispetto del programma nelle ultime 4 settimane, verde da 80 %, al posto di "Piano, 4 sett.: 50 %". Accanto, "Allenato 9 nov" e "Collegato 9 nov" |
| | Esercizi | `ActivityBars`: registrazioni delle ultime 8 settimane come barre, la settimana corrente in ambra, più il totale scritto. Il conteggio lo fa `weeklyCounts` in `lib/stats.ts` (2 test) |
| | schede modello | sopra i giorni, una striscia di blocchetti per settimana: acceso se la settimana ha esercizi, contornato quello aperto. Nei giorni, un pallino per esercizio nel colore del tipo al posto di "2 es." (il numero resta nell'etichetta del pulsante) |
| **V06** meno testo | Atleti ("Da guardare", "Schede"), pagina dell'atleta, Esercizi, Grafici ("Andamento", "Ripetizioni per tipo"), Account ("Avatar") | le spiegazioni passano dietro "?" (`CardHead`). Gli stati "Riposo" dicono solo cosa fare. Il suggerimento "tocca o trascina sul grafico" è nella spiegazione di Andamento |

**Effetto collaterale**: `CardHead` con titolo grande ora va a capo (`.card-t h2.big`). Il nome di un atleta lungo non
esce più dalla scheda.

## Stato

**Fatto il 10 novembre 2026**, sul ramo `carattere-v04-v06`.

**Sezione H dell'audit**: da **6,0 a 10,0**.

| Voce | Prima | Dopo |
|---|---|---|
| H1 stati vuoti di una frase | 9 | 0 |
| H2 parole in prima schermata, media | 59,9 | 48,75 |
| H3 schermate con dati disegnati | 4 su 8 | 7 su 8 (manca solo Account) |

**Sonda** a 375 × 812 sulle 8 schermate di riferimento: axe 0, nessun bersaglio sotto 44 px, nessun testo sotto 12 px,
nessuno scorrimento orizzontale, un h1 per pagina.

**Contrasto in Scheda**: un primo giro di sonda su Scheda ha segnalato un `color-contrast`, misurando durante le
animazioni d'ingresso. Ripetuta dopo 3,5 s, la misura è pulita: per la sezione H conviene aspettare più di 1,5 s.

**Pallini delle schede modello**: verificati aggiungendo un esercizio di prova a "Nuova scheda", poi tolto.

**Vista desktop**: Atleti controllata a 1280 px.

**Test**: 189 unitari verdi.

**Peso**:
- JS iniziale 158,3 KB gzip. A4 resta 2 punti, ma ora è vicino al limite di 160. In questa build `vite` ha diviso
  diversamente il codice comune: `hooks` è un blocco caricato subito.
- CSS +0,3 KB.

**Migration**: nessuna. Gli `style={{` in linea restano 8.

**Non verificato a schermo**: gli stati vuoti di Grafici, Assegna e "non trovato". Servono dati che il seed non ha. Il
codice passa i controlli dei tipi.
