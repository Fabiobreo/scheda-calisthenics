# 28 — Primo accesso guidato: la checklist "Per iniziare" in Home

- **Fonte**: A14 nell'indice, misura C6 di [`audit/AUDIT.md`](../audit/AUDIT.md). Avviato dall'utente il 10 novembre 2026.
- **Figura professionale**: product designer + frontend.
- **Dipende da**: 10 (Home "Livello"), 11 (figura dell'avatar), 19 (Oggi), 21–24 (stile visivo).
- **Stima**: M.

## Decisioni (chieste prima di scrivere codice)

| Domanda | Scelta |
|---|---|
| Forma | checklist in Home, non una guida a schermate |
| Si può chiudere? | sì, con "Più tardi"; sparisce comunque da sola a passi fatti |
| Atleta collegato a un trainer | stessi passi; cambia solo il suggerimento del quarto |
| Trainer che guarda la Home dell'atleta | invariato: vede ancora la nota in sola lettura |
| Mockup | no, verifica con gli screenshot |

## Cosa è cambiato

| Intervento | Dove | Come |
|---|---|---|
| **Quattro passi** dedotti dai dati | `firstSteps.ts` (6 test) | peso → figura dell'avatar → primo record → primo allenamento. Ogni passo è fatto quando c'è il dato: un peso, `avatarBody`, un record di livello, un allenamento (`kind = 'training'`, data fino a oggi). Niente da salvare, **nessuna migration** |
| **Card "Per iniziare"** | Home, sotto il profilo, `FirstStepsCard.tsx` | `CardHead` con la spiegazione dietro "?" e, a destra, quattro blocchetti che si accendono di verde più "1/4". Ogni passo ha un pallino che diventa una spunta (rimbalza quando il passo si compie a card aperta) e un pulsante: **Inserisci** apre il campo del peso nel profilo, **Scegli** porta ad Account, **Aggiungi** apre Fondamentali spinta e ci scorre, **Scheda** porta alla Scheda |
| **Un suggerimento solo** | il prossimo passo | una riga sotto il passo da fare, le altre no: "Senza, i record in kg non contano.", "Cambia fisico man mano che sali di livello.", "Tocca una categoria e scegli un esercizio.". Per l'allenamento: "Registra un esercizio di Oggi." se c'è programma oggi, "Il tuo trainer ti prepara la settimana." se è collegato, altrimenti "Prepara la settimana dalla Scheda." |
| **Più tardi** | in fondo alla card | la nasconde su quel dispositivo, per quell'utente (`localStorage`, chiave `primi-passi-nascosti:<id>`, letta e scritta in `try/catch`). Nascosta la card, la Home torna come prima: la nota sul peso e il link alla figura |
| **Festa a passi fatti** | riquadro della festa (ticket 22) | se l'ultimo passo si compie a card aperta (es. "Registra" da Oggi): "Primi passi fatti!" con le scintille |
| **Meno doppioni** | profilo | con la card a schermo spariscono la nota "Per iniziare inserisci il tuo peso…" e il link "Scegli la figura del tuo avatar": li sostituiscono i passi |
| Stili | `src/styles.css`, blocco "Ticket 28" in fondo | pallini da 28 px, righe da 52 px, pulsanti `btn small ghost` (44 px). Le animazioni riusano `check-pop` e `block-in`, quindi "riduci movimento" le ferma già |

**Chi non la vede**: il trainer che guarda un atleta (sola lettura); un account in modalità trainer, sulla sua Home (avrebbe
quattro passi da atleta che forse non gli servono); chi ha già fatto tutto. La card aspetta che profilo, collegamenti e
dati siano arrivati, così non compare e scompare durante il caricamento.

## Stato

**Fatto il 10 novembre 2026**, sul ramo `claude/a14-primo-accesso-bd34b6`. Non unito a main.

**Audit C6**: da **1 a 3** (checklist di 4 passi). Sezione C da 20 a 22, totale da 76,9 a **78,9**.

**Verifica a 375 × 812**, con un account nuovo creato dalla registrazione in locale (`nuovo-a14@scheda.test`, poi
cancellato col suo `localStorage`):

| Prova | Esito |
|---|---|
| account nuovo | card in prima schermata, 0/4, suggerimento sul peso |
| Inserisci | apre il campo del peso con il cursore; salvato 72,5 kg → 1/4, spunta verde |
| Scegli → Account → "Donna" | tornando in Home 2/4, avatar disegnato nel profilo |
| Aggiungi | apre Fondamentali spinta e ci scorre; record di Dip → 3/4 |
| con un esercizio in programma oggi | il suggerimento diventa "Registra un esercizio di Oggi." |
| Registra da Oggi → Salva | la card sparisce, compare "Primi passi fatti!" |
| Più tardi | card nascosta, resta nascosta dopo il ricarico, nessuna festa |
| atleta del seed (tutto fatto) | nessuna card, Home identica a prima |
| trainer del seed, sua Home | nessuna card, la nota di prima |
| trainer, pagina dell'atleta | nessuna card |

L'esercizio e la riga di programma per il quarto passo sono stati inseriti nel database locale: un account nuovo non ha
esercizi, e crearli dalla UI non era l'oggetto della prova.

**Sonda** (`audit/probe.js`):
- Home dell'account nuovo con la card: axe 0, nessun bersaglio sotto 44 px, nessun testo sotto 12 px, nessuno
  scorrimento orizzontale, un h1, 50 parole in prima schermata.
- Home dell'atleta del seed, cioè la schermata di riferimento della sezione H: 36 parole e 1 dato disegnato, come prima.
  **H resta 10,0.**

Nel pannello del browser nascosto le animazioni restano ferme al primo fotogramma, e il pentagono (`opacity: 0` a inizio
animazione) non viene contato. Per misurare `drawnData` le animazioni vanno chiuse prima (`document.getAnimations()` e
poi `finish()`).

**Test**: 195 unitari verdi (+6). `tsc -b` e `npm run build` puliti.

**Peso**:
- JS iniziale **159,6 KB** gzip (era 158,3). A4 resta 2, ma il margine sul limite di 160 è di 0,4 KB.
- CSS +0,4 KB.

**Migration**: nessuna. Gli `style={{` in linea restano 8. `TodayCard.tsx` non è stato toccato.

**Non verificato**: la vista desktop a 1280 px (la card sta nella colonna di sinistra, come la nota di prima); il suggerimento
"Il tuo trainer ti prepara la settimana." con un account nuovo collegato davvero, coperto solo dai test; il caso con
`localStorage` bloccato.
