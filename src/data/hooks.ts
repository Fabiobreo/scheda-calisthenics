import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useRepo } from '../app/session';
import { useToast } from '../app/toast';
import type { Repo } from './repo';
import type { EntryInput, ExerciseInput } from './types';

const K = {
  exercises: ['exercises'] as QueryKey,
  entries: ['entries'] as QueryKey,
  plan: ['plan'] as QueryKey,
};

export function useExercises() {
  const repo = useRepo();
  return useQuery({ queryKey: K.exercises, queryFn: () => repo.listExercises() });
}

export function useEntries() {
  const repo = useRepo();
  return useQuery({ queryKey: K.entries, queryFn: () => repo.listEntries() });
}

export function usePlan() {
  const repo = useRepo();
  return useQuery({ queryKey: K.plan, queryFn: () => repo.listPlan() });
}

/** Tutti i dati dell'app: le viste ne usano sempre più di uno. */
export function useData() {
  const ex = useExercises();
  const en = useEntries();
  const pl = usePlan();
  const all = ex.data ?? [];
  return {
    exercises: all,
    active: all.filter((e) => !e.archivedAt),
    entries: en.data ?? [],
    plan: pl.data ?? [],
    isLoading: ex.isLoading || en.isLoading || pl.isLoading,
    error: ex.error ?? en.error ?? pl.error,
  };
}

function useRepoMutation<A>(fn: (repo: Repo, args: A) => Promise<unknown>, keys: QueryKey[], okMsg?: string) {
  const repo = useRepo();
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (args: A) => fn(repo, args),
    onSuccess: () => okMsg && toast(okMsg),
    onError: () => toast('Non riesco a salvare. Riprova.'),
    onSettled: () => Promise.all(keys.map((queryKey) => qc.invalidateQueries({ queryKey }))),
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

export const useCreateEntry = (okMsg = 'Salvato') =>
  useRepoMutation((r, a: EntryInput) => r.createEntry(a), [K.entries], okMsg);

export const useUpdateEntry = (okMsg?: string) =>
  useRepoMutation((r, a: { id: string; patch: Partial<EntryInput> }) => r.updateEntry(a.id, a.patch), [K.entries], okMsg);

export const useDeleteEntry = () => useRepoMutation((r, id: string) => r.deleteEntry(id), [K.entries]);

export const useAddPlanItem = () =>
  useRepoMutation((r, a: { weekday: number; exerciseId: string }) => r.addPlanItem(a.weekday, a.exerciseId), [K.plan]);

export const useRemovePlanItem = () => useRepoMutation((r, id: string) => r.removePlanItem(id), [K.plan]);
