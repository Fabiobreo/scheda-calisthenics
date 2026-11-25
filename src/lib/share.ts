/**
 * Allenamenti condivisi (ticket 39): dalla giornata dell'utente alla copia in sola lettura che vedono gli amici, e
 * dalla copia al programma di chi la vuole rifare. Solo logica pura.
 */
import { DEFAULT_REST, type CatalogExercise, type Entry, type Exercise, type ExerciseInput, type PlanItem, type Scheme, type SharedItem, type WorkSet } from '../data/types';
import { byDay, offPlan } from './plan';

/** Il database accetta al massimo 40 esercizi per allenamento condiviso. */
export const MAX_SHARED_ITEMS = 40;

const schemeSets = (s: Scheme): WorkSet[] => Array.from({ length: Math.max(1, s.sets) }, () => ({ weight: s.weight, reps: s.seconds > 0 ? 0 : s.reps, seconds: s.seconds }));

/**
 * Gli esercizi di un giorno da condividere, nell'ordine del programma: per ognuno le serie registrate, o quelle in
 * programma se non è ancora stato fatto; in fondo gli allenamenti registrati fuori programma. `onlyDone`: solo quello
 * che è stato fatto davvero (dal riepilogo di fine sessione). Note, difficoltà e tentativi di record non si
 * condividono.
 */
export function sharedItems(plan: PlanItem[], entries: Entry[], exercises: Exercise[], date: string, opts: { onlyDone?: boolean } = {}): SharedItem[] {
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const out: SharedItem[] = [];
  const item = (ex: Exercise, type: SharedItem['type'], rest: number, sets: WorkSet[]): SharedItem => ({
    name: ex.name,
    catalogId: ex.catalogId,
    measure: ex.measure,
    type,
    rest,
    sets: sets.map((s) => ({ weight: s.weight, reps: s.reps, seconds: s.seconds })),
  });
  const day = plan.filter((p) => p.date === date && byId.has(p.exerciseId)).sort(byDay);
  for (const p of day) {
    const ex = byId.get(p.exerciseId)!;
    const done = entries.find((e) => e.exerciseId === p.exerciseId && e.kind === 'training' && e.date === date);
    if (done?.sets.length) out.push(item(ex, done.type, p.scheme.rest, done.sets));
    else if (!opts.onlyDone) out.push(item(ex, p.scheme.type, p.scheme.rest, schemeSets(p.scheme)));
  }
  for (const e of offPlan(entries, day, date)) {
    const ex = byId.get(e.exerciseId);
    if (ex && e.kind === 'training' && e.sets.length) out.push(item(ex, e.type, DEFAULT_REST, e.sets));
  }
  return out.slice(0, MAX_SHARED_ITEMS);
}

/** Lo schema con cui un esercizio condiviso entra nel programma di chi lo copia: quante serie, e i valori della prima. */
export function schemeOf(item: SharedItem): Scheme {
  const first = item.sets[0] ?? { weight: 0, reps: 0, seconds: 0 };
  const timed = item.measure === 'time' || first.seconds > 0;
  return {
    type: item.type,
    sets: Math.max(1, item.sets.length),
    reps: timed ? 0 : Math.max(1, first.reps),
    seconds: timed ? Math.max(1, first.seconds) : 0,
    weight: first.weight,
    rest: item.rest > 0 ? item.rest : DEFAULT_REST,
  };
}

/** Che cosa fare di un esercizio condiviso per metterlo nel proprio giorno. */
export type CopyStep =
  /** c'è già in quel giorno: non si aggiunge due volte */
  | { kind: 'skip'; item: SharedItem }
  /** è già tra i miei esercizi */
  | { kind: 'use'; item: SharedItem; exerciseId: string }
  /** l'avevo archiviato: torna attivo */
  | { kind: 'restore'; item: SharedItem; exerciseId: string }
  /** non ce l'ho: nasce dal catalogo, o come esercizio personalizzato con quel nome */
  | { kind: 'create'; item: SharedItem; input: ExerciseInput };

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Per ogni esercizio dell'allenamento condiviso: il mio esercizio che gli corrisponde (stessa voce del catalogo, o
 * stesso nome per quelli personalizzati), oppure quello da creare. `dayPlan`: quello che ho già in programma quel
 * giorno. Una voce del catalogo che non esiste più si copia come esercizio personalizzato.
 */
export function copySteps(items: SharedItem[], exercises: Exercise[], catalog: CatalogExercise[], dayPlan: PlanItem[]): CopyStep[] {
  const planned = new Set(dayPlan.map((p) => p.exerciseId));
  const taken = new Set<string>();
  return items.map((item): CopyStep => {
    const voice = item.catalogId ? catalog.find((c) => c.id === item.catalogId) : undefined;
    const match = (e: Exercise) => (voice ? e.catalogId === voice.id : e.catalogId === null && same(e.name, item.name) && e.measure === item.measure);
    const mine = exercises.find((e) => !e.archivedAt && match(e)) ?? exercises.find(match);
    if (mine) {
      // lo stesso esercizio due volte nell'allenamento condiviso entra una volta sola
      if (planned.has(mine.id) || taken.has(mine.id)) return { kind: 'skip', item };
      taken.add(mine.id);
      return mine.archivedAt ? { kind: 'restore', item, exerciseId: mine.id } : { kind: 'use', item, exerciseId: mine.id };
    }
    const key = voice ? `cat:${voice.id}` : `name:${item.name.trim().toLowerCase()}:${item.measure}`;
    if (taken.has(key)) return { kind: 'skip', item };
    taken.add(key);
    return {
      kind: 'create',
      item,
      input: voice ? { catalogId: voice.id, name: voice.name, inRecords: false, measure: voice.measure } : { catalogId: null, name: item.name.trim(), inRecords: false, measure: item.measure },
    };
  });
}
