import { describe, expect, it } from 'vitest';
import type { Entry, Exercise } from '../data/types';
import { niceScale, personalBest, recordEntryIds, repsByType, series } from './stats';
import { fmtSets } from './format';

let n = 0;
const entry = (p: Partial<Entry> & Pick<Entry, 'exerciseId' | 'date' | 'sets'>): Entry => ({
  id: `e${++n}`,
  kind: 'training',
  difficulty: null,
  createdAt: `2026-01-01T00:00:${String(n).padStart(2, '0')}Z`,
  ...p,
});

const dip = (sets: [number, number][], date: string, extra: Partial<Entry> = {}) =>
  entry({ exerciseId: 'dip', date, sets: sets.map(([weight, reps]) => ({ weight, reps })), ...extra });

describe('personalBest', () => {
  it('prende la serie con più peso, poi più ripetizioni, da allenamenti e tentativi', () => {
    const es = [
      dip([[40, 8], [40, 8]], '2026-11-02'),
      dip([[50, 6], [50, 5]], '2026-11-09'),
      dip([[50, 7]], '2026-11-10', { kind: 'attempt' }),
      dip([[45, 10]], '2026-11-11'),
    ];
    const pb = personalBest(es, 'dip');
    expect(pb?.set).toEqual({ weight: 50, reps: 7 });
    expect(pb?.date).toBe('2026-11-10');
  });

  it('a parità tiene la data in cui è stato raggiunto la prima volta', () => {
    const es = [dip([[60, 1]], '2026-11-12'), dip([[60, 1]], '2026-11-05')];
    expect(personalBest(es, 'dip')?.date).toBe('2026-11-05');
  });

  it('restituisce null senza registrazioni', () => {
    expect(personalBest([], 'dip')).toBeNull();
  });
});

describe('recordEntryIds', () => {
  it('segna solo le registrazioni che hanno migliorato il record del momento', () => {
    const a = dip([[40, 8]], '2026-11-02');
    const b = dip([[40, 6]], '2026-11-03');
    const c = dip([[40, 9]], '2026-11-04');
    const d = dip([[50, 1]], '2026-11-05');
    expect([...recordEntryIds([d, c, b, a])].sort()).toEqual([a.id, c.id, d.id].sort());
  });
});

describe('series', () => {
  const es = [dip([[50, 6], [50, 5], [45, 6]], '2026-11-09'), dip([[40, 8], [40, 8]], '2026-11-02')];

  it('peso = massimo della giornata, in ordine di data', () => {
    expect(series(es, 'dip', 'peso')).toEqual([
      { date: '2026-11-02', v: 40 },
      { date: '2026-11-09', v: 50 },
    ]);
  });

  it('ripetizioni e volume sommano le serie', () => {
    expect(series(es, 'dip', 'reps').map((p) => p.v)).toEqual([16, 17]);
    expect(series(es, 'dip', 'volume').map((p) => p.v)).toEqual([640, 820]);
  });
});

describe('repsByType', () => {
  it('raggruppa per data e tipo, ignorando esercizi sconosciuti', () => {
    const exs = [{ id: 'dip', type: 'volume' }, { id: 'mu', type: 'tecnico' }] as Exercise[];
    const es = [
      dip([[0, 10]], '2026-11-02'),
      entry({ exerciseId: 'mu', date: '2026-11-02', sets: [{ weight: 0, reps: 3 }] }),
      entry({ exerciseId: 'ghost', date: '2026-11-02', sets: [{ weight: 0, reps: 99 }] }),
    ];
    expect(repsByType(es, exs)).toEqual([{ date: '2026-11-02', forza: 0, volume: 10, tecnico: 3 }]);
  });
});

describe('niceScale', () => {
  it('arrotonda a passi tondi', () => {
    expect(niceScale(50)).toEqual({ top: 60, step: 20 });
    expect(niceScale(24)).toEqual({ top: 30, step: 10 });
    expect(niceScale(0)).toEqual({ top: 4, step: 1 });
  });
});

describe('fmtSets', () => {
  it('compatta le serie uguali', () => {
    expect(fmtSets([{ weight: 50, reps: 6 }, { weight: 50, reps: 6 }])).toBe('2 serie × 6 rip. · 50 kg');
  });
  it('a parità di peso elenca solo le ripetizioni', () => {
    expect(fmtSets([{ weight: 50, reps: 6 }, { weight: 50, reps: 5 }])).toBe('6 / 5 rip. · 50 kg');
  });
  it('elenca le serie con pesi diversi', () => {
    expect(fmtSets([{ weight: 52.5, reps: 6 }, { weight: 50, reps: 5 }])).toBe('52,5 kg × 6 · 50 kg × 5');
  });
});
