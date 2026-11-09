import { describe, expect, it } from 'vitest';
import type { Entry, PlanItem, Scheme } from '../data/types';
import { fmtScheme, fmtSet, fmtSets } from './format';
import { cues, heldSeconds } from './hold';
import { METRICS_BY_MEASURE, personalBest, recordEntryIds, repsByType, series, suggestScheme, withMeasure } from './stats';

let n = 0;
const entry = (p: Partial<Entry> & Pick<Entry, 'exerciseId' | 'date' | 'sets'>): Entry => ({
  id: `t${++n}`,
  kind: 'training',
  type: 'tecnico',
  difficulty: null,
  note: null,
  createdAt: `2026-01-01T00:00:${String(n).padStart(2, '0')}Z`,
  ...p,
});

/** Straddle planche: [peso, secondi] per serie. */
const planche = (sets: [number, number][], date: string, extra: Partial<Entry> = {}) =>
  entry({ exerciseId: 'planche', date, sets: sets.map(([weight, seconds]) => ({ weight, reps: 0, seconds })), ...extra });

const timed = (sets: number, seconds: number, weight = 0): Scheme => ({ type: 'tecnico', sets, reps: 0, seconds, weight, rest: 120 });

describe('record delle tenute', () => {
  it('miglior serie: più peso, a parità di peso più secondi', () => {
    const es = [planche([[0, 8], [0, 12]], '2026-11-02'), planche([[0, 10]], '2026-11-04'), planche([[5, 3]], '2026-11-06', { kind: 'attempt' })];
    expect(personalBest(es, 'planche')?.set).toEqual({ weight: 5, reps: 0, seconds: 3 });
    expect(personalBest(es.slice(0, 2), 'planche')).toMatchObject({ set: { weight: 0, seconds: 12 }, date: '2026-11-02' });
  });

  it('segna come record solo le tenute che migliorano', () => {
    const a = planche([[0, 8]], '2026-11-02');
    const b = planche([[0, 7]], '2026-11-03');
    const c = planche([[0, 9]], '2026-11-04');
    expect([...recordEntryIds([c, b, a])].sort()).toEqual([a.id, c.id].sort());
  });
});

describe('grafici delle tenute', () => {
  const es = [planche([[0, 8], [0, 8], [0, 6]], '2026-11-02'), planche([[0, 10], [2.5, 5]], '2026-11-09'), planche([[0, 12]], '2026-11-09')];

  it('miglior tenuta = la serie più lunga della giornata', () => {
    expect(series(es, 'planche', 'tenuta')).toEqual([
      { date: '2026-11-02', v: 8 },
      { date: '2026-11-09', v: 12 },
    ]);
  });

  it('secondi totali = somma delle serie della giornata', () => {
    expect(series(es, 'planche', 'secondi').map((p) => p.v)).toEqual([22, 27]);
  });

  it('il peso resta il massimo della giornata; le ripetizioni sono zero', () => {
    expect(series(es, 'planche', 'peso').map((p) => p.v)).toEqual([0, 2.5]);
    expect(series(es, 'planche', 'reps').map((p) => p.v)).toEqual([0, 0]);
  });

  it('le metriche si corrispondono per posizione: miglior risultato, totale, altra', () => {
    expect(METRICS_BY_MEASURE.reps).toEqual(['peso', 'reps', 'volume']);
    expect(METRICS_BY_MEASURE.time).toEqual(['tenuta', 'secondi', 'peso']);
  });

  it('le tenute non entrano nelle ripetizioni per tipo', () => {
    const dip = entry({ exerciseId: 'dip', date: '2026-11-02', type: 'forza', sets: [{ weight: 10, reps: 5, seconds: 0 }] });
    expect(repsByType([...es, dip])).toEqual([{ date: '2026-11-02', forza: 5, volume: 0, tecnico: 0 }]);
  });
});

describe('testo delle serie a tempo', () => {
  const s = (weight: number, seconds: number) => ({ weight, reps: 0, seconds });

  it('serie tutte uguali', () => {
    expect(fmtSets([s(0, 8), s(0, 8), s(0, 8), s(0, 8)])).toBe('4 serie × 8 s · 0 kg');
  });
  it('stesso peso, secondi diversi', () => {
    expect(fmtSets([s(0, 10), s(0, 8), s(0, 6)])).toBe('10 / 8 / 6 s · 0 kg');
  });
  it('pesi diversi', () => {
    expect(fmtSets([s(5, 8), s(2.5, 10)])).toBe('5 kg × 8 s · 2,5 kg × 10 s');
  });
  it('una serie sola, per i record', () => {
    expect(fmtSet(s(0, 12))).toBe('12 s');
    expect(fmtSet(s(5, 8))).toBe('5 kg × 8 s');
    expect(fmtSet({ weight: 50, reps: 6, seconds: 0 })).toBe('50 kg × 6');
  });
  it('schema del giorno', () => {
    expect(fmtScheme(timed(4, 8))).toBe('4 × 8 s · 0 kg · rec. 120 s');
    expect(fmtScheme({ type: 'forza', sets: 5, reps: 5, seconds: 0, weight: 20, rest: 0 })).toBe('5 × 5 · 20 kg');
  });
});

describe('schema da proporre per le tenute', () => {
  const item = (scheme: Scheme): PlanItem => ({ id: `p${++n}`, date: '2026-11-02', exerciseId: 'planche', sortOrder: 0, scheme, assignedBy: null, note: null });

  it('quello che ha già nel programma', () => {
    expect(suggestScheme([item(timed(4, 8))], [], 'planche', 'tecnico', 'time')).toEqual(timed(4, 8));
  });

  it("l'ultimo allenamento, in secondi", () => {
    const es = [planche([[0, 10], [0, 9]], '2026-11-02')];
    expect(suggestScheme([], es, 'planche', 'tecnico', 'time')).toEqual({ type: 'tecnico', sets: 2, reps: 0, seconds: 10, weight: 0, rest: 90 });
  });

  it('senza dati 3 × 10 s', () => {
    expect(suggestScheme([], [], 'planche', 'tecnico', 'time')).toEqual({ type: 'tecnico', sets: 3, reps: 0, seconds: 10, weight: 0, rest: 90 });
  });

  it('un personalizzato che cambia misura porta lo stesso numero', () => {
    const reps: Scheme = { type: 'volume', sets: 3, reps: 30, seconds: 0, weight: 0, rest: 60 };
    expect(withMeasure(reps, 'time')).toEqual({ ...reps, reps: 0, seconds: 30 });
    expect(withMeasure(withMeasure(reps, 'time'), 'reps')).toEqual(reps);
    expect(suggestScheme([{ ...item(reps), exerciseId: 'hollow' }], [], 'hollow', 'volume', 'time').seconds).toBe(30);
  });
});

describe('cronometro', () => {
  it('nella preparazione un tick a -3, -2, -1 e il via a 0', () => {
    expect(cues(-5.001, -2.5, 0)).toEqual(['tick']);
    expect(cues(-2.5, 0.05, 0)).toEqual(['tick', 'tick', 'go']);
  });

  it('con un obiettivo: tick nei 3 secondi prima e segnale all’obiettivo', () => {
    expect(cues(0, 4.9, 8)).toEqual([]);
    expect(cues(4.9, 8.2, 8)).toEqual(['tick', 'tick', 'tick', 'target']);
    expect(cues(8.2, 20, 8)).toEqual([]);
  });

  it('obiettivo corto: niente tick prima del via', () => {
    expect(cues(-0.5, 2, 2)).toEqual(['go', 'tick', 'target']);
  });

  it('ogni secondo suona una volta sola, anche con aggiornamenti irregolari', () => {
    const steps = [-5.001, -4.2, -3.6, -2.95, -2.1, -0.97, -0.02, 0.4, 1.6, 4.99, 5.01, 6.5, 7.9, 8.0, 9.3];
    const all = steps.slice(1).flatMap((t, i) => cues(steps[i], t, 8));
    expect(all).toEqual(['tick', 'tick', 'tick', 'go', 'tick', 'tick', 'tick', 'target']);
  });

  it('secondi tenuti: quelli compiuti, mai negativi', () => {
    expect(heldSeconds(8.97)).toBe(8);
    expect(heldSeconds(9)).toBe(9);
    expect(heldSeconds(-2)).toBe(0);
  });
});
