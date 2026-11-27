export interface Profile {
  /** nome mostrato agli altri (es. al trainer); null = non ancora scelto */
  displayName: string | null;
  /** modalità trainer attiva: può invitare atleti e leggerne i dati */
  isTrainer: boolean;
  /** nazione, ISO 3166-1 alpha-2 ("IT"); null = non ancora indicata (ticket 38) */
  country: string | null;
  /** sigla della provincia ("MI"): solo in Italia */
  province: string | null;
  /** regione ricavata dalla provincia dal database: si legge soltanto */
  region: string | null;
  /** true (valore di partenza) = nelle classifiche il nome lo vede solo chi segue l'utente */
  isPrivate: boolean;
  /** true (valore di partenza) = un record che migliora il punteggio diventa una novità per chi mi segue (ticket 39) */
  shareRecords: boolean;
}

/** Ciò che l'utente può cambiare del profilo: la regione la decide la provincia. */
export type ProfilePatch = Partial<Omit<Profile, 'region'>>;

/** Ambiti delle classifiche (ticket 38). "amici" = le persone che seguo, più me. */
export type RankingScope = 'amici' | 'provincia' | 'regione' | 'nazione' | 'mondo';
export const RANKING_SCOPES: readonly RankingScope[] = ['amici', 'provincia', 'regione', 'nazione', 'mondo'];

/** Metrica di una classifica: il punteggio complessivo ("Generale") o una delle 5 categorie del motore. */
export type RankingMetric = 'generale' | 'fondamentali-tirata' | 'fondamentali-spinta' | 'skill-tirata' | 'skill-spinta' | 'handbalance';

/** Dove sono in una classifica. */
export interface RankingPlace {
  scope: RankingScope;
  metric: RankingMetric;
  /** false se l'ambito non vale per me: provincia e regione fuori dall'Italia, o luogo non ancora indicato */
  available: boolean;
  /** 1 = primo; a pari punti stessa posizione; null se non ho ancora punti */
  position: number | null;
  /** quanti hanno almeno un punto nell'ambito (contano anche i profili privati) */
  participants: number;
  /** i miei punti nella metrica */
  score: number | null;
}

export interface RankingRow {
  position: number;
  userId: string;
  name: string | null;
  score: number;
  me: boolean;
}

/** Una classifica: dove sono e le righe da mostrare. Tra amici tutte (fino a 100); negli altri ambiti le prime 3 visibili e i vicini. */
export interface Ranking extends RankingPlace {
  rows: RankingRow[];
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

export const MEASURES: Measure[] = ['reps', 'time'];
export const MEASURE_LABEL: Record<Measure, string> = { reps: 'Ripetizioni', time: 'Secondi' };

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
  /** quella della voce del catalogo; per un personalizzato la sceglie l'utente (non cambia dopo la prima registrazione) */
  measure: Measure;
  sortOrder: number;
  archivedAt: string | null;
}

export type ExerciseInput = Omit<Exercise, 'id' | 'sortOrder' | 'archivedAt'>;

/** Una serie: a ripetizioni (`seconds` = 0) oppure a tempo (`reps` = 0), secondo la misura dell'esercizio. */
export interface WorkSet {
  weight: number;
  reps: number;
  seconds: number;
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

/** Tipo, serie × ripetizioni (o secondi) × peso e recupero di un esercizio in un giorno del programma. */
export interface Scheme {
  /** lo stesso esercizio può essere di forza un giorno e di volume un altro */
  type: ExerciseType;
  sets: number;
  /** 0 negli esercizi a tempo */
  reps: number;
  /** secondi di tenuta di ogni serie; 0 negli esercizi a ripetizioni */
  seconds: number;
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

/**
 * Record di livello (ticket 09, formato v2 del ticket 32): voce + valore in una data, col peso corporeo dentro
 * quando la formula della voce lo usa. Il punteggio si calcola sempre dai record, non si salva.
 */
export interface LevelRecordRow {
  id: string;
  /** catena (es. 'planche'), vedi src/lib/levels/v2/rules.ts */
  subId: string;
  /** voce della catena nel motore v2 (es. 'straddle', 'zavorra', 'massimale') */
  stage: string;
  /** ripetizioni, secondi o kg secondo la voce */
  value: number;
  /** peso corporeo (kg) al momento del record: solo se la voce lo usa (`usesBodyweight`), altrimenti null */
  bodyweightKg: number | null;
  /** YYYY-MM-DD */
  date: string;
  note: string | null;
  /** false = "non condividere": questo record non va tra le novità degli amici (ticket 39) */
  shared: boolean;
  createdAt: string;
}

/** Senza `shared` il record è condivisibile (lo decide poi l'interruttore del profilo). */
export type LevelRecordInput = Omit<LevelRecordRow, 'id' | 'createdAt' | 'shared'> & { shared?: boolean };

// ---------------------------------------------------------------------------------------------------------
// Home social (ticket 39): seguire, persone, novità, allenamenti condivisi

/** Io verso una persona, o lei verso di me: niente, richiesta in attesa, accettata. */
export type FollowState = 'none' | 'pending' | 'accepted';

/**
 * Quello che si può vedere di una persona: nome e livello (la fascia, non i punti) sempre; il luogo solo se il suo
 * profilo è pubblico o se la seguo. Record e peso corporeo non arrivano mai.
 */
export interface PersonCard {
  userId: string;
  name: string | null;
  /** fascia del livello complessivo: 0 = Base … 5 = Leggenda */
  band: number;
  isPrivate: boolean;
  /** io verso di lei */
  relation: FollowState;
  /** lei verso di me */
  followsMe: FollowState;
  country: string | null;
  province: string | null;
  region: string | null;
}

/** Punti di una persona: complessivo e le 5 categorie (fondamentali tirata e spinta, skill tirata e spinta, handbalance). */
export interface PersonScores {
  total: number;
  ft: number;
  fs: number;
  st: number;
  ss: number;
  hb: number;
}

/**
 * Il profilo di una persona (migration 0021). Punti e record condivisi arrivano solo se la seguo con richiesta
 * accettata (`visible`); altrimenti c'è solo la scheda. Il peso corporeo e i record non condivisi non arrivano mai.
 */
export interface PersonProfile {
  card: PersonCard;
  visible: boolean;
  /** null: non la seguo, o non ha ancora punti */
  scores: PersonScores | null;
  /** i record che ha condiviso, dal più recente: come il `payload` di una novità "record" */
  records: Record<string, unknown>[];
}

export interface People {
  /** richieste di seguirmi da accettare o rifiutare */
  requests: PersonCard[];
  /** chi seguo, comprese le richieste che ho mandato e sono in attesa */
  following: PersonCard[];
  /** chi mi segue */
  followers: PersonCard[];
  blocked: { userId: string; name: string | null }[];
}

export type FeedKind = 'record' | 'workout' | 'overtake';

/** Una novità di una persona che seguo. Il contenuto di `payload` dipende dal tipo: lo leggono le funzioni di `socialView`. */
export interface FeedEvent {
  id: string;
  kind: FeedKind;
  actorId: string;
  actorName: string | null;
  payload: Record<string, unknown>;
  /** allenamento condiviso da aprire (solo `workout`) */
  workoutId: string | null;
  createdAt: string;
  unread: boolean;
}

export interface Feed {
  /** quante novità sono arrivate dopo l'ultima lettura (tutte, non solo quelle in `events`) */
  unread: number;
  events: FeedEvent[];
}

/** Un esercizio di un allenamento condiviso: copia in sola lettura di nome, serie e valori. */
export interface SharedItem {
  name: string;
  /** voce del catalogo, se l'esercizio ne aveva una: chi copia ritrova lo stesso esercizio */
  catalogId: string | null;
  measure: Measure;
  type: ExerciseType;
  /** secondi di recupero */
  rest: number;
  sets: WorkSet[];
}

export interface SharedWorkoutInput {
  /** nome dato dall'utente ("Push day") */
  name: string;
  /** YYYY-MM-DD: il giorno dell'allenamento */
  date: string;
  items: SharedItem[];
}

export interface SharedWorkout extends SharedWorkoutInput {
  id: string;
  userId: string;
  createdAt: string;
}
