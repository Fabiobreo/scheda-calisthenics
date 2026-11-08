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
