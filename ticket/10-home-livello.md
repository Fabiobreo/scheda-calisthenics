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
