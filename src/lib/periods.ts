import { addDays, daysBetween, mondayOf, parseDate, shortDate, toDateStr } from './dates';
import type { Metric, Point, TypeTotals } from './stats';

/** Periodi dei Grafici. */
export type Period = '4w' | '3m' | '6m' | '1y' | 'all';

export const PERIODS: { v: Period; l: string }[] = [
  { v: '4w', l: '4 sett.' },
  { v: '3m', l: '3 mesi' },
  { v: '6m', l: '6 mesi' },
  { v: '1y', l: '1 anno' },
  { v: 'all', l: 'Tutto' },
];

export const DEFAULT_PERIOD: Period = '3m';
export const isPeriod = (s: unknown): s is Period => PERIODS.some((p) => p.v === s);

/** Il periodo nel testo: "media a sessione, ultimi 3 mesi". */
export const PERIOD_NAME: Record<Period, string> = {
  '4w': 'ultime 4 settimane',
  '3m': 'ultimi 3 mesi',
  '6m': 'ultimi 6 mesi',
  '1y': 'ultimo anno',
  all: 'da sempre',
};

type Fixed = Exclude<Period, 'all'>;

/** "Nessuna registrazione negli ultimi 3 mesi." */
export const IN_PERIOD: Record<Fixed, string> = {
  '4w': 'nelle ultime 4 settimane',
  '3m': 'negli ultimi 3 mesi',
  '6m': 'negli ultimi 6 mesi',
  '1y': "nell'ultimo anno",
};

/** Il confronto col periodo prima: "+12% rispetto ai 3 mesi prima" o "nessuna sessione nei 3 mesi prima". */
export const PREVIOUS: Record<Fixed, { vs: string; none: string }> = {
  '4w': { vs: 'rispetto alle 4 settimane prima', none: 'nessuna sessione nelle 4 settimane prima' },
  '3m': { vs: 'rispetto ai 3 mesi prima', none: 'nessuna sessione nei 3 mesi prima' },
  '6m': { vs: 'rispetto ai 6 mesi prima', none: 'nessuna sessione nei 6 mesi prima' },
  '1y': { vs: "rispetto all'anno prima", none: "nessuna sessione nell'anno prima" },
};

/** Come si raggruppano i punti: uno per sessione (giorno), per settimana o per mese. */
export type Grain = 'day' | 'week' | 'month';

/** Metriche che nel gruppo prendono il massimo; le altre la media per sessione. */
export const isMaxMetric = (m: Metric) => m === 'peso' || m === 'tenuta';

/** YYYY-MM-DD spostata di `n` mesi; il 31 marzo meno un mese è il 28 (o 29) febbraio, non il 3 marzo. */
export function addMonths(s: string, n: number): string {
  const d = parseDate(s);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return toDateStr(d);
}

/** Arrotondato a un decimale: le medie si leggono "45,3", non "45,33". */
const round1 = (n: number) => Math.round(n * 10) / 10;

const MONTHS: Record<Exclude<Period, 'all' | '4w'>, number> = { '3m': 3, '6m': 6, '1y': 12 };

/**
 * Primo giorno (incluso) del periodo che finisce oggi, e del periodo uguale subito prima (`prevFrom`, fino a
 * `from - 1`). "Tutto" non ha limiti né confronto.
 */
export function periodRange(period: Period, today: string): { from: string; prevFrom: string } | null {
  if (period === 'all') return null;
  if (period === '4w') return { from: addDays(today, -27), prevFrom: addDays(today, -55) };
  const n = MONTHS[period];
  return { from: addDays(addMonths(today, -n), 1), prevFrom: addDays(addMonths(today, -2 * n), 1) };
}

/** Raggruppamento per il periodo: per sessione fino a 3 mesi, per settimana fino a un anno, per mese oltre. */
export function grainFor(period: Period, dates: string[]): Grain {
  if (period === '4w' || period === '3m') return 'day';
  if (period === '6m' || period === '1y') return 'week';
  if (dates.length < 2) return 'day';
  const span = daysBetween(dates.reduce((a, b) => (a < b ? a : b)), dates.reduce((a, b) => (a > b ? a : b)));
  return span <= 92 ? 'day' : span <= 366 ? 'week' : 'month';
}

/** Inizio del gruppo che contiene la data: la data stessa, il lunedì o il primo del mese. */
export function bucketStart(date: string, grain: Grain): string {
  if (grain === 'day') return date;
  if (grain === 'week') return mondayOf(date);
  return `${date.slice(0, 7)}-01`;
}

/** Ultimo giorno del gruppo che inizia in `start`. */
export function bucketEnd(start: string, grain: Grain): string {
  if (grain === 'day') return start;
  if (grain === 'week') return addDays(start, 6);
  return addDays(addMonths(start, 1), -1);
}

/**
 * Punti di una sessione (uno per giorno, come `series`) raggruppati: peso e tenuta prendono il massimo del gruppo,
 * ripetizioni, volume e secondi la media per sessione. Ogni punto dice quante sessioni contiene e dove finisce.
 */
export function aggregate(points: Point[], grain: Grain, metric: Metric): Point[] {
  if (grain === 'day') return points.map((p) => ({ ...p, n: 1 }));
  const groups = new Map<string, Point[]>();
  for (const p of points) {
    const k = bucketStart(p.date, grain);
    groups.set(k, [...(groups.get(k) ?? []), p]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, ps]) => ({ date, end: bucketEnd(date, grain), n: ps.length, v: round1(summarize(ps, metric)) }));
}

/** Valore di un insieme di sessioni: massimo o media per sessione secondo la metrica. 0 se vuoto. */
export function summarize(points: Point[], metric: Metric): number {
  if (!points.length) return 0;
  if (isMaxMetric(metric)) return Math.max(...points.map((p) => p.v));
  return points.reduce((s, p) => s + p.v, 0) / points.length;
}

/** Ripetizioni per tipo raggruppate: per ogni tipo la media per sessione del gruppo. */
export function aggregateTypes(rows: TypeTotals[], grain: Grain): (TypeTotals & { end?: string; n: number })[] {
  if (grain === 'day') return rows.map((r) => ({ ...r, n: 1 }));
  const groups = new Map<string, TypeTotals[]>();
  for (const r of rows) {
    const k = bucketStart(r.date, grain);
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, rs]) => {
      const n = rs.length;
      const avg = (k: 'forza' | 'volume' | 'tecnico') => round1(rs.reduce((s, r) => s + r[k], 0) / n);
      return { date, end: bucketEnd(date, grain), n, forza: avg('forza'), volume: avg('volume'), tecnico: avg('tecnico') };
    });
}

export interface Comparison {
  /** Valore del periodo (massimo o media per sessione). */
  cur: number;
  /** Valore del periodo prima; null se allora non ci sono sessioni. */
  prev: number | null;
  /** Variazione in percentuale, arrotondata; null se non si può calcolare (niente prima, o prima era 0). */
  pct: number | null;
}

/** Confronto del periodo con quello subito prima, partendo dai punti per sessione (non raggruppati). */
export function compare(points: Point[], range: { from: string; prevFrom: string }, metric: Metric): Comparison {
  const cur = summarize(points.filter((p) => p.date >= range.from), metric);
  const before = points.filter((p) => p.date >= range.prevFrom && p.date < range.from);
  const prev = before.length ? summarize(before, metric) : null;
  const pct = prev ? Math.round(((cur - prev) / prev) * 100) : null;
  return { cur: round1(cur), prev: prev === null ? null : round1(prev), pct };
}

/**
 * Etichetta per l'asse X: "3 nov" per le sessioni; "nov 25" per settimane e mesi, che coprono anche più di un anno
 * ("10 nov" e "2 nov" di due anni diversi si confonderebbero).
 */
export function axisLabel(date: string, grain: Grain): string {
  if (grain === 'day') return shortDate(date);
  return parseDate(date).toLocaleDateString('it-IT', { month: 'short', year: '2-digit' }).replace('.', '');
}

/** Descrizione di un gruppo nel testo: "3 nov", "settimana del 3 nov", "novembre 2025". */
export function bucketLabel(date: string, grain: Grain): string {
  if (grain === 'day') return shortDate(date);
  if (grain === 'week') return `settimana del ${shortDate(date)}`;
  return parseDate(date).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
}

/** Indici di al più `max` etichette distribuite sull'asse (sempre la prima e l'ultima). */
export function labelIndexes(count: number, max = 4): number[] {
  if (count <= max) return Array.from({ length: count }, (_, i) => i);
  const out = new Set<number>();
  for (let i = 0; i < max; i++) out.add(Math.round((i * (count - 1)) / (max - 1)));
  return [...out];
}
