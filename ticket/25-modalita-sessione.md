# 25 — Modalità sessione

- **Fonte**: A07 nell'indice, misura C3 di [`audit/AUDIT.md`](../audit/AUDIT.md) ("dopo il salvataggio si passa al prossimo
  esercizio del giorno, il recupero parte da solo, a fine sessione c'è un riepilogo"). Avviato dall'utente il 10 novembre 2026.
- **Figura professionale**: product designer + frontend.
- **Dipende da**: 19 (card "Oggi"), 21–24 (stile visivo).
- **Stima**: L.

## Perché

In palestra ogni esercizio si apriva e si chiudeva dalla lista di Oggi. Il recupero tra un esercizio e l'altro partiva
solo a mano, e a fine allenamento non c'era niente da vedere. C3 valeva 0.

## Decisioni (chieste all'utente il 10 novembre 2026)

| Domanda | Scelta |
|---|---|
| Da dove si avvia | Un pulsante **"Inizia allenamento"** in Oggi. I "Registra" di ogni riga restano e aprono il singolo esercizio fuori dalla sessione |
| Se si salta un esercizio | **"Salta"** lo manda in fondo alla coda. Alla fine si ripropone; se si salta di nuovo, nel riepilogo risulta saltato |
| Recupero tra gli esercizi | **Fisso, 2 minuti** (`REST_BETWEEN_EXERCISES`), regolabile con −15/+15 come ogni recupero |
| Mockup | No: si usano i componenti esistenti |

## Cosa è cambiato

| Intervento | Dove | Come |
|---|---|---|
| Logica della coda | `lib/workout.ts` (6 test) | `startSession` mette in coda le righe del giorno non ancora registrate. `completeCurrent` conta serie e record, `skipCurrent` gestisce "in fondo, poi fuori". `reconcile` riallinea la coda col programma e con quanto registrato fuori dalla sessione |
| Avvio e ripresa | Oggi (`TodayCard`) | sotto la lista c'è "▶ Inizia allenamento" finché resta qualcosa da fare. A sessione aperta diventa "Continua 2/3" più "Termina". A giornata chiusa non c'è nessun pulsante |
| Registratore guidato | `Logger.tsx` | il titolo diventa "Allenamento", con un segmento per esercizio: verdi i fatti, ambra quello aperto (pulsa, ma non con "riduci movimento"). Accanto c'è "2/3". L'esercizio è fisso (niente menu), sotto si legge "Poi: Dip" o "Ultimo esercizio". "Salva e avanti" (sull'ultimo "Salva e finisci") e "Salta" prendono il posto di "Salva allenamento" e "Annulla". La × mette in pausa: la sessione resta |
| Recupero automatico | `Logger.tsx` + `useRestTimer` | tra le serie c'era già: parte spuntando ✓. Ora dopo "Salva e avanti" parte anche quello tra gli esercizi, 2 minuti, con l'etichetta "Recupero · poi Dip". A fine sessione il timer si ferma |
| Riepilogo | `WorkoutSummary.tsx` | "Allenamento finito" (o "Allenamento chiuso" se si è premuto Termina) mostra l'anello del giorno e i numeri che salgono: esercizi, serie, record (in ambra se ce ne sono), minuti. Sotto, i record battuti uno per uno su fondo ambra, con le scintille. Poi "Saltati: …" e "Da fare: …". Infine "Fatto" |
| Sopravvive al ricaricamento | `localStorage` `scheda:workout` | come la bozza del registratore. Una sessione di un altro giorno non si riprende |
| Timer che copriva "Salva" | `styles.css`, blocco "Ticket 25" | sul telefono il timer di recupero, con un'etichetta lunga, va su due righe (124 px) e copriva i pulsanti in fondo al foglio. Con il timer aperto il foglio lascia 160 px in più sotto. In sessione succede a ogni esercizio |

## Stato

**Fatto il 10 novembre 2026**, sul ramo `claude/a07-modalita-sessione-c2f8f9`. Non unito a main.

**C3**: da **0 a 3** (tutte e tre le condizioni). **C** da 20,0 a 23,0, **totale** da 76,9 a **79,9**.

**Prova a mano** a 375 × 812 con l'atleta del seed e tre righe di oggi aggiunte per la prova (Trazioni, Dip, L-sit), poi
tolte insieme alle registrazioni. Sequenza provata:
1. Avvio dalla Home.
2. ✓ sulla prima serie: parte il recupero di 60 s dello schema.
3. "Salva e avanti": si apre Dip, 2/3, e parte il recupero di 2:00 "poi Dip".
4. "Salta" su Dip: si apre L-sit, sempre 2/3.
5. Salvo L-sit: Dip si ripropone, 3/3, con "Salva e finisci".
6. "Salta" di nuovo: riepilogo con 2/3, 5 serie, 2 record, "Saltati: Dip".

Provati anche la pausa con ×, la ripresa dopo il ricaricamento della pagina ("Continua 3/3") e "Termina" ("Allenamento
chiuso", "Da fare: Dip"). Il foglio è stato aperto anche a 1280 px.

**Sonda** a 375 × 812:

| Schermata | axe | sotto 44 px | testo sotto 12 px | scorrimento orizzontale |
|---|---:|---:|---:|---|
| Home con "Inizia allenamento" / "Continua" | 0 | 0 | 0 | no |
| Registratore in sessione | 0 | 0 | 0 | no |
| Riepilogo | 0 | 0 | 0 | no |

Un primo giro sul riepilogo ha dato un `region` (moderato) sul timer di recupero rimasto aperto. È un difetto che c'era
già: il timer sta fuori dai punti di riferimento della pagina. Ora a fine sessione il timer si ferma, e la misura è pulita.

**Sezione H**: invariata a 10. Il pulsante aggiunge 2 parole alla prima schermata della Home solo quando oggi c'è un
programma. Con il seed dell'audit (niente programma oggi) la Home non cambia. Il riepilogo usa anello, numeri che salgono e
scintille: niente stato vuoto nuovo.

**Test**: 195 unitari verdi (6 nuovi). `tsc -b` e `npm run build` puliti.

**Peso**:
- JS iniziale 158,9 KB gzip (+0,6). A4 resta 2, ma ormai è a 1,1 KB dal limite di 160. Il prossimo ticket che aggiunge
  codice alla Home dovrebbe caricare a parte (`lazy()`) almeno il riepilogo.
- CSS 11,8 KB.

**Migration**: nessuna. Gli `style={{` in linea restano 8.

**Non verificato**:
- su un telefono vero: suono e vibrazione a fine recupero;
- la riapertura del foglio dopo un ricaricamento a metà esercizio (bozza + sessione insieme). La logica è la stessa della
  bozza di prima;
- il riallineamento quando il trainer cambia il programma durante la sessione: è coperto dai test di `reconcile`, non provato
  a schermo.
