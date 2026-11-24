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

## Domande aperte

1. Account: va bene raggiungerlo toccando il nome in testata? (Fabio)
