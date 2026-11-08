# Backlog — "Correzioni app calisthenics" (8 novembre 2026)

Fonte: il documento `Correzioni app calisthenics _261108_130435.pdf` (10 punti). Ogni punto è stato confrontato con il codice
attuale (commit `a17d525`, migration fino a `0008`, già in produzione) e diviso in ticket.

## Come leggere i ticket

Ogni file ha la stessa struttura:

- **Figura professionale**: chi dovrebbe fare il lavoro (o guidarlo) per farlo al meglio.
- **Dipende da / Sblocca**: l'ordine non è casuale, rispettalo o leggi il motivo.
- **Contesto**: cosa chiede il documento e cosa c'è oggi nel codice.
- **Cosa fare**: requisiti.
- **Criteri di accettazione**: quando il ticket si può dire chiuso.
- **Domande aperte**: vanno risposte *prima* di iniziare (quelle segnate **bloccante**) o durante.
- **Stima**: S (≤ 1 giorno), M (2–3 giorni), L (≈ 1 settimana), XL (più settimane o lavoro esterno).

## Scaletta e ordine

| # | Ticket | Punto PDF | Figura principale | Stima |
|---|--------|-----------|-------------------|-------|
| 01 | [Tipo (Forza/Volume/Tecnico) dalla scheda, non dall'esercizio](01-tipo-esercizio-nella-scheda.md) | 2 | Full-stack (React + Postgres) | M |
| 02 | [Nuovo catalogo esercizi](02-nuovo-catalogo-esercizi.md) | 1 | Coach di calisthenics + backend | M |
| 03 | [Esercizi a tempo (secondi) oltre a ripetizioni e peso](03-esercizi-a-tempo.md) | 1, 5 (implicito) | Full-stack | L |
| 04 | [Eliminare il Registro senza perdere funzioni](04-eliminare-registro.md) | 4 | UX designer + frontend | M |
| 05 | [Specifica del sistema di livelli](05-specifica-livelli.md) — domande chiuse l'8/11, restano definizioni da rivedere | 5, 6 | Product owner + coach di calisthenics | S (ma bloccante) |
| 06 | [Identità visiva e design system](06-design-system.md) | 9, 10 | UI / brand designer | L |
| 07 | [Navigazione in basso (tab bar)](07-navigazione-in-basso.md) | 8 | UX mobile + frontend | S |
| 08 | [Motore di calcolo dei punteggi](08-motore-punteggi.md) | 5, 6 | Sviluppatore TypeScript (logica + test) | M |
| 09 | [Dati: peso corporeo e record di livello](09-dati-peso-e-record.md) | 5 | Backend (Postgres/Supabase, RLS) | M |
| 10 | [Home "Livello": profilo, pentagono, barre, record](10-home-livello.md) | 5 | Frontend + UI designer | L |
| 11 | [Avatar che evolve con il livello](11-avatar.md) | 5, 6 | Illustratore / character designer + motion designer | XL |
| 12 | [Riepilogo compatto (avatar + livello) nelle altre sezioni](12-riepilogo-compatto.md) | 7 | Frontend + UI designer | S |
| 13 | [Grafici: periodo selezionabile](13-grafici-periodo.md) | 3 | Frontend + data-viz | M |
| 14 | [Grafici: restyling coerente col pentagono](14-grafici-restyling.md) | 10 | Data-viz designer + frontend | M |
| 15 | [Il trainer vede il livello dell'atleta](15-trainer-vede-livello.md) | — (coerenza) | Product owner + full-stack | S |
| 16 | [Ripresa del piano precedente: rispetto del piano e notifiche](16-rispetto-piano-notifiche.md) | — (backlog) | Product owner | — |

### Perché quest'ordine

1. **01–04 sistemano le fondamenta** (modello dati e struttura) prima di costruirci sopra. 01 è un difetto vero
   (non si può avere "Trazioni" in forza e in volume); 02 e 03 cambiano catalogo e tipo di misura, che servono a livelli
   e grafici; 04 toglie una sezione: farlo prima evita di ridisegnarla.
2. **05 è un ticket di decisione, non di codice**: le formule del documento hanno alcune ambiguità (vedi lì) e finché non
   sono chiuse il motore (08) rischia di essere rifatto. Si può fare in parallelo a 01–04.
3. **06 (design) parte presto e in parallelo**: è lavoro di un designer, serve a 07, 10, 11, 12, 14. Costruire la Home
   con lo stile vecchio vorrebbe dire rifarla.
4. **07** è piccolo ma cambia lo scheletro dell'app: va fatto prima della Home, che diventa la prima scheda.
5. **08 → 09 → 10**: prima la logica pura e testata, poi i dati, poi lo schermo.
6. **11 (avatar)** ha tempi lunghi perché esterni (illustrazioni): va commissionato subito dopo 05/06, e la Home (10)
   parte con un segnaposto.
7. **12–14** sono rifiniture che dipendono da Home e design.
8. **15–16** completano la parte trainer, che resta il target di prodotto.

### Lavoro in parallelo possibile

- Designer: 06 → 11 (art direction) → 14
- Coach/PO: 05 e 02 (lista esercizi)
- Sviluppo: 01 → 03 → 04 → 07 → 08 → 09 → 10 → 12 → 13

## Domande trasversali (valgono per più ticket)

1. **Tema chiaro**: oggi l'app ha tema scuro e chiaro automatici. L'esempio del pentagono è scuro. Teniamo entrambi o
   l'app diventa solo scura? (06, 10, 14) — consiglio: solo scuro nella prima versione, è coerente con l'identità
   "seria e accattivante" e dimezza il lavoro di design.
2. **Lingua dei nomi**: nel catalogo convivono italiano e inglese ("Trazioni prone", "Push up", "Tuck planche").
   Va bene così (è come si parla in palestra) o vogliamo una regola? (02, 05)
3. **Trainer**: tutto ciò che è nuovo (livello, record, peso) il trainer lo vede in sola lettura come il resto? (15)
4. **Il piano "rispetto del piano e notifiche"** deciso il 3 novembre passa dopo questi lavori? (16)
