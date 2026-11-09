# 12 — Riepilogo compatto (avatar + livello) nelle altre sezioni

- **Punto PDF**: 7 (in Esercizi, Scheda e Grafici, in alto, una sintesi con avatar e livello generale, piccola ma
  visibile)
- **Figura professionale**: sviluppatore frontend; UI designer per la forma (06).
- **Dipende da**: 08, 09, 10, 11 (segnaposto accettato). **Sblocca**: —
- **Stima**: S

## Contesto

Oggi in alto c'è il titolo grande "Scheda Calisthenics" ([App.tsx](../src/app/App.tsx) `.hero`), che occupa molto
spazio e non dice nulla dell'utente.

## Cosa fare

1. Striscia alta ~56–64 px: avatar piccolo, nome, livello generale (e mini-barra o mini-pentagono, da decidere col
   designer); toccandola si va alla Home.
2. Al posto del titolo grande in Scheda, Grafici, Esercizi (e Atleti?).
3. Quando si scorre resta visibile in forma ancora più ridotta, o scorre via? (domanda)
4. Dati dalla stessa cache della Home (nessuna richiesta in più).

## Criteri di accettazione

- Visibile nelle tre sezioni, coerente con la Home, aggiornata subito dopo un nuovo record.
- Non sposta il contenuto quando i dati arrivano (spazio riservato).

## Domande aperte

1. Resta fissa scorrendo o scorre via con la pagina? (Consiglio: scorre via, la barra in basso è già fissa.)
2. Nella sezione Atleti del trainer mostra il livello del trainer stesso o niente?

## Stato

**Fatto il 9 novembre 2026** (solo app, nessuna migration). Codice in
[LevelStrip.tsx](../src/components/LevelStrip.tsx) e [Avatar.tsx](../src/components/Avatar.tsx) (avatar segnaposto
tolto dalla Home e reso riusabile); `Pentagon` ha la variante `mini`.

Decisioni dell'utente (9 novembre 2026):

1. Forma: **avatar piccolo, nome, "Livello 48" e mini-pentagono** senza etichette; toccandola si va alla Home. Il cerchio
   Account resta a destra.
2. **Scorre via** con la pagina (la barra in basso è già fissa).
3. In **Atleti e Account** (e nella Home, che ha già il profilo grande) resta il nome dell'app.

Come è fatto:

- La striscia sostituisce il nome dell'app nell'intestazione su `/scheda`, `/grafici`, `/esercizi` (`STRIP_PATHS` in
  [App.tsx](../src/app/App.tsx)). Altezza fissa 56 px: il contenuto non si sposta quando arrivano i dati (mentre carica
  mostra "Livello –").
- Dati da `useLevel()`, la stessa cache della Home: nessuna richiesta in più, e dopo un nuovo record si aggiorna da sola.
- Il pentagono mini è decorativo (`aria-hidden`); il link si legge "Livello 48: apri la Home" (con "ELITE" se serve).
- Attenzione per chi viene dopo: la classe `.mini` esiste già nei Grafici (mini-schede), per questo il pentagono
  piccolo usa `.penta-mini`.

Prove fatte: unitari 133 e build OK (nessun test nuovo: è solo interfaccia, la logica è quella del 08/10). Nell'app
locale a 375 px con l'atleta di prova: striscia in Scheda, Grafici ed Esercizi, nome dell'app in Home e Account,
nessuno scorrimento orizzontale.
