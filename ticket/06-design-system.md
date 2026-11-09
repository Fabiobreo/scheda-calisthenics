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

## Stato

**Fatto il 9 novembre 2026** (solo app, nessuna migration). Al posto del file Figma c'è una **pagina di proposta**
approvata dall'utente: [riferimenti/06-proposta-design.html](riferimenti/06-proposta-design.html) (colori con
contrasto, tipografia, spazi, raggi, bagliori, movimento, componenti, 5 schermate, anteprima dei grafici, icone,
accessibilità). Poi tradotta nel codice: [styles.css](../src/styles.css), [Pentagon.tsx](../src/components/Pentagon.tsx),
icona e manifest.

Decisioni dell'utente (9 novembre 2026):

1. **Solo tema scuro** (anche su telefoni in tema chiaro).
2. Prima una **proposta da guardare**, poi il codice dopo l'approvazione (approvata lo stesso giorno).
3. Direzione **come l'esempio del pentagono**: ciano con bagliore leggero, ambra per ELITE, linee topografiche discrete.
4. **Il nome resta** "Scheda Calisthenics", **icona nuova**. Nome/marchio per i trainer paganti: da decidere più avanti.
   Designer esterno e riferimenti di altre app: non serviti per questa versione.

Come è fatto:

- **Token** in `:root` di `styles.css`, nessun colore scritto a mano fuori di lì: fondo e superfici neri con una punta
  di blu-petrolio, `--accent` ciano (#2fd6e8) con `--accent-deep` per i gradienti, `--elite` ambra con `--elite-hot`,
  `--ok` verde (serie fatta, in salita) separato dal colore del tipo Tecnico, `--glow` / `--glow-elite` / `--halo`,
  raggi `--r-ctl` 12, `--r-tile` 14, `--r-card` 18. Tolto il tema chiaro automatico.
- **Regole**: ciano = da 0 a 100 e azioni; **ambra solo per ELITE e record** (i record ora sono ambra, non verdi; il
  Volume nei grafici passa da arancio a viola); il bagliore sta su dati e progressi, mai sotto i testi.
- **Fondo**: linee topografiche in `public/topo.svg` (7 KB, generato da `ticket/riferimenti/topo.gen.js`, nostro:
  nessuna licenza), al 8% sul fondo della pagina.
- **Componenti**: pulsante pieno con leggero gradiente e bagliore (testo scuro, contrasto 10:1), ghost con bordo più
  marcato, voce attiva del selettore con linea ciano in basso, voce attiva della barra in basso con linea luminosa,
  giorno scelto e mini-scheda scelta con bagliore, barre blu → ciano e ambra → arancio con bagliore, categoria ELITE
  con bordo e alone ambra, avatar segnaposto con fondo sfumato, timer e cronometro con barra in gradiente.
- **Pentagono**: area sfumata dal centro, lati con bagliore (copia sfocata sotto), alone sui vertici; nel mini niente
  bagliore. Corretto un difetto del 10: il lato verso una categoria ELITE doveva sfumare in ambra ma restava ciano
  (il colore della classe CSS vinceva sull'attributo `stroke`); ora il gradiente sta in `style`.
- Barre a zero: niente barra (il bagliore avrebbe fatto una macchia all'inizio del binario vuoto); barra di un
  sotto-esercizio in ELITE arrotondata da entrambi i lati.
- **Icona**: pentagono ciano con un vertice ambra su fondo `#0a1013`; PNG rigenerati con `npm run generate-pwa-assets`
  (nuovo `pwa-assets.config.mjs`: icone maskable e Apple su fondo scuro invece che bianco). Manifest e `theme-color`
  a `#0a1013`.

Prove fatte: unitari 168, pgTAP 166, `tsc -b` e `vite build` OK. Nell'app locale a 375 px (solo tema scuro): accesso,
Home, Scheda, Grafici; Handbalance portato in ELITE con un record HSPU di prova (pentagono con lato sfumato in ambra,
categoria con alone, celebrazione) e poi eliminato: database rimesso com'era (livello 48).

Note per chi viene dopo:

- Il 14 (grafici) usa gli stessi token: `--glow`, `--halo`, `--elite` per i record.
- Le icone delle 5 categorie restano quelle del 10 (tratto 1,8): coerenti, disegnate da noi.
- Non provato su telefono vero né con la PWA installata (l'icona nuova compare dopo l'aggiornamento della PWA).
