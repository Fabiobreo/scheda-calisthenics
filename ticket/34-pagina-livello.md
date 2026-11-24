# 34 — Pagina Livello: busto, pentagono, categorie a tendina, record col peso

- **Fonte**: `GraficaPDF` pagine 4–5, mockup "Livello", messaggio di Michael sul pentagono.
- **Figura professionale**: frontend + UI designer.
- **Dipende da**: 31, 32, 33. **Sblocca**: 38.
- **Stima**: L.

## Contesto

Oggi la pagina è [HomeView.tsx](../src/features/home/HomeView.tsx) sulla rotta `/` (voce "Livello"): `TodayCard`
("Oggi"), scheda profilo con avatar, livello, settimane di fila, % del programma e peso (modifica e storico),
checklist del primo accesso (28), pentagono, 5 categorie che si aprono sui sotto-esercizi, foglio del record
([RecordSheet.tsx](../src/features/home/RecordSheet.tsx)). La stessa vista, in sola lettura, è quella che il trainer
vede per un atleta (15).

## Cosa fare

1. **Rotta**: la pagina passa a `/livello` (cartella `features/livello`); `/` resta Livello finché non c'è la Home (39).
2. **Si toglie**: scheda "Oggi", riquadro "settimane di fila", riquadro "% del programma", peso (campo, modifica,
   storico) dalla pagina.
3. **Prima schermata fissa** (niente scorrimento a categorie chiuse): testata, busto a sinistra e pentagono a destra,
   5 schede categoria, barra. Altezze con `clamp()` sull'altezza dello schermo: deve stare in 360×640; sotto quella
   misura la pagina scorre invece di tagliare. Aprendo una categoria la pagina può scorrere.
4. **Busto**: per ora **una sola immagine**, il busto dorato del mockup, uguale per tutti (WebP trasparente, 2 misure,
   alone dorato in CSS). Sostituisce `Avatar` a 20 stadi e la scelta della figura in Account (13). Il componente prende
   già il livello complessivo, così quando Michael deciderà come deve cambiare l'avatar basterà aggiungere le immagini.
5. **Pentagono** ([Pentagon.tsx](../src/components/Pentagon.tsx)): contorno = fine del livello più alto tra le 5
   categorie, anelli interni = fine dei livelli sotto, un asse per categoria in scala sui punti (30, interpretazione 5).
   Quando una categoria sale di livello il contorno si allarga con un'animazione. Sigle HB, SS, FT, FS, ST con la % del
   livello; colori oro; testo alternativo con nomi e valori per intero. Via la zona ELITE arancione.
6. **Schede categoria**: nome, livello (Base…Leggenda), numero = % nel livello, barra dorata = stessa %, freccia.
   Ordine come nel mockup.
7. **Categoria aperta** (menu a tendina): una riga per catena (Trazioni, Muscle up, OAP…) con livello attuale (lettera e
   nome), % e miglior record. Toccando una catena si apre il **foglio del record**:
   - "Esercizio": menu a tendina con le voci ancora da completare (`availableEntries`);
   - valore (ripetizioni, secondi o kg secondo la voce, con il suggerimento giusto: "solo la zavorra", "massimale su
     1 ripetizione");
   - **peso corporeo** solo se la formula della voce lo usa (30, decisione 9), obbligatorio, precompilato con quello
     dell'ultimo record che lo aveva;
   - data; errori di validazione del 30 (fuori range = messaggio, nessun calcolo);
   - storico della catena con modifica ed eliminazione (anche dei livelli già completi);
   - catena tutta completa: niente modulo, solo "Catena completata" e storico.
8. **Celebrazioni**: nuovo livello di una categoria, nuovo livello complessivo (cambia il busto).
9. **Primo accesso** (28): i passi "inserisci il peso" e "scegli la figura" spariscono.
10. **Trainer**: stessa pagina in sola lettura, senza modulo.
11. **Modalità sessione** (25): "Inizia allenamento" stava in "Oggi": si sposta in Scheda (37).

## Testi dei livelli (Michael, 24 novembre 2026, sera)

Nell'app non si scrivono le percentuali del peso corporeo ("Trazioni 15%–45% PC"): valgono solo a 60 kg. Si mostra la
voce e la lettera del livello ("Trazioni zavorrate, livello C"); `LevelRule.name` del motore non va in pagina. La
zavorra è sempre maggiore di zero (30, decisione 14): il campo non accetta 0.

## Criteri di accettazione

- A 390×844 e 360×640 la pagina a categorie chiuse non scorre e niente è tagliato.
- Il peso si chiede solo nelle voci che lo usano (non per australian, bench dip, push up, muscle up a ripetizioni,
  verticali e OAHS); i punti cambiano come nel motore; la voce completata sparisce dal menu.
- Passando da Intermedio ad Avanzato in una categoria il contorno del pentagono cambia scala.
- Lettore di schermo: categorie come pulsanti con `aria-expanded`, pentagono con descrizione.

## Materiale da ricevere

- **Il file del busto dorato** con fondo trasparente (almeno 800 px di lato): nel mockup c'è solo dentro lo screenshot.
  **Non più bloccante** (Fabio, 24/11): il busto è stato ritagliato dallo screenshot del mockup "Livello" e sta in
  [`public/avatar/busto-540.webp`](../public/avatar/busto-540.webp) e `busto-270.webp` (fondo trasparente, senza
  l'alone: quello si rifà in CSS); il ritaglio di partenza è
  [`riferimenti/34-busto-ritagliato.png`](riferimenti/34-busto-ritagliato.png). Limite: nel mockup il busto è largo
  circa 270 px, quindi i 540 px sono un ingrandimento e i bordi sono un po' morbidi. Va bene alla misura del mockup
  (circa 135 px CSS a 2x); se Michael manda l'originale si sostituiscono i due file.

## Decisioni (Michael, 24 novembre 2026)

1. Lo **storico del peso** e il peso del profilo spariscono del tutto: il peso esiste solo dentro i record (32).
2. "Oggi", settimane di fila e % del programma si tolgono; "Inizia allenamento" va in Scheda (37).
3. L'avatar che cambia col livello è rimandato: un ticket a parte quando Michael avrà un'idea.

## Stato

**Fatto il 24 novembre 2026** sul ramo `claude/ticket-34-pagina-livello-7545a0` (solo app, nessuna migration). Niente
push, niente merge. Da rilasciare insieme alla migration `0015` del 32. Manca l'approvazione di Michael sulla pagina.

**Cosa c'è**

- **Tutta l'app sul motore v2.** `useLevel` ([hooks.ts](../src/data/hooks.ts)) calcola con `levelSummary` del v2 e dà
  `LevelRow` (il record del database più `chainId` / `entry` per il motore). `src/lib/levels/index.ts` esporta il v2.
  Cancellati: `src/lib/levels/rules.ts`, `engine.ts`, `engine.test.ts`, `legacy.ts`, `Avatar.tsx`, `avatarFigure.ts` col
  suo test, `TodayCard.tsx`, la scheda "Avatar" di Account, il campo `avatarBody` del profilo nell'app, e dal CSS
  avatar, zona ELITE, "Oggi", peso, tendenza settimanale. Nessun import dal motore vecchio, nessun punteggio 0–200.
- **Rotta** `/livello` (cartella `src/features/livello`, i file della vecchia `features/home` spostati con la loro
  storia); `/` rimanda a `/livello` finché non c'è la Home (39). La voce "Livello" della barra e il cerchio "Totale"
  puntano a `/livello`.
- **Pagina** ([LivelloView.tsx](../src/features/livello/LivelloView.tsx)): busto a sinistra
  ([Bust.tsx](../src/components/Bust.tsx): le due WebP con `srcset`, alone in CSS, prende già il livello complessivo
  come `band` / `data-band`), pentagono a destra, 5 schede categoria (nome, livello, % in oro, freccia, barra dorata
  con la stessa %). Via "Oggi", settimane di fila, % del programma, peso, tendenza.
- **Prima schermata fissa**: le schede sono alte `clamp(50px, 7.8dvh, 72px)`, gli spazi `clamp(6px, 1dvh, 10px)`, busto
  e pentagono prendono quello che resta dell'altezza dello schermo (minimo 150 px: sotto i 640 px di altezza la pagina
  scorre invece di tagliare). In questa pagina il fondo non lascia lo spazio per il timer di recupero (torna se il timer
  è aperto). Su schermo largo: busto e pentagono a sinistra, categorie a destra.
- **Pentagono** ([Pentagon.tsx](../src/components/Pentagon.tsx)): contorno = fine del livello più alto raggiunto tra le
  5 categorie; ogni asse va da 0 alla fine di quel livello per la sua categoria; anelli interni = fini dei livelli
  sotto, asse per asse (quindi non sono pentagoni regolari). Sigla e % del livello accanto a ogni vertice, tutto in
  oro, testo alternativo con nomi, livelli e valori per intero. Quando una categoria porta la scala a un livello più
  alto, area e anelli scorrono verso il centro in 0,7 s e il contorno pulsa (fermo con "riduci movimento").
- **Tendine**: l'intestazione di ogni categoria è un `button` dentro un `h2` con `aria-expanded` e `aria-controls`, il
  pannello è una `region` col nome dell'intestazione; Invio/Spazio aprono, frecce su/giù, Inizio e Fine passano da
  un'intestazione all'altra, Esc dentro il pannello lo chiude e riporta il fuoco. Una aperta alla volta.
- **Catena**: nome, livello come "voce, livello lettera" ("Trazioni zavorrate, livello C"), % del livello, miglior
  record con la data. `LevelRule.name` non compare da nessuna parte (lo controlla un test su tutti gli 83 livelli).
- **Foglio del record** ([RecordSheet.tsx](../src/features/livello/RecordSheet.tsx)): "Esercizio" con le voci di
  `availableEntries`, campo del valore con etichetta e suggerimento secondo la voce ("Zavorra (kg)", "Massimale (kg)",
  "Ripetizioni", "Secondi"), peso corporeo solo se `usesBodyweight` (obbligatorio, precompilato con l'ultimo
  inserito), data, errori di `validateRecord` sul campo giusto, storico con modifica ed eliminazione (correggendo, la
  voce del record resta tra le scelte anche se è completa), "Catena completata" senza modulo quando non restano voci.
- **Testata** ([TopBar.tsx](../src/components/TopBar.tsx)): sotto il nome il livello complessivo ("Avanzato"), nel
  cerchio "Totale" la % dentro quel livello.
- **Presentazione** ([levelView.ts](../src/features/livello/levelView.ts)): ordine e sigle, `pentagonScale`, testi di
  record e livelli, etichette e messaggi del foglio, `celebrations` ("Livello complessivo: Elite", "Sei Avanzato in
  Skill spinta"). Nessuna formula di punteggio nei componenti: il solo conto fuori dal motore è la posizione sugli
  assi (punti / fine del livello), che è la scala del disegno e sta in `levelView.ts`.
- **Celebrazioni**: nuovo livello complessivo e nuovo livello di una categoria, in un riquadro sopra la pagina (non
  sposta la schermata fissa), 6 secondi.
- **Primo accesso** (28): restano 2 passi, "Il primo record" e "Il primo allenamento".
- **Trainer**: stessa pagina in sola lettura dentro la scheda dell'atleta (altezze fisse, niente modulo nel foglio);
  nell'elenco degli atleti il busto piccolo e "Avanzato 45%" al posto di avatar e livello 0–200.

**Verifica**

- `npm test` 312 verdi (14 file: via i file di test del motore vecchio e dell'avatar, `levelView.test.ts` riscritto,
  `conversion.test.ts` tiene le 56 progressioni vecchie come dato fisso), `npx tsc -b` e `npm run build` puliti. JS
  iniziale 150,4 KB gzip (116,1 + 34,3) contro i 156,5 di prima: il motore v2 sta nel JS iniziale al posto del
  vecchio, il foglio del record si scarica a parte (2,2 KB).
- **Browser, con dati finti.** Il database a cui punta l'app locale **non ha la migration 0015**: la lettura di
  `level_records` risponde 400 (manca `bodyweight_kg`) e la pagina mostra "Non riesco a leggere livello e record" con
  tutto a zero. La migration **non è stata applicata**. Con l'account di Fabio ho visto così com'è solo lo stato
  vuoto; il resto l'ho provato sostituendo nella pagina le sole chiamate a `level_records` con un elenco in memoria
  (12 record inventati; niente è stato scritto su Supabase):
  - 390×844 e 360×640, categorie chiuse: altezza del documento uguale a quella dello schermo (nessuno scorrimento),
    ultima scheda sopra la barra, niente tagliato, nessuno scorrimento orizzontale; uno script non trova bersagli
    sotto 44 px né nella pagina né nel foglio;
  - tendina aperta sulle catene, `aria-expanded` giusto, frecce / Fine / Esc;
  - foglio di Trazioni: resta solo "Trazioni zavorrate" (A e B pieni), zavorra 0 → "La zavorra deve essere maggiore di
    0", peso 20 → "Il peso corporeo va tra 30 e 250 kg", nessun salvataggio; con 80 kg a 70 kg di peso il record si
    salva, compare "Sei Elite in Fondamentali tirata" e il pentagono passa alla scala Elite;
  - Verticale: niente campo del peso, "Verticale a muro" sparita dal menu perché piena;
  - Military portato al massimo: "Catena completata", niente modulo, storico con Modifica ed Elimina;
  - 1280×800: due colonne.
- **Non visto nel browser**: i record veri di un account (serve la 0015), la riga "Inizia allenamento" (oggi l'account
  di prova non ha niente in programma), la checklist del primo accesso con la pagina piena, la vista del trainer
  (l'account non è trainer), VoiceOver / TalkBack veri (ho controllato ruoli e attributi, non l'ascolto).

**Scelte dove il ticket non dice** (da far vedere a Michael)

1. **Ordine delle categorie**: assi del pentagono HB, SS, FT, FS, ST in senso orario dall'alto (`AXES` in
   `levelView.ts`); schede HB, SS, FS, ST, FT (`CARDS`). Corretto il 25/11 dopo l'unione, guardando il mockup: le
   schede non seguono l'ordine degli assi.
2. **Testata**: sotto il nome c'è solo "Avanzato", senza la parola "Livello"; nel cerchio "45%" e "Totale".
3. **"Inizia allenamento" resta in questa pagina**, in una riga sola tra pentagono e categorie, e solo quando oggi c'è
   ancora qualcosa da fare (o una sessione da continuare): era soltanto nella scheda "Oggi", toglierlo l'avrebbe reso
   irraggiungibile. Quando c'è toglie 44 px al blocco in alto, non alle schede. Va spostato in Scheda col 37 e tolto
   da qui (`StartWorkout` in `LivelloView.tsx`).
4. **Checklist del primo accesso**: sta sopra busto e pentagono, quindi finché è visibile (account nuovo) la pagina
   scorre. Sparisce al primo record e al primo allenamento, o con "Più tardi".
5. **`/` rimanda a `/livello`** invece di mostrare la stessa pagina a due indirizzi: così la voce attiva della barra
   è una sola.
6. **Catena**: la % è quella del livello attuale della catena, intera e per difetto (mai 0 se il livello c'è).
   Nelle skill la voce è la progressione, quindi si legge "Straddle, livello D".
7. **Busto negli elenchi del trainer**: lo stesso busto in piccolo per tutti gli atleti (un solo avatar per tutti),
   non più l'iniziale del nome.
8. **Record senza peso** (convertiti dal formato vecchio, 32 scelta 3): il motore li ignora; nella catena e nello
   storico c'è scritto che manca il peso, e si correggono con "Modifica".
9. **Celebrazioni**: il livello complessivo per primo, poi le categorie; un livello che scende non dice niente.
10. Nel foglio, sotto "Esercizio", una riga dice i livelli coperti dalla voce ("Livelli C–F: quale raggiungi lo decide
    il valore").

**Non fatto, di proposito**

- La colonna `profiles.avatar_body` resta nel database, non più letta né scritta: toglierla è una migration, da fare
  col ticket dell'avatar che cambia col livello (o col 38).
- Le pagine Esercizi, Grafici e Scheda (35, 36, 37) non sono state toccate.
- I link del "Contesto" qui sopra puntano ai file di prima (`features/home`): ora sono in `features/livello`.
- Sovrapposizione al mockup: da fare da chi ha i mockup (ordine delle categorie, proporzioni di busto e pentagono).
