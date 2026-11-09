import { DEFAULT_REST, type Entry, type ExerciseType, type Measure, type PlanItem, type Scheme, type WorkSet } from '../data/types';

export type Metric = 'peso' | 'reps' | 'volume' | 'tenuta' | 'secondi';

export const METRICS: Record<Metric, { label: string; unit: string }> = {
  peso: { label: 'Peso', unit: 'kg' },
  reps: { label: 'Rip. totali', unit: 'rip.' },
  volume: { label: 'Volume', unit: 'kg' },
  tenuta: { label: 'Miglior tenuta', unit: 's' },
  secondi: { label: 'Secondi totali', unit: 's' },
};

/**
 * Metriche di un esercizio secondo come si misura. Stessa posizione, stesso ruolo: il miglior risultato, il totale,
 * l'ultima; così la scelta resta sensata passando da un esercizio a ripetizioni a uno a tempo.
 */
export const METRICS_BY_MEASURE: Record<Measure, Metric[]> = {
  reps: ['peso', 'reps', 'volume'],
  time: ['tenuta', 'secondi', 'peso'],
};

export interface Point {
  /** Giorno della sessione o, se i punti sono raggruppati, primo giorno del gruppo. */
  date: string;
  v: number;
  /** Solo nei gruppi: ultimo giorno del gruppo. */
  end?: string;
  /** Quante sessioni contiene il punto. */
  n?: number;
}

export const totalReps = (sets: WorkSet[]) => sets.reduce((s, x) => s + x.reps, 0);
export const volume = (sets: WorkSet[]) => sets.reduce((s, x) => s + x.weight * x.reps, 0);
export const maxWeight = (sets: WorkSet[]) => sets.reduce((m, x) => Math.max(m, x.weight), 0);
export const totalSeconds = (sets: WorkSet[]) => sets.reduce((s, x) => s + x.seconds, 0);
export const maxSeconds = (sets: WorkSet[]) => sets.reduce((m, x) => Math.max(m, x.seconds), 0);

/**
 * > 0 se a è una serie migliore di b: più peso, a parità di peso più ripetizioni (o più secondi, negli esercizi a
 * tempo: lì le ripetizioni sono 0).
 */
export const compareSets = (a: WorkSet, b: WorkSet) => a.weight - b.weight || a.reps - b.reps || a.seconds - b.seconds;

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

/** Un punto per data: peso massimo, ripetizioni totali, volume totale, tenuta più lunga o secondi totali della giornata. */
export function series(entries: Entry[], exerciseId: string, metric: Metric): Point[] {
  const byDate = new Map<string, Point>();
  for (const e of entries) {
    if (e.exerciseId !== exerciseId) continue;
    const p = byDate.get(e.date) ?? { date: e.date, v: 0 };
    if (metric === 'peso') p.v = Math.max(p.v, maxWeight(e.sets));
    else if (metric === 'reps') p.v += totalReps(e.sets);
    else if (metric === 'volume') p.v += volume(e.sets);
    else if (metric === 'tenuta') p.v = Math.max(p.v, maxSeconds(e.sets));
    else p.v += totalSeconds(e.sets);
    byDate.set(e.date, p);
  }
  return [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
}

export type TypeTotals = { date: string } & Record<ExerciseType, number>;

/**
 * Ripetizioni per tipo, per data (tutte le sessioni, o le ultime `limit`). Il tipo è quello della registrazione:
 * le stesse Trazioni contano in forza un giorno e in volume un altro. Gli esercizi a tempo non hanno ripetizioni:
 * non contano, e una giornata solo di tenute non compare.
 */
export function repsByType(entries: Entry[], limit?: number): TypeTotals[] {
  const byDate = new Map<string, TypeTotals>();
  for (const e of entries) {
    if (!totalReps(e.sets)) continue;
    const d = byDate.get(e.date) ?? { date: e.date, forza: 0, volume: 0, tecnico: 0 };
    d[e.type] += totalReps(e.sets);
    byDate.set(e.date, d);
  }
  const rows = [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
  return limit ? rows.slice(-limit) : rows;
}

/** Ultima registrazione d'allenamento per l'esercizio (le entries arrivano dalla più recente). */
export const lastTraining = (entries: Entry[], exerciseId: string) =>
  entries.find((e) => e.exerciseId === exerciseId && e.kind === 'training');

const lastInPlan = (plan: PlanItem[], exerciseId: string) => [...plan].reverse().find((p) => p.exerciseId === exerciseId);

/** Recupero da proporre per un esercizio: quello dell'ultima volta che compare nel programma. */
export const suggestedRest = (plan: PlanItem[], exerciseId: string) => lastInPlan(plan, exerciseId)?.scheme.rest ?? DEFAULT_REST;

/**
 * Tipo da proporre per un esercizio nel giorno `date`: quello del programma di quel giorno o, se non c'è, dell'ultima
 * volta in programma prima di quel giorno; poi quello dell'ultimo allenamento registrato; poi della prossima volta in
 * programma; altrimenti `fallback` (di solito il tipo predefinito del catalogo).
 * Un giorno futuro in programma non deve decidere il tipo di oggi: il giovedì di volume non fa del lunedì un volume.
 */
export function suggestType(plan: PlanItem[], entries: Entry[], exerciseId: string, date: string, fallback: ExerciseType): ExerciseType {
  const rows = plan.filter((p) => p.exerciseId === exerciseId).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const upTo = rows.filter((p) => p.date <= date).pop();
  return upTo?.scheme.type ?? lastTraining(entries, exerciseId)?.type ?? rows[0]?.scheme.type ?? fallback;
}

/** Lo schema nella misura `m`: lo stesso numero passa da ripetizioni a secondi o viceversa. */
export function withMeasure(sc: Scheme, m: Measure): Scheme {
  if (m === 'time') return sc.seconds > 0 ? sc : { ...sc, reps: 0, seconds: sc.reps };
  return sc.seconds > 0 ? { ...sc, reps: sc.seconds, seconds: 0 } : sc;
}

/**
 * Schema da proporre quando si aggiunge un esercizio a un giorno: quello che ha già nel programma,
 * altrimenti l'ultimo allenamento registrato, altrimenti 3 × 8 (o 3 × 10 s) a corpo libero, di tipo `fallbackType`.
 */
export function suggestScheme(
  plan: PlanItem[],
  entries: Entry[],
  exerciseId: string,
  fallbackType: ExerciseType = 'volume',
  measure: Measure = 'reps',
): Scheme {
  const inPlan = lastInPlan(plan, exerciseId);
  if (inPlan) return withMeasure(inPlan.scheme, measure);
  const last = lastTraining(entries, exerciseId);
  if (last) {
    const first = last.sets[0];
    const sc = { type: last.type, sets: last.sets.length, reps: first.reps, seconds: first.seconds, weight: maxWeight(last.sets), rest: DEFAULT_REST };
    return withMeasure(sc, measure);
  }
  return blankScheme(fallbackType, measure);
}

/** Schema di partenza senza storia: 3 × 8 o 3 × 10 s, a corpo libero. */
export const blankScheme = (type: ExerciseType, measure: Measure): Scheme =>
  measure === 'time'
    ? { type, sets: 3, reps: 0, seconds: 10, weight: 0, rest: DEFAULT_REST }
    : { type, sets: 3, reps: 8, seconds: 0, weight: 0, rest: DEFAULT_REST };

/** Scala "tonda" per l'asse Y: 4 tacche circa. */
export function niceScale(max: number): { top: number; step: number } {
  if (!(max > 0)) return { top: 4, step: 1 };
  const raw = max / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / mag;
  const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
  return { top: Math.ceil(max / step) * step, step };
}
