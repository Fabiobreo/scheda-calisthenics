/**
 * Peso corporeo del giorno di un record (05, decisione 13; 09): l'ultimo peso inserito fino a quel giorno; se il
 * record è più vecchio di ogni peso, il primo inserito dopo. Correggere un peso ricalcola i record.
 */

export interface DatedWeight {
  /** YYYY-MM-DD */
  date: string;
  kg: number;
}

/** `weights` in ordine di data crescente (come li restituisce il repo). null se non c'è nessun peso. */
export function bodyweightOn(date: string, weights: readonly DatedWeight[]): number | null {
  if (weights.length === 0) return null;
  // ultimo indice con data <= date (ricerca binaria)
  let lo = 0;
  let hi = weights.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (weights[mid].date <= date) {
      found = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return weights[found >= 0 ? found : 0].kg;
}

/** Il peso attuale: l'ultimo inserito. */
export function currentBodyweight(weights: readonly DatedWeight[]): DatedWeight | null {
  return weights.length ? weights[weights.length - 1] : null;
}

/** Aggiunge a ogni record il peso del suo giorno, nella forma che vuole il motore. */
export function withBodyweight<R extends { date: string }>(records: readonly R[], weights: readonly DatedWeight[]): (R & { bodyweightKg: number | null })[] {
  return records.map((r) => ({ ...r, bodyweightKg: bodyweightOn(r.date, weights) }));
}
