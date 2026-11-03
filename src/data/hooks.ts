import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useRepo, useScope } from '../app/session';
import { useToast } from '../app/toast';
import type { Repo } from './repo';
import { todayStr } from '../lib/dates';
import type { CatalogExercise, EntryInput, Exercise, ExerciseInput, PlanChanges, Profile, Scheme } from './types';

const K = {
  exercises: ['exercises'] as QueryKey,
  entries: ['entries'] as QueryKey,
  plan: ['plan'] as QueryKey,
  profile: ['profile'] as QueryKey,
  catalog: ['catalog'] as QueryKey,
  links: ['links'] as QueryKey,
  invite: ['invite'] as QueryKey,
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
function useRepoMutation<A>(fn: (repo: Repo, args: A) => Promise<unknown>, keys: QueryKey[], okMsg?: string, dbMessage = false) {
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
      else id = (await r.createExercise({ catalogId: a.item.id, name: a.item.name, type: a.item.defaultType, inRecords: false })).id;
      await r.addPlanItem(a.date, id, a.scheme);
    },
    [K.exercises, K.plan],
  );

export const useCreateEntry = (okMsg = 'Salvato') =>
  useRepoMutation((r, a: EntryInput) => r.createEntry(a), [K.entries], okMsg);

export const useUpdateEntry = (okMsg?: string) =>
  useRepoMutation((r, a: { id: string; patch: Partial<EntryInput> }) => r.updateEntry(a.id, a.patch), [K.entries], okMsg);

export const useDeleteEntry = () => useRepoMutation((r, id: string) => r.deleteEntry(id), [K.entries]);

export const useAddPlanItem = () =>
  useRepoMutation(
    (r, a: { date: string; exerciseId: string; scheme: Scheme }) => r.addPlanItem(a.date, a.exerciseId, a.scheme),
    [K.plan],
  );

export const useSetPlanScheme = () =>
  useRepoMutation((r, a: { id: string; scheme: Scheme }) => r.setPlanScheme(a.id, a.scheme), [K.plan], 'Schema del giorno salvato');

export const useRemovePlanItem = () => useRepoMutation((r, id: string) => r.removePlanItem(id), [K.plan]);

export const useApplyPlanChanges = (okMsg?: string) =>
  useRepoMutation((r, a: PlanChanges) => r.applyPlanChanges(a), [K.plan], okMsg);
