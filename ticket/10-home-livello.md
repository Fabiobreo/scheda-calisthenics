# 10 — Home "Livello": profilo, pentagono, barre, record

- **Punto PDF**: 5 (la sezione principale, prima schermata all'apertura)
- **Figura professionale**: sviluppatore frontend React con buona mano su SVG e animazioni; UI designer per le
  schermate (dal 06).
- **Dipende da**: 06, 07, 08, 09. Avatar (11) con segnaposto finché non arrivano le illustrazioni.
- **Sblocca**: 12, 15.
- **Stima**: L

## Contesto

Richiesta: prima schermata con **avatar**, **nome**, **peso corporeo in kg** (inseribile e modificabile in qualsiasi
momento), **livello generale**, **grafico a pentagono** delle 5 macro categorie (colore diverso tra 0–100 ed ELITE),
sotto le **5 barre** una sotto l'altra con il numero, e toccando una barra si aprono le **sotto-categorie** dove inserire
e modificare i record personali. Pagina pulita: le sotto-categorie sono chiuse finché non si toccano.

Oggi il nome è già nel profilo (`display_name`, modificabile in Account).

## Cosa fare

1. **Intestazione**: avatar (11), nome (se manca: invito a sceglierlo), livello generale, peso corporeo con modifica
   rapida (campo numerico con tastiera decimale).
2. **Pentagono** (SVG, componente riusabile, niente librerie pesanti): 5 assi in ordine fisso, griglia concentrica,
   scala 0–200 con anello evidente a 100; area e punti color base, il tratto/punto della categoria in zona ELITE nel
   colore elite (come nell'esempio). Etichette leggibili su schermo stretto (375 px). Animazione di crescita all'apertura
   e quando un valore cambia (rispettando `prefers-reduced-motion`).
3. **Barre** delle 5 categorie, una sotto l'altra: valore "88 / 100" o "105 / 200 ELITE", riempimento con colore di zona,
   icona di categoria.
4. **Sotto-categorie** (a fisarmonica, una aperta per volta): per ognuna percentuale e barra; inserimento del record con
   il controllo giusto per il tipo:
   - kg → campo numerico;
   - progressione + secondi/ripetizioni → scelta della progressione (solo quelle ammesse) + valore nei limiti;
   - fasi ELITE visibili solo se sbloccate (dal 08).
   Mostrare data e valore del record attuale, storico dei record della sotto-categoria, modifica/eliminazione di un
   record sbagliato.
5. **Feedback**: quando un record fa salire il livello o sblocca l'ELITE, un momento di celebrazione sobrio (06).
6. **Stato vuoto** (nuovo utente): spiegare in una riga cosa fare (inserire peso e primi record), pentagono a zero ma
   visibile.
7. Calcolo solo con il motore (08); nessuna formula nell'interfaccia.

## Criteri di accettazione

- All'apertura dell'app si vede la Home.
- Inserendo i record dei casi di prova del 05 i numeri mostrati corrispondono.
- Le versioni ELITE non compaiono finché la soglia precedente non è completa.
- Funziona a 375 px di larghezza, con tastiera e lettore di schermo (i valori del pentagono sono anche in testo).

## Domande aperte

1. **Bloccante** — I numeri sulle barre: punti della categoria (es. "88 / 100") come nell'esempio, mentre dentro le
   sotto-categorie solo percentuali? Confermi?
2. Nell'esempio le barre sono su due colonne; il documento chiede una sotto l'altra. Confermo una sotto l'altra.
3. Inserire un record è un'azione rapida dalla Home o va registrato anche come allenamento (tentativo)? (Lega col 09,
   domanda 2.)
4. Vuoi uno storico/grafico del livello nel tempo ("eri 42 un mese fa")? Molto motivante; proposta: dopo la v1.
5. Ordine degli assi del pentagono: come nell'esempio (Fondamentali spinta in alto, poi in senso orario Fondamentali
   tirata, Skill tirata, Skill spinta, Balance)?

## Stato

**Fatto il 9 novembre 2026** (solo app, nessuna migration). Codice in `src/features/home/` (`HomeView.tsx`,
`RecordSheet.tsx`, `levelView.ts` + test) e `src/components/Pentagon.tsx`.

Decisioni dell'utente (9 novembre 2026):

1. Sulle barre i **punti della categoria** ("88 / 100", "102 / 200 ELITE"); nelle sotto-categorie **solo percentuali**
   ("40%", "ELITE 66%").
2. **Stile attuale** dell'app (tema chiaro e scuro automatici) con un colore ELITE ambra (`--elite`) e un **segnaposto
   per l'avatar** (cerchio con l'iniziale, alone che cresce con il livello, ambra in zona ELITE). Si ritocca col 06/11.
3. La Home è a `/` con la voce **"Livello" per prima** nella barra; la Scheda è a `/scheda` (anche `/registro` porta lì).
   Il nome dell'app in alto porta alla Home. Con il trainer le voci sono 5 e ci stanno a 375 px.
4. Assi del pentagono come nell'esempio (Fondamentali spinta in alto, poi in senso orario Fondamentali tirata, Skill
   tirata, Skill spinta, Handbalance); barre una sotto l'altra; storico del livello nel tempo **dopo la v1**; la Home è
   uguale per atleta e trainer (il suo livello personale). Record inseriti a mano (09, decisione 2).

Come è fatto:

- **Intestazione**: avatar segnaposto, nome (se manca: "Scegli il tuo nome" → Account), livello grande, peso con
  modifica rapida (tastiera decimale, salva il peso di **oggi**, 20–300 kg, arrotondato a 0,1).
- **Pentagono** SVG senza librerie. Scala 0–200 **a due tratti**: 0–100 occupa il 72% del raggio, 101–200 l'anello
  esterno (fascia ambra leggera), anello del 100 in evidenza. Così chi è sotto 100 non resta schiacciato al centro.
  Punti ELITE ambra con alone, lati verso un punto ELITE sfumati. Cresce all'apertura e quando un valore cambia
  (niente animazione con `prefers-reduced-motion`). Per il lettore di schermo è un'immagine con tutti i valori nel testo.
- **Barre** a fisarmonica (una aperta per volta, `aria-expanded`): in ELITE la barra è su 200, prima metà piena e
  seconda che cresce. Dentro: sotto-esercizi con percentuale, barretta, record migliore e data, "ELITE sbloccata".
- **Pannello del sotto-esercizio** (tocco su una riga): definizione del movimento, percentuale, nuovo record con il
  controllo giusto (progressioni sbloccate in un menu, le ELITE in un gruppo a parte; kg con virgola; ripetizioni e
  secondi interi nei limiti, con messaggio "Il massimo è 10 s"), data (passata o oggi), suggerimento della progressione
  successiva quando il valore è al massimo, storico con **Modifica** ed **Elimina** (doppio tocco). Apre sulla
  progressione del record migliore, o sulla successiva se è già al massimo.
- **Celebrazione**: dopo un record (o una correzione) che alza il livello, porta una categoria in ELITE o sblocca
  l'ELITE di un sotto-esercizio, un riquadro ambra in cima per 6 secondi (annunciato al lettore di schermo).
- **Stato vuoto**: una riga che dice di inserire il peso e i primi record; pentagono a zero visibile.
- Nessuna formula nell'interfaccia: tutti i numeri vengono dal motore (08) tramite `useLevel()` (09).

Prove fatte: unitari 133 (8 nuovi in `levelView.test.ts`), pgTAP 166, `tsc -b` e `vite build` OK. Nell'app locale a
375 px, tema scuro e chiaro: atleta di prova (livello 48), record nuovo di Trazioni con celebrazione ed ELITE sbloccata,
HSPU fuori limite rifiutato, HSPU a 10 rip. con Handbalance in ELITE e fase "Zavorra" comparsa, modifica ed
eliminazione di un record, peso modificato con ricalcolo; trainer senza dati (stato vuoto) e barra a 5 voci. Il database
locale è stato rimesso com'era.

Note per chi viene dopo:

- Il 12 (riepilogo compatto) può riusare l'avatar segnaposto (`.avatar` in `styles.css`) e `useLevel()`.
- Il 15 (trainer vede il livello) può riusare `Pentagon` e la parte delle barre in sola lettura: oggi `HomeView` mostra
  sempre i dati dell'utente collegato.
- Non provato su telefono vero né con la PWA installata. Il peso si inserisce solo per oggi: correggere un peso passato
  (il 09 lo permette) non ha ancora uno schermo.
