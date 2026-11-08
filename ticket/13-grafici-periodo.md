# 13 — Grafici: periodo selezionabile

- **Punto PDF**: 3 ("l'intervallo mostrato è solo una settimana; dare l'opzione di vedere l'andamento di ogni
  esercizio in qualsiasi periodo: un mese, un anno, ecc.")
- **Figura professionale**: sviluppatore frontend con competenza di data-viz.
- **Dipende da**: 01 (tipo dalle registrazioni), 03 (esercizi a tempo). **Sblocca**: 14.
- **Stima**: M

## Contesto

In [GraficiView.tsx](../src/features/grafici/GraficiView.tsx) e [stats.ts](../src/lib/stats.ts):

- il grafico "Andamento" mostra **tutte** le sessioni dell'esercizio (`series`), un punto per data, senza filtro;
- "Ripetizioni per tipo" mostra le **ultime 10 sessioni** (`repsByType(…, limit = 10)`): probabilmente è questo che
  sembra "una settimana";
- l'asse X ha solo 3 etichette; con molti mesi di dati i punti si affollano.

## Cosa fare

1. Selettore di periodo in alto, condiviso dai grafici della pagina: **4 settimane · 3 mesi · 6 mesi · 1 anno · Tutto**
   (+ intervallo personalizzato, vedi domande). Ricordato tra una visita e l'altra.
2. **Aggregazione** in base al periodo: per sessione fino a ~3 mesi, per settimana fino a 1 anno, per mese oltre
   (peso: massimo del periodo; ripetizioni/volume: somma o media per sessione — da decidere).
3. Asse X con etichette adatte al periodo (giorni, settimane, mesi).
4. Confronto col periodo precedente (es. "+12% rispetto ai 3 mesi prima").
5. Le mini-schede "Tutti gli esercizi" usano lo stesso periodo.
6. Test unitari per filtro e aggregazione.

## Criteri di accettazione

- Posso vedere l'andamento di un esercizio nell'ultimo mese, nell'ultimo anno e da sempre.
- Con un anno di dati il grafico resta leggibile.
- "Ripetizioni per tipo" rispetta il periodo scelto.

## Domande aperte

1. Serve l'intervallo personalizzato (data da–a) o bastano i periodi fissi? (Consiglio: fissi in v1.)
2. Per settimana/mese: il peso è il massimo del periodo; le ripetizioni sono il **totale** o la **media per sessione**?
3. Quali metriche vuoi davvero? Oggi: peso, ripetizioni totali, volume. Per le skill a tempo: miglior tenuta, secondi
   totali. Ne mancano (es. massimale stimato, frequenza)?
4. Vogliamo anche un grafico del **livello** e delle 5 categorie nel tempo qui in Grafici? (Lega col 10, domanda 4.)
