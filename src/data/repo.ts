import type {
  BodyWeight,
  CatalogExercise,
  CoachLink,
  Entry,
  EntryInput,
  Exercise,
  ExerciseInput,
  ExerciseRef,
  LevelRecordInput,
  LevelRecordRow,
  PlanChanges,
  PlanItem,
  Profile,
  Program,
  ProgramItem,
  ProgramItemInput,
  Scheme,
} from './types';

/** Accesso ai dati di un utente. */
export interface Repo {
  getProfile(): Promise<Profile>;
  updateProfile(patch: Partial<Profile>): Promise<void>;
  /** Elimina l'account con tutti i suoi dati. Non si torna indietro. */
  deleteAccount(): Promise<void>;

  /** storico del peso corporeo, dal giorno più vecchio */
  listBodyWeights(): Promise<BodyWeight[]>;
  /** inserisce o corregge il peso del giorno */
  setBodyWeight(date: string, kg: number): Promise<void>;
  deleteBodyWeight(date: string): Promise<void>;

  /** record di livello, dal più vecchio (a parità di data, in ordine d'inserimento) */
  listLevelRecords(): Promise<LevelRecordRow[]>;
  /** `id`: scelto dal telefono, per le righe salvate offline (ticket 27) */
  createLevelRecord(input: LevelRecordInput, id?: string): Promise<LevelRecordRow>;
  updateLevelRecord(id: string, patch: Partial<LevelRecordInput>): Promise<void>;
  deleteLevelRecord(id: string): Promise<void>;

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
