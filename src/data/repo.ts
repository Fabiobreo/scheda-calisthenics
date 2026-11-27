import type { LevelScores } from '../lib/levels';
import type {
  CatalogExercise,
  CoachLink,
  Entry,
  EntryInput,
  Exercise,
  ExerciseInput,
  ExerciseRef,
  Feed,
  FollowState,
  LevelRecordInput,
  LevelRecordRow,
  PlanChanges,
  PlanItem,
  People,
  PersonCard,
  PersonProfile,
  Ranking,
  RankingMetric,
  RankingPlace,
  RankingScope,
  Profile,
  ProfilePatch,
  Program,
  ProgramItem,
  ProgramItemInput,
  Scheme,
  SharedWorkout,
  SharedWorkoutInput,
} from './types';

/** Accesso ai dati di un utente. */
export interface Repo {
  getProfile(): Promise<Profile>;
  updateProfile(patch: ProfilePatch): Promise<void>;
  /** Elimina l'account con tutti i suoi dati. Non si torna indietro. */
  deleteAccount(): Promise<void>;

  /** record di livello, dal più vecchio (a parità di data, in ordine d'inserimento) */
  listLevelRecords(): Promise<LevelRecordRow[]>;
  /** `id`: scelto dal telefono, per le righe salvate offline (ticket 27) */
  createLevelRecord(input: LevelRecordInput, id?: string): Promise<LevelRecordRow>;
  updateLevelRecord(id: string, patch: Partial<LevelRecordInput>): Promise<void>;
  deleteLevelRecord(id: string): Promise<void>;

  /** punti salvati sul server per le classifiche (ticket 38); null = mai salvati */
  getLevelScore(): Promise<LevelScores | null>;
  /** scrive (o riscrive) i punti dell'utente: li calcola l'app dai record */
  saveLevelScore(scores: LevelScores): Promise<void>;
  /** una classifica: posizione, partecipanti e le righe intorno */
  ranking(scope: RankingScope, metric: RankingMetric): Promise<Ranking>;
  /** i 5 ambiti di una metrica in una chiamata, senza le righe */
  rankingOverview(metric: RankingMetric): Promise<Record<RankingScope, RankingPlace>>;

  // Home social (ticket 39). Di un altro utente arrivano solo nome, livello e ciò che condivide.
  /** persone per nome (almeno 2 caratteri, al massimo 20) */
  searchPeople(query: string): Promise<PersonCard[]>;
  /** il profilo di una persona; null = non esiste, non ha un nome o c'è un blocco */
  personProfile(userId: string): Promise<PersonProfile | null>;
  /** richieste ricevute, chi seguo, chi mi segue, chi ho bloccato */
  myPeople(): Promise<People>;
  /** segue: subito se il profilo è pubblico ('accepted'), con una richiesta se è privato ('pending') */
  followUser(userId: string): Promise<FollowState>;
  /** smette di seguire, o ritira la richiesta */
  unfollowUser(userId: string): Promise<void>;
  acceptFollow(userId: string): Promise<void>;
  rejectFollow(userId: string): Promise<void>;
  removeFollower(userId: string): Promise<void>;
  blockUser(userId: string): Promise<void>;
  unblockUser(userId: string): Promise<void>;
  reportUser(userId: string, reason: string): Promise<void>;
  /** codice del link "seguimi"; null = non ancora generato */
  getFollowCode(): Promise<string | null>;
  rotateFollowCode(): Promise<string>;
  /** chi c'è dietro un codice "seguimi"; null = codice non valido */
  previewFollowInvite(code: string): Promise<PersonCard | null>;
  /** novità delle persone che seguo, dalla più recente */
  feed(limit: number): Promise<Feed>;
  markFeedRead(): Promise<void>;
  /** condivide un allenamento con chi mi segue; `id` scelto dal telefono per i salvataggi offline */
  shareWorkout(input: SharedWorkoutInput, id?: string): Promise<void>;
  /** allenamento condiviso da me o da una persona che seguo; null = non c'è più o non lo posso leggere */
  getSharedWorkout(id: string): Promise<SharedWorkout | null>;
  /** gli allenamenti che ho condiviso io, dal più recente (senza gli esercizi) */
  listMySharedWorkouts(): Promise<{ id: string; name: string; date: string; createdAt: string }[]>;
  /** toglie un mio allenamento condiviso: sparisce anche dalle novità di chi mi segue */
  deleteSharedWorkout(id: string): Promise<void>;
  /** chi seguo, chi mi segue, blocchi e allenamenti condivisi, per l'export dei dati */
  exportSocial(): Promise<Record<string, unknown[]>>;

  /** collegamenti attivi in cui l'utente è trainer o atleta */
  listLinks(): Promise<CoachLink[]>;
  /** codice d'invito attuale del trainer; null = non ancora generato */
  getInviteCode(): Promise<string | null>;
  /** nuovo codice: quello vecchio smette di valere */
  rotateInviteCode(): Promise<string>;
  /** nome del trainer dietro un codice; null = codice non valido */
  previewInvite(code: string): Promise<{ trainerName: string | null } | null>;
  acceptInvite(code: string): Promise<void>;
  endLink(id: string): Promise<void>;

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
  /** `id`: scelto dal telefono, per le righe salvate offline (ticket 27) */
  createEntry(input: EntryInput, id?: string): Promise<Entry>;
  updateEntry(id: string, patch: Partial<EntryInput>): Promise<void>;
  deleteEntry(id: string): Promise<void>;

  listPlan(): Promise<PlanItem[]>;
  /** in fondo agli esercizi del giorno `date` (YYYY-MM-DD) */
  addPlanItem(date: string, exerciseId: string, scheme: Scheme): Promise<void>;
  setPlanScheme(id: string, scheme: Scheme): Promise<void>;
  /** nota del trainer su una riga sua */
  setPlanNote(id: string, note: string | null): Promise<void>;
  /** il trainer aggiunge un esercizio al calendario dell'atleta di questo repo */
  coachAddPlanItem(date: string, ref: ExerciseRef, scheme: Scheme, note: string | null): Promise<void>;

  /** schede modello del trainer collegato (non dipendono dall'utente del repo) */
  listPrograms(): Promise<Program[]>;
  createProgram(input: { name: string; weeks: number }): Promise<Program>;
  updateProgram(id: string, patch: { name?: string; weeks?: number }): Promise<void>;
  deleteProgram(id: string): Promise<void>;
  listProgramItems(programId: string): Promise<ProgramItem[]>;
  addProgramItems(items: ProgramItemInput[]): Promise<void>;
  updateProgramItem(id: string, patch: { scheme?: Scheme; note?: string | null }): Promise<void>;
  removeProgramItems(ids: string[]): Promise<void>;
  /** aggiunge e poi toglie: se l'aggiunta fallisce non si perde niente */
  replaceProgramItems(remove: string[], add: ProgramItemInput[]): Promise<void>;
  /** schede, assegnazioni e collegamenti (anche chiusi) dell'utente, per l'export dei dati */
  exportCoaching(): Promise<Record<string, unknown[]>>;
  /** scrive la scheda nel calendario dell'atleta dal lunedì indicato; restituisce quante righe */
  assignProgram(programId: string, athleteId: string, startMonday: string): Promise<number>;
  removePlanItem(id: string): Promise<void>;
  /** prima toglie, poi aggiunge */
  applyPlanChanges(changes: PlanChanges): Promise<void>;
}
