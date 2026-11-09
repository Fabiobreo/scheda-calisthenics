# 07 — Navigazione in basso (tab bar)

- **Punto PDF**: 8 ("sposterei i menù in basso così è più facile scorrere con il pollice")
- **Figura professionale**: UX designer mobile (struttura e voci), sviluppatore frontend.
- **Dipende da**: 04 (via il Registro), 06 (stile). **Sblocca**: 10 (la Home diventa la prima voce).
- **Stima**: S

## Contesto

Oggi la navigazione è una barra segmentata in alto, appiccicosa ([App.tsx](../src/app/App.tsx), `.nav` in
[styles.css](../src/styles.css)): Scheda, Grafici, Registro, Esercizi (+ Atleti per i trainer). Account ed Esci sono link
nell'intestazione, sopra il grande titolo "Scheda Calisthenics".

## Cosa fare

1. Barra fissa in basso con icona + etichetta, rispettando l'area sicura dell'iPhone (`env(safe-area-inset-bottom)`)
   e con l'app installata come PWA.
2. Voci proposte: **Home** (Livello, prima schermata all'apertura) · **Scheda** · **Grafici** · **Esercizi** ·
   **Atleti** (solo trainer). Account si raggiunge toccando l'avatar/nome in Home o in alto.
3. Ridurre l'intestazione: il titolo grande lascia posto al riepilogo compatto (12).
4. Spostare il banner "nuova versione" e i toast in modo che non coprano la barra; il timer di recupero e il logger
   (pannelli dal basso) devono stare sopra la barra.
5. Rotta `/` = Home; la Scheda passa a `/scheda` (con redirect per chi ha la vecchia home salvata? vedi domande).

## Criteri di accettazione

- Su telefono tutte le sezioni si raggiungono col pollice; nessun contenuto finisce sotto la barra.
- Voce attiva evidente; funziona con tastiera e lettore di schermo (`nav` con `aria-current`).
- Verificato su iPhone (PWA installata) e Android.

## Domande aperte

1. Account come voce della barra o dietro l'avatar? (Consiglio: dietro l'avatar, la barra resta a 4–5 voci.)
2. Per un trainer le voci diventano 5: va bene, o "Atleti" sostituisce "Esercizi" (che finisce in Scheda)?
3. Su schermi larghi (computer, usato dai trainer) teniamo la barra in basso o una barra laterale?

## Stato

**Fatto il 9 novembre 2026** (solo app, nessuna migration). Decisioni dell'utente sulle domande:

1. Account: **cerchio con l'iniziale in alto a destra**; "Esci" è ora nella scheda Account. L'avatar (11–12) prenderà
   quel posto.
2. Trainer: **Atleti come voce in più** (Scheda, Grafici, Esercizi, Atleti).
3. Schermi larghi: **barra in basso anche lì**, centrata e larga come il contenuto.

Cosa c'è:

- Barra fissa in basso con icona ed etichetta ([icons.tsx](../src/components/icons.tsx)), area sicura dell'iPhone
  rispettata, `nav aria-label="Sezioni"` con `aria-current="page"` sulla voce attiva.
- Intestazione corta: nome dell'app a sinistra (porta alla Scheda), cerchio Account a destra.
- Timer di recupero e toast stanno sopra la barra (variabile CSS `--tabbar`); logger e cronometro la coprono.
- Risolto anche il vecchio difetto del timer che, su schermi larghi, copriva "Salva" nel logger: con il timer aperto il
  pannello si accorcia (`body:has(.timer)`).

Rimandato:

- **Home a `/` e Scheda a `/scheda`**: la Home non esiste ancora; si fa con il ticket 10 (con redirect da `/`).
- Prova su iPhone con PWA installata e su Android: provato solo nel browser con la vista da telefono (375 px).
