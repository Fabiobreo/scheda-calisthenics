import { describe, expect, it } from 'vitest';
import type { PlanItem, ProgramItem, Scheme } from '../data/types';
import { addToProgramDay, duplicatePlanDay, duplicateProgramDay, schemeFor, sharedPreset, typeScheme } from './editor';

const sc: Scheme = { type: 'forza', sets: 5, reps: 5, seconds: 0, weight: 10, rest: 180 };
let n = 0;
const pi = (week: number, weekday: number, ref: { catalogId?: string; customName?: string }, sortOrder: number, note: string | null = null): ProgramItem => ({
  id: `i${++n}`,
  programId: 'p',
  week,
  weekday,
  catalogId: ref.catalogId ?? null,
  customName: ref.customName ?? null,
  sortOrder,
  scheme: sc,
  note,
});
const plan = (exerciseId: string, date: string, sortOrder: number): PlanItem => ({
  id: `${exerciseId}-${date}`,
  date,
  exerciseId,
  sortOrder,
  scheme: sc,
  assignedBy: 't',
  note: null,
});

describe('schema dal tipo', () => {
  it('forza 5 × 5 con 3 minuti, volume 3 × 10, tecnico 4 × 5', () => {
    expect(typeScheme('forza', 'reps')).toMatchObject({ sets: 5, reps: 5, seconds: 0, rest: 180 });
    expect(typeScheme('volume', 'reps')).toMatchObject({ sets: 3, reps: 10, rest: 90 });
    expect(typeScheme('tecnico', 'reps')).toMatchObject({ sets: 4, reps: 5, rest: 120 });
  });

  it('le tenute ricevono secondi e zero ripetizioni', () => {
    expect(typeScheme('forza', 'time')).toMatchObject({ reps: 0, seconds: 10 });
  });

  it('lo schema in comune va in ripetizioni o in secondi secondo la misura', () => {
    const s = { ...sharedPreset('volume'), weight: 5 };
    expect(schemeFor(s, 'reps')).toEqual({ type: 'volume', sets: 3, reps: 10, seconds: 0, weight: 5, rest: 90 });
    expect(schemeFor(s, 'time')).toEqual({ type: 'volume', sets: 3, reps: 0, seconds: 20, weight: 5, rest: 90 });
  });
});

describe('aggiunta multipla in una scheda modello', () => {
  const items = [pi(1, 0, { catalogId: 'trazioni' }, 1), pi(1, 0, { customName: 'Anelli' }, 4), pi(1, 1, { catalogId: 'dip' }, 9)];
  const add = addToProgramDay(
    items,
    { programId: 'p', week: 1, weekday: 0 },
    [
      { ref: { catalogId: 'dip', customName: null }, measure: 'reps' },
      { ref: { catalogId: 'trazioni', customName: null }, measure: 'reps' },
      { ref: { catalogId: null, customName: 'anelli ' }, measure: 'reps' },
      { ref: { catalogId: 'planche', customName: null }, measure: 'time' },
      { ref: { catalogId: 'planche', customName: null }, measure: 'time' },
    ],
    sharedPreset('forza'),
  );

  it("salta quelli già nel giorno (anche scritti diversi) e i doppioni, e mette gli altri in coda", () => {
    expect(add.map((a) => [a.catalogId, a.sortOrder, a.weekday])).toEqual([
      ['dip', 5, 0],
      ['planche', 6, 0],
    ]);
  });

  it('ogni esercizio prende lo schema nella sua misura', () => {
    expect(add[0].scheme).toMatchObject({ reps: 5, seconds: 0 });
    expect(add[1].scheme).toMatchObject({ reps: 0, seconds: 10 });
  });
});

describe('duplica giorno in una scheda modello', () => {
  const items = [
    pi(2, 0, { catalogId: 'trazioni' }, 2, 'piano'),
    pi(2, 0, { catalogId: 'dip' }, 1),
    pi(2, 3, { catalogId: 'dip' }, 7),
    pi(1, 0, { catalogId: 'squat' }, 1),
  ];

  it('copia nell’ordine del giorno, con nota, solo dalla settimana scelta', () => {
    const out = duplicateProgramDay(items, 2, 0, [2]);
    expect(out.map((o) => [o.catalogId, o.weekday, o.week, o.sortOrder, o.note])).toEqual([
      ['dip', 2, 2, 1, null],
      ['trazioni', 2, 2, 2, 'piano'],
    ]);
  });

  it('nel giorno di arrivo non raddoppia e accoda; il giorno di partenza e i doppioni si ignorano', () => {
    const out = duplicateProgramDay(items, 2, 0, [3, 0, 3]);
    expect(out.map((o) => [o.catalogId, o.weekday, o.sortOrder])).toEqual([['trazioni', 3, 8]]);
  });
});

describe('duplica giorno nel calendario di un atleta', () => {
  const p = [plan('a', '2026-11-09', 2), plan('b', '2026-11-09', 1), plan('a', '2026-11-11', 1)];

  it('copia nelle date scelte senza gli esercizi già presenti', () => {
    expect(duplicatePlanDay(p, '2026-11-09', ['2026-11-11', '2026-11-13', '2026-11-09']).map((o) => [o.date, o.item.exerciseId])).toEqual([
      ['2026-11-11', 'b'],
      ['2026-11-13', 'b'],
      ['2026-11-13', 'a'],
    ]);
  });
});
