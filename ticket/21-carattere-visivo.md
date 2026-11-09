# 21 — Carattere visivo, primo blocco

- **Fonte**: richiesta dell'utente del 9 novembre 2026 ("l'app è un po' piatta"), dopo l'audit dei ticket 17–20.
- **Figura professionale**: UI designer + frontend.
- **Dipende da**: 19 (card "Oggi"), 20 (vista desktop). **Sblocca**: V02 (animazioni e pittogrammi).
- **Stima**: M.
- **Riferimento**: [mockup](riferimenti/21-mockup-carattere.html), approvato dall'utente il 9 novembre 2026.

## Perché

Ogni schermata era una pila di schede uguali (stesso fondo, bordo e titolo maiuscolo grande), con 3–4 righe di
spiegazione sotto i titoli, dati scritti ("1 di 3", "2 es.", "Previsto: 5 × 5") e stati vuoti fatti di una frase.

## Cosa è cambiato

| Intervento | Dove | Come |
|---|---|---|
| Un protagonista per pagina | Home | "Oggi" ha la superficie illuminata (`.star`); le altre schede restano normali |
| Titoli delle schede piccoli | ovunque | `.card h2` diventa un'etichetta maiuscola piccola; il condensato grande resta per protagonisti, giorni, nome dell'atleta e accesso (`h2.big`) |
| Spiegazioni dietro "?" | Programma, Record personali, Atleti | `CardHead` in `components/ui.tsx`: "?" da 26 px in un bersaglio da 44, `aria-expanded` |
| Anello di avanzamento | Oggi | `Ring`: "1/2 fatti", verde con ✓ a giornata chiusa |
| Serie a blocchetti e striscia del tipo | Oggi, Scheda, programma dell'atleta | `SetBlocks` (previste, accese quelle registrate) e `.stripe t-<tipo>` |
| Settimana con i pallini | Scheda, programma dell'atleta (telefono) | `WeekDays` con `marks`: un pallino per esercizio, colore del tipo, pieno se fatto (anche spostato), sbiadito se saltato; legenda sotto. Logica in `dayMarks` (`lib/adherence.ts`) |
| Record con il progresso | Record personali | `lastRecordStep` (`lib/stats.ts`): "+2,5 kg", "+1 rip.", "+5 s" sul record precedente; quello di questa settimana in ambra |
| Tendenza e costanza | profilo in Home | "▲ n questa settimana" (livello di adesso contro i soli record prima di lunedì), settimane di fila con un allenamento (`weekStreak`, in ambra da 2), rispetto del programma nelle ultime 4 settimane |
| Avatar | profilo in Home | senza figura scelta compare "Scegli la figura del tuo avatar" (porta in Account) |
| Stati vuoti con disegno e azione | Grafici, Atleti | `EmptyState` con `EmptyChart` / `EmptyPeople`; il trainer che guarda un atleta vede il testo senza pulsanti |

## Stato

**Fatto il 9 novembre 2026.** Sonda a 375 × 812 su Livello, Scheda, Grafici (vuoto e pieno) e pagina dell'atleta: axe 0,
nessun bersaglio sotto 44 px, nessun testo sotto 12 px, nessuno scorrimento orizzontale. Test unitari 187 verdi (6 nuovi
per `weekStreak`, `lastRecordStep`, `dayMarks`). JS iniziale 150,7 KB gzip. Nessuna migration.

Il punteggio dell'audit non cambia: le sue metriche non misurano il carattere visivo (vedi V03 nell'indice).
