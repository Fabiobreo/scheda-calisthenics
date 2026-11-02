import type { SupabaseClient } from '@supabase/supabase-js';
import type { Repo } from './repo';
import type { Entry, EntryInput, Exercise, ExerciseInput, PlanItem, PlanItemInput, Scheme } from './types';

interface ExerciseRow {
  id: string;
  name: string;
  type: Exercise['type'];
  in_records: boolean;
  sort_order: number;
  archived_at: string | null;
}

interface EntryRow {
  id: string;
  exercise_id: string;
  date: string;
  kind: Entry['kind'];
  sets: Entry['sets'];
  difficulty: Entry['difficulty'];
  created_at: string;
}

interface PlanRow {
  id: string;
  date: string;
  exercise_id: string;
  sort_order: number;
  sets: number;
  reps: number;
  weight: number;
  rest_seconds: number;
}

const PAGE = 1000;

const toExercise = (r: ExerciseRow): Exercise => ({
  id: r.id,
  name: r.name,
  type: r.type,
  inRecords: r.in_records,
  sortOrder: r.sort_order,
  archivedAt: r.archived_at,
});

const toEntry = (r: EntryRow): Entry => ({
  id: r.id,
  exerciseId: r.exercise_id,
  date: r.date,
  kind: r.kind,
  sets: r.sets.map((s) => ({ weight: Number(s.weight), reps: Number(s.reps) })),
  difficulty: r.difficulty,
  createdAt: r.created_at,
});

const toPlan = (r: PlanRow): PlanItem => ({
  id: r.id,
  date: r.date,
  exerciseId: r.exercise_id,
  sortOrder: r.sort_order,
  scheme: { sets: r.sets, reps: r.reps, weight: Number(r.weight), rest: r.rest_seconds },
});

function exercisePatch(p: Partial<ExerciseInput>) {
  const row: Record<string, unknown> = {};
  if (p.name !== undefined) row.name = p.name;
  if (p.type !== undefined) row.type = p.type;
  if (p.inRecords !== undefined) row.in_records = p.inRecords;
  return row;
}

const schemeRow = (s: Scheme) => ({ sets: s.sets, reps: s.reps, weight: s.weight, rest_seconds: s.rest });

const planRow = (p: PlanItemInput) => ({ date: p.date, exercise_id: p.exerciseId, sort_order: p.sortOrder, ...schemeRow(p.scheme) });

function entryPatch(p: Partial<EntryInput>) {
  const row: Record<string, unknown> = {};
  if (p.exerciseId !== undefined) row.exercise_id = p.exerciseId;
  if (p.date !== undefined) row.date = p.date;
  if (p.kind !== undefined) row.kind = p.kind;
  if (p.sets !== undefined) row.sets = p.sets;
  if (p.difficulty !== undefined) row.difficulty = p.difficulty;
  return row;
}

/** Lancia l'errore di PostgREST invece di restituirlo. */
function must(res: { data: unknown; error: { message: string } | null }): unknown {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export function createSupabaseRepo(sb: SupabaseClient): Repo {
  return {
    async listExercises() {
      const rows = must(await sb.from('exercises').select('*').order('sort_order').order('created_at'));
      return (rows as ExerciseRow[]).map(toExercise);
    },
    async createExercise(input) {
      const last = must(
        await sb.from('exercises').select('sort_order').order('sort_order', { ascending: false }).limit(1),
      ) as { sort_order: number }[];
      const row = must(
        await sb
          .from('exercises')
          .insert({ ...exercisePatch(input), sort_order: (last[0]?.sort_order ?? 0) + 1 })
          .select()
          .single(),
      );
      return toExercise(row as ExerciseRow);
    },
    async updateExercise(id, patch) {
      must(await sb.from('exercises').update(exercisePatch(patch)).eq('id', id));
    },
    async setExerciseArchived(id, archived) {
      must(await sb.from('exercises').update({ archived_at: archived ? new Date().toISOString() : null }).eq('id', id));
      // un esercizio archiviato non resta nel programma
      if (archived) must(await sb.from('plan_items').delete().eq('exercise_id', id));
    },
    async deleteExercise(id) {
      must(await sb.from('exercises').delete().eq('id', id));
    },

    async listEntries() {
      // PostgREST restituisce al massimo 1000 righe per richiesta: leggo a pagine
      const out: Entry[] = [];
      for (let from = 0; ; from += PAGE) {
        const rows = must(
          await sb
            .from('entries')
            .select('*')
            .order('date', { ascending: false })
            .order('created_at', { ascending: false })
            .range(from, from + PAGE - 1),
        ) as EntryRow[];
        out.push(...rows.map(toEntry));
        if (rows.length < PAGE) return out;
      }
    },
    async createEntry(input) {
      const row = must(await sb.from('entries').insert(entryPatch(input)).select().single());
      return toEntry(row as EntryRow);
    },
    async updateEntry(id, patch) {
      must(await sb.from('entries').update(entryPatch(patch)).eq('id', id));
    },
    async deleteEntry(id) {
      must(await sb.from('entries').delete().eq('id', id));
    },

    async listPlan() {
      // anche il programma cresce settimana dopo settimana: leggo a pagine come le registrazioni
      const out: PlanItem[] = [];
      for (let from = 0; ; from += PAGE) {
        const rows = must(
          await sb
            .from('plan_items')
            .select('*')
            .order('date')
            .order('sort_order')
            .order('created_at')
            .range(from, from + PAGE - 1),
        ) as PlanRow[];
        out.push(...rows.map(toPlan));
        if (rows.length < PAGE) return out;
      }
    },
    async addPlanItem(date, exerciseId, scheme) {
      const last = must(
        await sb
          .from('plan_items')
          .select('sort_order')
          .eq('date', date)
          .order('sort_order', { ascending: false })
          .limit(1),
      ) as { sort_order: number }[];
      must(
        await sb
          .from('plan_items')
          .insert(planRow({ date, exerciseId, sortOrder: (last[0]?.sort_order ?? 0) + 1, scheme })),
      );
    },
    async setPlanScheme(id, scheme) {
      must(await sb.from('plan_items').update(schemeRow(scheme)).eq('id', id));
    },
    async removePlanItem(id) {
      must(await sb.from('plan_items').delete().eq('id', id));
    },
    async applyPlanChanges({ remove, add }) {
      if (remove.length) must(await sb.from('plan_items').delete().in('id', remove));
      if (add.length) must(await sb.from('plan_items').insert(add.map(planRow)));
    },
  };
}
