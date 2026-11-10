import { dehydrate, hydrate, type QueryClient, type QueryKey } from '@tanstack/react-query';
import { K } from './hooks';
import { CACHE_KEY, dequeue, pendingFor, type QueueItem, type QueueOp } from './offline';
import type { Repo } from './repo';
import { shortDate } from '../lib/dates';
import { SUBS } from '../lib/levels';
import type { BodyWeight, Entry, EntryInput, Exercise, LevelRecordInput, LevelRecordRow, PlanItem } from './types';

/**
 * Offline (ticket 27), la parte che si scarica dopo il primo disegno: invio della coda, modifiche ottimistiche alla
 * cache mentre un salvataggio aspetta, cache di TanStack Query salvata sul telefono.
 */

/** Query che ogni salvataggio cambia: dopo l'invio si rileggono dal server. */
export const OP_KEYS: Record<QueueOp, QueryKey> = {
  createEntry: K.entries,
  updateEntry: K.entries,
  deleteEntry: K.entries,
  setBodyWeight: K.bodyWeights,
  deleteBodyWeight: K.bodyWeights,
  createLevelRecord: K.levelRecords,
  updateLevelRecord: K.levelRecords,
  deleteLevelRecord: K.levelRecords,
};

/**
 * L'errore viene dalla rete, non dal server: vale la pena riprovare. Comprende i 5xx (gateway giù) e il token
 * scaduto (401), che si rinnova da solo appena torna la rete.
 */
export function isRetryable(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  const { status, code } = e as Error & { status?: number; code?: string };
  // 401: la richiesta è partita senza un token valido (rinnovo non ancora riuscito), non è un rifiuto dei dati
  if (status === 0 || status === 401 || (status !== undefined && status >= 500)) return true;
  if (code === 'PGRST301' || code === 'PGRST303' || /JWT/i.test(e.message)) return true;
  return e.name === 'TypeError' || /^(TypeError|FetchError|AbortError)\b|Failed to fetch|NetworkError|Load failed/i.test(e.message);
}

export const callOp = (repo: Repo, op: QueueOp, args: unknown[]) =>
  (repo[op] as (...a: unknown[]) => Promise<unknown>).apply(repo, args);

/** Doppione: la riga creata offline era già arrivata (la risposta si era persa). Conta come inviata. */
const isDuplicate = (e: unknown) => (e as { code?: string }).code === '23505';

export interface FlushResult {
  sent: QueueItem[];
  /** rifiutati dal server (es. esercizio eliminato nel frattempo): tolti dalla coda, l'utente lo sa da un messaggio */
  rejected: { item: QueueItem; reason: string }[];
  /** la rete è caduta di nuovo a metà: il resto resta in coda */
  stopped: boolean;
}

let running: Promise<FlushResult> | null = null;

/**
 * Invia la coda di `userId` in ordine di salvataggio, uno alla volta: una modifica arriva sempre dopo la creazione
 * della stessa riga. Vince l'ultimo salvataggio (scelta dell'utente): niente controllo dei conflitti, i rifiuti si
 * tolgono e si segnalano. Due chiamate insieme (rete tornata + "Invia ora") fanno un solo giro.
 */
export function flushQueue(repo: Repo, userId: string): Promise<FlushResult> {
  // il giro si libera a promessa finita (non dentro: senza niente da inviare finirebbe prima di essere assegnato)
  running ??= sendAll(repo, userId).finally(() => (running = null));
  return running;
}

async function sendAll(repo: Repo, userId: string): Promise<FlushResult> {
  const out: FlushResult = { sent: [], rejected: [], stopped: false };
  for (const item of pendingFor(userId)) {
    try {
      await callOp(repo, item.op, item.args);
      out.sent.push(item);
    } catch (e) {
      if (isDuplicate(e)) out.sent.push(item);
      else if (isRetryable(e)) {
        out.stopped = true;
        break;
      } else out.rejected.push({ item, reason: e instanceof Error ? e.message : String(e) });
    }
    dequeue([item.id]);
  }
  return out;
}

/** Dopo l'invio: le query toccate si rileggono, così le righe ottimistiche diventano quelle vere del server. */
export function refreshAfter(qc: QueryClient, items: QueueItem[]) {
  const keys = new Set(items.map((i) => OP_KEYS[i.op]));
  return Promise.all([...keys].map((queryKey) => qc.invalidateQueries({ queryKey })));
}

/**
 * Cosa mostrare nell'elenco "in attesa": "Allenamento · Trazioni · 10/11", "Peso · 72,5 kg · 10/11". I nomi vengono
 * dalla cache; si calcola qui e non al salvataggio per tenere leggero il JS iniziale.
 */
export function describe(qc: QueryClient, item: QueueItem): string {
  const { userId, args } = item;
  const entries = qc.getQueryData<Entry[]>(['entries', userId]) ?? [];
  const records = qc.getQueryData<LevelRecordRow[]>(['level-records', userId]) ?? [];
  const exName = (id?: string) => qc.getQueryData<Exercise[]>(['exercises', userId])?.find((e) => e.id === id)?.name ?? 'Esercizio';
  const subName = (id?: string) => SUBS.find((s) => s.id === id)?.name ?? 'Record';
  const entryEx = (id: string) => entries.find((e) => e.id === id)?.exerciseId;
  const recordSub = (id: string) => records.find((r) => r.id === id)?.subId;
  switch (item.op) {
    case 'createEntry': {
      const [a] = args as [EntryInput];
      return `${a.kind === 'attempt' ? 'Tentativo' : 'Allenamento'} · ${exName(a.exerciseId)} · ${shortDate(a.date)}`;
    }
    case 'updateEntry': {
      const [id, p] = args as [string, Partial<EntryInput>];
      return `Modifica · ${exName(p.exerciseId ?? entryEx(id))}`;
    }
    case 'deleteEntry':
      return `Eliminazione · ${exName(entryEx(args[0] as string))}`;
    case 'setBodyWeight':
      return `Peso · ${String(args[1]).replace('.', ',')} kg · ${shortDate(args[0] as string)}`;
    case 'deleteBodyWeight':
      return `Peso tolto · ${shortDate(args[0] as string)}`;
    case 'createLevelRecord':
      return `Record · ${subName((args[0] as LevelRecordInput).subId)}`;
    case 'updateLevelRecord': {
      const [id, p] = args as [string, Partial<LevelRecordInput>];
      return `Record modificato · ${subName(p.subId ?? recordSub(id))}`;
    }
    case 'deleteLevelRecord':
      return `Record tolto · ${subName(recordSub(args[0] as string))}`;
  }
}

// --- Modifiche ottimistiche -------------------------------------------------------------------------------------

function patchList<T>(qc: QueryClient, key: QueryKey, fn: (rows: T[]) => T[]) {
  qc.setQueryData<T[]>(key, (rows) => (rows ? fn(rows) : rows));
}

const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
/** Stesso ordine del repository: pesi e record dal più vecchio, registrazioni dalla più recente. */
const byDate = <T extends { date: string }>(rows: T[]) => [...rows].sort((a, b) => cmp(a.date, b.date));
const newestFirst = (rows: Entry[]) => [...rows].sort((a, b) => cmp(b.date, a.date) || cmp(b.createdAt, a.createdAt));

/**
 * Il salvataggio in coda si vede subito, come se fosse arrivato: l'allenamento compare nella giornata, il peso nel
 * grafico. La cache è salvata sul telefono, quindi si vede anche riaprendo l'app senza rete.
 */
export function applyOptimistic(qc: QueryClient, item: QueueItem) {
  const { userId, args } = item;
  const now = new Date(item.at).toISOString();
  switch (item.op) {
    case 'createEntry': {
      const [input, id] = args as [EntryInput, string];
      // il tipo, se manca, lo sceglie il database dal programma del giorno: qui la stessa regola, poi arriva quello vero
      const plan = qc.getQueryData<PlanItem[]>(['plan', userId]) ?? [];
      const type = input.type ?? plan.find((p) => p.date === input.date && p.exerciseId === input.exerciseId)?.scheme.type ?? 'forza';
      const row: Entry = { ...input, id, type, createdAt: now };
      return patchList<Entry>(qc, ['entries', userId], (rows) => newestFirst([...rows.filter((r) => r.id !== id), row]));
    }
    case 'updateEntry': {
      const [id, patch] = args as [string, Partial<EntryInput>];
      return patchList<Entry>(qc, ['entries', userId], (rows) => newestFirst(rows.map((r) => (r.id === id ? { ...r, ...patch } : r))));
    }
    case 'deleteEntry': {
      const [id] = args as [string];
      return patchList<Entry>(qc, ['entries', userId], (rows) => rows.filter((r) => r.id !== id));
    }
    case 'setBodyWeight': {
      const [date, kg] = args as [string, number];
      return patchList<BodyWeight>(qc, ['body-weights', userId], (rows) => byDate([...rows.filter((r) => r.date !== date), { date, kg }]));
    }
    case 'deleteBodyWeight': {
      const [date] = args as [string];
      return patchList<BodyWeight>(qc, ['body-weights', userId], (rows) => rows.filter((r) => r.date !== date));
    }
    case 'createLevelRecord': {
      const [input, id] = args as [LevelRecordInput, string];
      const row: LevelRecordRow = { ...input, id, createdAt: now };
      return patchList<LevelRecordRow>(qc, ['level-records', userId], (rows) => byDate([...rows.filter((r) => r.id !== id), row]));
    }
    case 'updateLevelRecord': {
      const [id, patch] = args as [string, Partial<LevelRecordInput>];
      return patchList<LevelRecordRow>(qc, ['level-records', userId], (rows) => byDate(rows.map((r) => (r.id === id ? { ...r, ...patch } : r))));
    }
    case 'deleteLevelRecord': {
      const [id] = args as [string];
      return patchList<LevelRecordRow>(qc, ['level-records', userId], (rows) => rows.filter((r) => r.id !== id));
    }
  }
}

/**
 * Dopo una rilettura dal server mentre la coda non è ancora partita (es. la rete torna e le query si rileggono prima
 * dell'invio), i salvataggi in attesa si riapplicano: non devono sparire e ricomparire.
 */
export function reapplyPending(qc: QueryClient, userId: string) {
  for (const item of pendingFor(userId)) applyOptimistic(qc, item);
}

// --- Cache persistita -------------------------------------------------------------------------------------------

/** Una cache più vecchia non si mostra: meglio "Caricamento" che dati di dieci giorni fa presentati come attuali. */
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const THROTTLE = 1000;

interface Saved {
  /** versione dell'app: dopo un aggiornamento la forma dei dati può essere cambiata */
  buster: string;
  at: number;
  state: unknown;
}

/** Rimette in cache i dati salvati, se sono di questa versione e recenti. */
export function restoreCache(qc: QueryClient, buster: string, storage: Pick<Storage, 'getItem' | 'removeItem'> = localStorage) {
  try {
    const saved = JSON.parse(storage.getItem(CACHE_KEY) ?? 'null') as Saved | null;
    if (!saved) return false;
    if (saved.buster !== buster || Date.now() - saved.at > MAX_AGE) {
      storage.removeItem(CACHE_KEY);
      return false;
    }
    hydrate(qc, saved.state as Parameters<typeof hydrate>[1]);
    return true;
  } catch {
    return false;
  }
}

export function saveCache(qc: QueryClient, buster: string, storage: Pick<Storage, 'setItem'> = localStorage) {
  // Si salva ogni query che ha dati, anche se l'ultima rilettura è fallita: offline è proprio il caso normale, e
  // scartarle farebbe sparire dalla copia esercizi e programma al primo tentativo senza rete. Si salvano come riuscite.
  const raw = dehydrate(qc, { shouldDehydrateQuery: (q) => q.state.data !== undefined });
  const state = { ...raw, queries: raw.queries.map((q) => ({ ...q, state: { ...q.state, status: 'success' as const, error: null, fetchStatus: 'idle' as const } })) };
  try {
    storage.setItem(CACHE_KEY, JSON.stringify({ buster, at: Date.now(), state } satisfies Saved));
  } catch {
    /* memoria piena: resta la copia di prima */
  }
}

/**
 * Cache persistita: si ripristina subito e poi si salva a ogni cambiamento, al massimo una volta al secondo, e quando
 * l'app va in secondo piano (su iOS una PWA chiusa dal multitasking non avvisa).
 */
export function persistCache(qc: QueryClient, buster: string) {
  restoreCache(qc, buster);
  let timer: number | undefined;
  const save = () => {
    clearTimeout(timer);
    timer = undefined;
    saveCache(qc, buster);
  };
  qc.getQueryCache().subscribe((e) => {
    if (e.type !== 'updated' && e.type !== 'removed') return;
    timer ??= window.setTimeout(save, THROTTLE);
  });
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && save());
}
