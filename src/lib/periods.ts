import { addDays, daysBetween, mondayOf, parseDate, shortDate, toDateStr } from './dates';
import { recordPoint, type Metric, type Point } from './stats';

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

type Fixed = Exclude<Period, 'all'>;

/** "Nessuna registrazione negli ultimi 3 mesi." */
export const IN_PERIOD: Record<Fixed, string> = {
  '4w': 'nelle ultime 4 settimane',
  '3m': 'negli ultimi 3 mesi',
  '6m': 'negli ultimi 6 mesi',
  '1y': "nell'ultimo anno",
};

/** Come si raggruppano i punti: uno per sessione (giorno), per settimana o per mese. */
export type Grain = 'day' | 'week' | 'month';

/** Metriche che nel gruppo prendono il massimo (il peso); le altre la media per sessione. */
export const isMaxMetric = (m: Metric) => m === 'peso';

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

/** Primo giorno (incluso) del periodo che finisce oggi. "Tutto" non ha limiti. */
export function periodRange(period: Period, today: string): { from: string } | null {
  if (period === 'all') return null;
  if (period === '4w') return { from: addDays(today, -27) };
  return { from: addDays(addMonths(today, -MONTHS[period]), 1) };
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
 * Punti di una sessione (uno per giorno, come `series`) raggruppati: il peso prende il massimo del gruppo,
 * ripetizioni, volume e tenute (media e totale) la media per sessione. Ogni punto dice quante sessioni contiene e
 * dove finisce.
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

/**
 * Punto del grafico da segnare come record: quello che contiene la sessione record di sempre (`recordPoint` su `daily`,
 * non solo sul periodo), cioè lo stesso giorno della riga "Record" sotto il grafico. Nei gruppi vale solo per il peso,
 * dove il punto è il massimo del gruppo; una media di settimana o mese non è un record. -1 se non c'è (record fuori
 * dal periodo, oppure tutto a zero).
 */
export function recordIndex(points: Point[], daily: Point[], grain: Grain, metric: Metric): number {
  if (grain !== 'day' && !isMaxMetric(metric)) return -1;
  const rec = recordPoint(daily);
  if (!rec) return -1;
  return points.findIndex((p) => rec.date >= p.date && rec.date <= (p.end ?? p.date));
}
