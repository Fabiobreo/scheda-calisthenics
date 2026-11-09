# 20 — Audit: vista desktop (A06)

- **Fonte**: [audit del 9 novembre 2026](../audit/AUDIT.md), intervento 6 della lista "Cosa migliorerei".
- **Figura professionale**: UX/UI designer + frontend.
- **Dipende da**: 17–19. **Sblocca**: A08 (editor di schede veloce) parte dalla settimana a 7 colonne.
- **Stima**: L.
- **Punti attesi**: +5 (F1 +3, D6 +2).

## Decisioni dell'utente (9 novembre 2026)

1. **Tutta l'app a due colonne** su schermo largo (≥ 1024 px), non solo le pagine del trainer.
2. Nella pagina di un atleta, su desktop, **la settimana intera a 7 colonne** con gli esercizi di ogni giorno e il loro
   stato.

## Criteri di accettazione

| Misura | Soglia |
|---|---|
| D6: a 1280 px il contenuto usa più di una colonna o ≥ 60 % della larghezza | sì su tutte le schermate |
| F1: vista trainer su desktop a 2+ colonne (elenco atleti + dettaglio) | sì |
| Sonda a 375 px | invariata: axe 0, nessun bersaglio sotto 44 px, nessun testo sotto 12 px |

## Stato

**Fatto il 9 novembre 2026.** Audit: **71,9 → 76,9** (D 8 → 10, F 4 → 7). Sonda sulle 8 schermate a 1280 px e a
375 px: axe 0, nessun bersaglio sotto 44 px, nessuno scorrimento orizzontale; a 1280 px il contenuto occupa il 76 %
della larghezza.

Come è fatto:

- **Guscio** (`styles.css`, `@media (min-width: 1024px)`): la barra delle sezioni diventa una barra laterale da 232 px
  (voce attiva con la linea a sinistra), `--tabbar` vale 0 così timer, toast e spazi in fondo non lasciano il posto alla
  barra che non c'è più; colonna dei contenuti fino a 1180 px.
- **Due colonne**: `.cols` / `.col` (o `Cols` in `components/ui.tsx`). Sul telefono sono `display: contents`: le
  schede restano in fila nello stesso ordine di prima, nessun cambiamento. Su desktop:
  - Livello: oggi, profilo e pentagono a sinistra, categorie a destra;
  - Scheda: programma a sinistra, record a destra;
  - Grafici: andamento a sinistra, ripartizione per tipo ed elenco degli esercizi a destra;
  - Esercizi: l'elenco su due colonne dentro la scheda;
  - Account: schede a muratura su due colonne (`.masonry`);
  - Atleti: elenco e schede modello a sinistra, "Da guardare" a destra;
  - Atleta (`AtletaPage`): elenco degli atleti a sinistra (280 px, quello aperto evidenziato) e l'atleta a destra; si
    passa dall'uno all'altro senza tornare indietro;
  - Scheda modello: i giorni (dove si lavora) a sinistra, nome e assegnazione a destra.
  Quando Livello e Grafici sono dentro la pagina dell'atleta (`NestedView`) non fanno colonne proprie (`.flat`).
- **Settimana a 7 colonne** per il trainer: `WeekDays` accetta `detail(date)`; su desktop ogni giorno mostra i suoi
  esercizi con lo stato (✓ fatto, ↔ spostato, ✕ non fatto, · da fare; letto anche dagli screen reader) o "Riposo";
  toccando un giorno si apre il dettaglio sotto, come prima.
- `useWide()` (`matchMedia`) per le pagine che cambiano ordine o contenuto su desktop.

Sistemato strada facendo: nei grafici due date vicine sull'asse si sovrapponevano (ora si salta quella troppo vicina e
l'ultima resta sempre); la voce "Atleti" resta accesa anche nelle schede modello; Grafici senza dati aveva perso l'`h1`.
