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

export const shortDate = (s: string) =>
  parseDate(s).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }).replace('.', '');

export const longDate = (s: string) =>
  parseDate(s).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
