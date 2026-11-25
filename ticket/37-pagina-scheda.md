# 37 — Pagina Scheda: solo programma e giorno

- **Fonte**: `GraficaPDF` pagina 3, mockup "Scheda".
- **Figura professionale**: frontend.
- **Dipende da**: 33. **Sblocca**: —
- **Stima**: M.

## Contesto

[SchedaView.tsx](../src/features/scheda/SchedaView.tsx): a sinistra "Programma" (bottone "+ Fuori programma",
`WeekDays` con i pallini per tipo, `DotsLegend` Forza/Volume/Tecnico, riga "Questa settimana: X% · n di m del
programma", giorno scelto con gli esercizi, `SetBlocks`, striscia colorata del tipo, stato vuoto "Riposo" con i 5 omini
`CategoryRow`), a destra "Record personali" (`Records`: elenco, "+ Tentativo", "Progressione record").

## Cosa fare

1. **Si toglie**:
   - "+ Fuori programma" (per registrare qualcosa di non previsto: lo si aggiunge al giorno e poi "Registra");
   - la legenda Forza/Volume/Tecnico e i pallini colorati per tipo: sotto ogni giorno resta un solo segno dorato
     (pieno = fatto, vuoto = da fare), come nel mockup;
   - la riga "Questa settimana: X% del programma";
   - i 5 omini del giorno di riposo (resta la scritta "Riposo" e il campo per aggiungere);
   - tutta la sezione "Record personali" (il record di un esercizio si legge in Grafici, quelli di livello in Livello).
2. **Struttura**: titolo "Programma", settimana con frecce ("9–15 nov · Questa settimana"), 7 giorni, titolo del giorno
   ("Martedì 10 novembre"), schede esercizio (nome, blocchetti delle serie, schema "3 × 4 · 30 kg · rec. 90 s",
   "Registra" oro, "×", "Modifica", nota "Spostato: …"), campo di ricerca + "Aggiungi", "Copia questa settimana…".
3. **Inizia allenamento** (25): il bottone che stava in "Oggi" (tolto dal 34) va in cima al giorno di oggi quando ha
   almeno un esercizio da fare.
4. La striscia colorata del tipo sulla scheda esercizio: via (coerente con la legenda tolta); il tipo resta nel testo dello
   schema dove serve al trainer.
5. La pagina scorre normalmente; su desktop una colonna (la seconda era "Record personali").
6. Pulizia: `Records`, `DotsLegend`, `CategoryRow` e gli stili relativi si eliminano se non servono più altrove; il 28
   (primo accesso) non deve più puntare a elementi tolti.
7. La vista del trainer sull'atleta ([AtletiView](../src/features/atleti/AtletiView.tsx)) usa gli stessi pezzi:
   controllare che editor e griglia settimanale (26) restino integri.

## Criteri di accettazione

- Nessuno degli elementi elencati al punto 1 è visibile.
- Da Scheda si può ancora: registrare, spostare, modificare lo schema, aggiungere, copiare la settimana, iniziare la
  sessione guidata.
- Audit C1 (prossima azione in cima) non peggiora.

## Decisioni (Michael, 24 novembre 2026)

1. "+ Fuori programma", "Record personali" con "+ Tentativo" e i colori Forza/Volume/Tecnico **si tolgono**.
2. "Inizia allenamento" passa qui dalla scheda "Oggi".

## Domande aperte

Nessuna. Deciso da Fabio il 25 novembre 2026: senza colori, il **tipo** deciso dal trainer (01) resta visibile
all'atleta **come testo** nello schema.

## Stato

**Fatto il 25 novembre 2026** sul ramo `claude/ticket-37-pagina-scheda-491885` (solo app, nessuna migration). Niente
push, niente merge. Manca l'approvazione di Michael sulla pagina.

**Cosa c'è**

- **Pagina** ([SchedaView.tsx](../src/features/scheda/SchedaView.tsx)): una sola scheda "Programma" (titolo grande):
  settimana con le frecce, 7 giorni, titolo del giorno, schede esercizio, ricerca + "Aggiungi", "Copia questa
  settimana…". Tolti "+ Fuori programma", legenda e pallini per tipo, la riga "Questa settimana: X% del programma", i 5
  omini di "Riposo" (restano la scritta e il campo per aggiungere), tutta la sezione "Record personali" (componente
  `Records` cancellato, con "+ Tentativo", "+ Record" e "Progressione record").
- **Segno del giorno**: `WeekDays` ha la nuova proprietà `sign` (un solo cerchietto dorato: pieno = fatto, vuoto = da
  fare, niente nei giorni senza esercizi); la regola è `daySign` in [adherence.ts](../src/lib/adherence.ts), sopra
  `dayMarks`, con il suo test. Lo stato è anche nell'etichetta del giorno per gli screen reader ("…, 3 esercizi, da
  fare"). Oggi si riconosce dal nome del giorno in oro (il "•" accanto al nome sarebbe stato un secondo segno dorato).
- **Scheda esercizio**: un riquadro per esercizio. In testa nome, "Registra" oro (o "Apri" a contorno se già
  registrato, "Programma" nei giorni futuri) e "×"; sotto, a tutta larghezza, blocchetti delle serie in oro, schema
  con **il tipo come testo** ("3 × 4 · 30 kg · rec. 90 s · Forza"), "Modifica", poi "Registrato: …" / "Spostato:
  fatto mer 25 · …" / "Ultimo: …" e la nota. Via la striscia colorata e la pastiglia del tipo col quadratino.
- **"Inizia allenamento"**: in cima al giorno di oggi (sotto il titolo del giorno), bottone oro a tutta larghezza,
  quando oggi resta almeno un esercizio non registrato; con una sessione aperta diventa "Continua allenamento 2/5" +
  "Termina". Tolto dalla pagina Livello (`StartWorkout`, `.lv-go` e `--lv-extra` cancellati).
- **Desktop**: una colonna, larga al massimo 760 px e centrata.
- **CSS**: le regole nuove sono in un blocco unico dopo `.addrow` ("Pagina Scheda dell'atleta"), tutte sotto `.sch`
  tranne `.day > .sign`, `.sch-go` e `.phead`. Cancellate le regole di "Record personali" (`.rlist`, `.rrow`, `.rname`,
  `.rval`, `.rmeta`, `.rgain`, `rec-flash`, `.empty-ico`).

**Verifica**

- `npm test` 314 verdi (14 file, +2 per `daySign`), `npx tsc -b` e `npm run build` puliti.
- **Browser**, app locale con l'account di Fabio. Programma e registrazioni vere si leggono (segni giusti nelle
  settimane di ottobre e novembre). Questa settimana l'account non ha niente in programma e **non ho scritto niente su
  Supabase**: per provare le azioni ho sostituito nella pagina le chiamate a `plan_items` e `entries` con una copia in
  memoria (righe vere + 6 righe di programma e 2 registrazioni inventate per la settimana; ogni altra scrittura
  bloccata; alla fine coda offline vuota, copia locale cancellata e pagina ricaricata sui dati veri). Così, a 390×844
  e 360×640:
  - modificare lo schema (serie da 3 a 4, "Schema del giorno salvato"), aggiungere un esercizio a un giorno, togliere
    con "×" e "Annulla", copiare la settimana nelle 4 successive, registrare da "Registra" (blocchetti pieni, "Apri");
  - "Inizia allenamento" apre la sessione sul primo esercizio (1/3), chiuso il foglio c'è "Continua allenamento 1/3" +
    "Termina", "Termina" apre il riepilogo;
  - nota "Spostato: fatto mer 25 · …" su un esercizio di martedì fatto mercoledì, che mercoledì compare sotto
    "Registrato fuori programma";
  - giorno di riposo senza omini; nessuno degli elementi del punto 1 nel testo o nel DOM;
  - nessuno scorrimento orizzontale; uno script non trova bersagli sotto 44 px (giorno con le schede e giorno di
    riposo; modulo dello schema e pannello della copia, che non sono cambiati, non li ho misurati aperti).
  - 1280×800: una colonna centrata.
- **Livello** dopo aver tolto `StartWorkout`: a 390×844 e 360×640 l'altezza del documento è uguale a quella dello
  schermo, ultima categoria sopra la barra, nessun "Inizia allenamento". La lettura di `level_records` risponde ancora
  400 (manca la `0015`): per vedere la schermata fissa l'ho sostituita con un elenco vuoto e ho chiuso la checklist
  con "Più tardi" (poi ho tolto la chiave dal `localStorage`). Con l'errore e la checklist visibili la pagina scorre,
  come prima.
- **Primo accesso** (28): la checklist porta a `/scheda` e i suoi testi ("Prepara la settimana dalla Scheda", "Oggi
  hai un allenamento in programma") non nominano niente di tolto.
- **Non visto nel browser**: la vista del trainer (l'account non è trainer): editor, aggiunta multipla, duplica
  giorno e griglia settimanale non sono stati toccati (`AtletiView.tsx` e `SchedeView.tsx` senza modifiche, `WeekDays`
  con `marks` e `detail` invariato) e compilano; una riga bloccata dal trainer vera (senza un legame attivo l'app non
  la blocca: ho visto solo la nota "Dal trainer:"); gli esercizi a tempo; il confronto col mockup.

**Scelte dove il ticket non dice** (da far vedere a Michael)

1. **La vista del trainer resta com'è**, con pallini per tipo, legenda, % della settimana e striscia colorata:
   l'indice dice che i colori spariscono "per l'atleta" e il ticket che il tipo "serve al trainer". Per questo
   `DotsLegend` e `CategoryRow` **non sono stati cancellati**: li usano ancora `AtletiView`, `SchedeView` ed
   `EserciziView` (quest'ultima è del 35). Se Michael vuole anche il trainer senza colori è un ticket a parte.
2. **Segno del giorno**: pieno solo se **tutti** gli esercizi del giorno sono fatti (uno spostato conta come fatto,
   come nel 16; un allenamento fuori programma conta come fatto); vuoto se ne resta anche uno, anche nei giorni
   passati (non c'è un segno diverso per "saltato").
3. **"Inizia allenamento" si vede solo guardando oggi**: scegliendo un altro giorno sparisce (la sessione è quella di
   oggi). La pagina si apre sempre su oggi.
4. **Il tipo** è in fondo allo schema, dopo il recupero.
5. **Via il pittogramma** dalle schede esercizio: a 360 px, con "Registra" e "×" in testa, il nome andava a capo a
   metà parola; il ticket non lo elenca tra i pezzi della scheda e il 35 toglie i pittogrammi da Esercizi.
6. **Restano**: "Ultimo: …" sotto lo schema, la pastiglia "★ Record" sulla registrazione che è un record, "Dal
   trainer", e la sezione "Registrato fuori programma" per le registrazioni che esistono già (tentativi e fuori
   programma vecchi, o esercizi tolti dal giorno dopo averli fatti): senza, non si potrebbero più aprire. Lì il tipo
   è scritto senza quadratino colorato.
7. **Settimana**: date e "Questa settimana" restano su due righe (a 360 px su una riga non ci stanno); nelle altre
   settimane c'è "Torna a oggi".
8. **Titolo "Programma" grande** (era piccolo in oro spento), perché ora è l'unica scheda della pagina.

**Non fatto, di proposito**

- Il registratore sa ancora fare i **tentativi di record** (`kind: 'attempt'` in `Logger.tsx`), ma nessun bottone li
  apre più: serve per aprire e correggere quelli già salvati. `lastRecordStep` in `src/lib/stats.ts` non ha più
  chiamanti: non l'ho toccato perché il file è del 36. Il campo "Nei record" degli esercizi (`inRecords`) ora non ha
  più effetto in Scheda: è nella pagina Esercizi, del 35.
- `ui.tsx` non è stato toccato: `SetBlocks` chiede ancora il tipo, l'oro in Scheda arriva dal CSS.
