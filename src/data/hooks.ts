import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { useRepo, useScope } from '../app/session';
import { useToast } from '../app/toast';
import type { Repo } from './repo';
import { enqueue, netDown, newId, pendingFor, queue, QUEUE_FORMAT, type QueueOp } from './offline';
import { scoreToSave } from './scoreSync';
import { todayStr } from '../lib/dates';
import { levelScores, levelSummary, type LevelRecord } from '../lib/levels';
import { schemeOf, type CopyStep } from '../lib/share';
import type {
  CatalogExercise,
  EntryInput,
  Exercise,
  ExerciseInput,
  ExerciseRef,
  LevelRecordInput,
  LevelRecordRow,
  PlanChanges,
  ProfilePatch,
  PlanItem,
  RankingMetric,
  RankingScope,
  ProgramItemInput,
  Scheme,
  SharedWorkoutInput,
} from './types';

/** Chiavi delle query (esportate per la coda offline, ticket 27). */
export const K = {
  exercises: ['exercises'] as QueryKey,
  entries: ['entries'] as QueryKey,
  plan: ['plan'] as QueryKey,
  profile: ['profile'] as QueryKey,
  catalog: ['catalog'] as QueryKey,
  links: ['links'] as QueryKey,
  invite: ['invite'] as QueryKey,
  programs: ['programs'] as QueryKey,
  programItems: ['program-items'] as QueryKey,
  levelRecords: ['level-records'] as QueryKey,
  levelScore: ['level-score'] as QueryKey,
  ranking: ['ranking'] as QueryKey,
  /** tutto ciò che è social (ticket 39): persone, ricerca, novità, link "seguimi", allenamenti condivisi */
  social: ['social'] as QueryKey,
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
    // errore solo se mancano i dati: offline restano quelli in cache, e "non riesco a leggere" sarebbe falso (ticket 27)
    error: ex.data && en.data && pl.data ? null : (ex.error ?? en.error ?? pl.error),
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

/** Il salvataggio è rimasto sul telefono (ticket 27): l'utente deve sapere che non è ancora arrivato. */
export const QUEUED_MSG = 'Salvato sul telefono: lo invio appena torna la rete';

/**
 * Come `useRepoMutation`, ma senza rete il salvataggio va in coda invece di fallire (ticket 27): si vede subito nelle
 * viste e parte da solo quando la rete torna. Se si è già offline non si prova nemmeno. Se in coda c'è già qualcosa si
 * accoda anche con la rete, così l'ordine dei salvataggi resta quello in cui l'utente li ha fatti. `networkMode: 'always'`: senza rete TanStack Query
 * metterebbe la mutazione in pausa invece di farla fallire, e il salvataggio non arriverebbe mai alla coda.
 */
function useQueuedMutation<A>(
  op: QueueOp,
  toArgs: (a: A) => unknown[],
  keys: QueryKey[],
  /** testo fisso, o ricavato da quello che il server ha risposto */
  okMsg?: string | ((result: unknown) => string | undefined),
  /** in caso di rifiuto mostra il messaggio del database (le funzioni del seguire spiegano cosa non va) */
  dbMessage = false,
) {
  const { repo, userId } = useScope();
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    networkMode: 'always',
    mutationFn: async (a: A): Promise<{ queued: boolean; result?: unknown }> => {
      const args = toArgs(a);
      // già offline: dritto in coda, senza aspettare (col token scaduto auth-js riproverebbe il rinnovo per 30 s)
      if (!pendingFor(userId).length && !netDown.get())
        try {
          const result = await (repo[op] as (...x: unknown[]) => Promise<unknown>).apply(repo, args);
          return { queued: false, result };
        } catch (e) {
          // `sync` si scarica solo qui, al primo errore: il service worker lo ha in cache anche senza rete
          if (!(await import('./sync').then((m) => m.isRetryable(e), () => true))) throw e;
        }
      const item = { id: newId(), userId, at: Date.now(), op, args, v: QUEUE_FORMAT };
      enqueue(item);
      try {
        (await import('./sync')).applyOptimistic(qc, item);
      } catch {
        /* pezzo non in cache (sviluppo senza service worker): il salvataggio è comunque in coda */
      }
      return { queued: true };
    },
    onSuccess: (r) => {
      const msg = r.queued ? QUEUED_MSG : typeof okMsg === 'function' ? okMsg(r.result) : okMsg;
      if (msg) toast(msg);
    },
    onError: (e) => toast(dbMessage && e instanceof Error && e.message ? e.message : 'Non riesco a salvare. Riprova.'),
    onSettled: (r) => r?.queued || Promise.all(keys.map((queryKey) => qc.invalidateQueries({ queryKey }))),
  });
}

// luogo e visibilità cambiano le classifiche: si rileggono insieme al profilo
export const useUpdateProfile = (okMsg = 'Profilo salvato') =>
  useRepoMutation((r, a: ProfilePatch) => r.updateProfile(a), [K.profile, K.ranking], okMsg);

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

export const useCreateEntry = (okMsg = 'Salvato') => useQueuedMutation('createEntry', (a: EntryInput) => [a, newId()], [K.entries], okMsg);

export const useUpdateEntry = (okMsg?: string) =>
  useQueuedMutation('updateEntry', (a: { id: string; patch: Partial<EntryInput> }) => [a.id, a.patch], [K.entries], okMsg);

export const useDeleteEntry = () => useQueuedMutation('deleteEntry', (id: string) => [id], [K.entries], 'Registrazione eliminata');

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

// Sistema di livelli (ticket 09 e 32): record col peso corporeo dentro. Solo l'atleta scrive; il trainer legge.

export function useLevelRecords() {
  const repo = useRepo();
  return useQuery({ queryKey: useKey(K.levelRecords), queryFn: () => repo.listLevelRecords() });
}

/** Record letto dal database, pronto per il motore: catena e voce coi nomi che il motore si aspetta. */
export type LevelRow = LevelRecordRow & LevelRecord;

/**
 * Livello calcolato dai soli record col motore v2 (`src/lib/levels`), ognuno col peso corporeo che porta dentro. Non
 * si salva mai: cambiando un record o una soglia delle regole si ricalcola da solo.
 */
export function useLevel() {
  const lr = useLevelRecords();
  const computed = useMemo(() => {
    const records = toLevelRecords(lr.data ?? []);
    return { summary: levelSummary(records), records };
  }, [lr.data]);
  return { ...computed, isLoading: lr.isLoading, error: lr.data ? null : lr.error };
}

const toLevelRecords = (rows: LevelRecordRow[]): LevelRow[] => rows.map((r) => ({ ...r, chainId: r.subId, entry: r.stage }));

/**
 * Tiene allineati i punti sul server (`level_scores`, ticket 38) al livello calcolato dai record: dopo un record
 * nuovo, corretto o eliminato, dopo l'invio dei salvataggi fatti offline, e all'avvio se i punti salvati sono di
 * regole più vecchie. Scrive solo quando record e punti salvati sono appena stati letti dal server, c'è rete e non c'è
 * niente in coda: i punti non devono mai arrivare prima dei record da cui nascono. Da montare una volta sola, sui dati
 * dell'utente (non su quelli di un atleta visto dal trainer).
 */
export function useScoreSync() {
  const { repo, userId, readOnly } = useScope();
  const qc = useQueryClient();
  const records = useLevelRecords();
  const saved = useQuery({ queryKey: useKey(K.levelScore), queryFn: () => repo.getLevelScore(), enabled: !readOnly });
  const down = useSyncExternalStore(netDown.subscribe, netDown.get);
  const pending = pendingFor(userId, useSyncExternalStore(queue.subscribe, queue.get)).length > 0;
  /** ultimi punti che si è provato a scrivere: se il server li rifiuta non si riprova a ogni disegno */
  const tried = useRef<string | null>(null);
  const fresh = (q: { status: string; fetchStatus: string }) => q.status === 'success' && q.fetchStatus === 'idle';
  const ready = !readOnly && !down && !pending && fresh(records) && fresh(saved);
  // tornata la rete si può riprovare
  useEffect(() => {
    if (down) tried.current = null;
  }, [down]);
  useEffect(() => {
    if (!ready) return;
    const next = scoreToSave(levelScores(levelSummary(toLevelRecords(records.data ?? []))), saved.data ?? null);
    if (!next) return;
    const sig = `${userId}:${JSON.stringify(next)}`;
    if (tried.current === sig) return;
    tried.current = sig;
    repo.saveLevelScore(next).then(
      () => {
        qc.setQueryData([...K.levelScore, userId], next);
        void qc.invalidateQueries({ queryKey: K.ranking });
      },
      () => {
        /* senza rete o rifiutato: si riprova al prossimo cambiamento dei record o al ritorno della rete */
      },
    );
  }, [ready, records.data, saved.data, repo, userId, qc]);
}

// Classifiche (ticket 38): cambiano quando qualcun altro migliora, quindi si rileggono spesso ma non a ogni tocco.

const RANKING_STALE = 60_000;

/** I 5 riquadri (Amici, Provincia, Regione, Nazione, Mondo) di una metrica: posizione e partecipanti. */
export function useRankingOverview(metric: RankingMetric) {
  const repo = useRepo();
  return useQuery({ queryKey: [...useKey(K.ranking), 'overview', metric], queryFn: () => repo.rankingOverview(metric), staleTime: RANKING_STALE });
}

/** Una classifica con le righe (tra amici tutte; altrove prime 3 e vicini). `scope` null = nessuna aperta. */
export function useRanking(scope: RankingScope | null, metric: RankingMetric) {
  const repo = useRepo();
  return useQuery({
    queryKey: [...useKey(K.ranking), scope, metric],
    queryFn: () => repo.ranking(scope!, metric),
    enabled: scope !== null,
    staleTime: RANKING_STALE,
  });
}

export const useCreateLevelRecord = (okMsg = 'Record salvato') =>
  useQueuedMutation('createLevelRecord', (a: LevelRecordInput) => [a, newId()], [K.levelRecords], okMsg);

export const useUpdateLevelRecord = (okMsg = 'Record aggiornato') =>
  useQueuedMutation('updateLevelRecord', (a: { id: string; patch: Partial<LevelRecordInput> }) => [a.id, a.patch], [K.levelRecords], okMsg);

export const useDeleteLevelRecord = () => useQueuedMutation('deleteLevelRecord', (id: string) => [id], [K.levelRecords], 'Record eliminato');

// ---------------------------------------------------------------------------------------------------------
// Home social (ticket 39). Sono sempre i dati dell'utente che ha fatto l'accesso: la Home non si apre sui dati di un
// atleta. Le novità e le persone cambiano per mano di altri: si rileggono spesso, come le classifiche.

const SOCIAL_STALE = 60_000;

/** Richieste ricevute, chi seguo, chi mi segue, chi ho bloccato. */
export function usePeople() {
  const repo = useRepo();
  return useQuery({ queryKey: [...useKey(K.social), 'people'], queryFn: () => repo.myPeople(), staleTime: SOCIAL_STALE });
}

/** Ricerca per nome: parte da 2 caratteri. */
export function useSearchPeople(query: string) {
  const repo = useRepo();
  const q = query.trim();
  return useQuery({ queryKey: [...useKey(K.social), 'search', q.toLowerCase()], queryFn: () => repo.searchPeople(q), enabled: q.length >= 2, staleTime: SOCIAL_STALE });
}

/** Le novità di chi seguo. `limit`: quante righe (la Home ne mostra poche, "Vedi tutte" di più). */
export function useFeed(limit: number) {
  const repo = useRepo();
  return useQuery({ queryKey: [...useKey(K.social), 'feed', limit], queryFn: () => repo.feed(limit), staleTime: SOCIAL_STALE });
}

/** Segna le novità come lette. Niente messaggio: è una conseguenza dell'averle aperte. */
export function useMarkFeedRead() {
  const repo = useRepo();
  const qc = useQueryClient();
  return useMutation({ mutationFn: () => repo.markFeedRead(), onSuccess: () => qc.invalidateQueries({ queryKey: K.social }) });
}

/** Codice del link "seguimi". */
export function useFollowCode() {
  const repo = useRepo();
  return useQuery({ queryKey: [...useKey(K.social), 'code'], queryFn: () => repo.getFollowCode() });
}

export const useRotateFollowCode = () => useRepoMutation((r) => r.rotateFollowCode(), [K.social], undefined, true);

/** Il profilo di una persona (punti e record condivisi solo se la seguo). `userId` null = nessuno aperto. */
export function usePersonProfile(userId: string | null) {
  const repo = useRepo();
  return useQuery({ queryKey: [...useKey(K.social), 'person', userId], queryFn: () => repo.personProfile(userId!), enabled: userId !== null, staleTime: SOCIAL_STALE });
}

/** Chi c'è dietro un link "seguimi". Non si rilegge da solo: ogni codice sbagliato conta tra i tentativi falliti. */
export function useFollowInvite(code: string | undefined) {
  const repo = useRepo();
  return useQuery({
    queryKey: [...useKey(K.social), 'invite', code],
    queryFn: () => repo.previewFollowInvite(code!),
    enabled: !!code,
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

// seguire cambia anche l'ambito "amici" delle classifiche
const SOCIAL_KEYS = [K.social, K.ranking];

/** "Segui": subito se il profilo è pubblico, una richiesta se è privato. Senza rete resta in coda (ticket 27). */
export const useFollow = () =>
  useQueuedMutation('followUser', (userId: string) => [userId], SOCIAL_KEYS, (r) => (r === 'pending' ? 'Richiesta inviata' : 'Hai iniziato a seguire'), true);

export const useUnfollow = (okMsg: string) => useRepoMutation((r, id: string) => r.unfollowUser(id), SOCIAL_KEYS, okMsg, true);
export const useAcceptFollow = () => useRepoMutation((r, id: string) => r.acceptFollow(id), SOCIAL_KEYS, 'Richiesta accettata', true);
export const useRejectFollow = () => useRepoMutation((r, id: string) => r.rejectFollow(id), SOCIAL_KEYS, 'Richiesta rifiutata', true);
export const useRemoveFollower = () => useRepoMutation((r, id: string) => r.removeFollower(id), SOCIAL_KEYS, 'Non ti segue più', true);
export const useBlockUser = () => useRepoMutation((r, id: string) => r.blockUser(id), SOCIAL_KEYS, 'Persona bloccata', true);
export const useUnblockUser = () => useRepoMutation((r, id: string) => r.unblockUser(id), SOCIAL_KEYS, 'Blocco tolto', true);
export const useReportUser = () =>
  useRepoMutation((r, a: { userId: string; reason: string }) => r.reportUser(a.userId, a.reason), [], 'Segnalazione inviata', true);

/** "Condividi con gli amici": una copia in sola lettura dell'allenamento. Senza rete resta in coda. */
export const useShareWorkout = () =>
  useQueuedMutation('shareWorkout', (a: SharedWorkoutInput) => [a, newId()], [K.social], 'Allenamento condiviso con chi ti segue', true);

/** Gli allenamenti che ho condiviso io. */
export function useMySharedWorkouts() {
  const repo = useRepo();
  return useQuery({ queryKey: [...useKey(K.social), 'my-workouts'], queryFn: () => repo.listMySharedWorkouts(), staleTime: SOCIAL_STALE });
}

export const useDeleteSharedWorkout = () => useRepoMutation((r, id: string) => r.deleteSharedWorkout(id), [K.social], 'Allenamento non più condiviso');

/** Un allenamento condiviso da una persona che seguo (o da me). */
export function useSharedWorkout(id: string | null) {
  const repo = useRepo();
  return useQuery({ queryKey: [...useKey(K.social), 'workout', id], queryFn: () => repo.getSharedWorkout(id!), enabled: id !== null, staleTime: SOCIAL_STALE });
}

/**
 * "Copia nella mia scheda": gli esercizi di un allenamento condiviso entrano nel giorno scelto. Per ognuno si usa il
 * proprio esercizio, si ripristina quello archiviato o lo si crea (`copySteps`), poi lo si mette in programma con lo
 * schema dell'allenamento. Una chiamata per esercizio, in fila: al primo errore si ferma e quelli già copiati
 * restano. Restituisce quanti ne ha copiati.
 */
export const useCopySharedWorkout = () =>
  useRepoMutation(
    async (r, a: { steps: CopyStep[]; date: string }) => {
      let n = 0;
      for (const s of a.steps) {
        if (s.kind === 'skip') continue;
        let id: string;
        if (s.kind === 'create') id = (await r.createExercise(s.input)).id;
        else {
          id = s.exerciseId;
          if (s.kind === 'restore') await r.setExerciseArchived(id, false);
        }
        await r.addPlanItem(a.date, id, schemeOf(s.item));
        n++;
      }
      return n;
    },
    [K.exercises, K.plan],
  );
