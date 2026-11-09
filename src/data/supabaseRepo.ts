import type { SupabaseClient } from '@supabase/supabase-js';
import type { Repo } from './repo';
import type {
  BodyWeight,
  CatalogExercise,
  CoachLink,
  Entry,
  EntryInput,
  Exercise,
  ExerciseInput,
  LevelRecordInput,
  LevelRecordRow,
  PlanItem,
  PlanItemInput,
  Profile,
  Program,
  ProgramItem,
  ProgramItemInput,
  Scheme,
  WorkSet,
} from './types';

interface LinkRow {
  id: string;
  trainer_id: string;
  athlete_id: string;
  created_at: string;
  trainer: { display_name: string | null } | null;
  athlete: { display_name: string | null } | null;
}

const LINK_COLS =
  'id, trainer_id, athlete_id, created_at, trainer:profiles!coach_links_trainer_id_fkey(display_name), athlete:profiles!coach_links_athlete_id_fkey(display_name)';

const toLink = (r: LinkRow): CoachLink => ({
  id: r.id,
  trainerId: r.trainer_id,
  athleteId: r.athlete_id,
  trainerName: r.trainer?.display_name ?? null,
  athleteName: r.athlete?.display_name ?? null,
  createdAt: r.created_at,
});

interface CatalogRow {
  id: string;
  name: string;
  category: CatalogExercise['category'];
  default_type: CatalogExercise['defaultType'];
  aliases: string[];
  measure: CatalogExercise['measure'];
}

interface ExerciseRow {
  id: string;
  catalog_id: string | null;
  name: string | null;
  /** nome della voce del catalogo collegata */
  catalog: { name: string } | null;
  in_records: boolean;
  measure: Exercise['measure'];
  sort_order: number;
  archived_at: string | null;
}

/**
 * Serie nel database. A tempo `reps` ripete i secondi, per le versioni vecchie dell'app che leggono solo `reps`
 * (migration 0011); a ripetizioni `seconds` non c'è.
 */
interface SetRow {
  weight: number;
  reps: number;
  seconds?: number;
}

interface EntryRow {
  id: string;
  exercise_id: string;
  date: string;
  kind: Entry['kind'];
  type: Entry['type'];
  sets: SetRow[];
  difficulty: Entry['difficulty'];
  note: string | null;
  created_at: string;
}

interface PlanRow {
  id: string;
  date: string;
  exercise_id: string;
  sort_order: number;
  sets: number;
  reps: number;
  /** null = a ripetizioni; a tempo `reps` ripete i secondi */
  seconds: number | null;
  weight: number;
  rest_seconds: number;
  type: Scheme['type'];
  assigned_by: string | null;
  note: string | null;
}

interface ProgramRow {
  id: string;
  name: string;
  weeks: number;
  updated_at: string;
}

interface ProgramItemRow {
  id: string;
  program_id: string;
  week: number;
  weekday: number;
  catalog_id: string | null;
  custom_name: string | null;
  sort_order: number;
  sets: number;
  reps: number;
  seconds: number | null;
  weight: number;
  rest_seconds: number;
  type: Scheme['type'];
  note: string | null;
}

const PAGE = 1000;

const toScheme = (r: { type: Scheme['type']; sets: number; reps: number; seconds: number | null; weight: number; rest_seconds: number }): Scheme => ({
  type: r.type,
  sets: r.sets,
  reps: r.seconds ? 0 : r.reps,
  seconds: r.seconds ?? 0,
  weight: Number(r.weight),
  rest: r.rest_seconds,
});

const toSet = (s: SetRow): WorkSet => {
  const seconds = Number(s.seconds ?? 0) || 0;
  return { weight: Number(s.weight), reps: seconds ? 0 : Number(s.reps), seconds };
};

const setRow = (s: WorkSet): SetRow => (s.seconds > 0 ? { weight: s.weight, reps: s.seconds, seconds: s.seconds } : { weight: s.weight, reps: s.reps });

const toProgram = (r: ProgramRow): Program => ({ id: r.id, name: r.name, weeks: r.weeks, updatedAt: r.updated_at });

const toProgramItem = (r: ProgramItemRow): ProgramItem => ({
  id: r.id,
  programId: r.program_id,
  week: r.week,
  weekday: r.weekday,
  catalogId: r.catalog_id,
  customName: r.custom_name,
  sortOrder: r.sort_order,
  scheme: toScheme(r),
  note: r.note,
});

/** Colonne di un esercizio, con il nome della voce del catalogo. */
const EXERCISE_COLS = '*, catalog:catalog_exercises(name)';

const toCatalog = (r: CatalogRow): CatalogExercise => ({
  id: r.id,
  name: r.name,
  category: r.category,
  defaultType: r.default_type,
  aliases: r.aliases,
  measure: r.measure,
});

const toExercise = (r: ExerciseRow): Exercise => ({
  id: r.id,
  catalogId: r.catalog_id,
  name: r.catalog?.name ?? r.name ?? '',
  inRecords: r.in_records,
  measure: r.measure,
  sortOrder: r.sort_order,
  archivedAt: r.archived_at,
});

const toEntry = (r: EntryRow): Entry => ({
  id: r.id,
  exerciseId: r.exercise_id,
  date: r.date,
  kind: r.kind,
  type: r.type,
  sets: r.sets.map(toSet),
  difficulty: r.difficulty,
  note: r.note,
  createdAt: r.created_at,
});

const toPlan = (r: PlanRow): PlanItem => ({
  id: r.id,
  date: r.date,
  exerciseId: r.exercise_id,
  sortOrder: r.sort_order,
  scheme: toScheme(r),
  assignedBy: r.assigned_by,
  note: r.note,
});

function exercisePatch(p: Partial<ExerciseInput>) {
  const row: Record<string, unknown> = {};
  if (p.catalogId !== undefined) row.catalog_id = p.catalogId;
  // il nome di un esercizio del catalogo è quello del catalogo: non se ne salva uno proprio
  if (p.name !== undefined) row.name = p.catalogId ? null : p.name;
  if (p.inRecords !== undefined) row.in_records = p.inRecords;
  // quella di una voce del catalogo la decide il catalogo
  if (p.measure !== undefined && !p.catalogId) row.measure = p.measure;
  return row;
}

const schemeRow = (s: Scheme) => ({
  type: s.type,
  sets: s.sets,
  // a tempo `reps` ripete i secondi, per le versioni vecchie dell'app
  reps: s.seconds > 0 ? s.seconds : s.reps,
  seconds: s.seconds > 0 ? s.seconds : null,
  weight: s.weight,
  rest_seconds: s.rest,
});

const planRow = (p: PlanItemInput) => ({ date: p.date, exercise_id: p.exerciseId, sort_order: p.sortOrder, note: p.note, ...schemeRow(p.scheme) });

const programItemRow = (p: ProgramItemInput) => ({
  program_id: p.programId,
  week: p.week,
  weekday: p.weekday,
  catalog_id: p.catalogId,
  custom_name: p.customName,
  sort_order: p.sortOrder,
  note: p.note,
  ...schemeRow(p.scheme),
});

function entryPatch(p: Partial<EntryInput>) {
  const row: Record<string, unknown> = {};
  if (p.exerciseId !== undefined) row.exercise_id = p.exerciseId;
  if (p.date !== undefined) row.date = p.date;
  if (p.kind !== undefined) row.kind = p.kind;
  if (p.type !== undefined) row.type = p.type;
  if (p.sets !== undefined) row.sets = p.sets.map(setRow);
  if (p.difficulty !== undefined) row.difficulty = p.difficulty;
  if (p.note !== undefined) row.note = p.note;
  return row;
}

interface LevelRow {
  id: string;
  sub_id: string;
  stage: string;
  /** numeric: PostgREST lo può restituire come stringa */
  value: number | string;
  date: string;
  note: string | null;
  created_at: string;
}

const toLevelRecord = (r: LevelRow): LevelRecordRow => ({
  id: r.id,
  subId: r.sub_id,
  stage: r.stage,
  value: Number(r.value),
  date: r.date,
  note: r.note,
  createdAt: r.created_at,
});

function levelPatch(p: Partial<LevelRecordInput>) {
  const row: Record<string, unknown> = {};
  if (p.subId !== undefined) row.sub_id = p.subId;
  if (p.stage !== undefined) row.stage = p.stage;
  if (p.value !== undefined) row.value = p.value;
  if (p.date !== undefined) row.date = p.date;
  if (p.note !== undefined) row.note = p.note;
  return row;
}

/** Lancia l'errore di PostgREST invece di restituirlo. */
function must(res: { data: unknown; error: { message: string } | null }): unknown {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

type Table = 'exercises' | 'entries' | 'plan_items' | 'body_weights' | 'level_records';

/**
 * Repo dei dati di `userId`. Ogni query filtra per utente in modo esplicito: le policy RLS non bastano a
 * delimitare i dati, perché un trainer può leggere anche quelli dei suoi atleti.
 */
export function createSupabaseRepo(sb: SupabaseClient, userId: string): Repo {
  const select = (t: Table, cols = '*') => sb.from(t).select(cols).eq('user_id', userId);
  const update = (t: Table, patch: Record<string, unknown>) => sb.from(t).update(patch).eq('user_id', userId);
  const remove = (t: Table) => sb.from(t).delete().eq('user_id', userId);
  const insert = (t: Table, rows: Record<string, unknown>[]) => sb.from(t).insert(rows.map((r) => ({ ...r, user_id: userId })));

  return {
    async getProfile() {
      const row = must(await sb.from('profiles').select('display_name, is_trainer').eq('id', userId).single()) as {
        display_name: string | null;
        is_trainer: boolean;
      };
      return { displayName: row.display_name, isTrainer: row.is_trainer };
    },
    async updateProfile(patch: Partial<Profile>) {
      const row: Record<string, unknown> = {};
      if (patch.displayName !== undefined) row.display_name = patch.displayName;
      if (patch.isTrainer !== undefined) row.is_trainer = patch.isTrainer;
      must(await sb.from('profiles').update(row).eq('id', userId));
    },
    async deleteAccount() {
      must(await sb.rpc('delete_own_account'));
      // la sessione punta a un utente che non c'è più: la chiudo solo su questo dispositivo
      await sb.auth.signOut({ scope: 'local' });
    },

    async listBodyWeights() {
      // una riga al giorno: dopo qualche anno si superano le 1000 righe di una richiesta
      const out: BodyWeight[] = [];
      for (let from = 0; ; from += PAGE) {
        const rows = must(await select('body_weights', 'date, kg').order('date').range(from, from + PAGE - 1)) as { date: string; kg: number | string }[];
        out.push(...rows.map((r) => ({ date: r.date, kg: Number(r.kg) })));
        if (rows.length < PAGE) return out;
      }
    },
    async setBodyWeight(date, kg) {
      must(await sb.from('body_weights').upsert({ user_id: userId, date, kg }, { onConflict: 'user_id,date' }));
    },
    async deleteBodyWeight(date) {
      must(await remove('body_weights').eq('date', date));
    },

    async listLevelRecords() {
      const out: LevelRecordRow[] = [];
      for (let from = 0; ; from += PAGE) {
        const rows = must(
          await select('level_records', 'id, sub_id, stage, value, date, note, created_at')
            .order('date')
            .order('created_at')
            .order('id')
            .range(from, from + PAGE - 1),
        ) as LevelRow[];
        out.push(...rows.map(toLevelRecord));
        if (rows.length < PAGE) return out;
      }
    },
    async createLevelRecord(input) {
      const row = must(await insert('level_records', [levelPatch(input)]).select('id, sub_id, stage, value, date, note, created_at').single());
      return toLevelRecord(row as LevelRow);
    },
    async updateLevelRecord(id, patch) {
      must(await update('level_records', levelPatch(patch)).eq('id', id));
    },
    async deleteLevelRecord(id) {
      must(await remove('level_records').eq('id', id));
    },

    async listLinks() {
      const rows = must(
        await sb
          .from('coach_links')
          .select(LINK_COLS)
          .eq('status', 'active')
          .or(`trainer_id.eq.${userId},athlete_id.eq.${userId}`)
          .order('created_at'),
      );
      return (rows as unknown as LinkRow[]).map(toLink);
    },
    async getInviteCode() {
      const rows = must(await sb.from('trainer_invites').select('code').eq('trainer_id', userId)) as { code: string }[];
      return rows[0]?.code ?? null;
    },
    async rotateInviteCode() {
      return must(await sb.rpc('rotate_invite_code')) as string;
    },
    async previewInvite(code) {
      const rows = must(await sb.rpc('preview_invite', { invite_code: code })) as { trainer_name: string | null }[];
      return rows[0] ? { trainerName: rows[0].trainer_name } : null;
    },
    async acceptInvite(code) {
      // un codice sbagliato non dà errore (il tentativo fallito resta registrato): restituisce null
      const link = must(await sb.rpc('accept_invite', { invite_code: code }));
      if (!link) throw new Error('Codice non valido o scaduto. Chiedine uno nuovo al tuo trainer.');
    },
    async endLink(id) {
      must(await sb.rpc('end_coach_link', { link: id }));
    },

    async listCatalog() {
      const rows = must(await sb.from('catalog_exercises').select('id, name, category, default_type, aliases, measure').order('sort_order'));
      return (rows as CatalogRow[]).map(toCatalog);
    },

    async listExercises() {
      const rows = must(await select('exercises', EXERCISE_COLS).order('sort_order').order('created_at'));
      return (rows as ExerciseRow[]).map(toExercise);
    },
    async createExercise(input) {
      const last = must(
        await select('exercises', 'sort_order').order('sort_order', { ascending: false }).limit(1),
      ) as { sort_order: number }[];
      const row = must(
        await insert('exercises', [{ ...exercisePatch(input), sort_order: (last[0]?.sort_order ?? 0) + 1 }])
          .select(EXERCISE_COLS)
          .single(),
      );
      return toExercise(row as ExerciseRow);
    },
    async updateExercise(id, patch) {
      must(await update('exercises', exercisePatch(patch)).eq('id', id));
    },
    async setExerciseArchived(id, archived) {
      must(await update('exercises', { archived_at: archived ? new Date().toISOString() : null }).eq('id', id));
      // un esercizio archiviato non resta nel programma
      if (archived) must(await remove('plan_items').eq('exercise_id', id));
    },
    async deleteExercise(id) {
      must(await remove('exercises').eq('id', id));
    },

    async listEntries() {
      // PostgREST restituisce al massimo 1000 righe per richiesta: leggo a pagine
      const out: Entry[] = [];
      for (let from = 0; ; from += PAGE) {
        const rows = must(
          await select('entries')
            .order('date', { ascending: false })
            .order('created_at', { ascending: false })
            .range(from, from + PAGE - 1),
        ) as EntryRow[];
        out.push(...rows.map(toEntry));
        if (rows.length < PAGE) return out;
      }
    },
    async createEntry(input) {
      const row = must(await insert('entries', [entryPatch(input)]).select().single());
      return toEntry(row as EntryRow);
    },
    async updateEntry(id, patch) {
      must(await update('entries', entryPatch(patch)).eq('id', id));
    },
    async deleteEntry(id) {
      must(await remove('entries').eq('id', id));
    },

    async listPlan() {
      // anche il programma cresce settimana dopo settimana: leggo a pagine come le registrazioni
      const out: PlanItem[] = [];
      for (let from = 0; ; from += PAGE) {
        const rows = must(
          await select('plan_items')
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
        await select('plan_items', 'sort_order').eq('date', date).order('sort_order', { ascending: false }).limit(1),
      ) as { sort_order: number }[];
      must(await insert('plan_items', [planRow({ date, exerciseId, sortOrder: (last[0]?.sort_order ?? 0) + 1, scheme, note: null })]));
    },
    async setPlanScheme(id, scheme) {
      must(await update('plan_items', schemeRow(scheme)).eq('id', id));
    },
    async setPlanNote(id, note) {
      must(await update('plan_items', { note }).eq('id', id));
    },
    async coachAddPlanItem(date, ref, scheme, note) {
      must(
        await sb.rpc('coach_add_plan_item', {
          p_athlete: userId,
          p_date: date,
          p_catalog: ref.catalogId,
          p_custom: ref.customName,
          p_sets: scheme.sets,
          p_reps: scheme.seconds > 0 ? scheme.seconds : scheme.reps,
          p_seconds: scheme.seconds > 0 ? scheme.seconds : null,
          p_weight: scheme.weight,
          p_rest: scheme.rest,
          p_note: note,
          p_type: scheme.type,
        }),
      );
    },
    async removePlanItem(id) {
      must(await remove('plan_items').eq('id', id));
    },
    async applyPlanChanges({ remove: gone, add }) {
      if (gone.length) must(await remove('plan_items').in('id', gone));
      if (add.length) must(await insert('plan_items', add.map(planRow)));
    },

    async listPrograms() {
      const rows = must(await sb.from('programs').select('id, name, weeks, updated_at').order('updated_at', { ascending: false }));
      return (rows as ProgramRow[]).map(toProgram);
    },
    async createProgram({ name, weeks }) {
      const row = must(await sb.from('programs').insert({ name, weeks }).select('id, name, weeks, updated_at').single());
      return toProgram(row as ProgramRow);
    },
    async updateProgram(id, patch) {
      must(await sb.from('programs').update(patch).eq('id', id));
    },
    async deleteProgram(id) {
      must(await sb.from('programs').delete().eq('id', id));
    },
    async listProgramItems(programId) {
      const rows = must(await sb.from('program_items').select('*').eq('program_id', programId).order('week').order('weekday').order('sort_order'));
      return (rows as ProgramItemRow[]).map(toProgramItem);
    },
    async addProgramItems(items) {
      if (items.length) must(await sb.from('program_items').insert(items.map(programItemRow)));
    },
    async updateProgramItem(id, patch) {
      const row: Record<string, unknown> = {};
      if (patch.scheme) Object.assign(row, schemeRow(patch.scheme));
      if (patch.note !== undefined) row.note = patch.note;
      must(await sb.from('program_items').update(row).eq('id', id));
    },
    async removeProgramItems(ids) {
      if (ids.length) must(await sb.from('program_items').delete().in('id', ids));
    },
    async replaceProgramItems(gone, add) {
      if (add.length) must(await sb.from('program_items').insert(add.map(programItemRow)));
      if (gone.length) must(await sb.from('program_items').delete().in('id', gone));
    },
    async exportCoaching() {
      // le policy restituiscono solo le righe dell'utente (come trainer o come atleta)
      const [programs, items, assignments, links] = await Promise.all([
        sb.from('programs').select('*').order('created_at'),
        sb.from('program_items').select('*').order('program_id').order('week').order('weekday').order('sort_order'),
        sb.from('program_assignments').select('*').order('created_at'),
        sb.from('coach_links').select('*').order('created_at'),
      ]);
      return {
        programs: must(programs) as unknown[],
        programItems: must(items) as unknown[],
        programAssignments: must(assignments) as unknown[],
        coachLinks: must(links) as unknown[],
      };
    },
    async assignProgram(programId, athleteId, startMonday) {
      return must(await sb.rpc('assign_program', { p_program: programId, p_athlete: athleteId, start_monday: startMonday })) as number;
    },
  };
}
