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

/** Come si misura un esercizio: ripetizioni o secondi di tenuta. */
export type Measure = 'reps' | 'time';

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
  /** si misura in ripetizioni o in secondi (tenute: planche, front lever, verticale…) */
  measure: Measure;
}

/** Esercizio dell'utente: collegato a una voce del catalogo oppure personalizzato. */
export interface Exercise {
  id: string;
  /** voce del catalogo; null = esercizio personalizzato */
  catalogId: string | null;
  /** il nome del catalogo, oppure quello scelto dall'utente */
  name: string;
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
  /** forza, volume o tecnico: quello della scheda di quel giorno, o scelto registrando */
  type: ExerciseType;
  sets: WorkSet[];
  difficulty: Difficulty | null;
  /** nota dell'atleta, letta anche dal trainer */
  note: string | null;
  createdAt: string;
}

/** Senza `type` lo completa il database: dal programma di quel giorno, poi dall'esercizio. */
export type EntryInput = Omit<Entry, 'id' | 'createdAt' | 'type'> & { type?: ExerciseType };

/** Tipo, serie × ripetizioni × peso e recupero di un esercizio in un giorno del programma. */
export interface Scheme {
  /** lo stesso esercizio può essere di forza un giorno e di volume un altro */
  type: ExerciseType;
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
  /** trainer che l'ha programmato; null = programmato dall'atleta */
  assignedBy: string | null;
  /** nota del trainer */
  note: string | null;
}

/** Riga nuova scritta dall'utente stesso: mai a nome di un trainer. */
export type PlanItemInput = Omit<PlanItem, 'id' | 'assignedBy'>;

/** Scheda modello di un trainer: settimane relative, senza date. */
export interface Program {
  id: string;
  name: string;
  weeks: number;
  updatedAt: string;
}

/** Esercizio di una scheda modello: voce del catalogo oppure nome personalizzato. */
export interface ProgramItem {
  id: string;
  programId: string;
  /** 1 ... weeks */
  week: number;
  /** 0 = lunedì ... 6 = domenica */
  weekday: number;
  catalogId: string | null;
  customName: string | null;
  sortOrder: number;
  scheme: Scheme;
  note: string | null;
}

export type ProgramItemInput = Omit<ProgramItem, 'id'>;

/** Cosa mettere in un giorno: una voce del catalogo o un nome personalizzato. */
export type ExerciseRef = { catalogId: string; customName: null } | { catalogId: null; customName: string };

/** Modifica di più giorni in un colpo (es. copia di una settimana): id da togliere, righe da aggiungere. */
export interface PlanChanges {
  remove: string[];
  add: PlanItemInput[];
}

/** Recupero quando non c'è uno schema da cui prenderlo. */
export const DEFAULT_REST = 90;
