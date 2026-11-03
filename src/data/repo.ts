import type { CatalogExercise, Entry, EntryInput, Exercise, ExerciseInput, PlanChanges, PlanItem, Profile, Scheme } from './types';

/** Accesso ai dati di un utente. */
export interface Repo {
  getProfile(): Promise<Profile>;
  updateProfile(patch: Partial<Profile>): Promise<void>;
  /** Elimina l'account con tutti i suoi dati. Non si torna indietro. */
  deleteAccount(): Promise<void>;

  /** catalogo comune, in ordine di categoria */
  listCatalog(): Promise<CatalogExercise[]>;

  listExercises(): Promise<Exercise[]>;
  /** con `catalogId` il nome viene dal catalogo e `name` è ignorato */
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
