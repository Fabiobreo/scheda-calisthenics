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
