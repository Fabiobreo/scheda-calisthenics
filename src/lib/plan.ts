import type { PlanChanges, PlanItem } from '../data/types';
import { addDays, daysBetween, inWeek } from './dates';

/** replace: la settimana di destinazione diventa uguale a quella copiata. merge: aggiunge solo gli esercizi che mancano. */
export type CopyMode = 'replace' | 'merge';

/** Ordine del calendario: data, poi posizione nel giorno. */
export const byDay = (a: PlanItem, b: PlanItem) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.sortOrder - b.sortOrder);

/** Esercizi della settimana che inizia dal lunedì `monday`, in ordine di calendario. */
export const weekItems = (plan: PlanItem[], monday: string) => plan.filter((p) => inWeek(p.date, monday)).sort(byDay);

/** Cosa togliere e aggiungere per copiare la settimana `from` (un lunedì) sulle settimane `targets` (lunedì). */
/**
 * `locked`: righe che l'utente non può togliere né sovrascrivere (programmate dal suo trainer).
 * Restano dove sono anche in replace, e la copia salta lo stesso esercizio nello stesso giorno.
 */
export function copyWeek(plan: PlanItem[], from: string, targets: string[], mode: CopyMode, locked: (p: PlanItem) => boolean = () => false): PlanChanges {
  const source = weekItems(plan, from);
  const out: PlanChanges = { remove: [], add: [] };
  for (const to of new Set(targets)) {
    if (to === from) continue;
    const shift = daysBetween(from, to);
    const target = weekItems(plan, to);
    const existing = mode === 'replace' ? target.filter(locked) : target;
    if (mode === 'replace') out.remove.push(...target.filter((p) => !locked(p)).map((p) => p.id));
    // i nuovi vanno in coda a quelli che restano nel giorno, nell'ordine della settimana copiata
    const lastOrder = new Map<string, number>();
    for (const p of existing) lastOrder.set(p.date, Math.max(lastOrder.get(p.date) ?? 0, p.sortOrder));
    for (const p of source) {
      const date = addDays(p.date, shift);
      if (existing.some((e) => e.date === date && e.exerciseId === p.exerciseId)) continue;
      const sortOrder = mode === 'replace' && !lastOrder.has(date) ? p.sortOrder : (lastOrder.get(date) ?? 0) + 1;
      lastOrder.set(date, sortOrder);
      out.add.push({ date, exerciseId: p.exerciseId, sortOrder, scheme: { ...p.scheme }, note: p.note });
    }
  }
  return out;
}
