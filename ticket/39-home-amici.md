# 39 — Home: cerca persone, amici, novità, condivisione di record e allenamenti

- **Fonte**: `GraficaPDF` pagina 5, mockup "Home".
- **Figura professionale**: full-stack (React + Postgres/RLS) + UX.
- **Dipende da**: 33, 38. **Sblocca**: —
- **Stima**: XL.

## Contesto

Niente di tutto questo esiste. La Home del mockup: testata comune; **Classifica** con le pastiglie Media / Handbalance /
Skill spinta… (scorrono in orizzontale) e 5 riquadri (Amici #1 su 12, Provincia, Regione, Italia, Mondo); **Novità** con
contatore e "Vedi tutte": righe con iniziale, nome, testo, quando, e un bottone (Record, Vedi, Classifica).

## Cosa fare

1. **Seguire, come su Instagram** — tabella `follows (follower, followee, status, created_at)`:
   - profilo **pubblico**: "Segui" vale subito;
   - profilo **privato**: "Segui" manda una richiesta, che l'altro accetta o rifiuta;
   - "Amici" (classifica e novità) = le persone che seguo. RLS: una riga la vedono solo i due interessati.
     Funzioni: segui, accetta, rifiuta, smetti di seguire, rimuovi chi mi segue, blocca.
   - Passando da pubblico a privato chi già segue resta; da privato a pubblico le richieste in attesa si accettano.
2. **Cerca persone** — icona lente in Home: ricerca per nome tra tutti i profili; risultato con nome, livello, luogo e
   bottone "Segui" (o "Richiesta inviata"). Di un profilo privato non seguito si vedono solo nome e livello.
   Limite di richieste al giorno contro lo spam. In più: link d'invito da condividere (come quello del trainer, 0007).
3. **Novità** — tabella `feed_events (id, actor, kind, payload, created_at)` + lettura per utente (`feed_reads`):
   | Tipo | Quando nasce | Bottone |
   |---|---|---|
   | `record` | l'amico salva un record di livello che migliora il suo punteggio, e ha la condivisione dei record accesa | "Record": apre il record |
   | `workout` | l'amico condivide un allenamento | "Vedi": apre l'allenamento |
   | `overtake` | un amico ti supera in una classifica | "Classifica": apre quella classifica |
   Gli eventi li crea il database (trigger su `level_records` e `level_scores`, funzione per la condivisione); li
   legge solo chi segue l'autore. Contatore dei non letti, "Vedi tutte" con elenco completo. Solo in app: le
   notifiche push restano A19.
4. **Condividere un allenamento** — dal riepilogo di fine sessione (25) e dal giorno in Scheda: "Condividi con gli
   amici". Si salva una copia in sola lettura (esercizi, serie, valori, nome dato dall'utente: "Push day").
   Chi lo apre lo vede e può **copiarlo in un giorno della propria scheda**.
5. **Condividere i record** — interruttore in Account "Condividi i nuovi record con gli amici" (acceso di default: tra
   amici), più "Non condividere" sul singolo record.
6. **Pagina Home** (`features/home` nuova, rotta `/`; Livello resta su `/livello`): testata, lente, Classifica (pastiglie
   scorrevoli con `scroll-snap`, 5 riquadri dal 38; toccando un riquadro si apre la classifica con i vicini), Novità.
   Stati vuoti: nessun amico ("Cerca i tuoi amici"), classifiche spente (invito ad accenderle), nessuna novità.
   La checklist del primo accesso (28) si sposta qui. Quinta voce "Home" nella barra in basso.
7. **Trainer**: nessun cambiamento; la Home del trainer è la stessa.
8. **Offline** (27): Home in sola lettura dalla cache; richieste e condivisioni in coda come gli altri salvataggi.
9. Moderazione minima: blocca e segnala una persona. Si mostra il nome dell'utente per intero.

## Criteri di accettazione

- Tre account di prova (A pubblico, B privato, C): C segue A subito; C chiede a B e vede le sue novità solo dopo
  l'accettazione; record di A nelle novità di C, allenamento condiviso aperto e copiato, sorpasso notificato.
- Chi non segue un profilo privato non legge niente oltre a nome e livello (test pgTAP sulle policy).
- Smettere di seguire toglie le novità di quella persona; cancellare l'account toglie tutto.

## Decisioni (Michael, 24 novembre 2026)

1. Modello **Instagram**: profilo pubblico = basta "Segui"; profilo privato = richiesta e accettazione.
2. Novità: per ora i **tre tipi** della tabella (record, allenamento condiviso, sorpasso).
3. Si mostra **il nome dell'utente**.

4. **"Amici" = chi seguo io**, con richiesta accettata (Fabio, 25 novembre 2026): non serve che l'altro mi segua. Vale
   per il riquadro Amici della classifica e per le novità. Era già così in `ranking()` (38).

## Domande aperte

Nessuna del ticket. Quelle nate facendolo sono tra le "Scelte" qui sotto; restano aperte, dal 38, l'email
dell'informativa (`VITE_PRIVACY_EMAIL`) e la decisione sui minori.

## Stato

**Fatto il 25 novembre 2026** sul ramo `claude/ticket-39-home-amici-f59875`. Niente push, niente merge, **nessuna
migration applicata a un database Supabase** (né remoto né locale: vedi "Verifica"). Da rilasciare insieme alle
migration `0015`–`0017`: l'app nuova legge colonne (`profiles.share_records`, `level_records.shared`) che esistono solo
dopo la `0018`.

**Il mockup "Home" non è nel repository**: la pagina è costruita sulla descrizione scritta qui sopra (testata,
lente, Classifica con pastiglie e 5 riquadri, Novità con contatore e "Vedi tutte") e sullo stile delle pagine già
fatte. Va confrontata col mockup da Michael.

**Cosa c'è**

- [`supabase/migrations/0018_social.sql`](../supabase/migrations/0018_social.sql):
  - **seguire**: `follow_user` (subito se il profilo è pubblico, richiesta se è privato), `unfollow_user` (anche per
    ritirare una richiesta), `accept_follow`, `reject_follow`, `remove_follower`, `block_user`, `unblock_user`,
    `report_user`. `follows` resta senza policy di scrittura: si scrive solo da queste funzioni. Da privato a pubblico
    le richieste in attesa si accettano (trigger); da pubblico a privato chi segue resta;
  - **cerca persone**: `search_people(testo)` tra tutti i profili con un nome (almeno 2 caratteri, 20 risultati) e
    `my_people()` (richieste, chi seguo, chi mi segue, bloccati). Di una persona esce una "scheda" con nome, **fascia
    del livello** (Base…Leggenda, non i punti), se è privata, il rapporto nei due versi; il luogo solo se è pubblica o
    se la seguo;
  - **link "seguimi"**: `follow_invites`, `rotate_follow_code`, `preview_follow_invite` (codice di 8 caratteri come
    quello del trainer; i codici sbagliati contano nello stesso limite, 10 all'ora);
  - **novità**: `feed_events` (con `target` per i sorpassi e i riferimenti al record e all'allenamento), `feed_reads`,
    `feed(limite)` e `feed_mark_read()`. Le crea il database: trigger su `level_records` e `level_scores` (record e
    sorpasso) e su `shared_workouts` (allenamento). Le legge solo chi segue l'autore con richiesta accettata, sia
    dalla funzione sia dalla tabella (policy);
  - **allenamenti condivisi**: `shared_workouts` (nome, giorno, esercizi con serie e valori), leggibile dall'autore e
    da chi lo segue, non modificabile, eliminabile dall'autore;
  - **condivisione dei record**: `profiles.share_records` (acceso di partenza) e `level_records.shared`;
  - **blocchi e segnalazioni**: `blocks`, `reports`; `ranking()` riscritta perché tra due persone separate da un
    blocco le righe non si vedano (contano nelle posizioni, come un profilo privato);
  - tutte le tabelle nuove si svuotano a cascata quando l'account viene eliminato.
- Test del database: [`social.test.sql`](../supabase/tests/database/social.test.sql) (131 test pgTAP) e
  [`scripts/prova-migration-0018.mjs`](../scripts/prova-migration-0018.mjs).
- App:
  - **Home** ([HomeView.tsx](../src/features/home/HomeView.tsx)) sulla rotta `/`, prima voce della barra in basso
    (Home, Livello, Scheda, Grafici, Esercizi, più Atleti per il trainer): "Cerca persone", Classifica (`RankingBoard`
    del 38, il foglio con i vicini toccando un riquadro), Novità con contatore, le ultime 4 righe e "Vedi tutte". In
    cima, solo quando servono: i primi passi (28, spostati qui da Livello), "Dove ti alleni?" per chi non ha ancora
    indicato il luogo (rimandato dal 38), le richieste di seguirti. `/classifiche` ora porta alla Home;
  - **novità** ([FeedSheets.tsx](../src/features/home/FeedSheets.tsx)): "Record" apre il record condiviso (voce,
    valore, data, punti guadagnati), "Vedi" l'allenamento condiviso con "Copia nella mia scheda" in un giorno a
    scelta, "Classifica" la classifica degli amici nella metrica del sorpasso. Aprire "Vedi tutte" le segna lette;
  - **Persone** ([PeopleView.tsx](../src/features/home/PeopleView.tsx), `/persone` e `/segui/CODICE`): ricerca, il
    proprio link (crea, condividi, cambia), richieste (Accetta / Rifiuta), chi segui, chi ti segue, bloccati,
    allenamenti che hai condiviso (Togli); menu "⋯" con smetti di seguire, togli da chi ti segue, segnala, blocca;
  - **condividere un allenamento** ([ShareWorkout.tsx](../src/components/ShareWorkout.tsx)): dal riepilogo di fine
    sessione (solo quello fatto) e dal giorno in Scheda (le serie registrate, o quelle in programma). Note e
    difficoltà non si condividono;
  - **condividere i record**: interruttore in Account ("Luogo, classifiche e amici") e "Non condividere con gli
    amici" nel foglio del record;
  - senza rete "Segui" e "Condividi" restano in coda come gli altri salvataggi (27); la Home si legge dalla cache;
  - informativa aggiornata (chi vede cosa con ricerca, seguire, novità, allenamenti condivisi); l'export dei dati
    comprende chi segui, i blocchi e gli allenamenti condivisi.

**Verifica**

- `npx vitest run` 364 verdi (19 file; nuovi `share.test.ts` e `social.test.ts`, che controlla anche che le soglie di
  `level_band` nel database siano quelle del motore), `npx tsc -b` e `npm run build` puliti. JS iniziale 100,4 KB gzip
  per `index` (era 94,5): la Home è la prima pagina e si porta dietro la classifica; Livello ora si scarica dopo.
- **Supabase non disponibile su questa macchina** (manca Docker): `supabase db reset` e `supabase test db` **non sono
  stati eseguiti**, e la `0018` non è mai girata su un Postgres di Supabase. Al loro posto
  `node scripts/prova-migration-0018.mjs` (PGlite, Postgres in WebAssembly):
  - migration 0001–0018 applicate senza errori; tre account "di prima" con record, punti e chi segue chi restano
    identici, le tabelle nuove nascono vuote, nessuna novità retroattiva;
  - `social.test.sql` 131 su 131, `rankings.test.sql` 72 su 72 (la funzione è stata riscritta), `levels.test.sql`
    43 su 43. I test coprono i criteri del ticket: C segue A subito e chiede a B; di B, privato e non seguito, legge
    solo nome e fascia del livello (scheda, tabelle, classifica); dopo l'accettazione ne vede novità e allenamento;
    record di A tra le novità, sorpasso notificato solo a chi è stato superato; smettere di seguire toglie le novità;
    account eliminato toglie tutto; in più blocco, segnalazione, link, limiti, chi non ha fatto l'accesso;
  - con `DOPO=1 node scripts/prova-migration-0017.mjs` il confronto del 38 (180 classifiche su 50.000 account contro
    un conto fatto a parte) resta giusto con la `ranking()` nuova;
  - 50.000 account, uno seguito da 2.000: classifica nazionale 30 ms, novità 0,6 ms, ricerca 15 ms, scrittura dei
    punti di chi è seguito da 2.000 persone 2 ms (col trigger dei sorpassi).
  Limiti di questa prova: schema `auth`, ruoli, pgTAP e `gen_random_bytes` sono imitazioni scritte nello script; i
  tempi sono di PGlite. **Da fare prima del rilascio**, dove c'è Docker: `supabase db reset && supabase test db`.
- **Browser, con un finto Supabase in memoria** (porta 5189 per l'app: nessuna richiesta è arrivata a un database
  vero, niente è stato scritto su Supabase), a 390×844, 360×640 e 1280×800, con dati inventati:
  - Home con richieste, classifica e novità; stato vuoto "Cerca i tuoi amici"; primi passi e "Dove ti alleni?" per
    un account senza record e senza luogo; barra con 5 e con 6 voci a 360 px senza testi tagliati, nessuno
    scorrimento orizzontale, nessun bersaglio sotto 44 px;
  - "Vedi tutte" (le righe nuove restano segnate finché è aperto), foglio del record, classifica del sorpasso,
    allenamento condiviso copiato in oggi: 3 esercizi creati e messi in programma con lo schema giusto, quello già
    in programma saltato;
  - Persone: ricerca, "Segui" a un privato che diventa "Richiesta inviata", accetta e rifiuta, crea il link,
    segnala con blocco, link di un'altra persona (`/segui/…`) valido e non valido;
  - Account: interruttore dei record; foglio del record con e senza "Non condividere"; Scheda: "Condividi con gli
    amici" manda esercizi e serie, non la nota;
  - senza `VITE_PRIVACY_EMAIL` la ricerca è spenta col suo motivo.
- **Non visto**: niente di tutto questo con un database vero (RLS dal client, trigger veri, tempi); i tre account
  A, B, C del criterio di accettazione provati solo nei test del database, non con tre telefoni; la condivisione dal
  riepilogo di fine sessione e "Togli" di un allenamento condiviso (scritti, coperti dal typecheck, non aperti nel
  browser); la coda offline per "Segui" e "Condividi" (non provata senza rete); il confronto col mockup;
  VoiceOver / TalkBack veri.

**Scelte dove il ticket non dice** (da far vedere a Fabio e Michael)

1. **La ricerca per nome è spenta finché manca l'email dell'informativa**, come i profili pubblici del 38: la
   ricerca mostra nome e livello di chiunque sia iscritto, e l'informativa deve prima dire a chi scrivere. Il link
   "seguimi" funziona comunque (il nome lo dà chi lo condivide). È un blocco dell'app (`publicProfilesEnabled`), non
   del database.
2. **Di una persona si vede la fascia del livello, non i punti.** I punti di chi seguo (o di un profilo pubblico) si
   vedono solo in classifica, come nel 38. Per questo il database ha una piccola funzione con le 6 soglie del
   complessivo (`level_band`), tenuta allineata al motore da un test.
3. **Chi apre il link di un profilo privato manda una richiesta**, non segue subito: un link può girare.
4. **Che cosa esce di un record condiviso**: voce, valore, data e punti guadagnati nel complessivo. Mai il peso
   corporeo, mai gli altri record. Il ticket dice «"Record": apre il record»: questa è la lettura più stretta.
5. **Una novità "record" per ogni salita del punteggio**, attaccata all'ultimo record toccato. I punti li scrive
   l'app dopo il record (38): se più record arrivano insieme (invio dei salvataggi offline) ne nasce una sola, per
   l'ultimo. Un ricalcolo con regole nuove non crea novità.
6. **Sorpasso**: lo riceve solo chi è stato superato, da una persona che segue; uno per persona a ogni salita
   (prima il Generale, poi le categorie), solo se chi è superato ha punti in quella classifica; un secondo sorpasso
   nella stessa classifica aggiorna la novità invece di aggiungerne un'altra.
7. **"Letto"** è "fino a quando": una riga per utente in `feed_reads`, non una per novità. Si segna aprendo "Vedi
   tutte"; il contatore è solo nella Home (niente pallino sulla barra).
8. **Blocco**: toglie il seguire nei due versi; chi è bloccato non trova più chi l'ha bloccato, non può seguirlo
   ("Profilo non trovato", non sa del blocco) e in classifica i due non si vedono. Si toglie da Persone → Bloccati.
9. **Segnalazioni**: finiscono nella tabella `reports`, che si legge solo dal pannello di Supabase. Non c'è una
   pagina per gestirle né un avviso a Fabio: va deciso come le guarda e ogni quanto.
10. **Limiti**: 30 "Segui" al giorno, 10 allenamenti condivisi al giorno, 40 esercizi per allenamento. Numeri miei.
11. **Serve il nome** per seguire, farsi seguire e creare il link: chi riceve una richiesta deve leggere chi è.
12. **Copia di un allenamento**: per ogni esercizio usa il mio (stessa voce del catalogo o stesso nome), ripristina
    quello archiviato o lo crea; non aggiunge due volte quello che ho già quel giorno; lo schema è "quante serie, coi
    valori della prima". L'allenamento condiviso è una copia: se l'autore poi corregge la giornata non cambia.
13. **Offline**: in coda vanno "Segui" e "Condividi" (ticket, punto 8). Accettare, rifiutare, bloccare, smettere di
    seguire e copiare un allenamento chiedono la rete.
14. **Primi passi in Home**: il pulsante del primo record porta a Livello; la festa a passi finiti è diventata un
    messaggio.
15. **Livello non è più nel JS iniziale** (si scarica subito dopo il primo disegno): la prima pagina è la Home.
16. **Informativa**: aggiornata con ricerca, seguire, novità e allenamenti condivisi. Resta una bozza da rileggere.

**Non fatto, di proposito**

- **Minori**: ancora da decidere (38). Con ricerca e richieste tra sconosciuti pesa di più: va deciso prima di
  mettere `VITE_PRIVACY_EMAIL`.
- Notifiche push (A19), come dice il ticket. "Vedi tutte" mostra le ultime 100 novità, senza pagine successive.
- Ricerca: scorre tutti i profili (15 ms su 50.000 con PGlite); se servirà, un indice `pg_trgm`.
- Pagina del profilo di un'altra persona: non c'è. Di un altro si vedono la riga in Persone, la riga in classifica e
  le sue novità.
- `seed.sql` non crea persone da seguire: per provare in locale servono più account.
