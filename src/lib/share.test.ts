import { describe, expect, it } from 'vitest';
import { toSharedItems } from '../data/supabaseRepo';
import type { CatalogExercise, Entry, Exercise, PlanItem, SharedItem } from '../data/types';
import { copySteps, schemeOf, sharedItems } from './share';

const DAY = '2026-11-25';

const ex = (id: string, name: string, catalogId: string | null = id, over: Partial<Exercise> = {}): Exercise => ({ id, catalogId, name, inRecords: false, measure: 'reps', sortOrder: 0, archivedAt: null, ...over });
const plan = (exerciseId: string, sortOrder: number, date = DAY, over: Partial<PlanItem['scheme']> = {}): PlanItem => ({
  id: `p-${exerciseId}-${date}`,
  date,
  exerciseId,
  sortOrder,
  scheme: { type: 'forza', sets: 3, reps: 5, seconds: 0, weight: 10, rest: 120, ...over },
  assignedBy: null,
  note: 'nota del trainer',
});
const entry = (exerciseId: string, sets: Entry['sets'], over: Partial<Entry> = {}): Entry => ({
  id: `e-${exerciseId}`,
  exerciseId,
  date: DAY,
  kind: 'training',
  type: 'volume',
  sets,
  difficulty: 'difficile',
  note: 'nota privata',
  createdAt: '2026-11-25T10:00:00Z',
  ...over,
});

const EXERCISES = [ex('trazioni', 'Trazioni'), ex('dip', 'Dip'), ex('plank', 'Plank', 'plank', { measure: 'time' }), ex('mio', 'Curl col sasso', null)];

describe('esercizi da condividere', () => {
  const PLAN = [plan('dip', 2), plan('trazioni', 1), plan('plank', 3, DAY, { reps: 0, seconds: 30, weight: 0, type: 'tecnico' }), plan('trazioni', 1, '2026-11-26')];
  const ENTRIES = [
    entry('trazioni', [
      { weight: 10, reps: 6, seconds: 0 },
      { weight: 10, reps: 5, seconds: 0 },
    ]),
    entry('mio', [{ weight: 20, reps: 12, seconds: 0 }]),
    entry('dip', [{ weight: 0, reps: 9, seconds: 0 }], { kind: 'attempt', id: 'tentativo' }),
    entry('dip', [{ weight: 0, reps: 9, seconds: 0 }], { date: '2026-11-24', id: 'ieri' }),
  ];

  it('nell\'ordine del programma: le serie fatte, o quelle in programma; in fondo il fuori programma', () => {
    const items = sharedItems(PLAN, ENTRIES, EXERCISES, DAY);
    expect(items.map((i) => i.name)).toEqual(['Trazioni', 'Dip', 'Plank', 'Curl col sasso']);
    expect(items[0]).toEqual({ name: 'Trazioni', catalogId: 'trazioni', measure: 'reps', type: 'volume', rest: 120, sets: [{ weight: 10, reps: 6, seconds: 0 }, { weight: 10, reps: 5, seconds: 0 }] });
    // non fatto: lo schema del giorno, serie per serie
    expect(items[1].sets).toEqual([1, 2, 3].map(() => ({ weight: 10, reps: 5, seconds: 0 })));
    expect(items[2]).toMatchObject({ measure: 'time', type: 'tecnico', sets: [1, 2, 3].map(() => ({ weight: 0, reps: 0, seconds: 30 })) });
    expect(items[3]).toMatchObject({ catalogId: null, rest: 90 });
  });

  it('dal riepilogo di fine sessione: solo quello che è stato fatto', () => {
    expect(sharedItems(PLAN, ENTRIES, EXERCISES, DAY, { onlyDone: true }).map((i) => i.name)).toEqual(['Trazioni', 'Curl col sasso']);
  });

  it('note, difficoltà e tentativi di record non si condividono', () => {
    const text = JSON.stringify(sharedItems(PLAN, ENTRIES, EXERCISES, DAY));
    expect(text).not.toMatch(/nota|difficile|attempt/);
    expect(Object.keys(sharedItems(PLAN, ENTRIES, EXERCISES, DAY)[0]).sort()).toEqual(['catalogId', 'measure', 'name', 'rest', 'sets', 'type']);
  });

  it('un giorno vuoto non ha niente da condividere, e non si superano i 40 esercizi', () => {
    expect(sharedItems(PLAN, ENTRIES, EXERCISES, '2026-11-30')).toEqual([]);
    const many = Array.from({ length: 45 }, (_, i) => ex(`x${i}`, `Esercizio ${i}`));
    expect(sharedItems(many.map((e, i) => plan(e.id, i)), [], many, DAY)).toHaveLength(40);
  });
});

const shared = (name: string, catalogId: string | null, over: Partial<SharedItem> = {}): SharedItem => ({ name, catalogId, measure: 'reps', type: 'forza', rest: 60, sets: [{ weight: 5, reps: 8, seconds: 0 }, { weight: 5, reps: 6, seconds: 0 }], ...over });

describe('copia nel proprio programma', () => {
  const CATALOG: CatalogExercise[] = [
    { id: 'trazioni', name: 'Trazioni', category: 'tirata', defaultType: 'forza', aliases: [], measure: 'reps' },
    { id: 'plank', name: 'Plank', category: 'core', defaultType: 'tecnico', aliases: [], measure: 'time' },
    { id: 'dip', name: 'Dip', category: 'spinta', defaultType: 'forza', aliases: [], measure: 'reps' },
  ];

  it('lo schema: quante serie, e i valori della prima', () => {
    expect(schemeOf(shared('Trazioni', 'trazioni'))).toEqual({ type: 'forza', sets: 2, reps: 8, seconds: 0, weight: 5, rest: 60 });
    expect(schemeOf(shared('Plank', 'plank', { measure: 'time', rest: 0, sets: [{ weight: 0, reps: 0, seconds: 40 }] }))).toEqual({ type: 'forza', sets: 1, reps: 0, seconds: 40, weight: 0, rest: 90 });
  });

  it('usa il mio esercizio, ripristina quello archiviato, crea quello che manca', () => {
    const mine = [ex('a', 'Trazioni', 'trazioni'), ex('b', 'Plank', 'plank', { measure: 'time', archivedAt: '2026-01-01' }), ex('c', 'curl col sasso', null)];
    const steps = copySteps(
      [shared('Trazioni', 'trazioni'), shared('Plank', 'plank', { measure: 'time' }), shared('Dip', 'dip'), shared('Curl col Sasso ', null), shared('Salto', null), shared('Voce tolta', 'non-esiste-piu')],
      mine,
      CATALOG,
      [],
    );
    expect(steps.map((s) => s.kind)).toEqual(['use', 'restore', 'create', 'use', 'create', 'create']);
    expect(steps[2]).toMatchObject({ input: { catalogId: 'dip', name: 'Dip', measure: 'reps' } });
    expect(steps[3]).toMatchObject({ exerciseId: 'c' });
    expect(steps[4]).toMatchObject({ input: { catalogId: null, name: 'Salto' } });
    // una voce che il catalogo non ha più diventa un esercizio personalizzato con quel nome
    expect(steps[5]).toMatchObject({ input: { catalogId: null, name: 'Voce tolta' } });
  });

  it('non aggiunge due volte: né quello che è già nel giorno, né un doppione nell\'allenamento', () => {
    const mine = [ex('a', 'Trazioni', 'trazioni')];
    const steps = copySteps([shared('Trazioni', 'trazioni'), shared('Dip', 'dip'), shared('Dip', 'dip'), shared('Salto', null), shared('salto', null)], mine, CATALOG, [plan('a', 1)]);
    expect(steps.map((s) => s.kind)).toEqual(['skip', 'create', 'skip', 'create', 'skip']);
  });
});

describe('esercizi letti dal database', () => {
  it('quello che non ha un nome e una serie si scarta; i valori strani si ripuliscono', () => {
    expect(toSharedItems('niente')).toEqual([]);
    expect(
      toSharedItems([
        { name: ' Dip ', catalogId: 'dip', measure: 'reps', type: 'volume', rest: 90, sets: [{ weight: '10', reps: 8, seconds: 0 }] },
        { name: 'Senza serie', sets: [] },
        { sets: [{ weight: 0, reps: 5 }] },
        null,
        { name: 'Plank', measure: 'time', type: 'boh', rest: -5, sets: [{ weight: -3, reps: 4, seconds: 30.4 }], bodyweightKg: 80 },
      ]),
    ).toEqual([
      { name: 'Dip', catalogId: 'dip', measure: 'reps', type: 'volume', rest: 90, sets: [{ weight: 10, reps: 8, seconds: 0 }] },
      { name: 'Plank', catalogId: null, measure: 'time', type: 'forza', rest: 0, sets: [{ weight: 0, reps: 0, seconds: 30 }] },
    ]);
  });
});
