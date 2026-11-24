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

## Criteri di accettazione

- A 390×844 e 360×640 la pagina a categorie chiuse non scorre e niente è tagliato.
- Il peso si chiede solo nelle voci che lo usano (non per australian, bench dip, push up, muscle up a ripetizioni,
  verticali e OAHS); i punti cambiano come nel motore; la voce completata sparisce dal menu.
- Passando da Intermedio ad Avanzato in una categoria il contorno del pentagono cambia scala.
- Lettore di schermo: categorie come pulsanti con `aria-expanded`, pentagono con descrizione.

## Materiale da ricevere

- **Il file del busto dorato** con fondo trasparente (almeno 800 px di lato): nel mockup c'è solo dentro lo screenshot.
  Bloccante per la chiusura; nel frattempo si ritaglia dallo screenshot.

## Decisioni (Michael, 24 novembre 2026)

1. Lo **storico del peso** e il peso del profilo spariscono del tutto: il peso esiste solo dentro i record (32).
2. "Oggi", settimane di fila e % del programma si tolgono; "Inizia allenamento" va in Scheda (37).
3. L'avatar che cambia col livello è rimandato: un ticket a parte quando Michael avrà un'idea.
