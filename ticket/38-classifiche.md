# 38 — Punteggi sul server, profilo pubblico e classifiche

- **Fonte**: `GraficaPDF` pagina 5 (Home), mockup "Home" (Classifica: Media / Handbalance / Skill spinta…; Amici,
  Provincia, Regione, Italia, Mondo), risposte di Michael del 24 novembre.
- **Figura professionale**: backend (Postgres, RLS, prestazioni) + product owner (privacy).
- **Dipende da**: 31, 32. **Sblocca**: 39.
- **Stima**: L.

## Contesto

Oggi non esiste niente di sociale: l'unico legame tra persone è trainer–atleta (0007). Il livello **non è salvato**: lo
calcola l'app dai record. Una classifica ha bisogno dei punti di tutti sul server. `profiles` ha nome, `is_trainer`,
figura dell'avatar; niente provincia o regione.

## Cosa fare

1. **Punti sul server** — tabella `level_scores (user_id, total, ft, fs, st, ss, hb, rules_version, updated_at)`:
   la scrive l'app dell'utente ogni volta che il suo livello cambia (dopo un record, dopo la sincronizzazione offline,
   all'avvio se `rules_version` è vecchia). RLS: ognuno scrive solo la sua riga; vincoli 0–1400 e 0–7000.
   Perché non calcolare sul server: le formule vivrebbero in due posti (TypeScript e SQL) e i record sono comunque
   dichiarati dall'utente, quindi il server non garantirebbe niente di più. Se un giorno servirà (gare, premi) si
   sposta lo stesso motore in una Edge Function.
2. **Luogo e visibilità del profilo** — in `profiles`: `country` (ISO), `province` (sigla, solo per l'Italia), `region`
   (derivata dalla provincia), `is_private boolean`.
   - **Alla registrazione** l'utente indica il suo luogo: nazione e, se Italia, provincia da elenco (107 province,
     niente posizione GPS). Chi è già iscritto lo indica la prima volta che apre la Home; si cambia da Account.
   - **Profilo pubblico o privato come su Instagram** (39): pubblico = chiunque può seguirlo e lo vede nelle
     classifiche col suo nome; privato = lo si segue solo dopo richiesta accettata, e fuori da chi lo segue la sua
     riga non compare (resta contato nella posizione degli altri e vede la propria).
   - Nelle classifiche si mostra **il nome dell'utente** per intero.
3. **Classifiche** — funzione `ranking(scope, metric)`:
   - `scope`: **amici** (le persone che seguo, più me), **provincia**, **regione**, **nazione**, **mondo**;
     `metric`: punteggio generale o una delle 5 categorie;
   - chi non è in Italia non ha provincia e regione: quei due riquadri mostrano "—";
   - restituisce posizione dell'utente, numero di partecipanti e le righe intorno (prime 3 + vicini), non l'elenco
     intero; `security definer` con solo i campi pubblici; indici su `(province, total)`, `(region, total)`,
     `(country, total)`, `total` e per categoria.
4. **Motore**: `levelSummary` espone i 6 numeri da salvare; test che `level_scores` segua i record (anche dopo una
   eliminazione).
5. **Privacy** (collegato ad A05, ancora aperto): informativa aggiornata prima di accendere le classifiche pubbliche;
   minori; cancellazione dell'account = riga tolta dalle classifiche.
6. Test pgTAP: RLS (nessuno legge record o peso di altri, solo i punti), posizioni corrette, profilo non pubblico
   invisibile fuori dagli amici.

## Criteri di accettazione

- Posizione e totale partecipanti corretti per i 5 ambiti e le 6 metriche su dati di prova.
- Un profilo privato non compare col nome a chi non lo segue in Provincia/Regione/Nazione/Mondo.
- La registrazione non si completa senza il luogo; chi è già iscritto lo inserisce al primo ingresso in Home.
- Classifica nazionale sotto 200 ms con 50.000 righe di prova.

## Decisioni (Michael, 24 novembre 2026)

1. La prima pastiglia della classifica si chiama **"Generale"** (nel mockup "Media"): è il punteggio complessivo
   dell'utente, cioè la somma delle 5 categorie (0–7000), ed è chiaro che riguarda tutto il profilo.
2. Ambiti: **amici, provincia, regione, nazione, mondo**; il luogo si indica alla registrazione.
3. Profili pubblici o privati come su Instagram.
4. Si mostra il nome dell'utente.

## Domande aperte

1. Chi si iscrive parte **pubblico o privato**? Su Instagram si parte pubblici; qui si mostrano nome e luogo, quindi
   proposta: la scelta è un passo esplicito della registrazione, senza valore già selezionato. (Fabio, bloccante: è
   una scelta di privacy)
2. Chi è il titolare del trattamento per l'informativa (già aperto in A05)? Con nome e provincia visibili a tutti
   l'informativa va pubblicata prima di accendere le classifiche. (Fabio, bloccante per il rilascio)
