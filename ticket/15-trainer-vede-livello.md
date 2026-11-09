# 15 — Il trainer vede il livello dell'atleta

- **Punto PDF**: non citato; serve per coerenza con la direzione di prodotto (trainer e atleti sono il target: il
  trainer vede registro, grafici e record dell'atleta in sola lettura).
- **Figura professionale**: product owner (decisione), sviluppatore full-stack.
- **Dipende da**: 09, 10. **Sblocca**: —
- **Stima**: S

## Contesto

Il trainer apre un atleta da Atleti ([AtletiView.tsx](../src/features/atleti/AtletiView.tsx)) con le schede Programma,
Storico, Grafici; i componenti dell'atleta sono riusati in sola lettura grazie a `useScope()`.

## Cosa fare

1. Nuova scheda **Livello** nella pagina dell'atleta: la Home (10) in sola lettura (pentagono, barre, sotto-categorie,
   record con data).
2. In elenco Atleti: livello e mini-avatar accanto al nome.
3. Policy RLS di lettura già previste nel 09.

## Criteri di accettazione

- Il trainer collegato vede il livello e i record dell'atleta, senza poterli modificare (salvo decisione diversa).
- Un trainer scollegato non vede nulla.

## Domande aperte

1. ~~Il trainer può inserire o verificare un record?~~ **Deciso (05)**: no, solo l'atleta inserisce; il trainer legge.
2. Il trainer vuole confrontare i suoi atleti (classifica per livello)? Possibile funzione per il piano a pagamento.

## Stato

**Fatto il 9 novembre 2026** (solo app, nessuna migration: le policy di lettura del trainer c'erano già dal 09, con i
test pgTAP "il trainer collegato vede…" e "un trainer non collegato non vede niente" in `levels.test.sql`).

Decisioni dell'utente (9 novembre 2026):

1. Il trainer vede anche il **peso corporeo** dell'atleta, in sola lettura.
2. Nell'elenco Atleti: **avatar e livello accanto al nome**. Classifica / ordinamento per livello **rimandati** (possibile
   funzione del piano a pagamento).
3. (dal 05) Solo l'atleta inserisce i record; il trainer legge.

Come è fatto:

- Pagina dell'atleta: schede **Programma · Livello · Grafici**. "Livello" è la Home dell'atleta
  ([HomeView.tsx](../src/features/home/HomeView.tsx)) dentro `AthleteScope`, che legge `useScope().readOnly`: peso
  senza "Modifica", nome dell'atleta (o "Atleta senza nome") senza link ad Account, righe "Nessun record" senza invito a
  toccare, pannello del sotto-esercizio con definizione, percentuale e storico ma **senza modulo né Modifica/Elimina**
  ([RecordSheet.tsx](../src/features/home/RecordSheet.tsx), prop `readOnly`). Messaggi per il trainer: "Non ha ancora
  inserito record…" / "Non ha ancora inserito il peso corporeo…".
- La scheda Livello non aspetta registrazioni e programma dell'atleta: ha i suoi dati (record e peso).
- Elenco Atleti ([AtletiView.tsx](../src/features/atleti/AtletiView.tsx), `AthleteHead`): avatar piccolo, nome,
  "Livello 48" (ambra con ELITE), "Nessun record" se non ne ha, e la data del collegamento. Ogni riga è nel suo
  `AthleteScope`: la cache è la stessa della scheda Livello, aprendo l'atleta non si ricarica.

Prove fatte: unitari 153, pgTAP 166, `tsc -b` e `vite build` OK (nessun test nuovo: la logica è quella già testata di
08/09/10, cambia solo cosa si mostra). Nell'app locale a 375 px col trainer di prova collegato all'atleta di prova
(collegamento e `is_trainer` messi a mano e poi tolti: DB rimesso com'era): elenco con "Livello 48", scheda Livello con
pentagono, barre, peso "75 kg dal 7 nov", pannello Trazioni con storico e senza modulo; la Home del trainer resta
modificabile.

Note per chi viene dopo:

- Ogni atleta in elenco fa 2 richieste (record e peso). Va bene per qualche decina di atleti; con molti di più conviene
  una funzione SQL che restituisca i livelli di tutti in una volta (servirebbe però il calcolo del livello in SQL, oggi
  è solo nell'app).
- Non c'è ancora uno storico del livello nel tempo (vedi 10 e 13): il trainer vede il livello di oggi.
