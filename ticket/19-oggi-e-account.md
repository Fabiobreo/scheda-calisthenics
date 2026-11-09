# 19 — Audit: "Oggi" in Home e Account più completo (A03, A05)

- **Fonte**: [audit del 9 novembre 2026](../audit/AUDIT.md), interventi 3 e 5 della lista "Cosa migliorerei".
- **Figura professionale**: UX designer + frontend.
- **Dipende da**: 17, 18. **Sblocca**: A07 (modalità sessione) parte dalla card "Oggi".
- **Stima**: M.
- **Punti attesi**: +5 (C1) e +6 (E1, E2, E3, E8); ottenuti +8, vedi Stato.

## Decisioni dell'utente (9 novembre 2026)

1. **"Oggi" in cima alla Home**, sopra il livello.
2. **Privacy e termini rimandati**: servono il titolare del trattamento e un contatto, da decidere.
3. **Cambio email incluso**: è raro, due email ogni tanto non toccano davvero il limite dell'email di Supabase.

## Cosa fare e criteri di accettazione

| # | Intervento | Criterio |
|---|---|---|
| A03 | Card "Oggi" in cima alla Home con "Registra" per ogni esercizio del giorno; in Scheda il programma prima dei record | all'apertura il primo "Registra" di oggi è visibile senza scorrere (375 × 812) |
| A05 | Cambio password e cambio email da Account, versione dell'app, supporto | si cambiano password ed email senza uscire; versione visibile |

## Stato

**Fatto il 9 novembre 2026** (A05 in parte). Audit: **63,9 → 71,9** (C 15 → 20, E 6 → 9): sopra la soglia di
"prodotto professionale". Sonda: axe 0, nessun bersaglio sotto 44 px su Home, Scheda, Account.

- **A03** — `TodayCard` (`features/home/TodayCard.tsx`): titolo con la data, "n di m" fatti (verde quando sono tutti),
  per ogni esercizio schema del giorno o quanto registrato, e "Registra"/"Apri" che apre il registratore come la Scheda
  (con la nota del trainer). Nei giorni senza programma: "Riposo. Prossimo allenamento …" o l'invito a preparare la
  settimana, con il link alla Scheda. Non compare nella Home dell'atleta vista dal trainer. In Scheda il programma ora
  viene prima dei record. Il primo "Registra" sta a 235 px dall'alto; da app aperta a esercizio salvato: 2 tocchi.
- **A05** — card "Accesso e sicurezza": *Cambia password* chiede quella attuale (verificata rientrando: un telefono
  sbloccato non basta) e la nuova; *Cambia email* manda il link a entrambi gli indirizzi (verificato in Mailpit) e dice
  che fino alla conferma si entra con quella vecchia. Card "Informazioni": versione di `package.json` e commit
  (`scripts/build-info.mjs`, su Vercel da `VERCEL_GIT_COMMIT_SHA`); l'email del supporto compare solo se c'è
  `VITE_SUPPORT_EMAIL` (in `.env.example`). Nuovi messaggi in italiano per gli errori di riautenticazione.

Restano per chiudere A05: privacy e termini (E3) e un'email di supporto (E8). Trovato strada facendo: le email di
Supabase (conferma, reset, cambio email) sono in inglese → nuovo intervento **A24** nel backlog.
