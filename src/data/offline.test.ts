import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Repo } from './repo';
import type { BodyWeight, Entry, EntryInput, PlanItem } from './types';

// gli hook portano dietro il client Supabase (vuole il browser): alla coda servono solo le chiavi delle query
vi.mock('./hooks', () => ({ K: { entries: ['entries'], bodyWeights: ['body-weights'], levelRecords: ['level-records'], profile: ['profile'] } }));

// localStorage finto: la coda e la cache ci scrivono, in node non c'è
const mem = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
});

const { enqueue, newId, pendingFor, queue, savesText, CACHE_KEY } = await import('./offline');
const { applyOptimistic, describe: label, isRetryable, flushQueue, reapplyPending, restoreCache, saveCache } = await import('./sync');
type QueueItem = import('./offline').QueueItem;

const U = 'user-a';
let seq = 0;
const item = (op: QueueItem['op'], args: unknown[], userId = U): QueueItem => ({ id: `q${++seq}`, userId, at: Date.parse('2026-11-10T18:00:00Z') + seq, op, args });

const input: EntryInput = { exerciseId: 'trazioni', kind: 'training', date: '2026-11-10', sets: [{ weight: 0, reps: 8, seconds: 0 }], difficulty: null, note: null };
const entry = (id: string, date: string, createdAt = `${date}T10:00:00Z`): Entry => ({ ...input, id, date, type: 'forza', createdAt });

/** Errore come lo lancia `must` in supabaseRepo: messaggio di PostgREST, con codice e stato HTTP. */
const pgError = (message: string, status: number, code = '') => Object.assign(new Error(message), { status, code });
const offline = () => pgError('TypeError: Failed to fetch', 0);

beforeEach(() => {
  mem.clear();
  queue.set([]);
});

describe('errori da riprovare', () => {
  it('rete assente, gateway giù, token scaduto: sì', () => {
    expect(isRetryable(offline())).toBe(true);
    expect(isRetryable(new TypeError('Failed to fetch'))).toBe(true);
    expect(isRetryable(new Error('TypeError: Load failed'))).toBe(true);
    expect(isRetryable(pgError('bad gateway', 502))).toBe(true);
    expect(isRetryable(pgError('JWT expired', 401, 'PGRST303'))).toBe(true);
    // partita con la sola chiave pubblica (token non ancora rinnovato): RLS risponde 401
    expect(isRetryable(pgError('new row violates row-level security policy for table "body_weights"', 401, '42501'))).toBe(true);
  });
  it('rifiuto del server: no', () => {
    expect(isRetryable(pgError('insert or update on table "entries" violates foreign key constraint', 409, '23503'))).toBe(false);
    expect(isRetryable(pgError('new row violates row-level security policy', 403, '42501'))).toBe(false);
    expect(isRetryable('stringa')).toBe(false);
  });
});

describe('coda', () => {
  it('si salva nel localStorage, divisa per account', () => {
    enqueue(item('createEntry', [input, 'e1']));
    enqueue(item('setBodyWeight', ['2026-11-10', 72], 'user-b'));
    expect(JSON.parse(mem.get('scheda:queue')!)).toHaveLength(2);
    expect(pendingFor(U).map((i) => i.op)).toEqual(['createEntry']);
    expect(pendingFor('user-b').map((i) => i.op)).toEqual(['setBodyWeight']);
  });

  it('id nuovi: uuid v4 diversi', () => {
    const a = newId();
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(newId()).not.toBe(a);
  });

  it('testo dei messaggi', () => {
    expect(savesText(1, 'inviato')).toBe('1 salvataggio inviato');
    expect(savesText(3, 'inviato')).toBe('3 salvataggi inviati');
    expect(savesText(2, 'non inviato')).toBe('2 salvataggi non inviati');
  });
});

describe('invio della coda', () => {
  const repoWith = (impl: (op: string, args: unknown[]) => Promise<unknown>) => {
    const calls: [string, unknown[]][] = [];
    const handler = (op: string) => (...args: unknown[]) => {
      calls.push([op, args]);
      return impl(op, args);
    };
    const repo = new Proxy({}, { get: (_t, op: string) => handler(op) }) as Repo;
    return { repo, calls };
  };

  it('in ordine di salvataggio, e svuota la coda', async () => {
    enqueue(item('createEntry', [input, 'e1']));
    enqueue(item('updateEntry', ['e1', { note: 'ok' }]));
    enqueue(item('setBodyWeight', ['2026-11-10', 72]));
    const { repo, calls } = repoWith(async () => undefined);
    const r = await flushQueue(repo, U);
    expect(calls.map((c) => c[0])).toEqual(['createEntry', 'updateEntry', 'setBodyWeight']);
    expect(calls[0][1]).toEqual([input, 'e1']);
    expect(r.sent).toHaveLength(3);
    expect(pendingFor(U)).toEqual([]);
  });

  it('solo i salvataggi dell’account collegato', async () => {
    enqueue(item('createEntry', [input, 'e1'], 'user-b'));
    const { repo, calls } = repoWith(async () => undefined);
    await flushQueue(repo, U);
    expect(calls).toEqual([]);
    expect(pendingFor('user-b')).toHaveLength(1);
  });

  it('la rete cade a metà: si ferma e il resto resta in coda, nello stesso ordine', async () => {
    enqueue(item('createEntry', [input, 'e1']));
    enqueue(item('createEntry', [input, 'e2']));
    enqueue(item('deleteEntry', ['e1']));
    let n = 0;
    const { repo } = repoWith(async () => {
      if (++n === 2) throw offline();
    });
    const r = await flushQueue(repo, U);
    expect(r.stopped).toBe(true);
    expect(r.sent).toHaveLength(1);
    expect(pendingFor(U).map((i) => i.args[i.op === 'deleteEntry' ? 0 : 1])).toEqual(['e2', 'e1']);
  });

  it('doppione (la risposta di un invio precedente si era persa): conta come inviato', async () => {
    enqueue(item('createEntry', [input, 'e1']));
    const { repo } = repoWith(async () => {
      throw pgError('duplicate key value violates unique constraint "entries_pkey"', 409, '23505');
    });
    const r = await flushQueue(repo, U);
    expect(r.sent).toHaveLength(1);
    expect(r.rejected).toEqual([]);
    expect(pendingFor(U)).toEqual([]);
  });

  it('rifiuto del server (esercizio eliminato nel frattempo): tolto dalla coda e segnalato, gli altri partono', async () => {
    enqueue(item('createEntry', [input, 'e1']));
    enqueue(item('setBodyWeight', ['2026-11-10', 72]));
    const { repo, calls } = repoWith(async (op) => {
      if (op === 'createEntry') throw pgError('violates foreign key constraint', 409, '23503');
    });
    const r = await flushQueue(repo, U);
    expect(r.rejected.map((x) => x.item.op)).toEqual(['createEntry']);
    expect(r.rejected[0].reason).toMatch(/foreign key/);
    expect(r.sent.map((x) => x.op)).toEqual(['setBodyWeight']);
    expect(calls).toHaveLength(2);
    expect(pendingFor(U)).toEqual([]);
  });

  it('due invii insieme fanno un solo giro', async () => {
    enqueue(item('createEntry', [input, 'e1']));
    const { repo, calls } = repoWith(() => new Promise((ok) => setTimeout(ok, 5)));
    const [a, b] = await Promise.all([flushQueue(repo, U), flushQueue(repo, U)]);
    expect(a).toBe(b);
    expect(calls).toHaveLength(1);
  });
});

describe('modifiche ottimistiche', () => {
  const setup = () => {
    const qc = new QueryClient();
    qc.setQueryData<Entry[]>(['entries', U], [entry('old2', '2026-11-09'), entry('old1', '2026-11-01')]);
    qc.setQueryData<BodyWeight[]>(['body-weights', U], [{ date: '2026-11-01', kg: 70 }]);
    qc.setQueryData<PlanItem[]>(['plan', U], [
      { id: 'p', date: '2026-11-10', exerciseId: 'trazioni', sortOrder: 0, scheme: { type: 'volume', sets: 3, reps: 8, seconds: 0, weight: 0, rest: 90 }, assignedBy: null, note: null },
    ]);
    return qc;
  };
  const entries = (qc: QueryClient) => qc.getQueryData<Entry[]>(['entries', U])!;

  it('un allenamento in coda compare per primo, con il tipo del programma del giorno', () => {
    const qc = setup();
    applyOptimistic(qc, item('createEntry', [input, 'e1']));
    expect(entries(qc).map((e) => e.id)).toEqual(['e1', 'old2', 'old1']);
    expect(entries(qc)[0].type).toBe('volume');
  });

  it('applicarlo due volte non lo raddoppia', () => {
    const qc = setup();
    const it1 = item('createEntry', [input, 'e1']);
    applyOptimistic(qc, it1);
    applyOptimistic(qc, it1);
    expect(entries(qc).filter((e) => e.id === 'e1')).toHaveLength(1);
  });

  it('modifica ed eliminazione', () => {
    const qc = setup();
    applyOptimistic(qc, item('updateEntry', ['old1', { note: 'dolore al gomito' }]));
    expect(entries(qc).find((e) => e.id === 'old1')!.note).toBe('dolore al gomito');
    applyOptimistic(qc, item('deleteEntry', ['old2']));
    expect(entries(qc).map((e) => e.id)).toEqual(['old1']);
  });

  it('peso del giorno: sostituisce quello della stessa data, in ordine', () => {
    const qc = setup();
    applyOptimistic(qc, item('setBodyWeight', ['2026-11-10', 72]));
    applyOptimistic(qc, item('setBodyWeight', ['2026-11-10', 71.5]));
    expect(qc.getQueryData(['body-weights', U])).toEqual([
      { date: '2026-11-01', kg: 70 },
      { date: '2026-11-10', kg: 71.5 },
    ]);
  });

  it('dopo una rilettura dal server i salvataggi in coda si riapplicano', () => {
    const qc = setup();
    enqueue(item('createEntry', [input, 'e1']));
    // il server non li ha ancora
    qc.setQueryData<Entry[]>(['entries', U], [entry('old2', '2026-11-09')]);
    reapplyPending(qc, U);
    expect(entries(qc).map((e) => e.id)).toEqual(['e1', 'old2']);
  });

  it('senza dati in cache non inventa una lista', () => {
    const qc = new QueryClient();
    applyOptimistic(qc, item('createEntry', [input, 'e1']));
    expect(qc.getQueryData(['entries', U])).toBeUndefined();
  });
});

describe('cache persistita', () => {
  it('salva le query riuscite e le rimette in una cache vuota', () => {
    const a = new QueryClient();
    a.setQueryData(['entries', U], [entry('e1', '2026-11-10')]);
    saveCache(a, 'v1', localStorage);
    const b = new QueryClient();
    expect(restoreCache(b, 'v1', localStorage)).toBe(true);
    expect(b.getQueryData<Entry[]>(['entries', U])!.map((e) => e.id)).toEqual(['e1']);
  });

  it('salva anche una query con dati la cui ultima rilettura è fallita (offline), come riuscita', async () => {
    const a = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    a.setQueryData(['plan', U], [{ id: 'p' }]);
    await a.fetchQuery({ queryKey: ['plan', U], queryFn: () => Promise.reject(new TypeError('Failed to fetch')), staleTime: 0 }).catch(() => {});
    expect(a.getQueryState(['plan', U])!.status).toBe('error');
    saveCache(a, 'v1', localStorage);
    const b = new QueryClient();
    restoreCache(b, 'v1', localStorage);
    expect(b.getQueryData(['plan', U])).toEqual([{ id: 'p' }]);
    expect(b.getQueryState(['plan', U])!.status).toBe('success');
  });

  it('una versione diversa dell’app scarta la copia', () => {
    const a = new QueryClient();
    a.setQueryData(['entries', U], [entry('e1', '2026-11-10')]);
    saveCache(a, 'v1', localStorage);
    expect(restoreCache(new QueryClient(), 'v2', localStorage)).toBe(false);
    expect(mem.has(CACHE_KEY)).toBe(false);
  });

  it('più vecchia di una settimana: scartata', () => {
    mem.set(CACHE_KEY, JSON.stringify({ buster: 'v1', at: Date.now() - 8 * 24 * 3600 * 1000, state: { queries: [], mutations: [] } }));
    expect(restoreCache(new QueryClient(), 'v1', localStorage)).toBe(false);
  });

  it('copia rovinata: nessun errore', () => {
    mem.set(CACHE_KEY, '{non json');
    expect(restoreCache(new QueryClient(), 'v1', localStorage)).toBe(false);
  });
});

describe('etichette dell’elenco in attesa', () => {
  it('nome dell’esercizio dalla cache, data corta, peso con la virgola', () => {
    const qc = new QueryClient();
    qc.setQueryData(['exercises', U], [{ id: 'trazioni', catalogId: null, name: 'Trazioni', inRecords: true, measure: 'reps', sortOrder: 0, archivedAt: null }]);
    qc.setQueryData<Entry[]>(['entries', U], [entry('old1', '2026-11-01')]);
    expect(label(qc, item('createEntry', [input, 'e1']))).toMatch(/^Allenamento · Trazioni · /);
    expect(label(qc, item('createEntry', [{ ...input, kind: 'attempt' }, 'e2']))).toMatch(/^Tentativo · Trazioni/);
    expect(label(qc, item('deleteEntry', ['old1']))).toBe('Eliminazione · Trazioni');
    expect(label(qc, item('setBodyWeight', ['2026-11-10', 72.5]))).toMatch(/^Peso · 72,5 kg · /);
    expect(label(qc, item('createLevelRecord', [{ subId: 'trazioni', stage: 'zavorra', value: 10, date: '2026-11-10', note: null }, 'r1']))).toBe('Record · Trazioni');
    expect(label(qc, item('deleteEntry', ['sconosciuta']))).toBe('Allenamento eliminato');
  });
});
