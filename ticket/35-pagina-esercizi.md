# 35 — Pagina Esercizi: righe pulite, menu "⋯", catalogo senza tastiera, 5 voci tolte

- **Fonte**: `GraficaPDF` pagina 1, mockup "Esercizi".
- **Figura professionale**: frontend; backend per la migration del catalogo.
- **Dipende da**: 33. **Sblocca**: —
- **Stima**: M.

## Contesto

[EserciziView.tsx](../src/features/esercizi/EserciziView.tsx): ogni riga ha il pittogramma di categoria (`ExIcon`), le
8 barre delle ultime settimane (`Activity` / `ActivityBars`, "N in 8 sett."), i bottoni Modifica e Archivia; Elimina e
Ripristina solo nell'elenco "Archiviati". "+ Aggiungi" apre un modulo in cima con "Dal catalogo / Personalizzato" e un
`SearchSelect` **già compilato** con la prima voce libera del catalogo. Il catalogo è la tabella `catalog_exercises`
(solo migration, [0010](../supabase/migrations/0010_catalog_v2.sql)); `exercises.catalog_id` e
`program_items.catalog_id` la puntano con `on delete restrict`.

## Cosa fare

1. **Riga esercizio**: solo nome e, sotto, l'etichetta quando serve ("A tempo", "Personalizzato"). Via pittogramma e
   barre delle 8 settimane (e il testo di aiuto che le spiega).
2. **Menu "⋯"** (componente nuovo, condiviso col 33): Modifica, Archivia, Elimina. Elimina chiede conferma e dice quante
   registrazioni cancella; Archivia resta bloccata se il trainer ha l'esercizio in programma, con la spiegazione.
   Accessibile da tastiera (`aria-haspopup="menu"`, Esc chiude, frecce).
3. Nota in fondo come nel mockup (differenza tra Elimina e Archivia); "Archiviati (n)" resta sotto, con Ripristina.
4. **Catalogo**: "+ Aggiungi" apre un foglio con campo di ricerca **vuoto e senza fuoco** e sotto l'elenco del catalogo
   per gruppi, subito scorrevole; la tastiera si apre solo toccando la ricerca. "Personalizzato" come seconda scheda del
   foglio (lì il fuoco sul nome ha senso). Stessa regola per gli altri punti dove si sceglie dal catalogo:
   [QuickAdd.tsx](../src/components/QuickAdd.tsx) (oggi `autoFocus`) e `ExercisePicker`.
5. **Migration `0016_catalog_trim.sql`**: tolte `wide-planche`, `planche-push-up`, `planche-press`,
   `front-lever-pull-up`, `front-lever-touch`, con lo schema del 0010: gli esercizi degli utenti che le usano diventano
   **personalizzati con lo stesso nome** (storico, programma e grafici restano), le righe di `program_items` passano a
   `custom_name`, poi si cancellano le voci. Aggiornare `catalog.test.sql` (oggi si aspetta 25 skill e "Wide planche").
   Non tocca i livelli: lì planche push ups, press, front lever touch e pull ups sono catene di record (30), non voci di
   catalogo.
6. La pagina scorre normalmente.

## Criteri di accettazione

- Aprendo il catalogo su telefono la tastiera non compare e il campo è vuoto.
- Chi aveva "Planche press" in scheda la ritrova come esercizio personalizzato con tutto lo storico.
- Nessun pittogramma né barre nella lista; tutte le azioni dentro "⋯".

## Decisioni (Michael, 24 novembre 2026)

1. Le 5 voci **si tolgono e basta**, senza varianti al loro posto.

## Domande aperte

1. `ExIcon` resta altrove (stati vuoti)? Proposta: si toglie ovunque, insieme agli "omini" della Scheda (37). (Fabio)

## Stato

**Fatto il 25 novembre 2026** sul ramo `claude/ticket-35-pagina-esercizi-1f5814` (app + migration `0016`). Niente push,
niente merge. La migration **non è stata applicata a nessun database** e **non è stata provata su Supabase** (né remoto
né locale: qui manca Docker), solo su un Postgres in memoria. Manca l'approvazione di Michael sulla pagina.

**Cosa c'è**

- **Pagina** ([EserciziView.tsx](../src/features/esercizi/EserciziView.tsx)): ogni riga ha il nome e, sotto, in oro
  spento, "Personalizzato" e/o "A tempo" quando serve. Via pittogramma, barre delle 8 settimane, "N in 8 sett." e la
  frase dell'aiuto che le spiegava. A destra solo il menu "⋯" (`MoreMenu` del 33, usato così com'è).
- **Menu "⋯"**: Modifica, Archivia, Elimina (in rosso). Negli archiviati: Ripristina, Elimina.
  - *Elimina* apre una conferma (`alertdialog`) che dice quante registrazioni si cancellano, se l'esercizio esce anche
    dalla scheda e che non si può annullare; il bottone ripete il numero ("Elimina con 3 registrazioni"). Il fuoco
    parte dal titolo, non dal bottone che cancella.
  - *Archivia* archivia subito (si ripristina da "Archiviati") e lo dice con un messaggio. Se il trainer ha
    l'esercizio in programma da oggi in poi, sia Archivia sia Elimina si fermano con la spiegazione ("… è nel programma
    del tuo trainer: chiedigli di toglierlo prima di …").
  - *Modifica* apre un foglio: nome e misura per i personalizzati (misura bloccata se ci sono registrazioni), per
    tutti "Mostra nei record personali". Gli errori sul nome stanno sotto il campo, non più in un toast.
- **Nota in fondo**: una riga sulla differenza tra Elimina e Archivia. Sotto, "Archiviati (n)" (`aria-expanded`).
- **Foglio "Aggiungi esercizio"** ([ExerciseSheet.tsx](../src/features/esercizi/ExerciseSheet.tsx)): due schede,
  "Catalogo" e "Personalizzato". In Catalogo il campo di ricerca è vuoto e non prende il fuoco (il fuoco va sul
  titolo del foglio, quindi sul telefono la tastiera non si apre); sotto c'è l'elenco per gruppi, con testata e
  ricerca ferme e solo l'elenco che scorre. Un tocco su una voce la aggiunge subito; il foglio resta aperto e la riga
  resta lì segnata "Aggiunto". La ricerca guarda nome, sinonimi e nome del gruppo (`searchCatalog` in
  [catalog.ts](../src/lib/catalog.ts), con test). Se non trova niente propone "Crealo come personalizzato", che porta
  il testo cercato nella seconda scheda. In Personalizzato il fuoco va sul nome; un nome che è nel catalogo viene
  aggiunto dal catalogo, come prima.
- **Altri punti dove si sceglie dal catalogo**: in [QuickAdd.tsx](../src/components/QuickAdd.tsx) ("+ Più esercizi"
  del trainer) tolto l'`autoFocus` dalla ricerca; in [ExercisePicker.tsx](../src/components/ExercisePicker.tsx) il
  campo parte vuoto invece che con la prima voce del catalogo (`ref()` è null finché non si sceglie; `missing` dà il
  messaggio giusto, "Scegli un esercizio" o "Scrivi il nome dell'esercizio", usato in `AtletiView` e `SchedeView`).
- **Migration** [0016_catalog_trim.sql](../supabase/migrations/0016_catalog_trim.sql), sullo schema della 0010: le righe
  di `program_items` con le cinque voci passano a `custom_name` (il nome della voce) con `catalog_id` nullo; gli
  esercizi degli utenti perdono solo `catalog_id` (nome, misura, record, archivio, ordine restano); poi le cinque voci
  si cancellano. Registrazioni e programma non vengono toccati perché puntano all'esercizio, non al catalogo.
  `level_stages` non è toccata. [catalog.test.sql](../supabase/tests/database/catalog.test.sql) aggiornato: 20 skill,
  niente "Wide planche", più 5 test nuovi (le cinque voci non ci sono, i loro nomi non portano a nessuna voce, una
  voce tolta non si sceglie più, il suo nome va bene per un personalizzato). `supabase/seed.sql` non cita le cinque
  voci come catalogo (solo le catene dei livelli con lo stesso nome): non cambia.
- **CSS**: un blocco solo, "Ticket 35", al posto della vecchia regola `.ex-list`; tolte `.ex-name` e `.ex-activity`.

**Verifica**

- `npm test` 317 verdi (14 file), `npx tsc -b` e `npm run build` puliti (blocco principale del JS 116,1 KB gzip,
  come prima).
- **Migration su Postgres in memoria**: `node scripts/prova-migration-0016.mjs` (PGlite, come per la 0015). Applica le
  migration fino alla 0015, inserisce due atleti e un trainer che usano le cinque voci, applica la 0016 e confronta
  riga per riga: catalogo 59 → 54 voci (le altre identiche); 6 esercizi diventati personalizzati con lo stesso nome e
  la stessa misura (compreso uno archiviato e uno col suffisso " (catalogo)"), gli altri invariati; 7 registrazioni e
  4 righe di programma identiche; 5 righe di scheda modello passate a nome personalizzato con schema e nota uguali
  (le due a tempo restano a tempo); dopo, la scheda del trainer ritrova l'esercizio dell'atleta per nome invece di
  crearne un doppione; le catene dei livelli restano. Poi esegue `catalog.test.sql`: 25 test su 25, con pgTAP
  **imitato**. Non sostituisce `supabase test db`.
- **Browser, con dati finti.** Il server locale è partito sulla porta 5174 (la 5173 era occupata da un'altra
  sessione) e lì non c'era nessun accesso aperto: non ho usato l'account di Fabio. Ho sostituito nella pagina tutte le
  chiamate a Supabase (accesso e tabelle) con dati in memoria: 10 esercizi inventati, 18 registrazioni, un trainer
  collegato con un esercizio in programma, e il catalogo come sarà dopo la 0016. Nessuna richiesta è uscita verso
  Supabase. Visto così:
  - 390×844 e 360×640: nessuno scorrimento orizzontale, la pagina scorre normalmente, uno script non trova bersagli
    sotto 44 px nella pagina, nel menu e nei fogli; il menu dell'ultima riga resta sopra la barra in basso;
  - nessun pittogramma né barre nella lista;
  - menu da tastiera: `aria-haspopup="menu"`, freccia giù apre e porta il fuoco su Modifica, frecce e Fine si
    muovono (con ritorno in cima), Esc chiude e riporta il fuoco sul pulsante;
  - Archivia ed Elimina su un esercizio del trainer: messaggio e nessuna scrittura; Elimina su "Dip": conferma con
    "3 registrazioni" ed "Esce anche dalla scheda", Esc annulla, conferma cancella; Archivia e Ripristina;
  - foglio del catalogo: ricerca vuota, fuoco sul titolo, 5 gruppi, elenco che scorre; "pull" trova per sinonimo;
    un tocco aggiunge, un secondo tocco sulla stessa riga non aggiunge due volte; ricerca senza risultati →
    Personalizzato col nome già scritto e fuoco sul nome; nome già posseduto → errore sotto il campo;
  - Modifica di un esercizio del catalogo e di un personalizzato con registrazioni (misura bloccata);
  - 1280×800: lista su due colonne, foglio al centro.
- **Non visto nel browser**: i dati veri di un account; la scelta dell'esercizio e "+ Più esercizi" nelle pagine del
  trainer (Atleti, schede modello) dopo le modifiche a `ExercisePicker` e `QuickAdd` (coperte solo da `tsc`); un
  telefono vero (che la tastiera non si apra l'ho dedotto dal fuoco, che non è su un campo); VoiceOver / TalkBack.

**Scelte dove il ticket non dice** (da far vedere a Michael e Fabio)

1. **"Nei record" non è più nella riga**: il ticket parla solo di "A tempo" e "Personalizzato". Si vede e si cambia
   in Modifica.
2. **Un tocco sulla voce del catalogo aggiunge subito**, senza "Mostra nei record personali" (parte spento, si accende
   da Modifica) e senza un secondo bottone di conferma; il foglio resta aperto per aggiungerne altre.
3. **Archivia non chiede conferma** (prima era un doppio tocco): è già dentro un menu e si annulla con Ripristina.
4. **Elimina è disponibile anche sugli esercizi attivi** (prima solo sugli archiviati), come nel mockup; la conferma
   suggerisce Archivia a chi ha uno storico. Elimina è bloccata come Archivia se il trainer ha l'esercizio in
   programma: cancellandolo sparirebbero anche le righe del trainer.
5. **Negli archiviati le azioni stanno nel "⋯"** (Ripristina, Elimina), non in un bottone "Ripristina" a vista: così
   tutte le azioni della pagina sono nel menu.
6. **Modifica apre un foglio**, non più il modulo in cima alla pagina.
7. **`ExercisePicker` parte vuoto**: al trainer serve un tocco in più per scegliere la prima voce, ma non trova più
   un esercizio che non ha scelto. È la lettura di "stessa regola" del punto 4.
8. **Stato vuoto**: ha ancora la fila dei cinque pittogrammi (`CategoryRow`). La domanda aperta 1 è di Fabio: non ho
   tolto `ExIcon` da nessun'altra parte.
9. **Esercizi col suffisso " (catalogo)"**: chi aveva già un personalizzato con lo stesso nome di una delle cinque
   voci si ritrova due personalizzati, "Planche press" e "Planche press (catalogo)", ognuno col suo storico (come nella
   0010). Unirli vorrebbe dire fondere due storici: non l'ho fatto.

**Non fatto, di proposito, e cose da sapere**

- `ActivityBars` in `ui.tsx`, le sue regole `.bars` e `weeklyCounts` in `stats.ts` non sono più usati da nessuno: li
  ho lasciati (componenti condivisi e file di altri ticket), si tolgono in un giro di pulizia.
- Un telefono con l'app vecchia aperta e il catalogo in memoria può ancora proporre una delle cinque voci: dopo la
  0016 il salvataggio fallisce con "Non riesco a salvare" finché l'app non si aggiorna. Lo stesso per un'aggiunta
  rimasta nella coda offline.
- La 0016 va rilasciata dopo la 0015 (ordine dei file); non dipende dal suo contenuto.
