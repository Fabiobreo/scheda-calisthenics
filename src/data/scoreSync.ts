import type { LevelScores } from '../lib/levels';

/**
 * Punti sul server (ticket 38): il livello lo calcola sempre l'app dai record, e a ogni cambiamento riscrive la sua
 * riga di `level_scores`, che serve alle classifiche. Qui c'è solo la decisione, senza rete: che cosa scrivere dati i
 * punti calcolati ora e quelli salvati.
 *
 * - niente riga sul server e nessun punto: non si scrive niente (chi non ha record non entra in classifica);
 * - riga con numeri diversi (un record nuovo, corretto o eliminato): si riscrive, anche per tornare a zero;
 * - riga uguale ma con regole più vecchie: si riscrive, così il server sa che i punti sono di queste regole;
 * - riga con regole più NUOVE di quelle di questa app (app rimasta indietro su questo dispositivo): non si tocca.
 */
export function scoreToSave(local: LevelScores, server: LevelScores | null): LevelScores | null {
  if (!server) return local.total > 0 ? local : null;
  if (server.rulesVersion > local.rulesVersion) return null;
  return sameScores(local, server) ? null : local;
}

const KEYS = ['total', 'ft', 'fs', 'st', 'ss', 'hb', 'rulesVersion'] as const;

export const sameScores = (a: LevelScores, b: LevelScores) => KEYS.every((k) => a[k] === b[k]);
