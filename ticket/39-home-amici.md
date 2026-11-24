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

## Domande aperte

1. "Amici" nel riquadro della classifica = chi seguo, o solo chi mi segue anche lui? Proposta: chi seguo. (Fabio)
