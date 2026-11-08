# 01 — Tipo (Forza / Volume / Tecnico) dalla scheda, non dall'esercizio

- **Punto PDF**: 2
- **Figura professionale**: sviluppatore full-stack (React + Postgres/Supabase), con attenzione alle migration su dati
  di produzione.
- **Dipende da**: nulla. **Sblocca**: 02, 13 (grafico "Ripetizioni per tipo").
- **Stima**: M

## Contesto

Richiesta: togliere la scelta del TIPO quando si crea un esercizio (catalogo o personalizzato) e permetterla solo nella
scheda, per ogni singolo esercizio. Motivo: le Trazioni possono essere fatte in forza, volume o tecnica; oggi se le
Trazioni sono "Volume" non si può creare un secondo esercizio "Trazioni" in "Forza".

Oggi nel codice:

- `exercises.type` è obbligatorio (`0001_init.sql`), e c'è un nome unico per utente (`0003_scheme_in_plan.sql`) e una
  voce del catalogo al massimo una volta per utente (`0006`). Il blocco descritto nel PDF è voluto: un esercizio = una
  linea nei grafici. Il problema è che il tipo sta nel posto sbagliato, non che manchi un duplicato.
- Il tipo si sceglie in [EserciziView.tsx](../src/features/esercizi/EserciziView.tsx) e si mostra con `TypeChip` in
  Scheda, Registro, Esercizi, Atleti.
- `catalog_exercises.default_type` dà il tipo predefinito.
- Il grafico "Ripetizioni per tipo" ([stats.ts](../src/lib/stats.ts) `repsByType`) prende il tipo dall'esercizio.
- Schema della scheda: `plan_items` (calendario dell'atleta) e `program_items` (schede modello del trainer).

## Cosa fare

1. **Modello dati** (nuova migration `0009_…`):
   - aggiungere `type` a `plan_items` e `program_items` (stessi valori ammessi);
   - riempirlo per le righe esistenti copiando `exercises.type` (per `program_items` dal `default_type` del catalogo,
     o "volume" per i nomi personalizzati);
   - aggiungere `type` anche a `entries`, valorizzato quando si registra da una riga della scheda (vedi domande):
     serve perché il grafico per tipo continui a funzionare anche quando la scheda cambia;
   - `exercises.type` **non va cancellata subito**: chi ha ancora aperta la versione vecchia dell'app la legge e la scrive
     (stesso principio di compatibilità di `0006`). Renderla facoltativa con un default, e toglierla in una migration
     successiva.
   - `assign_program` e `coach_add_plan_item` devono copiare il tipo.
2. **Esercizi**: togliere il campo Tipo dal form (catalogo e personalizzato) e il `TypeChip` dalla lista.
3. **Scheda**: aggiungere il Tipo in `SchemeForm` (accanto a serie, ripetizioni, peso, recupero), nella scheda
   dell'atleta, nella scheda modello del trainer e nell'aggiunta di un esercizio da parte del trainer. Proposta iniziale:
   l'ultimo tipo usato per quell'esercizio, altrimenti il `default_type` del catalogo.
4. **Copia della settimana** ([plan.ts](../src/lib/plan.ts)): deve copiare anche il tipo.
5. **Grafico per tipo**: legge il tipo dalla registrazione (`entries.type`), con ripiego sulla riga di scheda del giorno.
6. **Test**: unitari (copia settimana, `repsByType`) e pgTAP (vincoli, `assign_program` copia il tipo).

## Criteri di accettazione

- Creando o modificando un esercizio non compare più la scelta del tipo.
- Nella stessa settimana posso avere Trazioni in Forza il lunedì e Trazioni in Volume il giovedì; nei grafici restano
  un unico esercizio.
- Le schede già esistenti mostrano lo stesso tipo che mostravano prima della migration.
- Assegnando una scheda modello il tipo arriva nel calendario dell'atleta.
- Una versione vecchia dell'app ancora aperta continua a creare esercizi senza errori.

## Stato

**Fatto l'8 novembre 2026** (migration `0009_type_per_day.sql`, test in `supabase/tests/database/types.test.sql`).
Scelte fatte sulle domande, secondo le proposte (da rivedere se non vanno bene):

1. Registrazione fuori scheda: il tipo si sceglie nel logger. Viene proposto quello del programma di quel giorno (o
   dell'ultima volta in programma prima di quel giorno), poi quello dell'ultimo allenamento, poi della prossima volta in
   programma, altrimenti il predefinito del catalogo. Per i tentativi di record viene proposto "Forza". Lo stesso vale
   quando il trainer aggiunge un esercizio a un giorno dell'atleta.
2. Lo stesso esercizio due volte nello stesso giorno: **non ancora**, il vincolo resta. Da riaprire se serve.
3. I tipi restano tre, fissi.

Note per chi viene dopo:

- `exercises.type` ora è facoltativo: l'app nuova non lo scrive più. Va tolto con una migration successiva, quando non
  ci saranno più versioni vecchie dell'app in giro.
- I trigger completano il tipo delle righe scritte senza (versione vecchia): dal giorno in programma, poi dal tipo che
  l'utente aveva dato all'esercizio, poi dal predefinito del catalogo.
- `coach_add_plan_item` ha un parametro in più, `p_type`, facoltativo.
