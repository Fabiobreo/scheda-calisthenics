# 14 — Grafici: restyling coerente col pentagono

- **Punto PDF**: 10 ("la rappresentazione dei grafici è troppo piatta; adottare lo stesso stile del grafico a
  pentagono per avere coerenza in tutta l'app")
- **Figura professionale**: **data-viz designer** (stile e leggibilità) + sviluppatore frontend.
- **Dipende da**: 06 (token), 10 (pentagono), 13 (nuova struttura dei grafici). **Sblocca**: —
- **Stima**: M

## Contesto

[charts.tsx](../src/components/charts.tsx): grafici SVG fatti a mano (linea con area, barre impilate, sparkline), colori
piatti da `styles.css`.

## Cosa fare

1. Stessa grammatica visiva del pentagono: linee con bagliore leggero, area sfumata, punti luminosi sull'ultimo valore,
   griglia sottile, sfondo con texture topografica discreta.
2. Colore elite (arancio) per evidenziare i record personali sul grafico.
3. Interazione: toccare/trascinare sul grafico per leggere data e valore (oggi solo tocco sui punti).
4. Restare SVG fatto a mano (leggero e già testato) salvo motivi forti per una libreria.
5. Leggibilità prima dell'effetto: il bagliore non deve ridurre il contrasto di assi e testi; `prefers-reduced-motion`.

## Criteri di accettazione

- Grafici di Grafici e Home visivamente dello stesso sistema (approvazione del designer).
- Prestazioni: nessun calo visibile scorrendo la lista delle mini-schede su un telefono di fascia media.

## Domande aperte

1. Vuoi animazioni di ingresso nei grafici o solo nella Home?
2. Il grafico "Ripetizioni per tipo" ha ancora senso dopo il 01, o lo sostituiamo con qualcosa di più utile (es.
   distribuzione del lavoro per macro categoria, legata al livello)?
