# 06 — Identità visiva e design system

- **Punti PDF**: 9 ("design troppo spento… più accattivante e stimolante mantenendo una certa serietà"), 10 (coerenza
  in tutta l'app con lo stile del pentagono)
- **Figura professionale**: **UI / brand designer** con esperienza di app sportive o fitness (Figma). Poi sviluppatore
  frontend per tradurre i token in CSS.
- **Dipende da**: 05 per sapere cosa va mostrato (livelli, elite). **Sblocca**: 07, 10, 11, 12, 14.
- **Stima**: L (lavoro del designer) + M (sviluppo)

## Contesto

Oggi ([styles.css](../src/styles.css)): fondo quasi nero, superfici grigie, un solo accento blu, Barlow / Barlow
Condensed, tema scuro e chiaro automatici. Pulito ma piatto.

Il riferimento visivo nel documento ([riferimenti/pentagono-esempio.jpg](riferimenti/pentagono-esempio.jpg)): fondo scuro con **linee topografiche** sottili, accento
**ciano/turchese** con bagliore per la zona 0–100, **arancio/ambra con fiamma** per la zona ELITE, schede con bordo
sottile e angoli arrotondati, numeri grandi, icone per categoria.

## Cosa fare (designer)

1. Moodboard e 2 direzioni visive, poi una scelta.
2. **Token**: colori (fondo, superfici, testo, accento base, accento elite, stati, colori dei grafici), tipografia
   (si possono tenere i Barlow: sono adatti), spaziature, raggi, ombre/bagliori, movimento.
3. **Componenti**: scheda, pulsanti, campi numerici, selettore progressione, barra di categoria (base/elite), chip,
   barra di navigazione in basso, intestazione con riepilogo avatar (12), grafici.
4. **Icone** per le 5 macro categorie (coerenti tra loro, licenza chiara).
5. Schermate chiave in Figma: Home Livello (aperta e con una categoria espansa), Scheda, Grafici, Esercizi, logger.
6. Regole di accessibilità: contrasto AA del testo anche sopra i bagliori, nessuna informazione affidata solo al colore
   (base/elite anche con etichetta "ELITE"), animazioni ridotte con `prefers-reduced-motion`.

## Cosa fare (sviluppo)

- Tradurre i token in variabili CSS, aggiornare i componenti esistenti di [ui.tsx](../src/components/ui.tsx) e le
  schermate attuali, senza cambiarne il comportamento.
- Aggiornare icona dell'app e colori del manifest PWA.

## Criteri di accettazione

- File Figma approvato con token e componenti.
- Tutte le schermate esistenti usano i nuovi token; nessun colore scritto a mano fuori dai token.
- Contrasto verificato.

## Domande aperte

1. **Bloccante** — Solo tema scuro o anche chiaro? (Consiglio: solo scuro in v1.)
2. Hai riferimenti di app che ti piacciono (anche non di fitness)? E qualcosa che *non* vuoi (es. stile videogioco
   cartoon)?
3. Nome e logo restano "Scheda Calisthenics"? Con trainer paganti in arrivo potrebbe valere la pena un nome/marchio
   proprio: va deciso prima del lavoro di brand, non dopo.
4. Budget e tempi per un designer esterno?
