/**
 * Modalità sessione (ticket 25, audit C3): l'allenamento del giorno come una coda di righe del programma.
 * Solo logica pura, senza React: lo stato si salva nel browser e sopravvive al ricaricamento della pagina.
 */

/** Recupero tra un esercizio e il successivo, in secondi (fisso, deciso con l'utente). */
export const REST_BETWEEN_EXERCISES = 120;

export interface SessionRecord {
  name: string;
  /** la serie del record in breve: "20 kg × 5", "12 rip.", "45 s" */
  text: string;
}

export interface WorkoutSession {
  date: string;
  /** epoch ms dell'avvio */
  startedAt: number;
  /** righe del programma (id) ancora da fare, nell'ordine: la prima è quella aperta */
  queue: string[];
  /** righe salvate durante la sessione */
  done: string[];
  /** righe saltate una volta: sono in fondo alla coda */
  skippedOnce: string[];
  /** righe saltate due volte: fuori dalla coda, nel riepilogo come saltate */
  skipped: string[];
  /** serie salvate durante la sessione */
  sets: number;
  records: SessionRecord[];
  /** id delle righe già fatte prima di avviare: contano nel totale del giorno */
  before: string[];
}

/** Avvia la sessione con le righe del giorno, già in ordine; quelle già registrate restano fuori dalla coda. */
export function startSession(date: string, planIds: string[], alreadyDone: (planId: string) => boolean, now = Date.now()): WorkoutSession {
  return {
    date,
    startedAt: now,
    queue: planIds.filter((id) => !alreadyDone(id)),
    done: [],
    skippedOnce: [],
    skipped: [],
    sets: 0,
    records: [],
    before: planIds.filter(alreadyDone),
  };
}

/** La riga aperta adesso; null a sessione finita. */
export const current = (s: WorkoutSession): string | null => s.queue[0] ?? null;

/** La riga che viene dopo quella aperta. */
export const upNext = (s: WorkoutSession): string | null => s.queue[1] ?? null;

export const isFinished = (s: WorkoutSession) => s.queue.length === 0;

/** Righe del giorno in tutto: quelle di prima, quelle fatte, saltate e ancora in coda. */
export const totalItems = (s: WorkoutSession) => s.before.length + s.done.length + s.skipped.length + s.queue.length;

/** Posizione (da 1) della riga aperta tra quelle del giorno. */
export const position = (s: WorkoutSession) => s.before.length + s.done.length + s.skipped.length + 1;

/** Salvata la riga aperta: esce dalla coda, si contano serie e record. */
export function completeCurrent(s: WorkoutSession, sets: number, record?: SessionRecord): WorkoutSession {
  const id = current(s);
  if (!id) return s;
  return {
    ...s,
    queue: s.queue.slice(1),
    done: [...s.done, id],
    skippedOnce: s.skippedOnce.filter((x) => x !== id),
    sets: s.sets + sets,
    records: record ? [...s.records, record] : s.records,
  };
}

/**
 * Salta la riga aperta. La prima volta va in fondo alla coda (alla fine si ripropone);
 * la seconda esce dalla coda e nel riepilogo risulta saltata.
 */
export function skipCurrent(s: WorkoutSession): WorkoutSession {
  const id = current(s);
  if (!id) return s;
  const rest = s.queue.slice(1);
  if (s.skippedOnce.includes(id)) return { ...s, queue: rest, skippedOnce: s.skippedOnce.filter((x) => x !== id), skipped: [...s.skipped, id] };
  return { ...s, queue: [...rest, id], skippedOnce: [...s.skippedOnce, id] };
}

/**
 * Riallinea la coda col programma: le righe tolte dal programma escono, quelle registrate fuori dalla sessione
 * (dalla lista di Oggi) passano tra le fatte.
 */
export function reconcile(s: WorkoutSession, exists: (planId: string) => boolean, isDone: (planId: string) => boolean): WorkoutSession {
  const queue = s.queue.filter(exists);
  const doneOutside = queue.filter(isDone);
  if (queue.length === s.queue.length && !doneOutside.length) return s;
  return {
    ...s,
    queue: queue.filter((id) => !isDone(id)),
    done: [...s.done, ...doneOutside],
    skippedOnce: s.skippedOnce.filter((id) => queue.includes(id) && !isDone(id)),
  };
}

/** Durata in minuti interi, almeno 1. */
export const durationMin = (s: WorkoutSession, now = Date.now()) => Math.max(1, Math.round((now - s.startedAt) / 60_000));
