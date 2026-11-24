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
