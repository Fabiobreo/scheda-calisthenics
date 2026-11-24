# 33 — Stile nuovo: oro, foto di sfondo, testata e barra in basso

- **Fonte**: mockup di Michael (Home e Livello sono il riferimento) e messaggi del 22–24 novembre: "stile, grafica e
  sfondo devono essere quelli di Home e Livelli", "caratteri come nella Home", "massimo 3–4 colori di oro", nei grafici
  "troppo bianco nelle scritte".
- **Figura professionale**: UI designer + frontend.
- **Dipende da**: nulla (si può fare in parallelo a 30–32). **Sblocca**: 34, 35, 36, 37, 39.
- **Stima**: L.

## Contesto

Oggi ([styles.css](../src/styles.css)): tema scuro con accento **ciano** (`--accent #2fd6e8`), ambra solo per ELITE e
record (`--elite`), sfondo `topo.svg`, caratteri **Barlow / Barlow Condensed** (`main.tsx`), titoli in maiuscolo.
Testata in [App.tsx](../src/app/App.tsx): marchio oppure `LevelStrip` (nome, "Livello N", mini pentagono) + avatar che
porta ad Account. Barra in basso con 4 voci (Livello, Scheda, Grafici, Esercizi, più Atleti per i trainer).

Nei mockup: fondo quasi nero con **foto della palestra** in alto che sfuma nel nero, schede grigio-antracite molto
arrotondate con bordo sottile, **oro** per azioni e valori, carattere tipo **Inter**, titoli in minuscolo. Testata uguale
in tutte le pagine: nome grande, livello sotto, **cerchio "Totale"** a destra. Barra in basso flottante a pillola con 5
voci (Home, Livello, Scheda, Grafici, Esercizi), quella attiva in un riquadro dorato.

## Cosa fare

1. **Token** (`styles.css`): tavolozza a 4 ori + neutri, da fissare sul mockup:
   - `--gold` (valori, icone attive, linee dei grafici), `--gold-hi` (chiaro, cima dei gradienti), `--gold-deep` (bronzo,
     fondo dei gradienti e bordi attivi), `--gold-dim` (oro spento per testi secondari importanti);
   - `--bg`, `--surface`, `--surface2`, `--line`; testi `--fg` (bianco caldo, solo per titoli e nomi) e `--muted`.
   - Il ciano sparisce. Colori di stato (`--ok`, `--danger`) restano ma solo per errori e conferme.
   - Forza/Volume/Tecnico: la legenda in Scheda viene tolta (37); i tre colori restano solo dove servono ancora
     (editor del trainer), in tinte che non stonino con l'oro.
   - Contrasto: testo oro su antracite ≥ 4,5:1, `--muted` ≥ 4,5:1 (l'audit B lo misura).
2. **Carattere**: Inter (pacchetto `@fontsource-variable/inter`, un solo file) al posto di Barlow e Barlow Condensed;
   titoli in minuscolo con peso 600–700. Controllare il peso del JS/CSS iniziale (audit A4).
3. **Sfondo**: la foto che ha mandato Michael (palestra con gli anelli, 688×1536) in `public/`, in WebP/AVIF a due
   larghezze, fissa in alto con sfumatura verso `--bg`; precaricata; il testo della testata sempre leggibile sopra.
   `topo.svg` si toglie. Il service worker deve averla in cache (offline, 27).
4. **Testata comune** (nuovo componente al posto di `LevelStrip` + marchio): nome, livello complessivo (Base…Leggenda),
   cerchio con la **% nel livello** e la scritta "Totale" (dati dal 31; finché il 31 non c'è, valori attuali).
   Il cerchio porta a Livello. **Account**: toccando il nome (o un'icona discreta accanto): nel mockup non c'è, serve
   un punto d'ingresso. Pastiglia "Offline" mantenuta.
5. **Barra in basso**: pillola flottante, voce attiva nel riquadro dorato; la voce Home si aggiunge col 39 (fino ad
   allora 4 voci). Per i trainer resta Atleti (sesta voce: da provare su 360 px, altrimenti dentro Account).
6. **Componenti condivisi** (`ui.tsx` + CSS): scheda, bottone primario (gradiente oro, testo scuro), bottone secondario
   (contorno), segmenti (periodo, metrica), campo di ricerca con lente, menu "⋯", fogli dal basso, toast, scheletri.
7. **Pagine fuori dai mockup** (Account, Atleti, schede modello, accesso, registratore, sessione, riepilogo): stessi
   token e componenti, senza ridisegnarle.
8. **Desktop** (20): le due colonne restano; la foto diventa fascia in alto.
9. Aggiornare [06](06-design-system.md) con la nuova tavolozza (questo ticket lo sostituisce nei colori e nei caratteri).

## Criteri di accettazione

- Nessun ciano residuo; al massimo 4 ori nel CSS (controllo con una ricerca sui token).
- Home/Livello a 390×844 sovrapposte al mockup: stesse proporzioni di testata, schede e barra.
- Contrasti e bersagli di tocco ≥ 44 px invariati (audit B3, B4); JS iniziale non oltre 160 KB.
- Screenshot di tutte le pagine approvati da Michael.

## Decisioni (Michael, 24 novembre 2026)

1. **Carattere**: Michael non sa quale sia quello dei mockup: si usa **Inter**, che è quello che gli somiglia.
2. **Foto di sfondo**: l'ha generata lui con un'AI, si usa così com'è (nessuna licenza di terzi).

3. **Account** (Fabio, 24 novembre): si raggiunge toccando il nome in testata.

## Stato

**Fatto il 24 novembre 2026** (solo app, nessuna migration). Manca l'approvazione di Michael sugli screenshot.

Come è fatto:

- **Token** (`styles.css`): quattro ori — `--gold` #d6a84e (valori, icone attive, linee dei grafici; 8,2:1 su
  `--surface`), `--gold-hi` #f2d58c (cima dei gradienti, record, zona ELITE finché c'è; 12,6:1), `--gold-deep` #9c712c
  (bronzo, fondo dei gradienti e bordi; 4,1:1, quindi **mai per il testo**), `--gold-dim` #bca37a (titoli piccoli delle
  schede, livello in testata; 7,5:1) — più neutri antracite, `--fg` bianco caldo e `--muted` (6,6:1). Testo scuro
  `--on-gold` sull'oro (8,5:1). `--accent`, `--elite` e `--elite-hot` non ci sono più: il ciano sparisce da CSS,
  grafici, pentagono, icona dell'app (PNG rigenerati), `theme-color` e manifest (#0b0b0d). ELITE e record passano
  all'oro chiaro. Forza/Volume/Tecnico in tinte spente (#8ea4c8, #b996c6, #8fc49c). Raggi più ampi (schede 22 px).
- **Carattere**: `@fontsource-variable/inter` (un file per tutti i pesi, il browser scarica solo il latino) al posto di
  Barlow e Barlow Condensed, tolti dalle dipendenze. Titoli senza maiuscolo forzato, peso 700, spaziatura negativa;
  numeri grandi ridotti del 10–20% (Inter è più largo del condensato). Ho letto "titoli in minuscolo" come "scritti come
  sono" (niente MAIUSCOLO): se Michael li vuole tutti minuscoli è una riga di CSS. Le etichette piccole dei campi
  restano in maiuscoletto.
- **Sfondo**: la foto di Michael (sorgente in [riferimenti/33-sfondo-palestra.webp](riferimenti/33-sfondo-palestra.webp),
  688×1536, nessun originale più grande) diventa `public/bg/palestra-688.webp` (22 KB) e `palestra-480.webp` (12 KB)
  con `node scripts/bg-photo.mjs <foto>` (senza argomento fa un segnaposto). È in `index.html`, fuori da React, con
  `srcset` e `<link rel="preload">`: arriva col primo disegno. In alto, sfuma nel fondo con un velo che tiene leggibile
  la testata. Il service worker la mette in cache (`webp` nei `globPatterns`). `topo.svg` tolto.
- **Testata comune** ([TopBar.tsx](../src/components/TopBar.tsx), al posto di marchio, `LevelStrip` e avatar): nome
  grande con un'icona persona (tocco → Account), "Livello N" in oro spento sotto, cerchio "Totale" a destra (tocco →
  Livello) con arco dorato pari al livello attuale (pieno da 100). Dati da `useLevel`, calcoli invariati: il 31 cambierà
  livello (Base…Leggenda) e percentuale, non il componente. Pastiglia "Offline" tra nome e cerchio. Mentre la sessione
  si apre resta il nome dell'app.
- **Barra in basso**: pillola flottante staccata dal bordo, voce attiva in un riquadro dorato; restano le 4 voci (+ Atleti
  per i trainer). `--tabbar` passa a 84 px, quindi timer, toast e fogli restano sopra la pillola.
- **Componenti** ([ui.tsx](../src/components/ui.tsx) + CSS): `Card` (con `star`), bottone primario a gradiente oro con
  bordo bronzo, secondario a contorno bronzo e testo oro, segmenti a pillola con la voce attiva nel riquadro dorato,
  `SearchField` (lente a sinistra, anche per la scelta con ricerca già esistente), `MoreMenu` "⋯" (menu ARIA: frecce,
  Home/Fine, Esc, tocco fuori, fuoco che torna al pulsante; non ancora usato, serve al 35), fogli dal basso più
  arrotondati con maniglia, toast scuro con bordo dorato, scheletri sui nuovi neutri.
- **Pagine fuori dai mockup** (accesso, Account, Atleti, schede modello, registratore, sessione, riepilogo): solo i token
  e i componenti, nessuna funzione tolta o spostata (lo fanno 34–37).
- **Desktop** (20): colonna laterale al posto della pillola, due colonne invariate; la foto diventa una fascia alta
  380 px, larga al massimo 688 px (niente ingrandimento) e sfumata ai lati.

Prove fatte: unitari 232, `tsc -b` e `vite build` OK. **JS iniziale 156,5 KB gzip** (101,9 + 34,2 + 20,3, misurato come
in AUDIT.md con `.env.local`): invariato, A4 resta 2. Nessun `--accent` né colore ciano nel codice; al massimo 4 ori
(`grep -o "--gold[a-z-]*:" src/styles.css`). Nell'app locale con l'account di Fabio, a 390×844 e 360×640: accesso,
Livello, Scheda, Grafici, Esercizi, Account, registratore; a 1280×800 Livello e Scheda in due colonne. Nessuno
scorrimento orizzontale a 360 px; uno script su Livello, Scheda, Grafici, Esercizi e Account non trova bersagli
sotto 44 px.

Note per chi viene dopo:

- Non provati nel browser: Atleti e schede modello (l'account di prova non è trainer), modalità sessione e riepilogo
  (serve un programma per oggi), cronometro delle tenute. Hanno solo i token, nessun cambio di struttura.
- Gli screenshot sono stati mandati a Fabio per Michael; i mockup non sono nel repository, quindi la sovrapposizione
  precisa a Home/Livello va fatta da chi li ha.
- `scripts/bg-photo.mjs` usa `sharp`, che arriva con `@vite-pwa/assets-generator`.
