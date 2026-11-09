# 16 — Ripresa del piano precedente: rispetto del piano e notifiche

- **Punto PDF**: non citato. Era il **passo 5** dell'ordine dei lavori deciso il 3 novembre 2026 (dopo Supabase locale,
  catalogo, collegamento trainer–atleta, schede modello: tutti fatti e in produzione).
- **Figura professionale**: product owner per la ri-prioritizzazione; poi full-stack.
- **Dipende da**: decisione di priorità. **Sblocca**: —
- **Stima**: da rifare quando torna in cima

## Contesto

Il passo 5 prevedeva: per il trainer, vedere quanto l'atleta rispetta il piano (fatto vs programmato) e ricevere avvisi.
Il documento di oggi porta priorità diverse (livello, design, navigazione). Questo ticket esiste per non perderlo.

## Domande aperte

1. **Bloccante** — Lo mettiamo dopo il 15 (come in questo backlog) o va prima, perché serve ai trainer che stanno per
   arrivare?
2. Le notifiche push su PWA (soprattutto iPhone) hanno limiti: servono davvero push o bastano avvisi dentro l'app?

## Stato

**Fatto il 9 novembre 2026** (solo app, nessuna migration: il trainer legge già programma, registrazioni e record
dell'atleta). Logica in [adherence.ts](../src/lib/adherence.ts) con i test in `adherence.test.ts`.

Decisioni dell'utente (9 novembre 2026):

1. Priorità: si fa adesso, dopo il 15 (il 14 aspetta il design 06).
2. Un esercizio in programma è **fatto** se registrato lo stesso giorno **o spostato** in un altro giorno della stessa
   settimana (lun–dom), prima o dopo: conta come fatto, ma si vede che è spostato.
3. Il rispetto del piano lo vedono **trainer e atleta**.
4. **Avvisi dentro l'app**, niente notifiche push in v1 (su iPhone funzionano solo con la PWA installata e servono server
   di invio e consenso): si aggiungono se i trainer li chiedono.
5. Avvisi scelti: **fermo da 7 giorni**, **settimana scorsa sotto il 50%**, **nuovo record**, **niente in programma
   nei prossimi 7 giorni**.

Come è fatto:

- Calcolo (`weekStatuses`): per ogni esercizio in programma della settimana, prima l'allenamento dello stesso giorno,
  poi uno spostato (il giorno più vicino); più registrazioni dello stesso esercizio nello stesso giorno sono una sola
  sessione, che vale per un solo giorno in programma. Contano solo gli allenamenti (non i tentativi di record) fino a
  oggi. Quelli di oggi e dei giorni dopo non ancora fatti sono "da fare" e **non abbassano la percentuale**.
  Percentuale = (fatti + spostati) / (fatti + spostati + saltati). Contano tutte le righe del programma, anche quelle
  che l'atleta si è messo da solo.
- **Scheda dell'atleta** e **Programma dell'atleta lato trainer**: sotto i giorni "Questa settimana: 67% · 2 di 3,
  1 spostato del programma" (per la settimana mostrata); un esercizio spostato dice "Spostato: fatto mar 3 · serie".
- **Elenco Atleti**: sotto il livello "Piano, 4 sett.: 82% · 9 di 11 · ultimo allenamento 3 nov".
- **Riquadro "Da guardare"** in cima ad Atleti (solo se il trainer ha atleti): per ogni atleta con avvisi, il nome (porta
  alla sua pagina) e gli avvisi in ordine d'importanza; "Tutto in ordine: nessun avviso" se non ce ne sono.
  - Fermo: nessun allenamento da almeno 7 giorni **e** qualcosa in programma negli ultimi 7 ("Fermo da 9 giorni (ultimo
    allenamento 31 ott)", o "Non ha ancora registrato allenamenti").
  - Settimana scorsa sotto il 50% ("Settimana scorsa: 33% del programma (1 di 3)").
  - Niente in programma da domani a 7 giorni.
  - Record degli ultimi 7 giorni: di livello (data del record) e allenamenti che hanno battuto un record; **la prima
    registrazione di un esercizio non conta** (non è un miglioramento).

Prove fatte: unitari 168 (15 nuovi), pgTAP 166, `tsc -b` e `vite build` OK. Nell'app locale a 375 px: atleta di prova
con 3 righe di programma messe a mano nella settimana scorsa (una fatta, una spostata, una saltata) → "67% · 2 di 3,
1 spostato" nella sua Scheda e nella pagina dell'atleta lato trainer; elenco Atleti e "Da guardare" col trainer di prova
collegato (righe, collegamento e `is_trainer` poi tolti: DB rimesso com'era).

Note per chi viene dopo:

- Un allenamento spostato compare anche tra i "fuori programma" del giorno in cui è stato fatto (il calendario usa ancora
  `offPlan`, che guarda solo lo stesso giorno). Si può far dire "spostato da mer 4" usando `weekStatuses`.
- L'elenco Atleti legge tutti i dati di ogni atleta (registrazioni, programma, esercizi, record, peso). Va bene per
  qualche decina di atleti; oltre servirà una funzione SQL con i riepiloghi (rispetto del piano, ultimo allenamento,
  avvisi).
- Gli avvisi non si possono "segnare come visti": spariscono quando la situazione cambia. Se i trainer li vogliono
  archiviare servirà una tabella.
- Le soglie (7 giorni, 50%) sono costanti in `adherence.ts` (`ALERT_DAYS`); se i trainer le vogliono personalizzabili
  vanno nel profilo.
