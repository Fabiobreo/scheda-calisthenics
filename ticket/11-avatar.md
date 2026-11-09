# 11 — Avatar che evolve con il livello

- **Punti PDF**: 5, 6
- **Figura professionale**: **illustratore / character designer** (le figure) e **motion designer** (aura e scosse
  elettriche); sviluppatore frontend per il componente. Art direction dal designer del 06.
- **Dipende da**: 05 (quanti stadi), 06 (stile). **Sblocca**: 10 (definitivo), 12.
- **Stima**: XL (tempi esterni; va commissionato presto)

## Contesto

Richiesta:

- l'avatar cambia **fisicamente** salendo di livello, **sempre nella stessa posa**;
- avvicinandosi a 100 compare un'**aura** appena percepibile che diventa piena a 100;
- da 101 a 200 resta l'aura e compaiono **scosse elettriche**, prima appena percepibili poi piene a 200;
- design "accattivante, suggestivo, senza cadere nel banale, con una linea seria".

**Deciso (05)**: cambio ogni **10 livelli** → **20 stadi** (10 fino a 100, 10 nella zona ELITE).

## Cosa fare

1. **Brief all'illustratore**: posa unica, inquadratura, stile (coerente con il 06), numero di stadi, progressione del
   fisico (da principiante a atleta d'élite, senza caricature), formato.
2. **Formato tecnico** consigliato: le figure come immagini separate (SVG o WebP ottimizzati, ≤ 40 KB l'una, caricate
   solo quella che serve), mentre **aura e scosse** sono effetti disegnati in codice (SVG/CSS) con un'intensità 0–1:
   così crescono in modo continuo livello per livello e non servono 200 immagini.
3. **Componente** `<Avatar level size />` usato in Home (grande) e nel riepilogo compatto (12, piccolo), con
   `prefers-reduced-motion` (aura statica, niente scosse animate) e testo alternativo ("Avatar livello 47").
4. Segnaposto di sviluppo finché le illustrazioni non sono pronte.
5. **Diritti**: contratto con cessione dei diritti d'uso commerciale (l'app avrà trainer paganti).

## Criteri di accettazione

- Tutti gli stadi consegnati, coerenti tra loro, stessa posa e inquadratura.
- Aura e scosse crescono in modo continuo e sono pienamente visibili rispettivamente a 100 e 200.
- La Home resta fluida su un telefono di fascia media; peso totale degli avatar scaricati ≤ 1 stadio alla volta.

## Domande aperte

1. ~~Ogni 20 o ogni 10 livelli?~~ **Deciso**: ogni 10 (20 stadi).
2. **Bloccante** — Un solo avatar o scelta **uomo/donna** (ed eventualmente corporatura/carnagione)? Ogni variante
   moltiplica le illustrazioni; ma un avatar solo maschile esclude una parte degli utenti.
3. Stile: illustrazione realistica, semi-realistica, silhouette stilizzata, 3D? (Silhouette stilizzata + effetti luce
   è la strada più seria e meno costosa.)
4. Budget e tempi per l'illustratore? In alternativa un pacchetto acquistato con licenza commerciale, adattato.
5. L'avatar si può personalizzare (nome, colore aura) o è uguale per tutti a parità di livello?

## Stato

**Fatto il 9 novembre 2026**, senza illustratore esterno: su decisione dell'utente la figura è disegnata in codice (SVG),
quindi niente brief, contratto né diritti da cedere. Migration `0013_avatar_body.sql` (una colonna facoltativa: le
versioni vecchie dell'app non la leggono e non si rompono). Codice in [avatarFigure.ts](../src/lib/avatarFigure.ts)
(disegno, 9 test) e [Avatar.tsx](../src/components/Avatar.tsx); scelta in Account. Tutti i 40 stadi in
[riferimenti/11-avatar-stadi.html](riferimenti/11-avatar-stadi.html).

Decisioni dell'utente (9 novembre 2026):

1. **Uomo e donna**, scelta nell'Account (2 × 20 stadi). Carnagione e corporatura no.
2. Stile **silhouette + luce**, coerente col design system (06).
3. **L'illustratore è Claude**: figura in codice, nessun brief né budget.
4. **Uguale per tutti** a parità di livello: nessuna personalizzazione in v1.

Come è fatto:

- **Figura**: mezzo busto frontale, sempre nella stessa posa e inquadratura (testa ferma, braccia lungo i fianchi, il
  cerchio taglia ai fianchi). Corpo scuro con il contorno in luce ciano (ambra in ELITE). Lo stadio è quello del 05
  (`floor(livello / 10)`, 0–19). Salendo crescono spalle, braccia, trapezi e dorsali, la vita resta stretta (forma a
  V); più veloce nei primi stadi, perché i progressi del principiante si vedano. La definizione compare un poco alla
  volta: clavicole sempre, poi pettorali, deltoidi, addominali, bicipiti, obliqui. Donna: spalle più strette, fianchi
  più larghi, capelli raccolti, linea morbida sotto il seno al posto dei pettorali, addominali più leggeri.
  Stadio 0 è una persona normale, 19 un atleta d'élite, senza caricature.
- **Aura**: il contorno esterno sfocato più un alone dietro la figura e attorno al cerchio. Cresce col quadrato del
  livello verso 100: appena percepibile a metà strada (un quarto a 50), piena a 100.
- **Scosse** da 101: 8 saette fisse attorno alla figura, ne compare una ogni 12–13 livelli fino a 200, più luminose
  salendo; tremolano. Con "riduci movimento" restano ferme.
- **Leggerezza**: niente immagini da scaricare (pochi KB di codice per tutti i 40 stadi). Nella versione piccola
  (riepilogo in alto, elenco atleti) niente linee dei muscoli, aura sfocata e filtri.
- **Scelta**: Account → "Avatar", Uomo / Donna, con anteprima al proprio livello; si salva subito. Finché non si
  sceglie resta il cerchio con l'iniziale. Il trainer vede la figura scelta dall'atleta (nell'elenco Atleti e nella
  sua Home in sola lettura).
- Decorativo per il lettore di schermo: il livello è sempre scritto accanto.

Prove fatte: unitari 181 (9 nuovi), pgTAP 171 (5 nuovi: valori ammessi, solo sul proprio profilo), `tsc -b` e
`vite build` OK. Foglio dei 40 stadi generato dal componente vero e rivisto (corretta l'aura, che all'inizio
illuminava lo spazio tra braccia e tronco). Nell'app locale: scelta "Uomo" in Account con anteprima, figura nella Home;
poi la scelta è stata tolta dal database locale (rimesso com'era).

Note per chi viene dopo:

- Non provato su telefono vero, né la vista del trainer con un atleta che ha scelto la figura (nel seed
  `trainer@scheda.test` non è trainer).
- Ogni atleta nell'elenco del trainer legge il proprio profilo (una richiesta piccola in più per atleta).
- Se in futuro si vuole un'illustrazione vera, basta sostituire il disegno in `Figure` (Avatar.tsx): stadio, aura e
  scosse restano.
