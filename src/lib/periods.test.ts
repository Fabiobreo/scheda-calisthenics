import { describe, expect, it } from 'vitest';
import {
  addMonths,
  aggregate,
  aggregateTypes,
  axisLabel,
  bucketEnd,
  bucketLabel,
  bucketStart,
  compare,
  grainFor,
  labelIndexes,
  periodRange,
  summarize,
} from './periods';
import type { Point } from './stats';

const pts = (...xs: [string, number][]): Point[] => xs.map(([date, v]) => ({ date, v }));

describe('addMonths', () => {
  it('sposta di mesi senza scavalcare la fine del mese', () => {
    expect(addMonths('2026-11-09', -3)).toBe('2026-08-09');
    expect(addMonths('2026-03-31', -1)).toBe('2026-02-28');
    expect(addMonths('2028-03-31', -1)).toBe('2028-02-29');
    expect(addMonths('2026-01-15', -12)).toBe('2025-01-15');
    expect(addMonths('2026-12-31', 1)).toBe('2027-01-31');
  });
});

describe('periodRange', () => {
  it('4 settimane: 28 giorni con oggi, e i 28 prima', () => {
    expect(periodRange('4w', '2026-11-09')).toEqual({ from: '2026-10-13', prevFrom: '2026-09-15' });
  });
  it('mesi: dal giorno dopo la stessa data di n mesi fa', () => {
    expect(periodRange('3m', '2026-11-09')).toEqual({ from: '2026-08-10', prevFrom: '2026-05-10' });
    expect(periodRange('1y', '2026-11-09')).toEqual({ from: '2025-11-10', prevFrom: '2024-11-10' });
  });
  it('Tutto non ha limiti', () => {
    expect(periodRange('all', '2026-11-09')).toBeNull();
  });
});

describe('grainFor', () => {
  it('per sessione fino a 3 mesi, per settimana fino a un anno', () => {
    expect(grainFor('4w', [])).toBe('day');
    expect(grainFor('3m', [])).toBe('day');
    expect(grainFor('6m', [])).toBe('week');
    expect(grainFor('1y', [])).toBe('week');
  });
  it('Tutto: secondo quanto tempo coprono i dati', () => {
    expect(grainFor('all', ['2026-11-01'])).toBe('day');
    expect(grainFor('all', ['2026-09-01', '2026-11-01'])).toBe('day');
    expect(grainFor('all', ['2026-01-01', '2026-11-01'])).toBe('week');
    expect(grainFor('all', ['2026-11-01', '2024-06-01'])).toBe('month');
  });
});

describe('gruppi', () => {
  it('inizio e fine di settimana (da lunedì) e mese', () => {
    expect(bucketStart('2026-11-09', 'week')).toBe('2026-11-09');
    expect(bucketStart('2026-11-15', 'week')).toBe('2026-11-09');
    expect(bucketEnd('2026-11-09', 'week')).toBe('2026-11-15');
    expect(bucketStart('2026-02-17', 'month')).toBe('2026-02-01');
    expect(bucketEnd('2026-02-01', 'month')).toBe('2026-02-28');
    expect(bucketEnd('2026-12-01', 'month')).toBe('2026-12-31');
  });
});

describe('aggregate', () => {
  const days = pts(['2026-11-02', 10], ['2026-11-04', 20], ['2026-11-06', 15], ['2026-11-10', 30]);

  it('per sessione lascia i punti come sono', () => {
    expect(aggregate(days, 'day', 'reps')).toEqual(days.map((p) => ({ ...p, n: 1 })));
  });
  it('ripetizioni: media per sessione della settimana', () => {
    expect(aggregate(days, 'week', 'reps')).toEqual([
      { date: '2026-11-02', end: '2026-11-08', n: 3, v: 15 },
      { date: '2026-11-09', end: '2026-11-15', n: 1, v: 30 },
    ]);
  });
  it('peso e tenuta: massimo del gruppo', () => {
    expect(aggregate(days, 'week', 'peso').map((p) => p.v)).toEqual([20, 30]);
    expect(aggregate(days, 'month', 'tenuta')).toEqual([{ date: '2026-11-01', end: '2026-11-30', n: 4, v: 30 }]);
  });
  it('medie arrotondate a un decimale', () => {
    expect(aggregate(pts(['2026-11-02', 10], ['2026-11-03', 10], ['2026-11-04', 11]), 'week', 'secondi')[0].v).toBe(10.3);
  });
});

describe('aggregateTypes', () => {
  it('media per sessione di ogni tipo', () => {
    const rows = [
      { date: '2026-11-02', forza: 10, volume: 0, tecnico: 3 },
      { date: '2026-11-05', forza: 0, volume: 20, tecnico: 0 },
    ];
    expect(aggregateTypes(rows, 'week')).toEqual([{ date: '2026-11-02', end: '2026-11-08', n: 2, forza: 5, volume: 10, tecnico: 1.5 }]);
  });
});

describe('compare', () => {
  const range = { from: '2026-10-13', prevFrom: '2026-09-15' };
  const days = pts(['2026-09-01', 99], ['2026-09-20', 10], ['2026-10-01', 20], ['2026-10-20', 18], ['2026-11-05', 24]);

  it('media a sessione: periodo contro periodo prima, ignorando quello che c’è prima ancora', () => {
    expect(compare(days, range, 'reps')).toEqual({ cur: 21, prev: 15, pct: 40 });
  });
  it('massimo per il peso', () => {
    expect(compare(days, range, 'peso')).toEqual({ cur: 24, prev: 20, pct: 20 });
  });
  it('senza sessioni prima non c’è percentuale', () => {
    expect(compare(pts(['2026-11-05', 24]), range, 'reps')).toEqual({ cur: 24, prev: null, pct: null });
  });
  it('prima a 0 (corpo libero): niente percentuale', () => {
    expect(compare(pts(['2026-10-01', 0], ['2026-11-05', 5]), range, 'peso')).toEqual({ cur: 5, prev: 0, pct: null });
  });
  it('calo', () => {
    expect(compare(pts(['2026-10-01', 20], ['2026-11-05', 15]), range, 'reps').pct).toBe(-25);
  });
});

describe('summarize', () => {
  it('vuoto vale 0', () => {
    expect(summarize([], 'reps')).toBe(0);
    expect(summarize([], 'peso')).toBe(0);
  });
});

describe('etichette', () => {
  it('asse e testo', () => {
    expect(axisLabel('2026-11-03', 'day')).toBe('3 nov');
    expect(axisLabel('2026-11-01', 'month')).toBe('nov 26');
    expect(axisLabel('2025-11-10', 'week')).toBe('nov 25');
    expect(bucketLabel('2026-11-02', 'week')).toBe('settimana del 2 nov');
    expect(bucketLabel('2026-11-01', 'month')).toBe('novembre 2026');
  });
  it('al più 4 etichette, sempre la prima e l’ultima', () => {
    expect(labelIndexes(3)).toEqual([0, 1, 2]);
    expect(labelIndexes(52)).toEqual([0, 17, 34, 51]);
    expect(labelIndexes(0)).toEqual([]);
  });
});
