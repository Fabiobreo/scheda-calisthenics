import { describe, expect, it } from 'vitest';
import type { Entry, PlanItem } from '../data/types';
import { niceScale, personalBest, recordEntryIds, repsByType, series, suggestedRest, suggestScheme, suggestType } from './stats';
import { fmtSets } from './format';
import { addDays, mondayOf, weekLabel } from './dates';
import { copyWeek } from './plan';

let n = 0;
const entry = (p: Partial<Entry> & Pick<Entry, 'exerciseId' | 'date' | 'sets'>): Entry => ({
  id: `e${++n}`,
  kind: 'training',
  type: 'volume',
  difficulty: null,
  note: null,
  createdAt: `2026-01-01T00:00:${String(n).padStart(2, '0')}Z`,
  ...p,
});

const dip = (sets: [number, number][], date: string, extra: Partial<Entry> = {}) =>
  entry({ exerciseId: 'dip', date, sets: sets.map(([weight, reps]) => ({ weight, reps, seconds: 0 })), ...extra });

describe('personalBest', () => {
  it('prende la serie con più peso, poi più ripetizioni, da allenamenti e tentativi', () => {
    const es = [
      dip([[40, 8], [40, 8]], '2026-11-02'),
      dip([[50, 6], [50, 5]], '2026-11-09'),
      dip([[50, 7]], '2026-11-10', { kind: 'attempt' }),
      dip([[45, 10]], '2026-11-11'),
    ];
    const pb = personalBest(es, 'dip');
    expect(pb?.set).toEqual({ weight: 50, reps: 7, seconds: 0 });
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
  it('raggruppa per data e per il tipo della registrazione', () => {
    const es = [
      dip([[0, 10]], '2026-11-02'),
      entry({ exerciseId: 'mu', date: '2026-11-02', type: 'tecnico', sets: [{ weight: 0, reps: 3, seconds: 0 }] }),
    ];
    expect(repsByType(es)).toEqual([{ date: '2026-11-02', forza: 0, volume: 10, tecnico: 3 }]);
  });

  it('lo stesso esercizio conta in forza un giorno e in volume un altro', () => {
    const es = [dip([[20, 5]], '2026-11-02', { type: 'forza' }), dip([[0, 15]], '2026-11-05', { type: 'volume' })];
    expect(repsByType(es)).toEqual([
      { date: '2026-11-02', forza: 5, volume: 0, tecnico: 0 },
      { date: '2026-11-05', forza: 0, volume: 15, tecnico: 0 },
    ]);
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
    expect(fmtSets([{ weight: 50, reps: 6, seconds: 0 }, { weight: 50, reps: 6, seconds: 0 }])).toBe('2 serie × 6 rip. · 50 kg');
  });
  it('a parità di peso elenca solo le ripetizioni', () => {
    expect(fmtSets([{ weight: 50, reps: 6, seconds: 0 }, { weight: 50, reps: 5, seconds: 0 }])).toBe('6 / 5 rip. · 50 kg');
  });
  it('elenca le serie con pesi diversi', () => {
    expect(fmtSets([{ weight: 52.5, reps: 6, seconds: 0 }, { weight: 50, reps: 5, seconds: 0 }])).toBe('52,5 kg × 6 · 50 kg × 5');
  });
});

describe('date delle settimane', () => {
  it('trova il lunedì della settimana, anche di domenica', () => {
    expect(mondayOf('2026-11-04')).toBe('2026-11-02');
    expect(mondayOf('2026-11-02')).toBe('2026-11-02');
    // domenica: il lunedì è quello precedente, non il successivo
    expect(mondayOf('2026-11-08')).toBe('2026-11-02');
  });

  it("sposta le date oltre mese, anno e cambio dell'ora legale", () => {
    expect(addDays('2026-10-26', 7)).toBe('2026-11-02');
    expect(addDays('2026-12-28', 7)).toBe('2027-01-04');
    expect(addDays('2027-03-22', 7)).toBe('2027-03-29');
    expect(addDays('2026-11-02', -7)).toBe('2026-10-26');
  });

  it('scrive la settimana, con due mesi se serve', () => {
    expect(weekLabel('2026-11-02')).toBe('2–8 nov');
    expect(weekLabel('2026-11-30')).toBe('30 nov – 6 dic');
  });
});

describe('copyWeek', () => {
  const sc = (sets: number, type: PlanItem['scheme']['type'] = 'volume') => ({ type, sets, reps: 5, seconds: 0, weight: 0, rest: 90 });
  const at = (date: string, exerciseId: string, sortOrder: number, sets = 3): PlanItem => ({ id: `p${++n}`, date, exerciseId, sortOrder, scheme: sc(sets), assignedBy: null, note: null });
  const plan = [at('2026-11-02', 'trazioni', 1, 5), at('2026-11-02', 'dip', 2), at('2026-11-05', 'squat', 1)];

  it('copia esercizi e schema negli stessi giorni delle settimane scelte', () => {
    const { add, remove } = copyWeek(plan, '2026-11-02', ['2026-11-09', '2026-11-16'], 'merge');
    expect(remove).toEqual([]);
    expect(add.map((p) => `${p.date} ${p.exerciseId} ${p.scheme.sets}`)).toEqual([
      '2026-11-09 trazioni 5',
      '2026-11-09 dip 3',
      '2026-11-12 squat 3',
      '2026-11-16 trazioni 5',
      '2026-11-16 dip 3',
      '2026-11-19 squat 3',
    ]);
  });

  it('in merge lascia com’è quello che c’è già e mette i nuovi in coda al giorno', () => {
    const already = at('2026-11-09', 'trazioni', 1, 8);
    const { add, remove } = copyWeek([...plan, already], '2026-11-02', ['2026-11-09'], 'merge');
    expect(remove).toEqual([]);
    expect(add.map((p) => `${p.date} ${p.exerciseId} ${p.sortOrder}`)).toEqual(['2026-11-09 dip 2', '2026-11-12 squat 1']);
  });

  it('in replace toglie tutta la settimana di destinazione', () => {
    const already = at('2026-11-10', 'plank', 1);
    const { add, remove } = copyWeek([...plan, already], '2026-11-02', ['2026-11-09'], 'replace');
    expect(remove).toEqual([already.id]);
    expect(add).toHaveLength(3);
  });

  it('non tocca le righe del trainer: restano anche in replace e la copia non le duplica', () => {
    const fromTrainer = { ...at('2026-11-09', 'trazioni', 1, 8), assignedBy: 'trainer' };
    const mine = at('2026-11-10', 'plank', 1);
    const { add, remove } = copyWeek([...plan, fromTrainer, mine], '2026-11-02', ['2026-11-09'], 'replace', (p) => p.assignedBy !== null);
    expect(remove).toEqual([mine.id]);
    expect(add.map((p) => `${p.date} ${p.exerciseId} ${p.sortOrder}`)).toEqual(['2026-11-09 dip 2', '2026-11-12 squat 1']);
  });

  it('copia anche il tipo di ogni giorno', () => {
    const week = [{ ...at('2026-11-02', 'trazioni', 1), scheme: sc(5, 'forza') }, { ...at('2026-11-05', 'trazioni', 1), scheme: sc(3, 'volume') }];
    const { add } = copyWeek(week, '2026-11-02', ['2026-11-09'], 'merge');
    expect(add.map((p) => `${p.date} ${p.scheme.type}`)).toEqual(['2026-11-09 forza', '2026-11-12 volume']);
  });

  it('ignora la settimana di partenza tra le destinazioni', () => {
    expect(copyWeek(plan, '2026-11-02', ['2026-11-02'], 'replace')).toEqual({ remove: [], add: [] });
  });
});

describe('suggestScheme', () => {
  const item = (exerciseId: string, scheme: PlanItem['scheme']): PlanItem => ({ id: `p${++n}`, date: '2026-11-02', exerciseId, sortOrder: 0, scheme, assignedBy: null, note: null });

  it("prende lo schema che l'esercizio ha già nel programma, l'ultimo se sono più d'uno", () => {
    const plan = [item('dip', { type: 'volume', sets: 3, reps: 8, seconds: 0, weight: 0, rest: 60 }), item('dip', { type: 'forza', sets: 5, reps: 5, seconds: 0, weight: 20, rest: 120 })];
    expect(suggestScheme(plan, [], 'dip')).toEqual({ type: 'forza', sets: 5, reps: 5, seconds: 0, weight: 20, rest: 120 });
    expect(suggestedRest(plan, 'dip')).toBe(120);
  });

  it("senza programma parte dall'ultimo allenamento, con il recupero predefinito", () => {
    const es = [dip([[30, 6], [25, 6], [25, 5]], '2026-11-09', { type: 'forza' }), dip([[10, 10]], '2026-11-02')];
    expect(suggestScheme([], es, 'dip')).toEqual({ type: 'forza', sets: 3, reps: 6, seconds: 0, weight: 30, rest: 90 });
    expect(suggestedRest([], 'dip')).toBe(90);
  });

  it('senza dati propone 3 × 8 a corpo libero, del tipo predefinito', () => {
    expect(suggestScheme([], [], 'dip')).toEqual({ type: 'volume', sets: 3, reps: 8, seconds: 0, weight: 0, rest: 90 });
    expect(suggestScheme([], [], 'dip', 'tecnico').type).toBe('tecnico');
  });
});

describe('suggestType', () => {
  const item = (date: string, type: PlanItem['scheme']['type']): PlanItem => ({
    id: `p${++n}`, date, exerciseId: 'dip', sortOrder: 0, scheme: { type, sets: 3, reps: 5, seconds: 0, weight: 0, rest: 90 }, assignedBy: null, note: null,
  });

  const week = [item('2026-11-05', 'volume'), item('2026-11-02', 'forza')];

  it('prende il tipo del programma di quel giorno, non di un giorno dopo', () => {
    expect(suggestType(week, [], 'dip', '2026-11-02', 'tecnico')).toBe('forza');
    expect(suggestType(week, [], 'dip', '2026-11-05', 'tecnico')).toBe('volume');
  });

  it("senza quel giorno in programma prende l'ultima volta prima", () => {
    expect(suggestType(week, [], 'dip', '2026-11-04', 'tecnico')).toBe('forza');
    expect(suggestType(week, [], 'dip', '2026-11-20', 'tecnico')).toBe('volume');
  });

  it("prima del programma usa l'ultimo allenamento, poi la prossima volta in programma", () => {
    const es = [dip([[20, 5]], '2026-10-20', { type: 'tecnico' })];
    expect(suggestType(week, es, 'dip', '2026-10-30', 'volume')).toBe('tecnico');
    expect(suggestType(week, [], 'dip', '2026-10-30', 'tecnico')).toBe('forza');
  });

  it('senza programma né allenamenti usa il predefinito', () => {
    expect(suggestType([], [], 'dip', '2026-11-02', 'tecnico')).toBe('tecnico');
  });
});
