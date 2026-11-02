export const DAY_SHORT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
export const DAY_LONG = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

const pad = (n: number) => String(n).padStart(2, '0');

export const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayStr = () => toDateStr(new Date());

/** YYYY-MM-DD → Date a mezzanotte locale (new Date('YYYY-MM-DD') sarebbe UTC). */
export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** 0 = lunedì ... 6 = domenica */
export const weekdayIndex = (d: Date = new Date()) => (d.getDay() + 6) % 7;

/** YYYY-MM-DD spostata di `n` giorni (anche negativi). */
export function addDays(s: string, n: number): string {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

/** Lunedì (YYYY-MM-DD) della settimana che contiene la data. */
export const mondayOf = (s: string) => addDays(s, -weekdayIndex(parseDate(s)));

/** Giorni tra due date YYYY-MM-DD (b - a). Arrotondato: il cambio dell'ora legale non sposta il conto. */
export const daysBetween = (a: string, b: string) => Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 86400000);

/** true se `s` cade nella settimana che inizia dal lunedì `monday`. */
export const inWeek = (s: string, monday: string) => s >= monday && s <= addDays(monday, 6);

/** "2–8 nov", oppure "30 nov – 6 dic" se la settimana cambia mese. */
export function weekLabel(monday: string): string {
  const a = parseDate(monday);
  const b = parseDate(addDays(monday, 6));
  const month = (d: Date) => d.toLocaleDateString('it-IT', { month: 'short' }).replace('.', '');
  return a.getMonth() === b.getMonth() ? `${a.getDate()}–${b.getDate()} ${month(b)}` : `${a.getDate()} ${month(a)} – ${b.getDate()} ${month(b)}`;
}

export const shortDate = (s: string) =>
  parseDate(s).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }).replace('.', '');

export const longDate = (s: string) =>
  parseDate(s).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
