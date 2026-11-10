import { DEFAULT_REST, type ExerciseRef, type ExerciseType, type Measure, type PlanItem, type ProgramItem, type ProgramItemInput, type Scheme } from '../data/types';

/**
 * Editor veloce (ticket 26): schema precompilato dal tipo, aggiunta di più esercizi con uno schema in comune,
 * duplica di un giorno. Solo logica: le viste chiamano queste funzioni e salvano il risultato.
 */

/** Schema di partenza per tipo: forza poche ripetizioni e recupero lungo, volume tante, tecnico poche e pulite. */
const PRESET: Record<ExerciseType, { sets: number; reps: number; seconds: number; rest: number }> = {
  forza: { sets: 5, reps: 5, seconds: 10, rest: 180 },
  volume: { sets: 3, reps: 10, seconds: 20, rest: DEFAULT_REST },
  tecnico: { sets: 4, reps: 5, seconds: 15, rest: 120 },
};

/** Lo schema proposto per un tipo, nella misura dell'esercizio. */
export function typeScheme(type: ExerciseType, measure: Measure): Scheme {
  const p = PRESET[type];
  return measure === 'time'
    ? { type, sets: p.sets, reps: 0, seconds: p.seconds, weight: 0, rest: p.rest }
    : { type, sets: p.sets, reps: p.reps, seconds: 0, weight: 0, rest: p.rest };
}

/** Lo schema in comune di un'aggiunta multipla: ripetizioni per chi si misura così, secondi per le tenute. */
export interface SharedScheme {
  type: ExerciseType;
  sets: number;
  reps: number;
  seconds: number;
  weight: number;
  rest: number;
}

export const sharedPreset = (type: ExerciseType): SharedScheme => {
  const p = PRESET[type];
  return { type, sets: p.sets, reps: p.reps, seconds: p.seconds, weight: 0, rest: p.rest };
};

/** Lo schema in comune applicato a un esercizio della misura `measure`. */
export const schemeFor = (s: SharedScheme, measure: Measure): Scheme =>
  measure === 'time'
    ? { type: s.type, sets: s.sets, reps: 0, seconds: s.seconds, weight: s.weight, rest: s.rest }
    : { type: s.type, sets: s.sets, reps: s.reps, seconds: 0, weight: s.weight, rest: s.rest };

/** Chiave di un esercizio in una scheda modello: la voce del catalogo o il nome personalizzato (senza maiuscole). */
export const refKey = (r: { catalogId: string | null; customName: string | null }) =>
  r.catalogId ? `c:${r.catalogId}` : `n:${(r.customName ?? '').trim().toLowerCase()}`;

/** Più esercizi in un giorno di una scheda modello, in coda a quelli che ci sono; quelli già presenti si saltano. */
export function addToProgramDay(
  items: ProgramItem[],
  at: { programId: string; week: number; weekday: number },
  refs: { ref: ExerciseRef; measure: Measure }[],
  shared: SharedScheme,
): ProgramItemInput[] {
  const day = items.filter((i) => i.week === at.week && i.weekday === at.weekday);
  const seen = new Set(day.map(refKey));
  let order = day.reduce((m, i) => Math.max(m, i.sortOrder), 0);
  const out: ProgramItemInput[] = [];
  for (const { ref, measure } of refs) {
    const k = refKey(ref);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ ...at, ...ref, sortOrder: ++order, scheme: schemeFor(shared, measure), note: null });
  }
  return out;
}

/**
 * Copia gli esercizi di un giorno di una scheda modello in altri giorni della stessa settimana, con schema e nota.
 * Nel giorno di arrivo gli esercizi che ci sono già restano come sono e non si raddoppiano; le copie vanno in coda.
 */
export function duplicateProgramDay(items: ProgramItem[], week: number, from: number, to: number[]): ProgramItemInput[] {
  const source = items.filter((i) => i.week === week && i.weekday === from).sort((a, b) => a.sortOrder - b.sortOrder);
  const out: ProgramItemInput[] = [];
  for (const d of new Set(to)) {
    if (d === from) continue;
    const there = items.filter((i) => i.week === week && i.weekday === d);
    const seen = new Set(there.map(refKey));
    let order = there.reduce((m, i) => Math.max(m, i.sortOrder), 0);
    for (const i of source) {
      if (seen.has(refKey(i))) continue;
      out.push({ programId: i.programId, week, weekday: d, catalogId: i.catalogId, customName: i.customName, sortOrder: ++order, scheme: i.scheme, note: i.note });
    }
  }
  return out;
}

/**
 * Copia gli esercizi di un giorno del calendario di un atleta in altre date: per ogni data le righe da aggiungere,
 * senza gli esercizi che in quella data ci sono già.
 */
export function duplicatePlanDay(plan: PlanItem[], from: string, to: string[]): { date: string; item: PlanItem }[] {
  const source = plan.filter((p) => p.date === from).sort((a, b) => a.sortOrder - b.sortOrder);
  const out: { date: string; item: PlanItem }[] = [];
  for (const date of new Set(to)) {
    if (date === from) continue;
    const there = new Set(plan.filter((p) => p.date === date).map((p) => p.exerciseId));
    for (const item of source) if (!there.has(item.exerciseId)) out.push({ date, item });
  }
  return out;
}
