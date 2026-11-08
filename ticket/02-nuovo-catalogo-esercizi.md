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

## Stato

**Fatto il 9 novembre 2026** (migration `0010_catalog_v2.sql`, test in `supabase/tests/database/catalog.test.sql`).

Decisioni:

1. Voci tolte già usate: **diventano esercizi personalizzati** con lo stesso nome e tutto lo storico; nelle schede
   modello dei trainer diventano nomi personalizzati.
2. Progressioni di planche e front lever: **esercizi distinti**.
3. Gli esercizi del sistema di livelli **entrano nel catalogo** (categoria Skill, OAP assistito in Tirata).
4. "Piegamenti in verticale" e "Hand stand push up" sono **lo stesso esercizio** (HSPU è un sinonimo); le progressioni
   si chiamano **Advanced tuck** (con "Tuck ADV" come sinonimo).
5. Attrezzi da palestra (Rematore, Lat machine, Military, Panca piana): sì, sono nella lista concordata.
6. Gambe e Core invariate e fuori dal livello (deciso nel 05).

Scelte fatte durante il lavoro (da rivedere se non vanno bene):

- Aggiunto anche **Wide front lever**, per simmetria con Wide planche. Non aggiunti Wide front lever pull up e Wide
  front lever touch: per ora restano solo nei record di livello.
- **OAP assistito** è una voce unica: il punto di presa (gomito, bicipite, spalla) conta per i livelli, non per
  l'allenamento.
- Verticale mono braccio divisa in **straddle** e **full**, come nei livelli.
- Gli esercizi personalizzati che ora sono nel catalogo (es. "Panca piana", "Lento avanti") si collegano alla voce;
  se un utente ne ha più d'uno per la stessa voce vince il nome esatto, poi il più vecchio.
- Nuova colonna `measure` (`reps` o `time`): le tenute (progressioni, verticale, bandiera, back lever, plank, L-sit,
  hollow, front lever touch) sono a tempo. L'app la legge ma la usa solo dal ticket 03.
