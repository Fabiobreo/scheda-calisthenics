import type { Entry, EntryInput, Exercise, ExerciseInput, PlanChanges, PlanItem, Scheme } from './types';

/** Accesso ai dati. Due implementazioni: Supabase (cloud) e localStorage (modalità locale). */
export interface Repo {
  listExercises(): Promise<Exercise[]>;
  createExercise(input: ExerciseInput): Promise<Exercise>;
  updateExercise(id: string, patch: Partial<ExerciseInput>): Promise<void>;
  setExerciseArchived(id: string, archived: boolean): Promise<void>;
  /** Elimina l'esercizio insieme a tutte le sue registrazioni. */
  deleteExercise(id: string): Promise<void>;

  listEntries(): Promise<Entry[]>;
  createEntry(input: EntryInput): Promise<Entry>;
  updateEntry(id: string, patch: Partial<EntryInput>): Promise<void>;
  deleteEntry(id: string): Promise<void>;

  listPlan(): Promise<PlanItem[]>;
  /** in fondo agli esercizi del giorno `date` (YYYY-MM-DD) */
  addPlanItem(date: string, exerciseId: string, scheme: Scheme): Promise<void>;
  setPlanScheme(id: string, scheme: Scheme): Promise<void>;
  removePlanItem(id: string): Promise<void>;
  /** prima toglie, poi aggiunge */
  applyPlanChanges(changes: PlanChanges): Promise<void>;
}
