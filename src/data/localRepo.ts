import type { Repo } from './repo';
import { addDays, mondayOf, todayStr } from '../lib/dates';
import { byDay } from '../lib/plan';
import { DEFAULT_REST, type Entry, type Exercise, type PlanItem, type Scheme } from './types';

const KEY = 'scheda:local-db:v1';

interface Db {
  exercises: Exercise[];
  entries: Entry[];
  plan: PlanItem[];
}

/** Esercizio salvato prima che lo schema passasse al programma. */
type LegacyExercise = Exercise & { targetSets?: number; targetReps?: number; targetWeight?: number; restSeconds?: number };

/** Riga del programma salvata quando era per giorno della settimana (0 = lunedì). */
type LegacyPlanItem = PlanItem & { weekday?: number };

/**
 * Porta i dati vecchi al formato attuale, come le migration del cloud:
 * lo schema predefinito passa dall'esercizio al programma (0003), la settimana tipo diventa la settimana in corso (0004).
 */
function upgrade(db: Db): Db {
  const legacy = new Map((db.exercises as LegacyExercise[]).map((e) => [e.id, e]));
  const monday = mondayOf(todayStr());
  db.plan = (db.plan as LegacyPlanItem[]).map(({ weekday, ...p }) => {
    const ex = legacy.get(p.exerciseId);
    const old = p.scheme as Partial<Scheme> | null;
    const scheme: Scheme = {
      sets: old?.sets ?? ex?.targetSets ?? 3,
      reps: old?.reps ?? ex?.targetReps ?? 8,
      weight: old?.weight ?? ex?.targetWeight ?? 0,
      rest: old?.rest ?? ex?.restSeconds ?? DEFAULT_REST,
    };
    return { ...p, date: p.date ?? addDays(monday, weekday ?? 0), scheme };
  });
  db.exercises = (db.exercises as LegacyExercise[]).map(({ targetSets, targetReps, targetWeight, restSeconds, ...e }) => e);
  return db;
}

function load(): Db {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return upgrade(JSON.parse(raw) as Db);
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
      return load().plan.sort(byDay);
    },
    async addPlanItem(date, exerciseId, scheme) {
      tx((db) => {
        if (db.plan.some((p) => p.date === date && p.exerciseId === exerciseId)) return;
        const order = db.plan.filter((p) => p.date === date).reduce((m, p) => Math.max(m, p.sortOrder), 0);
        db.plan.push({ id: crypto.randomUUID(), date, exerciseId, sortOrder: order + 1, scheme });
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
    async applyPlanChanges({ remove, add }) {
      tx((db) => {
        const gone = new Set(remove);
        db.plan = db.plan.filter((p) => !gone.has(p.id));
        // come il vincolo unique del cloud: un esercizio una volta sola per giorno
        for (const p of add)
          if (!db.plan.some((x) => x.date === p.date && x.exerciseId === p.exerciseId)) db.plan.push({ ...p, id: crypto.randomUUID() });
      });
    },
  };
}
