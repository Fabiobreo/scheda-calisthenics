import type { Repo } from './repo';
import type { Entry, Exercise, PlanItem } from './types';

const KEY = 'scheda:local-db:v1';

interface Db {
  exercises: Exercise[];
  entries: Entry[];
  plan: PlanItem[];
}

function load(): Db {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Db;
  } catch {
    /* storage non disponibile o corrotto: riparto vuoto */
  }
  return { exercises: [], entries: [], plan: [] };
}

function save(db: Db) {
  localStorage.setItem(KEY, JSON.stringify(db));
}

/** Legge, applica la modifica e salva. */
function tx<T>(fn: (db: Db) => T): T {
  const db = load();
  const out = fn(db);
  save(db);
  return out;
}

const byDateDesc = (a: Entry, b: Entry) =>
  a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt.localeCompare(a.createdAt);

/** Modalità locale: stessi contratti del repo Supabase, dati solo in questo browser. */
export function createLocalRepo(): Repo {
  return {
    async listExercises() {
      return load().exercises.sort((a, b) => a.sortOrder - b.sortOrder);
    },
    async createExercise(input) {
      return tx((db) => {
        const ex: Exercise = {
          ...input,
          id: crypto.randomUUID(),
          sortOrder: db.exercises.reduce((m, e) => Math.max(m, e.sortOrder), 0) + 1,
          archivedAt: null,
        };
        db.exercises.push(ex);
        return ex;
      });
    },
    async updateExercise(id, patch) {
      tx((db) => {
        db.exercises = db.exercises.map((e) => (e.id === id ? { ...e, ...patch } : e));
      });
    },
    async setExerciseArchived(id, archived) {
      tx((db) => {
        db.exercises = db.exercises.map((e) =>
          e.id === id ? { ...e, archivedAt: archived ? new Date().toISOString() : null } : e,
        );
        if (archived) db.plan = db.plan.filter((p) => p.exerciseId !== id);
      });
    },
    async deleteExercise(id) {
      tx((db) => {
        db.exercises = db.exercises.filter((e) => e.id !== id);
        db.entries = db.entries.filter((e) => e.exerciseId !== id);
        db.plan = db.plan.filter((p) => p.exerciseId !== id);
      });
    },

    async listEntries() {
      return load().entries.sort(byDateDesc);
    },
    async createEntry(input) {
      return tx((db) => {
        const en: Entry = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
        db.entries.push(en);
        return en;
      });
    },
    async updateEntry(id, patch) {
      tx((db) => {
        db.entries = db.entries.map((e) => (e.id === id ? { ...e, ...patch } : e));
      });
    },
    async deleteEntry(id) {
      tx((db) => {
        db.entries = db.entries.filter((e) => e.id !== id);
      });
    },

    async listPlan() {
      // i dati salvati prima dello schema per giorno non hanno il campo
      return load()
        .plan.map((p) => ({ ...p, scheme: p.scheme ?? null }))
        .sort((a, b) => a.sortOrder - b.sortOrder);
    },
    async addPlanItem(weekday, exerciseId) {
      tx((db) => {
        if (db.plan.some((p) => p.weekday === weekday && p.exerciseId === exerciseId)) return;
        const order = db.plan.filter((p) => p.weekday === weekday).reduce((m, p) => Math.max(m, p.sortOrder), 0);
        db.plan.push({ id: crypto.randomUUID(), weekday, exerciseId, sortOrder: order + 1, scheme: null });
      });
    },
    async setPlanScheme(id, scheme) {
      tx((db) => {
        db.plan = db.plan.map((p) => (p.id === id ? { ...p, scheme } : p));
      });
    },
    async removePlanItem(id) {
      tx((db) => {
        db.plan = db.plan.filter((p) => p.id !== id);
      });
    },
  };
}
