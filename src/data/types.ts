export interface Profile {
  /** nome mostrato agli altri (es. al trainer); null = non ancora scelto */
  displayName: string | null;
  /** modalità trainer attiva: può invitare atleti e leggerne i dati */
  isTrainer: boolean;
}

/** Collegamento attivo tra un trainer e un atleta. */
export interface CoachLink {
  id: string;
  trainerId: string;
  athleteId: string;
  trainerName: string | null;
  athleteName: string | null;
  createdAt: string;
}

export type ExerciseType = 'forza' | 'volume' | 'tecnico';
export type Difficulty = 'facile' | 'medio' | 'difficile';
export type EntryKind = 'training' | 'attempt';

export const EXERCISE_TYPES: ExerciseType[] = ['forza', 'volume', 'tecnico'];
export const DIFFICULTIES: Difficulty[] = ['facile', 'medio', 'difficile'];

export const TYPE_LABEL: Record<ExerciseType, string> = { forza: 'Forza', volume: 'Volume', tecnico: 'Tecnico' };
export const DIFFICULTY_LABEL: Record<Difficulty, string> = { facile: 'Facile', medio: 'Medio', difficile: 'Difficile' };

export type Category = 'tirata' | 'spinta' | 'gambe' | 'core' | 'skill';

export const CATEGORIES: Category[] = ['tirata', 'spinta', 'gambe', 'core', 'skill'];
export const CATEGORY_LABEL: Record<Category, string> = { tirata: 'Tirata', spinta: 'Spinta', gambe: 'Gambe', core: 'Core', skill: 'Skill' };

/** Voce del catalogo esercizi comune a tutti gli utenti. */
export interface CatalogExercise {
  /** slug stabile, es. "trazioni" */
  id: string;
  name: string;
  category: Category;
  defaultType: ExerciseType;
  /** altri nomi, in minuscolo */
  aliases: string[];
}

/** Esercizio dell'utente: collegato a una voce del catalogo oppure personalizzato. */
export interface Exercise {
  id: string;
  /** voce del catalogo; null = esercizio personalizzato */
  catalogId: string | null;
  /** il nome del catalogo, oppure quello scelto dall'utente */
  name: string;
  type: ExerciseType;
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

/** Serie × ripetizioni × peso e recupero di un esercizio in un giorno del programma. */
export interface Scheme {
  sets: number;
  reps: number;
  weight: number;
  /** secondi di recupero tra le serie; 0 = niente timer */
  rest: number;
}

export interface PlanItem {
  id: string;
  /** YYYY-MM-DD: il giorno del calendario in cui è programmato */
  date: string;
  exerciseId: string;
  sortOrder: number;
  scheme: Scheme;
}

export type PlanItemInput = Omit<PlanItem, 'id'>;

/** Modifica di più giorni in un colpo (es. copia di una settimana): id da togliere, righe da aggiungere. */
export interface PlanChanges {
  remove: string[];
  add: PlanItemInput[];
}

/** Recupero quando non c'è uno schema da cui prenderlo. */
export const DEFAULT_REST = 90;
