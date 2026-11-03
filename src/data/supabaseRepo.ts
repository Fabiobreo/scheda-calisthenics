import type { SupabaseClient } from '@supabase/supabase-js';
import type { Repo } from './repo';
import type { CatalogExercise, CoachLink, Entry, EntryInput, Exercise, ExerciseInput, PlanItem, PlanItemInput, Profile, Scheme } from './types';

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
}

interface ExerciseRow {
  id: string;
  catalog_id: string | null;
  name: string | null;
  /** nome della voce del catalogo collegata */
  catalog: { name: string } | null;
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

/** Colonne di un esercizio, con il nome della voce del catalogo. */
const EXERCISE_COLS = '*, catalog:catalog_exercises(name)';

const toCatalog = (r: CatalogRow): CatalogExercise => ({
  id: r.id,
  name: r.name,
  category: r.category,
  defaultType: r.default_type,
  aliases: r.aliases,
});

const toExercise = (r: ExerciseRow): Exercise => ({
  id: r.id,
  catalogId: r.catalog_id,
  name: r.catalog?.name ?? r.name ?? '',
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
  if (p.catalogId !== undefined) row.catalog_id = p.catalogId;
  // il nome di un esercizio del catalogo è quello del catalogo: non se ne salva uno proprio
  if (p.name !== undefined) row.name = p.catalogId ? null : p.name;
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

type Table = 'exercises' | 'entries' | 'plan_items';

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
      must(await sb.rpc('accept_invite', { invite_code: code }));
    },
    async endLink(id) {
      must(await sb.rpc('end_coach_link', { link: id }));
    },

    async listCatalog() {
      const rows = must(await sb.from('catalog_exercises').select('id, name, category, default_type, aliases').order('sort_order'));
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
      must(await insert('plan_items', [planRow({ date, exerciseId, sortOrder: (last[0]?.sort_order ?? 0) + 1, scheme })]));
    },
    async setPlanScheme(id, scheme) {
      must(await update('plan_items', schemeRow(scheme)).eq('id', id));
    },
    async removePlanItem(id) {
      must(await remove('plan_items').eq('id', id));
    },
    async applyPlanChanges({ remove: gone, add }) {
      if (gone.length) must(await remove('plan_items').in('id', gone));
      if (add.length) must(await insert('plan_items', add.map(planRow)));
    },
  };
}
