# 04 — Eliminare il Registro senza perdere funzioni

- **Punto PDF**: 4 ("la sezione REGISTRO la trovo inutile, la eliminerei")
- **Figura professionale**: UX designer (dove finiscono le funzioni), poi sviluppatore frontend.
- **Dipende da**: nulla. **Sblocca**: 07 (meno voci nella barra in basso).
- **Stima**: M

## Contesto

La sezione [RegistroView.tsx](../src/features/registro/RegistroView.tsx) è l'**unico punto** in cui oggi si può:

- vedere lo storico completo delle sessioni (anche gli esercizi registrati fuori programma e i tentativi di record);
- **indicare la difficoltà** (facile/medio/difficile) di una registrazione;
- **modificare o eliminare** una registrazione passata;
- vedere quali registrazioni hanno fatto un record (★).

Inoltre il trainer usa la stessa vista come scheda "Storico" dell'atleta
([AtletiView.tsx](../src/features/atleti/AtletiView.tsx)).

Togliere la sezione senza ricollocare queste funzioni vorrebbe dire non poter più correggere un errore di inserimento.

## Cosa fare

1. Ricollocare le funzioni (proposta da validare con il designer):
   - **Scheda / calendario**: i giorni passati mostrano già cosa è stato registrato ("Registrato: …" e "Apri"); aggiungere
     lì le registrazioni fuori programma del giorno, la difficoltà e l'eliminazione.
   - **Difficoltà**: si sceglie nel logger al salvataggio, non dopo.
   - **Storico di un esercizio**: dal grafico di quell'esercizio (13), toccando un punto si apre la sessione.
   - **Tentativi di record**: vivono nella Home Livello (10) e nei record della Scheda.
2. Rimuovere la voce Registro dalla navigazione e la rotta `/registro` (con redirect alla Scheda per chi l'ha salvata).
3. Lato trainer: sostituire la scheda "Storico" dell'atleta con il calendario (già in "Programma") che mostra il fatto
   e il programmato.
4. Rimuovere il codice non più usato.

## Criteri di accettazione

- Non esiste più la sezione Registro.
- Posso ancora: modificare ed eliminare una registrazione passata, indicarne la difficoltà, vedere le registrazioni fuori
  programma.
- Il trainer vede ancora tutto quello che l'atleta ha fatto.

## Domande aperte

1. **Bloccante** — Va bene la ricollocazione proposta (calendario della Scheda + logger + grafici)?
2. La **difficoltà** serve ancora? Nel documento non è citata; se nessuno la usa la togliamo invece di spostarla.
3. Le **note dell'atleta** sulla sessione (lette dal trainer) dove si scrivono e leggono dopo la rimozione? Proposta: nel
   logger e nel giorno del calendario.

## Stato

**Fatto il 9 novembre 2026.** Nessuna migration: cambia solo l'app.

Decisioni dell'utente sulle domande:

1. Ricollocazione: **calendario della Scheda + logger + elenco delle sessioni sotto il grafico**.
2. Difficoltà: **si tiene**, si sceglie nel logger (lì c'era già) e si vede nel calendario e dal trainer.
3. Note dell'atleta: restano nel logger; si leggono nel giorno del calendario ("La tua nota" / "Nota dell'atleta").

Dove sono finite le funzioni del Registro:

- **Giorno del calendario** (Scheda e calendario dell'atleta lato trainer): sotto gli esercizi in programma c'è
  "Registrato fuori programma" con gli allenamenti fuori programma e i tentativi di record del giorno. Le righe in
  programma mostrano difficoltà, nota e ★ Record. Il numero sotto ogni giorno conta anche il fuori programma.
- **Logger**: aprendo una registrazione esistente c'è "Elimina" (con conferma).
- **Grafici**: sotto il grafico grande, le sessioni dell'esercizio dalla più recente (5, poi "Mostra altre"); toccando
  un punto restano quelle di quel giorno. "Apri" porta al logger; il trainer le vede senza "Apri".
- `/registro` rimanda alla Scheda; la scheda "Storico" del trainer non c'è più.

Note per chi viene dopo:

- Calcolo del fuori programma in `offPlan` / `dayCount` ([plan.ts](../src/lib/plan.ts)), testati in `plan.test.ts`.
- Riga di una registrazione riusabile: [EntryItem.tsx](../src/components/EntryItem.tsx).
- Non c'è più una vista "tutte le sessioni di tutti gli esercizi in ordine": si passa per giorno (calendario) o per
  esercizio (grafici). Il ticket 13 può arricchire l'elenco sotto il grafico (periodo).
