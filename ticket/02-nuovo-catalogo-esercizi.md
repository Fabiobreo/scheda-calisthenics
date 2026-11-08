# 02 — Nuovo catalogo esercizi

- **Punto PDF**: 1
- **Figura professionale**: coach/esperto di calisthenics per la lista definitiva e i sinonimi; sviluppatore backend
  per la migration (delicata: tocca dati esistenti di tutti gli utenti).
- **Dipende da**: 01 (il tipo predefinito del catalogo perde importanza). **Sblocca**: 03, 05, 08.
- **Stima**: M

## Contesto

Catalogo richiesto:

| Categoria | Esercizi |
|-----------|----------|
| Tirata | Trazioni prone, Trazioni supine, Trazioni presa neutra, Muscle up, Muscle up agli anelli, OAP, Row agli anelli, Australian pull up, Rematore, Lat machine |
| Spinta | Push up, Pike push up, Piegamenti in verticale, Dip, Dip agli anelli, Military, Panca piana, Pseudo planche push up |
| Gambe | invariata |
| Core | invariata |
| Skill | Tuck planche, Tuck ADV planche, One leg planche, Straddle planche, Half lay planche, Full planche, Tuck front lever, Tuck ADV front lever, One leg front lever, Straddle front lever, Half lay front lever, Full front lever, Verticale, Bandiera, Back lever |

Oggi ([0006_exercise_catalog.sql](../supabase/migrations/0006_exercise_catalog.sql)) le voci hanno id stabili (slug),
sinonimi e sono collegate agli esercizi degli utenti con `on delete restrict`, e sono usate anche da `program_items`.

Confronto con l'attuale:

- **Da rinominare** (stessa voce, nome nuovo): `trazioni` → Trazioni prone, `muscle-up` → Muscle up,
  `muscle-up-anelli` → Muscle up agli anelli, `piegamenti` → Push up, `dip` → Dip, `rematore-inverso` → Australian pull up.
- **Nuove**: OAP, Row agli anelli, Rematore, Lat machine, Military, Panca piana, le 6 progressioni di planche e di front
  lever.
- **Spostate di categoria**: Front lever e Back lever (da Tirata a Skill), Planche (da Spinta a Skill, e divisa in
  progressioni).
- **Da togliere**: Trazioni arciere, Trazioni scapolari, Piegamenti diamante, Piegamenti declinati, Piegamenti arciere,
  Dip alla sbarra, V-sit, Front lever e Planche "generici".

## Cosa fare

1. Lista definitiva con il coach (nomi, sinonimi italiani/inglesi, ordine di visualizzazione).
2. Migration:
   - rinominare con `update` mantenendo gli id (gli esercizi degli utenti seguono da soli: il nome viene dal catalogo
     tramite trigger);
   - inserire le voci nuove;
   - per le voci tolte: **non si possono cancellare se qualcuno le usa** (`on delete restrict`). Due strade, vedi
     domande. Consiglio: aggiungere `catalog_exercises.retired_at` — non compaiono più tra le scelte, ma chi le ha le tiene
     con tutto lo storico.
   - Front lever / Planche generici: chi li ha già registrati li tiene (ritirati), le progressioni nuove sono voci a sé.
   - aggiornare i sinonimi per il riconoscimento dei nomi scritti a mano (`matchCatalog`).
3. Aggiornare il seed locale e i test pgTAP del catalogo.
4. Le voci che misurano tempo (planche, front lever, verticale, bandiera, back lever) vanno marcate come tali: lo
   prepara questo ticket (colonna `measure`), lo usa il 03.

## Criteri di accettazione

- Il menu "Dal catalogo" mostra esattamente la lista concordata, raggruppata per categoria.
- Nessun utente perde esercizi o registrazioni; gli esercizi con voci rinominate mostrano il nome nuovo.
- Le schede modello dei trainer che usano voci rinominate o ritirate continuano ad aprirsi e ad assegnarsi.
- `npx supabase db reset` e `npx supabase test db` passano.

## Domande aperte

1. **Bloccante** — Voci tolte già usate da qualcuno: le teniamo "ritirate" (consigliato) o le trasformiamo in esercizi
   personalizzati di quell'utente?
2. **Bloccante** — Le progressioni (Tuck, Tuck ADV, One leg, Straddle, Half lay, Full) devono essere **esercizi distinti**
   (come nella lista) o **un esercizio con la progressione come dettaglio** della serie? Distinti è più semplice e coerente
   col PDF; con la progressione come dettaglio il grafico "Planche" mostrerebbe un'unica linea di crescita. Cambia molto i
   grafici (13) e il collegamento con i record di livello (09).
3. Mancano voci che il sistema di livelli usa: **Planche push up, Planche press, Front lever pull up, Front lever touch,
   Hand stand push up, Verticale mono braccio, Wide planche, Maltese, Victorian, OAP assistito**. Vanno nel catalogo (per
   poterle allenare e programmare) o restano solo nei record di livello?
4. "Piegamenti in verticale" e "Hand stand push up" (dei livelli) sono lo stesso esercizio? Se sì, unico nome.
5. "Rematore" e "Lat machine" sono con attrezzi da palestra: confermiamo che l'app non è solo corpo libero? (vale anche per
   Military e Panca piana, che entrano nel punteggio).
6. "Tuck ADV" — scriviamo "Advanced tuck" (come nelle tabelle del documento) o "Tuck ADV"? Serve un nome unico.
7. Gambe e Core restano come sono: confermato anche che non entrano nel livello (le 5 macro categorie non le contano)?
