# 22 — Carattere visivo, secondo blocco: movimento e pittogrammi

- **Fonte**: V02 nell'indice, seguito del [ticket 21](21-carattere-visivo.md); avviato dall'utente il 10 novembre 2026.
- **Figura professionale**: UI designer + frontend.
- **Dipende da**: 21. **Sblocca**: V03 (criteri del carattere visivo nell'audit), se si decide di farlo.
- **Stima**: M.

## Decisioni (10 novembre 2026)

- **Pittogrammi**: uno per ciascuna delle 5 categorie del catalogo, non uno per esercizio. I personalizzati hanno una scintilla.
- **Animazioni**: vivaci, con rimbalzi e scintille sul record. Con "riduci movimento" del telefono sono tutte spente.
- **Niente mockup**: lo stile era già deciso nel ticket 21.

## Cosa è cambiato

| Intervento | Dove | Come |
|---|---|---|
| Pittogrammi degli esercizi | Oggi, Scheda (programma e record), Esercizi, programma dell'atleta, schede modello | `components/ExIcon.tsx`. `CategoryIcon` disegna figure a linea (appeso alla sbarra, piegamento, squat, L-sit, verticale); `ExIcon` sceglie la figura dalla voce di catalogo. Sono decorativi (`aria-hidden`): accanto c'è il nome |
| Ingresso delle pagine | tutte | `Routes` con chiave sul percorso: cambiando pagina il contenuto si rimonta, sale di 14 px e compare a cascata (50 ms tra un blocco e l'altro). Ne restano esclusi i fogli sovrapposti |
| Voce attiva della barra | barra delle sezioni | l'icona fa un piccolo salto |
| Spunta della serie | Registra | rimbalzo, anello verde che si allarga, riga che lampeggia di verde. Lo fa solo la serie appena segnata (anche dal cronometro), non quelle già fatte quando si riapre una registrazione |
| Serie a blocchetti | Oggi, Scheda | si accendono uno dopo l'altro |
| Anello di Oggi | Home | si disegna; quando è pieno fa un battito |
| Pentagono | Home | cresce dal centro ruotando |
| Numeri che salgono | profilo in Home | `CountUp` in `components/ui.tsx` (livello, settimane di fila, % del programma): da zero alla prima comparsa, dal valore di prima quando cambia |
| Nuovo record al salvataggio | Registra | se l'allenamento batte il record precedente (non il primo in assoluto, non una data futura) compare "★ Nuovo record · Dip 40 kg × 8", in ambra con le scintille, per 4 s. Il messaggio può avere ora un tono `record` (`app/toast.tsx`) |
| Record della settimana | Record personali | il valore in ambra lampeggia tre volte; anche il chip "★ Record" si accende due volte |
| Livello o ELITE sbloccati | Home | il riquadro della festa ha scintille, rimbalzo e parola che entra |
| Stati vuoti | Esercizi, Scheda (giorno senza programma, record) | `EmptyState` (nuova variante `small` dentro una card) con le cinque figure o la stella. In Esercizi c'è il pulsante "Aggiungi dal catalogo" |
| Meno movimento | tutte | con `prefers-reduced-motion` animazioni e transizioni durano 0,01 ms; scintille nascoste; `CountUp` mostra subito il valore |

## Stato

**Fatto il 10 novembre 2026**, sul ramo `animazioni-pittogrammi`.

- **Sonda** a 375 × 812 come atleta su Livello, Scheda, Esercizi e Grafici: axe 0, nessun bersaglio sotto 44 px, nessun
  testo sotto 12 px, nessuno scorrimento orizzontale, un h1 per pagina.
- **Stati vuoti** di Esercizi e Scheda: visti con il trainer, che non ha esercizi né programma.
- **Nel browser**:
  - il livello sale da 0 a 48 in circa mezzo secondo;
  - la spunta prende `pop` e la riga `set-flash`;
  - il record di prova (Dip a 40 kg) mostra il messaggio in ambra con 12 scintille. La registrazione di prova poi è
    stata eliminata.
- **Test** unitari: 187 verdi.
- **Peso**:
  - JS iniziale +1,1 KB gzip (155,7 → 156,8; la misura del ticket 21 contava diversamente i blocchi iniziali);
  - CSS +1,1 KB gzip.
- **Migration**: nessuna. Gli `style={{` in linea restano 8.

**Vista desktop** a 1280 px (Scheda): due colonne, stato vuoto "Riposo" e pittogrammi nei record a posto.

**Non verificato**: l'aspetto con "riduci movimento" attivo, che il browser di prova non simula; la regola è quella
standard.

Nel corso del lavoro è stato trovato e corretto un difetto: una regola di questo ticket metteva il messaggio del
record in `position: relative` e lo spingeva fuori dallo schermo.
