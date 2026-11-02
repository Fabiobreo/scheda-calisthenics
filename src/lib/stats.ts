import { DEFAULT_REST, type Entry, type Exercise, type ExerciseType, type PlanItem, type Scheme, type WorkSet } from '../data/types';

export type Metric = 'peso' | 'reps' | 'volume';

export const METRICS: Record<Metric, { label: string; unit: string }> = {
  peso: { label: 'Peso', unit: 'kg' },
  reps: { label: 'Rip. totali', unit: 'rip.' },
  volume: { label: 'Volume', unit: 'kg' },
};

export interface Point {
  date: string;
  v: number;
}

export const totalReps = (sets: WorkSet[]) => sets.reduce((s, x) => s + x.reps, 0);
export const volume = (sets: WorkSet[]) => sets.reduce((s, x) => s + x.weight * x.reps, 0);
export const maxWeight = (sets: WorkSet[]) => sets.reduce((m, x) => Math.max(m, x.weight), 0);

/** > 0 se a è una serie migliore di b: più peso, a parità di peso più ripetizioni. */
export const compareSets = (a: WorkSet, b: WorkSet) => a.weight - b.weight || a.reps - b.reps;

export function bestSet(sets: WorkSet[]): WorkSet | null {
  return sets.reduce<WorkSet | null>((best, s) => (!best || compareSets(s, best) > 0 ? s : best), null);
}

/** Ordine cronologico: data, poi momento di inserimento. */
export const chrono = (a: Entry, b: Entry) =>
  a.date < b.date ? -1 : a.date > b.date ? 1 : a.createdAt.localeCompare(b.createdAt);

export interface PersonalBest {
  set: WorkSet;
  date: string;
  entryId: string;
}

/** Miglior serie singola di sempre per l'esercizio, considerando allenamenti e tentativi. */
export function personalBest(entries: Entry[], exerciseId: string): PersonalBest | null {
  let pb: PersonalBest | null = null;
  for (const e of entries.filter((x) => x.exerciseId === exerciseId).sort(chrono)) {
    const b = bestSet(e.sets);
    // solo un miglioramento stretto: a parità resta la data del primo raggiungimento
    if (b && (!pb || compareSets(b, pb.set) > 0)) pb = { set: b, date: e.date, entryId: e.id };
  }
  return pb;
}

/** Id delle registrazioni che, quando sono state fatte, hanno stabilito un nuovo record. */
export function recordEntryIds(entries: Entry[]): Set<string> {
  const best = new Map<string, WorkSet>();
  const ids = new Set<string>();
  for (const e of [...entries].sort(chrono)) {
    const b = bestSet(e.sets);
    if (!b) continue;
    const prev = best.get(e.exerciseId);
    if (!prev || compareSets(b, prev) > 0) {
      best.set(e.exerciseId, b);
      ids.add(e.id);
    }
  }
  return ids;
}

/** Un punto per data: peso massimo, ripetizioni totali o volume totale della giornata. */
export function series(entries: Entry[], exerciseId: string, metric: Metric): Point[] {
  const byDate = new Map<string, Point>();
  for (const e of entries) {
    if (e.exerciseId !== exerciseId) continue;
    const p = byDate.get(e.date) ?? { date: e.date, v: 0 };
    if (metric === 'peso') p.v = Math.max(p.v, maxWeight(e.sets));
    else if (metric === 'reps') p.v += totalReps(e.sets);
    else p.v += volume(e.sets);
    byDate.set(e.date, p);
  }
  return [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
}

export type TypeTotals = { date: string } & Record<ExerciseType, number>;

/** Ripetizioni per tipo di esercizio, per data, sulle ultime `limit` sessioni. */
export function repsByType(entries: Entry[], exercises: Exercise[], limit = 10): TypeTotals[] {
  const typeOf = new Map(exercises.map((e) => [e.id, e.type]));
  const byDate = new Map<string, TypeTotals>();
  for (const e of entries) {
    const t = typeOf.get(e.exerciseId);
    if (!t) continue;
    const d = byDate.get(e.date) ?? { date: e.date, forza: 0, volume: 0, tecnico: 0 };
    d[t] += totalReps(e.sets);
    byDate.set(e.date, d);
  }
  return [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1)).slice(-limit);
}

/** Ultima registrazione d'allenamento per l'esercizio (le entries arrivano dalla più recente). */
export const lastTraining = (entries: Entry[], exerciseId: string) =>
  entries.find((e) => e.exerciseId === exerciseId && e.kind === 'training');

const lastInPlan = (plan: PlanItem[], exerciseId: string) => [...plan].reverse().find((p) => p.exerciseId === exerciseId);

/** Recupero da proporre per un esercizio: quello dell'ultima volta che compare nel programma. */
export const suggestedRest = (plan: PlanItem[], exerciseId: string) => lastInPlan(plan, exerciseId)?.scheme.rest ?? DEFAULT_REST;

/**
 * Schema da proporre quando si aggiunge un esercizio a un giorno: quello che ha già nel programma,
 * altrimenti l'ultimo allenamento registrato, altrimenti 3 × 8 a corpo libero.
 */
export function suggestScheme(plan: PlanItem[], entries: Entry[], exerciseId: string): Scheme {
  const inPlan = lastInPlan(plan, exerciseId);
  if (inPlan) return inPlan.scheme;
  const last = lastTraining(entries, exerciseId);
  if (last) return { sets: last.sets.length, reps: last.sets[0].reps, weight: maxWeight(last.sets), rest: DEFAULT_REST };
  return { sets: 3, reps: 8, weight: 0, rest: DEFAULT_REST };
}

/** Scala "tonda" per l'asse Y: 4 tacche circa. */
export function niceScale(max: number): { top: number; step: number } {
  if (!(max > 0)) return { top: 4, step: 1 };
  const raw = max / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / mag;
  const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
  return { top: Math.ceil(max / step) * step, step };
}
