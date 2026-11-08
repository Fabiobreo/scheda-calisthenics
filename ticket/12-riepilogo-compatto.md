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
