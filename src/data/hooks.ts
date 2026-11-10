import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useRepo, useScope } from '../app/session';
import { useToast } from '../app/toast';
import type { Repo } from './repo';
import { todayStr } from '../lib/dates';
import { currentBodyweight, levelSummary, withBodyweight } from '../lib/levels';
import type {
  CatalogExercise,
  EntryInput,
  Exercise,
  ExerciseInput,
  ExerciseRef,
  LevelRecordInput,
  PlanChanges,
  Profile,
  PlanItem,
  ProgramItemInput,
  Scheme,
} from './types';

const K = {
  exercises: ['exercises'] as QueryKey,
  entries: ['entries'] as QueryKey,
  plan: ['plan'] as QueryKey,
  profile: ['profile'] as QueryKey,
  catalog: ['catalog'] as QueryKey,
  links: ['links'] as QueryKey,
  invite: ['invite'] as QueryKey,
  programs: ['programs'] as QueryKey,
  programItems: ['program-items'] as QueryKey,
  bodyWeights: ['body-weights'] as QueryKey,
  levelRecords: ['level-records'] as QueryKey,
};

/** Chiave di una query sui dati di un utente: quelli propri e quelli di un atleta non si mescolano in cache. */
function useKey(base: QueryKey): QueryKey {
  return [...base, useScope().userId];
}

/** Catalogo comune: cambia solo con un deploy, non serve rileggerlo durante la sessione. */
export function useCatalog() {
  const repo = useRepo();
  return useQuery({ queryKey: K.catalog, queryFn: () => repo.listCatalog(), staleTime: Infinity });
}

export function useProfile() {
  const repo = useRepo();
  return useQuery({ queryKey: useKey(K.profile), queryFn: () => repo.getProfile() });
}

export function useExercises() {
  const repo = useRepo();
  return useQuery({ queryKey: useKey(K.exercises), queryFn: () => repo.listExercises() });
}

export function useEntries() {
  const repo = useRepo();
  return useQuery({ queryKey: useKey(K.entries), queryFn: () => repo.listEntries() });
}

export function usePlan() {
  const repo = useRepo();
  return useQuery({ queryKey: useKey(K.plan), queryFn: () => repo.listPlan() });
}

/** Tutti i dati dell'app: le viste ne usano sempre più di uno. */
export function useData() {
  const ex = useExercises();
  const en = useEntries();
  const pl = usePlan();
  const all = ex.data ?? [];
  const entries = en.data ?? [];
  const today = todayStr();
  return {
    exercises: all,
    active: all.filter((e) => !e.archivedAt),
    entries,
    /** solo fino a oggi: le registrazioni con data futura sono in programma, non ancora svolte */
    done: entries.filter((e) => e.date <= today),
    plan: pl.data ?? [],
    isLoading: ex.isLoading || en.isLoading || pl.isLoading,
    error: ex.error ?? en.error ?? pl.error,
  };
}

/** `dbMessage`: in caso d'errore mostra il messaggio del database (le funzioni dei collegamenti spiegano cosa non va). */
function useRepoMutation<A, R>(fn: (repo: Repo, args: A) => Promise<R>, keys: QueryKey[], okMsg?: string, dbMessage = false) {
  const repo = useRepo();
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (args: A) => fn(repo, args),
    onSuccess: () => okMsg && toast(okMsg),
    onError: (e) => toast(dbMessage && e instanceof Error && e.message ? e.message : 'Non riesco a salvare. Riprova.'),
    onSettled: () => Promise.all(keys.map((queryKey) => qc.invalidateQueries({ queryKey }))),
  });
}

export const useUpdateProfile = (okMsg = 'Profilo salvato') =>
  useRepoMutation((r, a: Partial<Profile>) => r.updateProfile(a), [K.profile], okMsg);

export function useLinks() {
  const repo = useRepo();
  return useQuery({ queryKey: useKey(K.links), queryFn: () => repo.listLinks() });
}

export function useInviteCode() {
  const repo = useRepo();
  return useQuery({ queryKey: useKey(K.invite), queryFn: () => repo.getInviteCode() });
}

export const useRotateInvite = () => useRepoMutation((r) => r.rotateInviteCode(), [K.invite], undefined, true);

/**
 * Righe del programma scritte dal trainer che segue ora l'utente: sono del trainer, l'utente le registra ma non le
 * modifica. Le righe di un trainer che non lo segue più sono tornate sue.
 */
export function useTrainerLock(): (p: PlanItem) => boolean {
  const { userId } = useScope();
  const trainer = useLinks().data?.find((l) => l.athleteId === userId)?.trainerId;
  return (p) => p.assignedBy !== null && p.assignedBy === trainer;
}

export const useAcceptInvite = () => useRepoMutation((r, code: string) => r.acceptInvite(code), [K.links], 'Collegato al trainer', true);

export const useEndLink = (okMsg: string) => useRepoMutation((r, id: string) => r.endLink(id), [K.links], okMsg, true);

export function useDeleteAccount() {
  const repo = useRepo();
  const toast = useToast();
  return useMutation({
    mutationFn: () => repo.deleteAccount(),
    onError: () => toast('Non riesco a eliminare l’account. Riprova.'),
  });
}

export const useCreateExercise = () =>
  useRepoMutation((r, a: ExerciseInput) => r.createExercise(a), [K.exercises], 'Esercizio aggiunto');

export const useUpdateExercise = (okMsg?: string) =>
  useRepoMutation(
    (r, a: { id: string; patch: Partial<ExerciseInput> }) => r.updateExercise(a.id, a.patch),
    [K.exercises],
    okMsg,
  );

export const useArchiveExercise = () =>
  useRepoMutation(
    (r, a: { id: string; archived: boolean }) => r.setExerciseArchived(a.id, a.archived),
    [K.exercises, K.plan],
  );

export const useDeleteExercise = () =>
  useRepoMutation((r, id: string) => r.deleteExercise(id), [K.exercises, K.entries, K.plan], 'Esercizio eliminato');

/**
 * Aggiunge al programma una voce del catalogo che l'utente non ha tra i suoi esercizi attivi:
 * la crea (o la ripristina, se era archiviata) e la mette nel giorno.
 */
export const useAddCatalogToPlan = () =>
  useRepoMutation(
    async (r, a: { item: CatalogExercise; archived?: Exercise; date: string; scheme: Scheme }) => {
      let id = a.archived?.id;
      if (id) await r.setExerciseArchived(id, false);
      else id = (await r.createExercise({ catalogId: a.item.id, name: a.item.name, inRecords: false, measure: a.item.measure })).id;
      await r.addPlanItem(a.date, id, a.scheme);
    },
    [K.exercises, K.plan],
  );

export const useCreateEntry = (okMsg = 'Salvato') =>
  useRepoMutation((r, a: EntryInput) => r.createEntry(a), [K.entries], okMsg);

export const useUpdateEntry = (okMsg?: string) =>
  useRepoMutation((r, a: { id: string; patch: Partial<EntryInput> }) => r.updateEntry(a.id, a.patch), [K.entries], okMsg);

export const useDeleteEntry = () => useRepoMutation((r, id: string) => r.deleteEntry(id), [K.entries], 'Registrazione eliminata');

export const useAddPlanItem = () =>
  useRepoMutation(
    (r, a: { date: string; exerciseId: string; scheme: Scheme }) => r.addPlanItem(a.date, a.exerciseId, a.scheme),
    [K.plan],
  );

export const useSetPlanScheme = () =>
  useRepoMutation((r, a: { id: string; scheme: Scheme }) => r.setPlanScheme(a.id, a.scheme), [K.plan], 'Schema del giorno salvato');

export const useRemovePlanItem = () => useRepoMutation((r, id: string) => r.removePlanItem(id), [K.plan]);

export const useSetPlanNote = () =>
  useRepoMutation((r, a: { id: string; note: string | null }) => r.setPlanNote(a.id, a.note), [K.plan]);

/** Il trainer aggiunge un esercizio al calendario dell'atleta che sta guardando. */
export const useCoachAddPlanItem = () =>
  useRepoMutation(
    (r, a: { date: string; ref: ExerciseRef; scheme: Scheme; note: string | null }) => r.coachAddPlanItem(a.date, a.ref, a.scheme, a.note),
    [K.plan, K.exercises],
    undefined,
    true,
  );

/**
 * Più righe nel calendario dell'atleta in una volta (ticket 26: aggiunta multipla, duplica giorno). Una chiamata per
 * riga, in fila: al primo errore si ferma e le righe già scritte restano. Restituisce quante ne ha scritte.
 */
export const useCoachAddPlanItems = () =>
  useRepoMutation(
    async (r, items: { date: string; ref: ExerciseRef; scheme: Scheme; note: string | null }[]) => {
      let n = 0;
      for (const a of items) {
        await r.coachAddPlanItem(a.date, a.ref, a.scheme, a.note);
        n++;
      }
      return n;
    },
    [K.plan, K.exercises],
    undefined,
    true,
  );

// Schede modello: sono del trainer collegato, non dell'utente che le viste stanno mostrando.

export function usePrograms() {
  const repo = useRepo();
  return useQuery({ queryKey: K.programs, queryFn: () => repo.listPrograms() });
}

export function useProgramItems(programId: string) {
  const repo = useRepo();
  return useQuery({ queryKey: [...K.programItems, programId], queryFn: () => repo.listProgramItems(programId) });
}

export const useCreateProgram = () =>
  useRepoMutation((r, a: { name: string; weeks: number }) => r.createProgram(a), [K.programs]);

export const useUpdateProgram = (okMsg?: string) =>
  useRepoMutation((r, a: { id: string; patch: { name?: string; weeks?: number } }) => r.updateProgram(a.id, a.patch), [K.programs], okMsg);

export const useDeleteProgram = () => useRepoMutation((r, id: string) => r.deleteProgram(id), [K.programs], 'Scheda eliminata');

export const useAddProgramItems = (okMsg?: string) =>
  useRepoMutation((r, items: ProgramItemInput[]) => r.addProgramItems(items), [K.programItems, K.programs], okMsg);

export const useUpdateProgramItem = () =>
  useRepoMutation(
    (r, a: { id: string; patch: { scheme?: Scheme; note?: string | null } }) => r.updateProgramItem(a.id, a.patch),
    [K.programItems, K.programs],
  );

/** Toglie `remove` e aggiunge `add` in un'unica operazione: non dipende dal componente che la avvia. */
export const useReplaceProgramItems = (okMsg?: string) =>
  useRepoMutation((r, a: { remove: string[]; add: ProgramItemInput[] }) => r.replaceProgramItems(a.remove, a.add), [K.programItems, K.programs], okMsg);

export const useRemoveProgramItems = () =>
  useRepoMutation((r, ids: string[]) => r.removeProgramItems(ids), [K.programItems, K.programs]);

/** Restituisce quante righe sono finite nel calendario dell'atleta. */
export const useAssignProgram = () =>
  useRepoMutation(
    (r, a: { programId: string; athleteId: string; startMonday: string }) => r.assignProgram(a.programId, a.athleteId, a.startMonday),
    [K.plan, K.exercises],
    undefined,
    true,
  );

export const useApplyPlanChanges = (okMsg?: string) =>
  useRepoMutation((r, a: PlanChanges) => r.applyPlanChanges(a), [K.plan], okMsg);

// Sistema di livelli (ticket 09): peso corporeo e record. Solo l'atleta scrive; il trainer legge.

export function useBodyWeights() {
  const repo = useRepo();
  return useQuery({ queryKey: useKey(K.bodyWeights), queryFn: () => repo.listBodyWeights() });
}

export function useLevelRecords() {
  const repo = useRepo();
  return useQuery({ queryKey: useKey(K.levelRecords), queryFn: () => repo.listLevelRecords() });
}

/**
 * Livello calcolato dai record, ognuno col peso del suo giorno. Non si salva mai: cambiando un record, un peso o
 * una soglia delle regole si ricalcola da solo.
 */
export function useLevel() {
  const bw = useBodyWeights();
  const lr = useLevelRecords();
  const computed = useMemo(() => {
    const weights = bw.data ?? [];
    const records = withBodyweight(lr.data ?? [], weights);
    return { summary: levelSummary(records), records, weights, bodyweight: currentBodyweight(weights) };
  }, [bw.data, lr.data]);
  return {
    ...computed,
    isLoading: bw.isLoading || lr.isLoading,
    error: bw.error ?? lr.error,
  };
}

/** Inserisce o corregge il peso di un giorno (di default oggi). */
export const useSetBodyWeight = (okMsg = 'Peso salvato') =>
  useRepoMutation((r, a: { kg: number; date?: string }) => r.setBodyWeight(a.date ?? todayStr(), a.kg), [K.bodyWeights], okMsg);

export const useDeleteBodyWeight = () => useRepoMutation((r, date: string) => r.deleteBodyWeight(date), [K.bodyWeights], 'Peso eliminato');

export const useCreateLevelRecord = (okMsg = 'Record salvato') =>
  useRepoMutation((r, a: LevelRecordInput) => r.createLevelRecord(a), [K.levelRecords], okMsg);

export const useUpdateLevelRecord = (okMsg = 'Record aggiornato') =>
  useRepoMutation((r, a: { id: string; patch: Partial<LevelRecordInput> }) => r.updateLevelRecord(a.id, a.patch), [K.levelRecords], okMsg);

export const useDeleteLevelRecord = () => useRepoMutation((r, id: string) => r.deleteLevelRecord(id), [K.levelRecords], 'Record eliminato');
