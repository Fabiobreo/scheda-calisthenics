import type { Scheme, WorkSet } from '../data/types';

const nf = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 });

export const fmt = (n: number) => nf.format(n);

/** Intero tra min e max compresi. */
export const isInt = (n: number, min: number, max: number) => Number.isInteger(n) && n >= min && n <= max;

/** "1 esercizio", "3 esercizi". */
export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Accetta sia "52,5" che "52.5". Restituisce NaN se non è un numero. */
export const parseNum = (v: string) => (v.trim() === '' ? NaN : Number(v.trim().replace(',', '.')));

/** Numero → stringa per un input, con la virgola decimale. */
export const numInput = (n: number) => String(n).replace('.', ',');

export const fmtDuration = (sec: number) => {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** Ripetizioni o secondi di una serie, con l'unità: "6", "8 s". */
const val = (s: WorkSet) => (s.seconds > 0 ? `${s.seconds} s` : String(s.reps));

/**
 * Serie tutte uguali: "3 serie × 6 rip. · 50 kg" (a tempo "4 serie × 8 s · 0 kg").
 * Stesso peso: "6 / 6 / 5 rip. · 50 kg" ("8 / 8 / 6 s · 0 kg").
 * Altrimenti: "50 kg × 6 · 45 kg × 6" ("10 kg × 8 s · 5 kg × 10 s").
 */
export function fmtSets(sets: WorkSet[]): string {
  if (!sets.length) return '';
  const w = sets[0].weight;
  const timed = sets.every((s) => s.seconds > 0);
  const n = (s: WorkSet) => (timed ? s.seconds : s.reps);
  const unit = timed ? 's' : 'rip.';
  if (sets.every((s) => s.weight === w)) {
    if (sets.every((s) => n(s) === n(sets[0]))) return `${sets.length} serie × ${n(sets[0])} ${unit} · ${fmt(w)} kg`;
    return `${sets.map(n).join(' / ')} ${unit} · ${fmt(w)} kg`;
  }
  return sets.map((s) => `${fmt(s.weight)} kg × ${val(s)}`).join(' · ');
}

/** Una serie sola, per i record: "50 kg × 6", "8 s", "10 kg × 8 s". */
export const fmtSet = (s: WorkSet) => (s.seconds > 0 && s.weight === 0 ? `${s.seconds} s` : `${fmt(s.weight)} kg × ${val(s)}`);

/** Schema del giorno: "4 × 8 · 10 kg · rec. 90 s", "4 × 8 s · 0 kg". */
export const fmtScheme = (sc: Scheme) =>
  `${sc.sets} × ${sc.seconds > 0 ? `${sc.seconds} s` : sc.reps} · ${fmt(sc.weight)} kg${sc.rest > 0 ? ` · rec. ${sc.rest} s` : ''}`;
