/**
 * Offline (ticket 27): stato della rete e coda dei salvataggi. Questa parte è nel JS iniziale e resta piccola: legge e
 * scrive la coda nel localStorage e dice alle viste se si è offline. L'invio della coda, le modifiche ottimistiche alla
 * cache e la cache persistita sono in `sync.ts`, che si scarica dopo (il service worker lo tiene in cache).
 */

/** Salvataggi che, senza rete, finiscono in coda (scelta dell'utente: allenamenti, peso e record). */
export type QueueOp =
  | 'createEntry'
  | 'updateEntry'
  | 'deleteEntry'
  | 'setBodyWeight'
  | 'deleteBodyWeight'
  | 'createLevelRecord'
  | 'updateLevelRecord'
  | 'deleteLevelRecord';

export interface QueueItem {
  /** id del salvataggio in coda (non quello della riga) */
  id: string;
  /** di chi sono i dati: la coda di un altro account non si invia mai con la sessione sbagliata */
  userId: string;
  /** quando l'utente ha salvato, in ms */
  at: number;
  op: QueueOp;
  /** argomenti del metodo del repository, già pronti (gli id delle righe nuove li sceglie il telefono) */
  args: unknown[];
}

const QUEUE_KEY = 'scheda:queue';
/** Cache di TanStack Query salvata sul telefono: la scrive e la legge `sync.ts`, la cancella l'uscita. */
export const CACHE_KEY = 'scheda:cache';

type Listener = () => void;

function store<T>(initial: T) {
  let value = initial;
  const listeners = new Set<Listener>();
  return {
    get: () => value,
    set: (v: T) => {
      if (Object.is(v, value)) return;
      value = v;
      listeners.forEach((l) => l());
    },
    subscribe: (l: Listener) => {
      listeners.add(l);
      return () => void listeners.delete(l);
    },
  };
}

// --- Rete -------------------------------------------------------------------------------------------------------

/**
 * `true` quando l'ultima richiesta al server non è arrivata (o il telefono dice di non avere rete). `navigator.onLine`
 * da solo non basta: in cantina con una tacca di campo è `true` ma le richieste non partono.
 */
export const netDown = store(typeof navigator !== 'undefined' && navigator.onLine === false);

if (typeof window !== 'undefined') {
  window.addEventListener('offline', () => netDown.set(true));
  // "online" dice solo che c'è un'interfaccia di rete: lo conferma la prossima richiesta riuscita
}

/** Id scelto dal telefono per le righe create offline: se l'invio si ripete il server riconosce il doppione. */
export function newId(): string {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  // http su un indirizzo di rete locale (sviluppo da telefono): randomUUID c'è solo nei contesti sicuri
  const b = c.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// --- Coda -------------------------------------------------------------------------------------------------------

function read(): QueueItem[] {
  try {
    const raw = JSON.parse(globalThis.localStorage?.getItem(QUEUE_KEY) ?? '[]') as unknown;
    return Array.isArray(raw) ? (raw as QueueItem[]) : [];
  } catch {
    return [];
  }
}

/** Tutta la coda, di tutti gli account usati su questo telefono, in ordine di salvataggio. */
export const queue = store<QueueItem[]>(read());

function write(items: QueueItem[]) {
  try {
    if (items.length) globalThis.localStorage?.setItem(QUEUE_KEY, JSON.stringify(items));
    else globalThis.localStorage?.removeItem(QUEUE_KEY);
  } catch {
    /* memoria piena o negata: la coda resta comunque in memoria finché l'app è aperta */
  }
  queue.set(items);
}

/** Un'altra scheda aperta ha cambiato la coda. */
if (typeof window !== 'undefined') window.addEventListener('storage', (e) => e.key === QUEUE_KEY && queue.set(read()));

export const pendingFor = (userId: string, items = queue.get()) => items.filter((i) => i.userId === userId);

export function enqueue(item: QueueItem) {
  write([...read(), item]);
}

/** Toglie dalla coda i salvataggi indicati (inviati o rifiutati). Rilegge prima: un'altra scheda può averla cambiata. */
export function dequeue(ids: string[]) {
  const gone = new Set(ids);
  write(read().filter((i) => !gone.has(i.id)));
}

/** Testo per il messaggio dopo l'invio: "1 salvataggio inviato", "3 salvataggi inviati". */
export const savesText = (n: number, verb: string) => (n === 1 ? `1 salvataggio ${verb}` : `${n} salvataggi ${verb.replace(/o$/, 'i')}`);
