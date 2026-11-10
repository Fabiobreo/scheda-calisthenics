# Audit di prodotto — Scheda Calisthenics

- **Data**: 9 novembre 2026, commit `9003b95`, migration fino a `0013`.
- **Chi**: UI/UX designer, mobile expert, product owner (sezioni A–F), coach di calisthenics (sezione G, punteggio a parte)
  e UI designer per il carattere visivo (sezione H, punteggio a parte, aggiunta il 10/11).
- **Ambiente**: Supabase locale con il seed (`atleta@scheda.test`, `trainer@scheda.test`), build di produzione per Lighthouse.

L'obiettivo di questo file è avere **un punteggio che si può rifare** a ogni release: ogni voce ha una misura e una
soglia, niente "mi sembra bello". Chi rifà l'audit deve ottenere lo stesso numero.

---

## Come si rifà l'audit

1. `npx supabase db reset` (dati del seed puliti), `npm run dev`.
2. Collegare l'atleta al trainer (Account trainer → *Attiva modalità trainer* → *Crea link d'invito*; atleta → apre il
   link → *Collegati*) e creare una scheda modello vuota: servono per le schermate del trainer.
3. **Sonda automatica** (sezioni B, D e H): viewport **375×812**, si incolla [`probe.js`](probe.js) nella console su
   ognuna delle **8 schermate di riferimento** (caselle e radio dentro un'etichetta si misurano sull'etichetta, che è toccabile):
   - atleta: `/`, `/scheda`, `/grafici`, `/esercizi`, `/account`
   - trainer: `/atleti`, `/atleti/<id atleta>`, `/schede/<id scheda>`

   Per la sezione H la sonda si lancia con la pagina in cima, almeno 1,5 s dopo averla aperta (animazioni d'ingresso finite).
4. **Lighthouse** (sezione A): `npx tsc -b && npx vite build && npx vite preview --port 4179`, poi
   `npx lighthouse@12.2.1 http://localhost:4179/ --form-factor=mobile --throttling-method=simulate`.
   (Misura la schermata di accesso: le altre richiedono il login.)
5. **Bundle**: somma dei valori `gzip:` dell'output di `vite build` per i `.js` che `dist/index.html` carica subito (lo `script` e i `modulepreload`); i pezzi caricati dopo (`lazy()`) non contano.
6. **Conteggi nel codice** (sezione D): i comandi sono scritti accanto a ogni voce.
7. **Conteggio dei tocchi** (sezioni C e F): si segue il percorso descritto nella voce, contando solo tocchi (lo scorrimento
   non conta, ma si annota).

Punteggio totale = somma delle sezioni A–F, su **100**. Sotto 50: prototipo. 50–69: beta usabile. 70–84: prodotto
professionale. 85+: pronto per chiedere soldi ai trainer.

---

## Punteggi del primo audit (9/11)

Per i punteggi più recenti vedi lo **Storico** in fondo.

| Sezione | Peso | Oggi | Note in una riga |
|---|---:|---:|---|
| A. Qualità tecnica | 15 | **9,7** | Lighthouse ottimo, ma un solo bundle da 191 KB e niente offline |
| B. Accessibilità ed ergonomia mobile | 20 | **8,0** | axe pulito, ma metà dei bersagli di tocco sotto i 44 px |
| C. Flussi principali | 25 | **8,0** | L'allenamento di oggi è sepolto; nessuna modalità sessione, nessun "annulla" |
| D. Coerenza visiva | 10 | **4,0** | Token rispettati; doppio avatar in testata, niente layout desktop |
| E. Completezza di prodotto | 15 | **3,0** | Mancano cambio password, privacy, notifiche, ricerca esercizi |
| F. Pronto per il trainer professionista | 15 | **4,0** | Costruire una settimana di scheda costa ~120 tocchi, su desktop è una colonna da telefono |
| **Totale** | **100** | **36,7** | **Prototipo avanzato**: buone fondamenta, non ancora un prodotto da vendere |
| G. Valutazione da coach (a parte) | 10 | **5,4** | Ottimo tracker personale, non ancora uno strumento per allenare clienti |
| H. Carattere visivo (a parte, dal 10/11) | 10 | **10,0** | Dopo il ticket 24: stati vuoti disegnati ovunque, un dato disegnato in 7 schermate su 8, meno di 50 parole a colpo d'occhio |

---

## A. Qualità tecnica — 9,7 / 15

| # | Misura | Soglia → punti | Valore oggi | Punti |
|---|---|---|---|---:|
| A1 | Lighthouse Performance (mobile) | 3 × punteggio/100 | 94 (FCP 1,8 s, LCP 2,9 s, TBT 10 ms, CLS 0,01) | 2,8 |
| A2 | Lighthouse Accessibility | 2 × punteggio/100 | 100 | 2,0 |
| A3 | Lighthouse Best practices + SEO (media) | 2 × media/100 | (100 + 91)/2 — manca `robots.txt` | 1,9 |
| A4 | JS iniziale gzip | ≤ 120 KB = 3 · ≤ 160 = 2 · ≤ 200 = 1 · oltre = 0 | **190,6 KB**, un solo chunk, nessun `lazy()` | 1,0 |
| A5 | `tsc -b` e `npm test` verdi | sì = 2 | sì, 181 test | 2,0 |
| A6 | Offline: l'app si apre con i dati in cache **e** un allenamento salvato senza rete arriva al server quando torna | sì = 3 · solo uno dei due = 1 | no: la bozza del logger sopravvive, ma senza rete non si legge né si salva nulla | 0 |

## B. Accessibilità ed ergonomia mobile — 8,0 / 20

Misure dalla sonda su 8 schermate (163 elementi interattivi in tutto).

| # | Misura | Soglia → punti | Valore oggi | Punti |
|---|---|---|---|---:|
| B1 | Violazioni axe *critical* + *serious* | 0 = 5 | 0 | 5 |
| B2 | Violazioni axe *moderate* (somma) | 0 = 3 · ≤ 4 = 2 · ≤ 8 = 1 | 9 (8 × `page-has-heading-one`, 1 × `heading-order` in Grafici) | 0 |
| B3 | Bersagli di tocco sotto 44×44 px | ≤ 5 % = 5 · ≤ 15 % = 3 · ≤ 30 % = 1 | **85 / 163 = 52 %** (Scheda: 26 su 35) | 0 |
| B4 | Testi sotto 12 px | 0 = 2 · ≤ 10 = 1 | 18 (etichette degli assi in Grafici, 11 px) | 0 |
| B5 | `document.title` diverso per ogni schermata | sì = 2 | no: sempre "Scheda Calisthenics" | 0 |
| B6 | Nessuno scorrimento orizzontale a 375 px | sì = 3 | sì | 3 |

## C. Flussi principali — 8,0 / 25

| # | Misura | Soglia → punti | Valore oggi | Punti |
|---|---|---|---|---:|
| C1 | All'apertura dell'app l'allenamento di oggi (con "Registra/Inizia") è visibile **senza scorrere** | sì = 5 | no: la Home mostra il livello; in Scheda prima vengono i Record, il primo "Registra" sta a ~1100 px | 0 |
| C2 | Tocchi per registrare un esercizio in programma oggi, serie come da piano, dall'apertura | ≤ 3 = 5 · ≤ 5 = 3 · ≤ 8 = 1 | 3 (Scheda → Registra → Salva) + 1 scorrimento | 5 |
| C3 | Modalità sessione: dopo il salvataggio si passa al prossimo esercizio del giorno, il recupero parte da solo, a fine sessione c'è un riepilogo | tutte e tre = 3 · una o due = 1 | nessuna: ogni esercizio si apre e chiude dalla lista; il recupero si avvia a mano | 0 |
| C4 | Ogni azione distruttiva ha conferma **o** "Annulla" nel toast (× nel programma, × nei record, Scollega, Archivia) | tutte = 4 · metà = 2 | metà: Scollega e Archivia chiedono conferma; le × (programma, record, schede modello) tolgono subito, senza annulla | 2 |
| C5 | Caricamento con scheletro della pagina (non solo "Caricamento…" su sfondo vuoto) | sì = 2 | no | 0 |
| C6 | Primo accesso guidato | checklist ≥ 3 passi = 3 · un suggerimento = 1 | un riquadro ("inserisci il peso…") | 1 |
| C7 | Il link d'invito mostra **chi** ti invita già prima di accedere/registrarti | sì = 3 | no: si vede la schermata di accesso generica, il nome del trainer compare solo dopo | 0 |

## D. Coerenza visiva — 4,0 / 10

| # | Misura | Soglia → punti | Valore oggi | Punti |
|---|---|---|---|---:|
| D1 | Colori scritti fuori dai token (`#…`/`rgb(` fuori da `:root` e nei `.tsx`) | 0 = 2 | 0 | 2 |
| D2 | `style={{` nei `.tsx` (`grep -ro "style={{" src \| wc -l`) | ≤ 10 = 1 | 52 | 0 |
| D3 | Regole CSS duplicate (`sort styles.css \| uniq -d`) | 0 = 1 | 1 (`.tabbar a.on::before` ripetuta) | 0 |
| D4 | Un solo elemento d'identità dell'utente in testata | sì = 2 | no: avatar del riepilogo **e** cerchio con l'iniziale, uno accanto all'altro | 0 |
| D5 | Contrasto AA (axe `color-contrast` = 0) | sì = 2 | sì | 2 |
| D6 | A 1280 px il contenuto usa più di una colonna o ≥ 60 % della larghezza | sì = 2 | no: colonna da 640 px e barra in basso anche su desktop | 0 |

## E. Completezza di prodotto — 3,0 / 15

1,5 punti per voce presente.

| # | Voce | Oggi |
|---|---|---|
| E1 | Cambio password da Account (non solo "password dimenticata") | no |
| E2 | Cambio email | no |
| E3 | Privacy policy e termini (l'app tratta peso corporeo e note sul dolore: dati sensibili per il GDPR) | no |
| E4 | Esportazione dei dati | **sì** |
| E5 | Eliminazione dell'account | **sì** |
| E6 | Notifiche (promemoria allenamento, avvisi al trainer) | no (solo in app) |
| E7 | Ricerca nel catalogo esercizi (oggi > 60 voci) | no: `<select>` nativo piatto |
| E8 | Contatto/supporto e versione dell'app visibili | no |
| E9 | Accesso senza password (magic link o Google/Apple) | no |
| E10 | Storico e grafico del peso corporeo | no (solo il valore attuale) |

## F. Pronto per il trainer professionista — 4,0 / 15

| # | Misura | Soglia → punti | Valore oggi | Punti |
|---|---|---|---|---:|
| F1 | Vista trainer su desktop a 2+ colonne (elenco atleti/settimana + dettaglio) | sì = 3 | no | 0 |
| F2 | Tocchi per costruire 1 settimana, 3 giorni × 5 esercizi con schema | ≤ 60 = 3 · ≤ 90 = 2 · ≤ 120 = 1 | ~123 (per esercizio: menu, scelta, Aggiungi, 4 campi, Aggiungi; più i giorni) | 0 |
| F3 | Copia settimana **e** duplica giorno | entrambe = 2 · una = 1 | solo copia settimana | 1 |
| F4 | Riquadro "Da guardare" con le priorità | sì = 2 | **sì** | 2 |
| F5 | Il trainer annota l'esercizio **e** risponde alla nota della sessione | entrambe = 2 · una = 1 | solo la nota sull'esercizio | 1 |
| F6 | Progressione automatica nella scheda (es. +1 rip. o +2,5 kg a settimana) | sì = 2 | no | 0 |
| F7 | Libreria di schede pronte da cui partire | sì = 1 | no | 0 |

---

## Cosa migliorerei, in ordine di resa (punti guadagnati per fatica)

Stime: XS ≤ ½ giorno, S ≤ 1 giorno, M 2–3 giorni, L ≈ 1 settimana.

| # | Intervento | Voci | Punti | Fatica |
|---|---|---|---:|---|
| 1 | **Bersagli di tocco ≥ 44 px** ovunque: `.btn.small`, `.link`, `.x`, giorni della settimana, controlli segmentati, "Modifica" | B3 | +5 | S |
| 2 | **Un `h1` e un `document.title` per schermata** ("Scheda · Scheda Calisthenics"); ordine dei titoli in Grafici | B2, B5 | +5 | XS |
| 3 | **"Oggi" in cima alla Home**: card con gli esercizi del giorno e un pulsante *Inizia allenamento*; in Scheda il programma prima dei Record | C1 | +5 | M |
| 4 | **Annulla nel toast** dopo ogni × (Scollega e Archivia hanno già la conferma) | C4 | +2 | S |
| 5 | **Account completo**: cambio password, cambio email, privacy e termini, supporto + versione | E1, E2, E3, E8 | +6 | M |
| 6 | **Vista desktop per il trainer** (lista a sinistra, atleta/settimana a destra; barra laterale invece della barra in basso sopra i 1024 px) | F1, D6 | +5 | L |
| 7 | **Modalità sessione**: dopo "Salva" si apre il prossimo esercizio, il recupero parte da solo, riepilogo finale con i record della giornata | C3 | +3 | L |
| 8 | **Editor di schede veloce**: griglia della settimana, aggiunta di più esercizi in una volta, schema precompilato dal tipo, duplica giorno | F2, F3 | +4 | L |
| 9 | **Offline vero**: cache di React Query persistita e coda dei salvataggi (la palestra in cantina senza campo è il caso normale) | A6 | +3 | L |
| 10 | **Invito con il nome del trainer** prima del login (funzione pubblica `preview_invite` per anon, solo nome) | C7 | +3 | S |
| 11 | **Testata pulita**: un solo avatar che porta ad Account; il riepilogo livello resta, il cerchio con l'iniziale sparisce | D4 | +2 | XS |
| 12 | **Code splitting** (`lazy()` per trainer, grafici, regole dei livelli) + `robots.txt` | A4, A3 | +2,1 | S |
| 13 | **Scheletri di caricamento** al posto di "Caricamento…" | C5 | +2 | S |
| 14 | **Primo accesso guidato**: peso → figura dell'avatar → primo record → primo allenamento | C6 | +2 | M |
| 15 | **Progressione automatica** nelle schede modello | F6 | +2 | M |
| 16 | **Etichette dei grafici a 12 px** | B4 | +2 | XS |
| 17 | **Ricerca e gruppi nel catalogo** (combobox con categorie: tirata, spinta, skill…) | E7 | +1,5 | S |
| 18 | **Storico del peso** con mini-grafico | E10 | +1,5 | S |
| 19 | **Notifiche push** (promemoria, avvisi "Da guardare" al trainer) | E6 | +1,5 | L |
| 20 | **Magic link** per l'accesso | E9 | +1,5 | S |
| 21 | **Risposta del trainer alla nota della sessione** | F5 | +1 | M |
| 22 | **Libreria di schede pronte** (principiante, trazioni, verticale…) | F7 | +1 | M |
| 23 | **Pulizia stile**: via gli `style={{}}` in classi, regola duplicata | D2, D3 | +2 | S |

**Proiezioni**

- Solo gli XS e S (1, 2, 4, 10, 11, 12, 13, 16, 17, 18, 20, 23): **36,7 → ~66** in circa una settimana e mezza di lavoro.
- Più 3, 5, 14 (M): **→ ~79**, a un passo da "prodotto professionale".
- Tutto: **→ ~99**. Il salto da "beta" a "da vendere" lo fanno 6, 7, 8 e 9: sono i più lunghi ma sono quelli che un trainer
  nota nei primi cinque minuti di prova.

---

## G. Valutazione da coach di calisthenics — 5,4 / 10

Punteggio a parte, perché misura se l'app **allena bene**, non se è fatta bene.

| Area | Peso | Voto | Perché |
|---|---:|---:|---|
| Sistema di livelli | 25 % | 5 | Idea forte e motivante (pentagono, zona ELITE, avatar). Ma la scala è tarata sull'élite: nelle trazioni il 100 % base si raggiunge solo con **+100 % del peso corporeo di zavorra su 1 rip.**, e il corpo libero vale 0. Un cliente con 15 trazioni pulite parte da zero e ci resta per anni: per l'80 % dei clienti di un trainer il livello non si muove, e un numero che non si muove demotiva. Panca e military (bilanciere) pesano un quinto del livello in un'app di calisthenics. Gambe e core fuori dal livello rendono la verticale da sola il 20 %. |
| Registrazione dell'allenamento | 20 % | 6 | Ottimi: serie precompilate, cronometro a tutto schermo per le tenute con schermo sempre acceso, recupero, note, tentativi di record separati. Mancano: **RPE/RIR per serie** (lo strumento base dell'autoregolazione), **assistenza con elastico** (il primo attrezzo di qualunque coach), tempo/eccentriche, lato sinistro/destro negli unilaterali (OAP, pistol, bandiera). |
| Programmazione | 20 % | 4 | Scheda per date, copia della settimana, schede modello in N settimane: le basi ci sono. Manca tutto ciò che è metodo: superserie/circuiti/EMOM, riscaldamento e mobilità, scarico, progressione automatica, giorni di test. Il "Tipo" (forza/volume/tecnico) è giusto ma non cambia nulla nell'interfaccia (né recuperi né schemi suggeriti). |
| Catalogo | 15 % | 6 | Le scale di planche e front lever sono complete e ben nominate. Mancano progressioni che uso ogni settimana: back lever (c'è solo il completo), bandiera (idem), pseudo planche lean, tuck front lever row, archer pull up/push up, typewriter, ring support/RTO, skin the cat e german hang, elbow lever, V-sit/manna, compressione e pike, preparazione dei polsi. Nessuna descrizione o video di esecuzione. |
| Rapporto coach–atleta | 20 % | 6 | Dati dell'atleta, collegamento revocabile, "Da guardare", rispetto del piano: impostazione corretta e onesta. Ma nelle skill il feedback è il **video**: senza poter caricare una ripresa per il controllo della tecnica, il coach di una planche lavora alla cieca. Manca anche un segnale di dolore/infortunio strutturato (oggi è testo libero nella nota). |

**Media pesata: 5 × 0,25 + 6 × 0,2 + 4 × 0,2 + 6 × 0,15 + 6 × 0,2 = 5,35 → 5,4.**

In una frase: **oggi la userei per tracciare i miei record, non ancora per seguire clienti paganti.** Le tre cose che da
coach cambierei per prime:

1. **Ritarare la fase base dei fondamentali** includendo le ripetizioni a corpo libero (es. trazioni 1→20 rip. = 0→50 %,
   poi la zavorra fino a 100 %), come già fatto bene per l'OAP con le progressioni. Rendere panca e military facoltativi.
2. **RPE per serie ed elastico come "peso negativo"** nel registratore (`-15 kg` di assistenza): due campi, ma cambiano il
   modo in cui il coach legge i dati.
3. **Video di controllo tecnica** allegato alla registrazione (anche solo 15 s), visibile al trainer.

## H. Carattere visivo — 10,0 / 10 (6,0 alla prima misura)

Punteggio a parte, aggiunto il 10/11 dopo i ticket 21 e 22: misura se l'app **trasmette energia** (ritmo, ricompense,
dati disegnati), cosa che A–F non vedono. Solo criteri misurabili: chi rifà l'audit ottiene lo stesso numero. Le misure
"della sonda" sono i campi `foldWords`, `drawnData`, `exRows` ed `exRowsWithIcon` di [`probe.js`](probe.js) sulle 8
schermate di riferimento.

| # | Misura | Soglia → punti | Valore oggi | Punti |
|---|---|---|---|---:|
| H1 | Stati vuoti fatti di una sola frase (`grep -rn 'className="empty"' src --include=*.tsx \| wc -l`) | 0 = 2 · ≤ 5 = 1 | 0 (erano 9 alla prima misura) | 2 |
| H2 | Parole nella prima schermata, media delle 8 schermate (`foldWords`) | ≤ 50 = 2 · ≤ 70 = 1 | 48,75 (da 36 in Livello a 71 in Grafici; prima misura 59,9) | 2 |
| H3 | Schermate con almeno un dato disegnato: anello, blocchetti, pallini, grafico con nome (`drawnData` ≥ 1) | ≥ 6 su 8 = 2 · ≥ 4 = 1 | 7: tutte tranne Account (prima misura 4) | 2 |
| H4 | Movimento: ingresso animato cambiando pagina **e** conferma animata della serie (1); `prefers-reduced-motion` ferma tutto con una regola globale (1) | 1 + 1 | sì; sì | 2 |
| H5 | Righe di esercizio con un pittogramma (`exRowsWithIcon` / `exRows`, somma sulle schermate) | 100 % = 1 | 8 / 8 | 1 |
| H6 | Ricompensa dedicata a nuovo record e livello nuovo, diversa dal messaggio standard (prova: salvare un allenamento che batte il record) | sì = 1 | sì: messaggio in ambra con scintille, riquadro della festa | 1 |

**Totale: 2 + 2 + 2 + 2 + 1 + 1 = 10,0.** Alla prima misura (10/11, ticket 23): 0 + 1 + 1 + 2 + 1 + 1 = 6,0.

Valori della sonda il 10/11, prima misura → dopo il ticket 24 (atleta, poi trainer):

| Schermata | Parole in prima schermata | Dati disegnati | Righe con pittogramma |
|---|---:|---:|---:|
| `/` | 36 → 36 | 1 → 1 | — |
| `/scheda` | 58 → 53 | 7 → 7 | 3 / 3 |
| `/grafici` | 70 → 71 | 2 → 2 | — |
| `/esercizi` | 60 → 49 | 0 → 5 | 5 / 5 |
| `/account` | 57 → 53 | 0 → 0 | — |
| `/atleti` | 89 → 41 | 0 → 1 | — |
| `/atleti/<id>` | 65 → 49 | 7 → 7 | — |
| `/schede/<id>` | 44 → 38 | 0 → 1 | — |

I tre interventi suggeriti alla prima misura (stati vuoti, dati disegnati, meno testo) sono fatti nel
[ticket 24](../ticket/24-carattere-v04-v06.md). H2 è al limite (48,75 su 50): una spiegazione in più in prima schermata la
riporta a 1.

---

## Storico dei punteggi

| Data | Commit | A | B | C | D | E | F | Totale | Coach | Carattere | Note |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 9/11/2026 | `9003b95` | 9,7 | 8,0 | 8,0 | 4,0 | 3,0 | 4,0 | **36,7** | 5,4 | — | primo audit (C4 corretto: nella prima stesura risultava 0, ma Archivia aveva già la conferma) |
| 9/11/2026 | ticket 17 | 9,7 | 20,0 | 10,0 | 7,0 | 3,0 | 4,0 | **53,7** | 5,4 | — | interventi rapidi A01, A02, A04, A11, A16 (+ regola CSS duplicata di A23); Lighthouse invariato 94/100/100/91, JS 191 KB |
| 9/11/2026 | ticket 18 | 10,9 | 20,0 | 15,0 | 8,0 | 6,0 | 4,0 | **63,9** | 5,4 | — | A10, A12, A13, A17, A18, A23; Lighthouse 95/100/100/100, JS iniziale 153 KB (A4 = 2), `style={{` 8 (A20 rimandato: serve un SMTP) |
| 9/11/2026 | ticket 19 | 10,9 | 20,0 | 20,0 | 8,0 | 9,0 | 4,0 | **71,9** | 5,4 | — | A03 ("Oggi" in Home, C1) e A05 parziale (cambio password ed email, versione: E1, E2); privacy/termini rimandati, supporto solo con `VITE_SUPPORT_EMAIL` (E3, E8 ancora 0). Soglia "prodotto professionale" (70) superata |
| 9/11/2026 | ticket 20 | 10,9 | 20,0 | 20,0 | 10,0 | 9,0 | 7,0 | **76,9** | 5,4 | — | A06: barra laterale e due colonne sopra i 1024 px (D6), atleti elenco + dettaglio e settimana a 7 colonne per il trainer (F1); a 1280 px il contenuto occupa il 76 % della larghezza; sonda a 375 e 1280 px pulita |
| 10/11/2026 | ticket 23 | 10,9 | 20,0 | 20,0 | 10,0 | 9,0 | 7,0 | **76,9** | 5,4 | 6,0 | nuova sezione H (carattere visivo, a parte), misurata dopo i ticket 21 e 22; A–F invariati. Sonda estesa con `foldWords`, `drawnData`, `exRows`, `exRowsWithIcon` |
| 10/11/2026 | ticket 24 | 10,9 | 20,0 | 20,0 | 10,0 | 9,0 | 7,0 | **76,9** | 5,4 | 10,0 | V04–V06: stati vuoti con disegno ovunque (H1), anello in Atleti, barre in Esercizi, settimane a blocchetti nelle schede (H3), spiegazioni dietro "?" (H2); JS iniziale 158,3 KB (A4 resta 2, vicino al limite di 160) |
| 10/11/2026 | ticket 25 | 10,9 | 20,0 | 23,0 | 10,0 | 9,0 | 7,0 | **79,9** | 5,4 | 10,0 | A07 modalità sessione (C3 da 0 a 3): "Inizia allenamento" in Oggi, "Salva e avanti" apre il prossimo esercizio, recupero di 2 minuti tra gli esercizi, "Salta" in fondo alla coda, riepilogo con esercizi, serie, record e minuti; sonda pulita su Home, registratore e riepilogo; JS iniziale 158,9 KB (A4 resta 2, a 1,1 KB dal limite) |
| 10/11/2026 | ticket 26 | 10,9 | 20,0 | 20,0 | 10,0 | 9,0 | 11,0 | **80,9** | 5,4 | 10,0 | A08: aggiunta multipla con uno schema dal tipo, duplica giorno, griglia della settimana su desktop. F2: da ~123 a 39 tocchi per 3 giorni × 5 esercizi (3 punti); F3: copia settimana e duplica giorno (2 punti). Sonda a 375 e 1280 px pulita, H invariata, JS iniziale 153,0 KB |
| 10/11/2026 | ticket 28 | 10,9 | 20,0 | 22,0 | 10,0 | 9,0 | 7,0 | **78,9** | 5,4 | 10,0 | A14: checklist "Per iniziare" in Home con 4 passi (peso, figura, primo record, primo allenamento) dedotti dai dati, C6 da 1 a 3; nessuna migration; sonda pulita, H invariata; JS iniziale 159,6 KB (A4 resta 2, a 0,4 KB dal limite) |
| 10/11/2026 | unione 25 + 26 + 28 | 10,9 | 20,0 | 25,0 | 10,0 | 9,0 | 11,0 | **85,9** | 5,4 | 10,0 | main con A07 (C3 = 3), A08 (F2, F3) e A14 (C6 = 3) insieme: somma delle voci misurate sui singoli rami, senza un nuovo giro completo dell'audit. Soglia "pronto per chiedere soldi ai trainer" (85) superata sulla carta |

Gli interventi sono tracciati in [`ticket/00-INDICE.md`](../ticket/00-INDICE.md), sezione "Backlog — Audit di prodotto".
