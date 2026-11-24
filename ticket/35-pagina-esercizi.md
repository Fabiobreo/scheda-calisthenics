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
