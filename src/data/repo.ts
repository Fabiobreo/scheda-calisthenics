import type { Entry, EntryInput, Exercise, ExerciseInput, PlanItem } from './types';

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
  addPlanItem(weekday: number, exerciseId: string): Promise<void>;
  removePlanItem(id: string): Promise<void>;
}
