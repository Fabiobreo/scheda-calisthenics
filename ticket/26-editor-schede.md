# 26 — Audit: editor di schede veloce (A08)

- **Fonte**: [audit del 9 novembre 2026](../audit/AUDIT.md), intervento 8 della lista "Cosa migliorerei" (misure F2 e F3).
  Avviato il 10 novembre 2026.
- **Figura professionale**: UX designer + frontend.
- **Dipende da**: 20 (settimana a 7 colonne), 21–24 (stile).
- **Stima**: L.
- **Punti attesi**: +4 (F2 +3, F3 +1).

## Decisioni dell'utente (10 novembre 2026)

1. **In entrambi gli editor**: le schede modello e il programma dell'atleta che il trainer modifica.
2. **La griglia della settimana solo su desktop** (≥ 1024 px). Sul telefono restano i giorni a pulsanti, con
   l'aggiunta multipla e il duplica.
3. **Uno schema per tutti** nell'aggiunta multipla, precompilato dal tipo. Il singolo esercizio si ritocca dopo con
   Modifica.
4. **Duplica in uno o più giorni della stessa settimana.** Gli esercizi già presenti nel giorno di arrivo non si
   raddoppiano.

## Cosa è cambiato

| Intervento | Dove | Come |
|---|---|---|
| **Aggiunta multipla** | schede modello, programma dell'atleta | "+ Più esercizi" accanto ad "Aggiungi". Si apre l'elenco del catalogo con la ricerca (nome, gruppo, sinonimo), diviso per categoria, con un pittogramma e una casella per riga (48 px). Gli esercizi già nel giorno non compaiono. Sotto c'è lo schema in comune: tipo, serie, ripetizioni e/o secondi (compaiono i secondi solo se è spuntata una tenuta), peso, recupero. Il pulsante dice quanti esercizi aggiunge ("Aggiungi 5"). I nomi personalizzati restano nell'aggiunta singola |
| **Schema dal tipo** | aggiunta multipla e singola, in entrambi gli editor | forza 5 × 5 con recupero di 180 s, volume 3 × 10 con 90 s, tecnico 4 × 5 con 120 s. Nelle tenute 10, 20 e 15 s. Cambiando tipo cambiano serie, ripetizioni, secondi e recupero; il peso resta. Il tipo di partenza è quello del primo esercizio spuntato. Prima l'aggiunta singola proponeva sempre 3 × 8 |
| **Duplica giorno** | schede modello, programma dell'atleta | "Duplica giorno" compare quando il giorno ha esercizi. Si scelgono i giorni di arrivo nella stessa settimana: il giorno di partenza è tratteggiato con la scritta "da qui", quelli scelti hanno la spunta. Si copiano esercizi, schemi e note in coda al giorno di arrivo. Nel calendario dell'atleta si copia solo la nota del trainer, non quella dell'atleta |
| **Griglia della settimana** | schede modello, ≥ 1024 px | la settimana occupa tutta la larghezza: 7 colonne da circa 128 px a 1280 px, ognuna con gli esercizi del giorno (pittogramma e nome) o "Riposo". Sotto ci sono due colonne: a sinistra il giorno aperto, a destra il nome della scheda e l'assegnazione. "Copia la settimana nelle successive" è nella scheda della griglia. Nel programma dell'atleta la griglia c'era già (ticket 20) |

**Logica** in `src/lib/editor.ts`, con 8 test in `editor.test.ts`:
- `typeScheme` e `sharedPreset`: lo schema dal tipo;
- `schemeFor`: lo schema in comune nella misura dell'esercizio;
- `addToProgramDay`: le righe dell'aggiunta multipla, senza doppioni e in coda;
- `duplicateProgramDay` e `duplicatePlanDay`: le righe da copiare, senza gli esercizi già presenti.

**Interfaccia** in `src/components/QuickAdd.tsx` (`MultiAdd`, `DuplicateDay`), usata dai due editor. Nel calendario
dell'atleta le righe si scrivono con il nuovo hook `useCoachAddPlanItems`: una chiamata a `coach_add_plan_item` per
riga, in fila.

## Tocchi per una settimana (F2)

Conteggio come nell'audit: 3 giorni × 5 esercizi con schema, in una scheda modello, sul telefono. Si contano i tocchi
sui controlli e i campi da compilare; non lo scorrimento.

| Passo | Prima | Ora |
|---|---:|---:|
| Per esercizio: menu, scelta, Aggiungi, 4 campi, Aggiungi | 8 × 15 = 120 | — |
| Per giorno: scelta del giorno, "+ Più esercizi", 5 caselle, tipo, 4 campi, "Aggiungi 5" | — | 13 × 3 = 39 |
| Giorni | 3 | (dentro i 13) |
| **Totale, tre giorni diversi** | **~123** | **39** |
| Stessa giornata ripetuta: giorno 1 come sopra, poi "Duplica giorno", 2 giorni, "Duplica in 2 giorni" | — | 13 + 4 = **17** |
| Schema dal tipo accettato così com'è (senza tipo e campi) | — | 8 × 3 = **24** |

**F2: da ~123 a 39 tocchi** (≤ 60 = 3 punti). **F3: copia settimana e duplica giorno** (2 punti).

## Stato

**Fatto il 10 novembre 2026**, sul ramo `claude/a08-editor-schede-7899a9`.

**Audit: 76,9 → 80,9**. La sezione F passa da 7 a 11 (F2 da 0 a 3, F3 da 1 a 2).

**Sonda** a 375 × 812 e a 1280 × 900 con l'aggiunta multipla aperta e con il duplica aperto, nella scheda modello e
nel programma dell'atleta:
- axe 0;
- nessun bersaglio sotto 44 px;
- nessun testo sotto 12 px;
- nessuno scorrimento orizzontale.

Un primo giro aveva 2 `color-contrast`: il giorno di partenza era reso trasparente. Ora è tratteggiato, a piena
opacità.

**Sezione H**: resta 10,0. `/schede/<id>` (la scheda vuota del seed) misura 38 parole in prima schermata e 1 dato
disegnato, come prima. I nuovi pulsanti sono sotto la prima schermata.

**Prove a schermo**, con i dati del seed:
- in una scheda di prova, 6 esercizi aggiunti al lunedì in una volta (tipo Forza dal primo esercizio, 5 × 5, 180 s),
  poi il lunedì duplicato in mercoledì e venerdì (18 esercizi in settimana);
- nel calendario dell'atleta, nella settimana del 7 dicembre: 5 esercizi aggiunti in una volta (con una tenuta, il
  Plank, a 5 × 10 s), poi duplicati in due giorni ("Lunedì copiato: 10 esercizi").

La scheda di prova, le 15 righe del calendario e i 4 esercizi creati per l'atleta sono stati tolti.

**Test**: 197 unitari verdi (8 nuovi). `tsc -b` e `npm run build` puliti.

**Peso**:
- JS iniziale 153,0 KB gzip: il nuovo codice è nei blocchi di Atleti e delle schede, caricati dopo;
- CSS: un blocco "Ticket 26" di 1,2 KB non compressi in fondo a `styles.css`.

**Migration**: nessuna.

## Limiti e cose non verificate

- **Calendario dell'atleta, salvataggio non atomico.** L'aggiunta multipla e il duplica fanno una chiamata per riga:
  se una fallisce, le precedenti restano e il messaggio d'errore lo dice. Per farlo in un colpo serve una funzione SQL
  nuova (una migration): non l'ho fatta per non toccare il database.
- **Niente "Annulla" nel messaggio** dopo l'aggiunta multipla e il duplica. Gli esercizi si tolgono uno per uno con la ×.
- **Duplica in un'altra settimana**: escluso per scelta. Per le schede modello c'è già "Copia la settimana nelle
  successive".
- **Non verificato a schermo**:
  - una scheda modello con più settimane piene;
  - un errore di rete a metà di un duplica nel calendario dell'atleta;
  - la griglia a 1024 px esatti (provata solo a 1280).
