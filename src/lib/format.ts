import type { WorkSet } from '../data/types';

const nf = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 });

export const fmt = (n: number) => nf.format(n);

/** Accetta sia "52,5" che "52.5". Restituisce NaN se non è un numero. */
export const parseNum = (v: string) => (v.trim() === '' ? NaN : Number(v.trim().replace(',', '.')));

/** Numero → stringa per un input, con la virgola decimale. */
export const numInput = (n: number) => String(n).replace('.', ',');

export const fmtDuration = (sec: number) => {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/**
 * Serie tutte uguali: "3 serie × 6 rip. · 50 kg".
 * Stesso peso: "6 / 6 / 5 rip. · 50 kg".
 * Altrimenti: "50 kg × 6 · 45 kg × 6".
 */
export function fmtSets(sets: WorkSet[]): string {
  if (!sets.length) return '';
  const w = sets[0].weight;
  if (sets.every((s) => s.weight === w)) {
    if (sets.every((s) => s.reps === sets[0].reps)) return `${sets.length} serie × ${sets[0].reps} rip. · ${fmt(w)} kg`;
    return `${sets.map((s) => s.reps).join(' / ')} rip. · ${fmt(w)} kg`;
  }
  return sets.map((s) => `${fmt(s.weight)} kg × ${s.reps}`).join(' · ');
}
