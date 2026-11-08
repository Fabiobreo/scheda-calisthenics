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
