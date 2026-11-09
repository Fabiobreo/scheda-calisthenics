import { describe, expect, it } from 'vitest';
import type { Entry, PlanItem } from '../data/types';
import { dayCount, offPlan } from './plan';

const entry = (id: string, exerciseId: string, date: string, kind: Entry['kind'] = 'training', at = '00'): Entry => ({
  id,
  exerciseId,
  date,
  kind,
  type: 'forza',
  sets: [{ weight: 0, reps: 5, seconds: 0 }],
  difficulty: null,
  note: null,
  createdAt: `2026-11-01T10:00:${at}Z`,
});
const item = (exerciseId: string, date: string): PlanItem => ({
  id: `p-${exerciseId}-${date}`,
  date,
  exerciseId,
  sortOrder: 0,
  scheme: { type: 'forza', sets: 3, reps: 5, seconds: 0, weight: 0, rest: 120 },
  assignedBy: null,
  note: null,
});

describe('registrato fuori programma', () => {
  const plan = [item('trazioni', '2026-11-09'), item('dip', '2026-11-10')];
  const entries = [
    entry('a', 'trazioni', '2026-11-09', 'training', '02'),
    entry('b', 'plank', '2026-11-09', 'training', '03'),
    entry('c', 'trazioni', '2026-11-09', 'attempt', '01'),
    entry('d', 'dip', '2026-11-09', 'training', '04'),
    entry('e', 'plank', '2026-11-08'),
  ];

  it("esclude l'allenamento dell'esercizio in programma, tiene altri esercizi e tentativi, in ordine di salvataggio", () => {
    expect(offPlan(entries, plan, '2026-11-09').map((e) => e.id)).toEqual(['c', 'b', 'd']);
  });

  it('un esercizio in programma un altro giorno conta come fuori programma', () => {
    expect(offPlan(entries, plan, '2026-11-09').some((e) => e.id === 'd')).toBe(true);
  });

  it('giorno senza programma: tutto è fuori programma', () => {
    expect(offPlan(entries, plan, '2026-11-08').map((e) => e.id)).toEqual(['e']);
    expect(offPlan(entries, plan, '2026-11-11')).toEqual([]);
  });

  it('il conto del giorno somma programma e fuori programma, senza contare due volte', () => {
    expect(dayCount(entries, plan, '2026-11-09')).toBe(4);
    expect(dayCount(entries, plan, '2026-11-10')).toBe(1);
    expect(dayCount(entries, plan, '2026-11-08')).toBe(1);
  });
});
