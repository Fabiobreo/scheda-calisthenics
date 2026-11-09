import { describe, expect, it } from 'vitest';
import type { Entry, PlanItem } from '../data/types';
import { adherence, adherenceText, athleteAlerts, lastTrainingDate, summarizeStatuses, weekStatuses } from './adherence';

// lunedì 2 novembre 2026 … domenica 8; oggi = giovedì 5
const MON = '2026-11-02';
const TODAY = '2026-11-05';

let n = 0;
const entry = (exerciseId: string, date: string, opts: { kind?: Entry['kind']; reps?: number; weight?: number } = {}): Entry => ({
  id: `e${++n}`,
  exerciseId,
  date,
  kind: opts.kind ?? 'training',
  type: 'forza',
  sets: [{ weight: opts.weight ?? 0, reps: opts.reps ?? 5, seconds: 0 }],
  difficulty: null,
  note: null,
  createdAt: `${date}T10:00:${String(n).padStart(2, '0')}Z`,
});
const item = (exerciseId: string, date: string): PlanItem => ({
  id: `p-${exerciseId}-${date}`,
  date,
  exerciseId,
  sortOrder: 0,
  scheme: { type: 'forza', sets: 3, reps: 5, seconds: 0, weight: 0, rest: 120 },
  assignedBy: 'coach',
  note: null,
});
const kinds = (m: Map<string, { kind: string }>) => Object.fromEntries([...m].map(([k, v]) => [k, v.kind]));

describe('weekStatuses', () => {
  it('fatto lo stesso giorno, spostato nella settimana, saltato, da fare', () => {
    const plan = [item('trazioni', '2026-11-02'), item('dip', '2026-11-03'), item('squat', '2026-11-04'), item('plank', '2026-11-06')];
    const entries = [entry('trazioni', '2026-11-02'), entry('dip', '2026-11-04')];
    expect(kinds(weekStatuses(plan, entries, MON, TODAY))).toEqual({
      'p-trazioni-2026-11-02': 'done',
      'p-dip-2026-11-03': 'moved',
      'p-squat-2026-11-04': 'missed',
      'p-plank-2026-11-06': 'pending',
    });
  });

  it('fatto in anticipo conta come spostato, anche per un giorno ancora da venire', () => {
    const s = weekStatuses([item('dip', '2026-11-07')], [entry('dip', '2026-11-03')], MON, TODAY);
    expect(s.get('p-dip-2026-11-07')?.kind).toBe('moved');
  });

  it('una sessione vale per un solo giorno in programma', () => {
    const plan = [item('dip', '2026-11-02'), item('dip', '2026-11-04')];
    // due registrazioni lo stesso lunedì sono la stessa sessione
    const entries = [entry('dip', '2026-11-02'), entry('dip', '2026-11-02')];
    expect(kinds(weekStatuses(plan, entries, MON, TODAY))).toEqual({ 'p-dip-2026-11-02': 'done', 'p-dip-2026-11-04': 'missed' });
  });

  it('lo spostato prende il giorno più vicino', () => {
    const plan = [item('dip', '2026-11-02'), item('dip', '2026-11-05')];
    const entries = [entry('dip', '2026-11-03'), entry('dip', '2026-11-04')];
    const s = weekStatuses(plan, entries, MON, TODAY);
    expect(s.get('p-dip-2026-11-02')).toMatchObject({ kind: 'moved', entry: { date: '2026-11-03' } });
    expect(s.get('p-dip-2026-11-05')).toMatchObject({ kind: 'moved', entry: { date: '2026-11-04' } });
  });

  it('non contano: tentativi di record, altre settimane, registrazioni future', () => {
    const plan = [item('dip', '2026-11-02')];
    const entries = [entry('dip', '2026-11-02', { kind: 'attempt' }), entry('dip', '2026-11-01'), entry('dip', '2026-11-06')];
    expect(weekStatuses(plan, entries, MON, TODAY).get('p-dip-2026-11-02')?.kind).toBe('missed');
  });
});

describe('summarizeStatuses e adherence', () => {
  it('percentuale su fatti + spostati, senza quelli da fare', () => {
    const plan = [item('trazioni', '2026-11-02'), item('dip', '2026-11-03'), item('squat', '2026-11-04'), item('plank', '2026-11-06')];
    const entries = [entry('trazioni', '2026-11-02'), entry('dip', '2026-11-04')];
    const a = summarizeStatuses(weekStatuses(plan, entries, MON, TODAY).values());
    expect(a).toEqual({ due: 3, done: 1, moved: 1, missed: 1, pct: 67 });
    expect(adherenceText(a)).toBe('67% · 2 di 3, 1 spostato');
  });

  it('niente da fare: nessuna percentuale', () => {
    expect(adherence([], [], TODAY).pct).toBeNull();
    expect(adherenceText(adherence([], [], TODAY))).toBe('niente da fare finora');
  });

  it('somma le ultime settimane, non quelle prima', () => {
    const plan = [item('dip', '2026-10-01'), item('dip', '2026-10-13'), item('dip', '2026-10-27'), item('dip', '2026-11-02')];
    const entries = [entry('dip', '2026-10-28'), entry('dip', '2026-11-02')];
    expect(adherence(plan, entries, TODAY)).toEqual({ due: 3, done: 1, moved: 1, missed: 1, pct: 67 });
  });
});

describe('athleteAlerts', () => {
  const names: Record<string, string> = { dip: 'Dip', trazioni: 'Trazioni' };
  const base = { levelRecords: [], today: TODAY, nameOf: (id: string) => names[id], subName: (id: string) => (id === 'planche' ? 'Planche' : undefined) };
  const future = item('dip', '2026-11-09');

  it('tutto in ordine: nessun avviso', () => {
    const plan = [item('dip', '2026-10-27'), item('dip', '2026-11-03'), future];
    const entries = [entry('dip', '2026-10-27'), entry('dip', '2026-11-03')];
    expect(athleteAlerts({ ...base, plan, entries })).toEqual([]);
  });

  it('fermo da 7 giorni con un programma', () => {
    const plan = [item('dip', '2026-10-30'), item('dip', '2026-11-03'), future];
    const entries = [entry('dip', '2026-10-29')];
    const a = athleteAlerts({ ...base, plan, entries });
    expect(a.map((x) => x.kind)).toEqual(['inactive']); // il 30 è stato fatto il 29: settimana scorsa al 100%
    expect(a[0].text).toBe('Fermo da 7 giorni (ultimo allenamento 29 ott)');
  });

  it('mai allenato ma con un programma', () => {
    const a = athleteAlerts({ ...base, plan: [item('dip', '2026-11-03'), future], entries: [] });
    expect(a[0].text).toBe('Non ha ancora registrato allenamenti');
  });

  it('fermo ma senza programma: solo il programma che manca', () => {
    expect(athleteAlerts({ ...base, plan: [], entries: [] }).map((x) => x.kind)).toEqual(['no-plan']);
  });

  it('settimana scorsa sotto il 50%', () => {
    const plan = [item('dip', '2026-10-26'), item('dip', '2026-10-28'), item('dip', '2026-10-30'), future];
    const entries = [entry('dip', '2026-10-26'), entry('dip', '2026-11-04')];
    const a = athleteAlerts({ ...base, plan, entries });
    expect(a).toEqual([{ kind: 'low-week', text: 'Settimana scorsa: 33% del programma (1 di 3)' }]);
  });

  it('record nuovi: di livello e battuti in allenamento, non la prima volta di un esercizio', () => {
    const entries = [
      entry('trazioni', '2026-10-01', { weight: 10 }),
      entry('trazioni', '2026-11-04', { weight: 15 }),
      entry('dip', '2026-11-04'), // prima volta: non è un record da festeggiare
    ];
    const levelRecords = [
      { subId: 'planche', date: '2026-11-01' },
      { subId: 'planche', date: '2026-10-20' }, // troppo vecchio
    ];
    const a = athleteAlerts({ ...base, plan: [future], entries, levelRecords });
    expect(a).toEqual([{ kind: 'record', text: 'Nuovi record: Planche, Trazioni' }]);
  });
});

describe('lastTrainingDate', () => {
  it('ultimo allenamento fino a oggi, senza tentativi né date future', () => {
    expect(lastTrainingDate([entry('dip', '2026-11-01'), entry('dip', '2026-11-04', { kind: 'attempt' }), entry('dip', '2026-11-08')], TODAY)).toBe(
      '2026-11-01',
    );
    expect(lastTrainingDate([], TODAY)).toBeNull();
  });
});
