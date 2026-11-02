export type ExerciseType = 'forza' | 'volume' | 'tecnico';
export type Difficulty = 'facile' | 'medio' | 'difficile';
export type EntryKind = 'training' | 'attempt';

export const EXERCISE_TYPES: ExerciseType[] = ['forza', 'volume', 'tecnico'];
export const DIFFICULTIES: Difficulty[] = ['facile', 'medio', 'difficile'];

export const TYPE_LABEL: Record<ExerciseType, string> = { forza: 'Forza', volume: 'Volume', tecnico: 'Tecnico' };
export const DIFFICULTY_LABEL: Record<Difficulty, string> = { facile: 'Facile', medio: 'Medio', difficile: 'Difficile' };

export interface Exercise {
  id: string;
  name: string;
  type: ExerciseType;
  targetSets: number;
  targetReps: number;
  targetWeight: number;
  restSeconds: number;
  inRecords: boolean;
  sortOrder: number;
  archivedAt: string | null;
}

export type ExerciseInput = Omit<Exercise, 'id' | 'sortOrder' | 'archivedAt'>;

export interface WorkSet {
  weight: number;
  reps: number;
}

export interface Entry {
  id: string;
  exerciseId: string;
  /** YYYY-MM-DD, data locale */
  date: string;
  kind: EntryKind;
  sets: WorkSet[];
  difficulty: Difficulty | null;
  createdAt: string;
}

export type EntryInput = Omit<Entry, 'id' | 'createdAt'>;

/** Serie × ripetizioni × peso: lo schema predefinito di un esercizio o quello di un giorno del programma. */
export interface Scheme {
  sets: number;
  reps: number;
  weight: number;
}

export interface PlanItem {
  id: string;
  /** 0 = lunedì ... 6 = domenica */
  weekday: number;
  exerciseId: string;
  sortOrder: number;
  /** schema di questo giorno; null = usa quello predefinito dell'esercizio */
  scheme: Scheme | null;
}

export const defaultScheme = (ex: Exercise): Scheme => ({ sets: ex.targetSets, reps: ex.targetReps, weight: ex.targetWeight });

export const planScheme = (p: PlanItem, ex: Exercise): Scheme => p.scheme ?? defaultScheme(ex);
