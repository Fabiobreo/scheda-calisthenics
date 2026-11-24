import { DEFAULT_REST, type Entry, type ExerciseType, type Measure, type PlanItem, type Scheme, type WorkSet } from '../data/types';
import { addDays, daysBetween, mondayOf } from './dates';

export type Metric = 'peso' | 'reps' | 'volume' | 'media' | 'secondi';

export const METRICS: Record<Metric, { label: string; unit: string }> = {
  peso: { label: 'Peso', unit: 'kg' },
  reps: { label: 'Rip. totali', unit: 'rip.' },
  volume: { label: 'Volume', unit: 'kg' },
  media: { label: 'Tenuta media', unit: 's' },
  secondi: { label: 'Tenuta totale', unit: 's' },
};

/**
 * Metriche di un esercizio secondo come si misura. A tempo sono due (ticket 36): "Tenuta media", la media dei secondi
 * delle serie della sessione, e "Tenuta totale", la loro somma.
 */
export const METRICS_BY_MEASURE: Record<Measure, Metric[]> = {
  reps: ['peso', 'reps', 'volume'],
  time: ['media', 'secondi'],
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

/**
 * Un punto per data (la sessione): peso massimo, ripetizioni totali, volume totale, secondi totali o, per la tenuta
 * media, la media dei secondi di tutte le serie della giornata (a un decimale): 10, 8 e 6 s danno 8 s di media e 24 s
 * di totale.
 */
export function series(entries: Entry[], exerciseId: string, metric: Metric): Point[] {
  const byDate = new Map<string, Point>();
  // solo per la media: quante serie ha la giornata
  const sets = new Map<string, number>();
  for (const e of entries) {
    if (e.exerciseId !== exerciseId) continue;
    const p = byDate.get(e.date) ?? { date: e.date, v: 0 };
    if (metric === 'peso') p.v = Math.max(p.v, maxWeight(e.sets));
    else if (metric === 'reps') p.v += totalReps(e.sets);
    else if (metric === 'volume') p.v += volume(e.sets);
    else p.v += totalSeconds(e.sets);
    byDate.set(e.date, p);
    sets.set(e.date, (sets.get(e.date) ?? 0) + e.sets.length);
  }
  const points = [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
  if (metric !== 'media') return points;
  return points.map((p) => {
    const n = sets.get(p.date) ?? 0;
    return { ...p, v: n ? Math.round((p.v / n) * 10) / 10 : 0 };
  });
}

/**
 * Sessione record di una metrica (ticket 36): il valore più alto tra i punti per sessione e il giorno in cui è stato
 * raggiunto la prima volta (a parità resta la prima data, come per i record personali). null se non ci sono punti o
 * sono tutti a zero (il peso di un esercizio a corpo libero).
 */
export function recordPoint(points: Point[]): Point | null {
  let best: Point | null = null;
  for (const p of points) if (p.v > 0 && (!best || p.v > best.v || (p.v === best.v && p.date < best.date))) best = p;
  return best;
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

export interface RecordStep {
  /** data dell'ultimo record */
  date: string;
  /** di quanto ha superato il record precedente, già scritto ("+2,5 kg", "+1 rip.", "+5 s"); null se è il primo */
  gain: string | null;
}

/**
 * Ultimo record di un esercizio e di quanto ha battuto quello prima (ticket 21): il progresso si legge accanto al
 * record, senza aprire lo storico. Conta il primo criterio che cambia: peso, poi ripetizioni, poi secondi.
 */
export function lastRecordStep(entries: Entry[], exerciseId: string): RecordStep | null {
  const ids = recordEntryIds(entries);
  const recs = entries.filter((e) => e.exerciseId === exerciseId && ids.has(e.id)).sort(chrono);
  const last = recs.at(-1);
  if (!last) return null;
  const prev = recs.at(-2);
  if (!prev) return { date: last.date, gain: null };
  const a = bestSet(last.sets)!;
  const b = bestSet(prev.sets)!;
  const num = (v: number) => String(Math.round(v * 100) / 100).replace('.', ',');
  const gain =
    a.weight !== b.weight
      ? `+${num(a.weight - b.weight)} kg`
      : a.reps !== b.reps
        ? `+${a.reps - b.reps} rip.`
        : `+${a.seconds - b.seconds} s`;
  return { date: last.date, gain };
}

/**
 * Registrazioni di un esercizio per settimana, dalla più vecchia alla corrente (V05: le barre in Esercizi).
 * Le settimane vanno da lunedì; contano solo le date fino a `today`.
 */
export function weeklyCounts(entries: Entry[], exerciseId: string, today: string, weeks = 8): number[] {
  const first = addDays(mondayOf(today), -7 * (weeks - 1));
  const out = Array.from({ length: weeks }, () => 0);
  for (const e of entries) {
    if (e.exerciseId !== exerciseId || e.date < first || e.date > today) continue;
    out[Math.floor(daysBetween(first, e.date) / 7)]++;
  }
  return out;
}
