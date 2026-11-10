# 27 — Offline vero: cache persistita e coda dei salvataggi

- **Fonte**: A09 nell'indice, misura A6 di [`audit/AUDIT.md`](../audit/AUDIT.md). Avviato dall'utente il 10 novembre 2026.
- **Figura professionale**: frontend (PWA, dati).
- **Dipende da**: 18 (service worker e caricamento differito), 25 (modalità sessione: i suoi salvataggi passano dalla
  stessa coda).
- **Stima**: L.

L'obiettivo: in palestra senza campo l'app si apre con gli ultimi dati, registra gli allenamenti e li invia da sola
quando torna la rete, dicendo cosa è ancora in attesa.

## Decisioni (chieste prima di scrivere codice)

| Domanda | Scelta |
|---|---|
| Che cosa va in coda | allenamenti e tentativi (crea, modifica, elimina), peso del giorno (salva, elimina), record del livello (crea, modifica, elimina). Il resto senza rete dà il solito "Non riesco a salvare" |
| Conflitti | vince l'ultimo salvataggio. Un salvataggio che il server rifiuta (es. esercizio eliminato nel frattempo) esce dalla coda e un messaggio lo dice. Niente doppioni: le righe nuove hanno un id scelto dal telefono |
| Dove si vede lo stato | pastiglia in testata più i messaggi in basso. Toccandola si apre l'elenco dei salvataggi in attesa, con "Invia ora" |

## Cosa è cambiato

| Intervento | Dove | Come |
|---|---|---|
| **Cache persistita** | `data/sync.ts` (`persistCache`), avviata da `main.tsx` | la cache di TanStack Query si salva nel `localStorage` (`scheda:cache`) al massimo una volta al secondo e quando l'app va in secondo piano. All'avvio si rimette in cache. Si salva ogni query che ha dati, anche se l'ultima rilettura è fallita (offline è il caso normale), e la si salva come riuscita. La copia si scarta dopo un aggiornamento dell'app (versione + commit) e dopo 7 giorni. `gcTime` è di 24 ore, così i dati di una pagina non aperta da un po' restano nella copia |
| **Coda dei salvataggi** | `data/offline.ts` (coda e stato della rete), `useQueuedMutation` in `data/hooks.ts` | se la richiesta non arriva (rete assente, gateway giù, token scaduto) il salvataggio va in coda (`scheda:queue`, divisa per account) e la vista lo mostra subito come fatto. Se si è già offline, o se in coda c'è già qualcosa, si accoda senza provare, così l'ordine resta quello dei salvataggi. `networkMode: 'always'`: senza, TanStack Query metterebbe la mutazione in pausa e il salvataggio non arriverebbe alla coda |
| **Niente doppioni** | `createEntry` e `createLevelRecord` del repository | accettano un `id`. Le righe nuove ce l'hanno sempre, scelto dal telefono. Se un invio si ripete dopo una risposta persa, il server risponde 23505 e la coda lo conta come inviato |
| **Modifiche ottimistiche** | `applyOptimistic`, `reapplyPending` | l'allenamento in coda compare nella giornata, il peso nel profilo, il record nel livello. Il tipo, se manca, viene dal programma del giorno, come fa il database. Se il server rilegge i dati prima dell'invio, i salvataggi in attesa si riapplicano e non spariscono |
| **Invio** | `flushQueue`, `SyncAgent` in `app/offline.tsx` | uno alla volta, nell'ordine dei salvataggi. Parte alla prima richiesta riuscita, all'evento `online`, tornando sull'app e ogni 20 s finché c'è qualcosa in attesa. Parte solo con un token valido: dopo ore offline il token è scaduto, e con la sola chiave pubblica il server rifiuterebbe tutto (401). Se la rete cade a metà, il resto resta in coda. Dopo l'invio le query toccate si rileggono dal server |
| **Stato della rete** | `netFetch` in `lib/supabase.ts` | ogni richiesta (dati e accesso) aggiorna `netDown`: una richiesta che non arriva, o un 502/503/504, accende "Offline"; la prima riuscita lo spegne. `navigator.onLine` da solo non basta: con una tacca di campo dice `true` |
| **Pastiglia in testata** | `OfflinePill`, accanto all'avatar | pallino rosso "Offline", oppure "2 in attesa" (pallino rosso se offline, ciano che pulsa mentre invia). È alta 44 px e corta per stare accanto al riepilogo del livello a 375 px; il testo completo ("Offline, 2 in attesa di invio") è nell'etichetta accessibile. Il pannello elenca i salvataggi ("Allenamento · Trazioni · 10 nov", "Peso · 74,5 kg · 10 nov") con l'ora, e "Invia ora" |
| **Messaggi** | `useToast` | "Salvato sul telefono: lo invio appena torna la rete"; poi "2 salvataggi inviati al server". Un rifiuto: "1 salvataggio non inviato: Peso · 74,5 kg · 10 nov. Il server l'ha rifiutato.", con Ok |
| **Accesso senza rete** | `session.tsx` | con il token scaduto (dura un'ora) auth-js non riesce a rinnovarlo e risponde "nessuna sessione" solo dopo 30 s di tentativi. La sessione però resta nel `localStorage`. Dopo 1 s, o alla risposta vuota, l'app parte con quella sessione salvata. Al ritorno della rete il rinnovo automatico la sostituisce |
| **Niente allarmi falsi** | `useData`, `useLevel`, `App.tsx` | "Non riesco a leggere i dati" compare solo se i dati mancano davvero, non quando ci sono quelli in cache. Con la pastiglia "Offline" accesa l'avviso in alto non compare |
| **Uscita** | `session.tsx` | uscendo dall'account la copia sul telefono si cancella. La coda resta, divisa per account: parte al prossimo accesso dello stesso utente |
| Stili | `src/styles.css`, blocco "Ticket 27" in fondo | pastiglia, pallino, elenco del pannello. Il pallino che pulsa si ferma con "riduci movimento" (regola globale) |

**Peso sul JS iniziale.** Nel JS iniziale restano solo la coda e lo stato della rete (`data/offline.ts`, circa 0,8 KB),
il ramo "accoda" negli hook e il controllo della sessione. Si scaricano dopo, e il service worker li tiene in cache anche
senza rete:
- `sync.ts` (2,6 KB): invio, modifiche ottimistiche, copia della cache, etichette dell'elenco. Lo carica `main.tsx` dopo
  il primo disegno, e gli hook lo caricano al primo errore;
- `offline.tsx` (1,8 KB): pastiglia e invio automatico. Si carica la prima volta che si va offline o che c'è qualcosa in
  coda.

## Stato

**Fatto il 10 novembre 2026**, sul ramo `claude/a09-offline-84f582`, ribasato su main dopo l'unione di 25, 26 e 28.
Non unito a main, niente push.

**Audit A6**: da **0 a 3**. L'app si apre senza rete con i dati in cache, e un allenamento salvato offline arriva al
server quando la rete torna. Sezione A da 9,9 a 12,9, totale da 84,9 a **87,9**.

**Audit A4**: JS iniziale **161,7 KB** gzip, misurato come dice il passo 5 del metodo (somma di `index` e `toast`, i
`.js` che `dist/index.html` carica subito). Main dopo l'unione era a 160,3: questo ticket aggiunge 1,4 KB. Sul ramo
prima del ribasamento (base: ticket 24) era 159,8 KB contro 158,3. A4 resta 1, come su main.

**Verifica nel browser**, sulla build di produzione col service worker, a 375 × 812, atleta del seed. Il gateway
Supabase non è stato fermato perché lo usavano anche le altre sessioni. Al suo posto, l'app costruita con
`VITE_SUPABASE_URL` puntato a un piccolo proxy locale verso Supabase, con un interruttore che fa cadere ogni connessione.
In più, nelle prove a freddo, il server dell'anteprima era spento: la pagina arrivava solo dal service worker.

| Prova | Esito |
|---|---|
| ricarico senza rete | Home con i dati di prima, nessun avviso d'errore; "Offline" alla prima richiesta fallita |
| registro un allenamento offline (Trazioni, 5 × 3) | "Salvato sul telefono…", compare subito in Scheda, pastiglia "1 in attesa" |
| ricarico ancora offline | l'allenamento in attesa c'è ancora, il pannello lo elenca |
| la rete torna, senza ricaricare | dopo 3 s "1 salvataggio inviato al server". Nel database una riga sola, con l'id scelto dal telefono |
| token scaduto (`expires_at` nel passato) + offline + ricarico | dati a schermo in 1,1 s (prima della correzione: 30 s di caricamento) |
| peso offline con token scaduto, poi la rete torna | il token si rinnova e il peso arriva (30 s, i tentativi di auth-js). Prima della correzione la richiesta partiva con la chiave pubblica, il server rispondeva 401 e la coda la scartava come rifiuto |
| salvataggio quando si è già offline | in coda in meno di mezzo secondo |
| elimino offline l'allenamento e il peso di prova, poi "Invia ora" | "2 salvataggi inviati al server", nel database non restano |
| uscita dall'account | copia della cache vuota |
| aggiornamento della PWA | "È disponibile una nuova versione" e "Aggiorna" funzionano come prima. La copia della versione vecchia si scarta |
| sul ramo ribasato su main | peso salvato offline, inviato 1 s dopo il ritorno della rete |

**Sonda** (`audit/probe.js`) a 375 × 812, animazioni chiuse prima della misura (nel pannello nascosto restano ferme):
- 8 schermate di riferimento: axe 0, nessun bersaglio sotto 44 px, nessun testo sotto 12 px, nessuno scorrimento
  orizzontale. Valori della sezione H uguali al ticket 24: parole 36 / 53 / 71 / 49 / 53 / 41 / 49 / 38, dati disegnati
  1 / 7 / 2 / 5 / 0 / 1 / 7 / 1. **H resta 10,0**.
- Scheda e Home con la pastiglia accesa: axe 0, la pastiglia 44 px di altezza, nessuno scorrimento orizzontale.

**Test**: 23 nuovi in `data/offline.test.ts` sulla coda, sull'invio, sulle modifiche ottimistiche, sulla copia della
cache e sulle etichette. In totale 232 verdi sul ramo ribasato. `tsc -b` e `npm run build` puliti.

**Dati di prova**: l'allenamento e i due pesi creati nelle prove sono stati tolti: i primi due dalla UI offline, l'ultimo
dal database locale. Per il 10/11 l'atleta del seed non ha né registrazioni né pesi.

**Migration**: nessuna (l'`id` delle righe ha già un default e si può scrivere).

**Non verificato**:
- su un telefono vero (iOS chiude le PWA senza avvisare: per questo la copia si salva anche quando l'app va in secondo
  piano) e in modalità aereo vera, dove `navigator.onLine` è `false`: lì "Offline" compare subito;
- i record del livello offline (stessa strada di peso e allenamenti, coperta dai test);
- la modalità sessione (ticket 25) offline. "Salva e avanti" usa lo stesso hook, ma il giro completo non l'ho provato;
- un rifiuto vero del server durante l'invio (coperto dai test);
- la vista desktop a 1280 px.

**Limiti noti**:
- "Offline" si accende alla prima richiesta fallita. Riaprendo l'app entro 30 s dall'ultima lettura non parte nessuna
  richiesta, e la pastiglia aspetta il primo salvataggio o la prima pagina con dati vecchi.
- Col token scaduto l'invio aspetta i 30 s di tentativi di auth-js prima di partire.
- Senza una copia in cache (primo accesso da quel telefono) l'app offline non ha dati da mostrare.
