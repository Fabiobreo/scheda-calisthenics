/**
 * Ponte provvisorio tra i dati v2 (ticket 32) e il motore vecchio, che la pagina Livello usa ancora: sparisce col
 * ticket 34, insieme a `rules.ts` ed `engine.ts` di questa cartella.
 *
 * Nel database le voci hanno gli identificativi del motore v2 (`src/lib/levels/v2`). Quasi tutte coincidono con le
 * progressioni del motore vecchio; quelle qui sotto hanno cambiato nome. Le voci nate col v2 (australian, trazioni a
 * ripetizioni, push up, …) non hanno un corrispondente: il motore vecchio le ignora e la pagina vecchia non le fa
 * inserire. Le progressioni tolte (planche half lay e wide, front lever touch e pull ups in tuck, …) non sono più
 * voci del database: chi le propone deve prima controllare che la voce esista nel v2.
 *
 * Qui non si importa il motore v2, per non portarlo nel JS iniziale insieme a `useLevel`.
 */

/** catena → voce v2 → progressione del motore vecchio */
const RENAMED: Record<string, Record<string, string>> = {
  military: { massimale: 'bilanciere' },
  'panca-piana': { massimale: 'bilanciere' },
  oap: { avambraccio: 'gomito', ripetizioni: 'oap' },
  verticale: { 'oahs-straddle': 'straddle-mono-braccio', oahs: 'full-mono-braccio' },
  hspu: { liberi: 'libera' },
};

/** Progressione del motore vecchio per una voce letta dal database. */
export function legacyStage(subId: string, entry: string): string {
  return RENAMED[subId]?.[entry] ?? entry;
}

/** Identificativo v2 (quello che si scrive nel database) di una progressione del motore vecchio. */
export function v2EntryId(subId: string, stage: string): string {
  return Object.entries(RENAMED[subId] ?? {}).find(([, old]) => old === stage)?.[0] ?? stage;
}

/** Record letti dal database, con la progressione come la conosce il motore vecchio. */
export function toLegacyRecords<R extends { subId: string; stage: string }>(records: readonly R[]): R[] {
  return records.map((r) => ({ ...r, stage: legacyStage(r.subId, r.stage) }));
}
