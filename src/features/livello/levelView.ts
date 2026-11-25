/**
 * Logica di presentazione della pagina Livello (ticket 34): ordine e sigle delle categorie, scala del pentagono, testi
 * di livelli e record, messaggi di errore e di celebrazione. Nessuna formula di punteggio: punti, livelli e
 * percentuali arrivano tutti dal motore (`src/lib/levels`); qui si decide solo come si leggono e come si disegnano.
 */
import {
  BANDS,
  CATEGORIES,
  LIMITS,
  chainRule,
  validateRecord,
  type BandId,
  type CategoryId,
  type ChainScore,
  type EntryOption,
  type LevelRecord,
  type LevelSummary,
  type Measure,
  type ValidationError,
} from '../../lib/levels';

/** Assi del pentagono in senso orario dall'alto, come nel mockup "Livello": HB, SS, FT, FS, ST. */
export const AXES: readonly CategoryId[] = ['handbalance', 'skill-spinta', 'fondamentali-tirata', 'fondamentali-spinta', 'skill-tirata'];

/** Schede delle categorie dall'alto in basso, come nel mockup "Livello": HB, SS, FS, ST, FT (non è l'ordine degli assi). */
export const CARDS: readonly CategoryId[] = ['handbalance', 'skill-spinta', 'fondamentali-spinta', 'skill-tirata', 'fondamentali-tirata'];

/** Sigle accanto ai vertici del pentagono. */
export const SIGLA: Record<CategoryId, string> = {
  handbalance: 'HB',
  'skill-spinta': 'SS',
  'fondamentali-tirata': 'FT',
  'fondamentali-spinta': 'FS',
  'skill-tirata': 'ST',
};

export const categoryName = (id: CategoryId) => CATEGORIES.find((c) => c.id === id)?.name ?? id;

export const chainName = (chainId: string) => chainRule(chainId)?.name ?? chainId;

/** Posto di un livello nella scala Base…Leggenda (0–5). */
const rank = (band: BandId) => BANDS.complessivo.findIndex((b) => b.id === band);

// ---------------------------------------------------------------------------------------------------------
// Pentagono

export interface PentagonAxis {
  id: CategoryId;
  /** Sigla accanto al vertice ("HB"). */
  code: string;
  /** Nome per intero, per il testo alternativo. */
  label: string;
  /** Livello della categoria ("Avanzato"). */
  level: string;
  /** % dentro il livello della categoria. */
  percent: number;
  /** Distanza dal centro, 0–1 del raggio. */
  at: number;
  /** Anelli interni dal più basso: dove cade, su questo asse, la fine di ogni livello sotto il contorno. */
  rings: number[];
}

export interface PentagonScale {
  /** Livello del contorno: il più alto raggiunto tra le 5 categorie. */
  band: BandId;
  name: string;
  axes: PentagonAxis[];
}

/**
 * Scala del pentagono (30, decisione 5): il contorno è la fine del livello più alto raggiunto tra le 5 categorie, e
 * ogni asse va da 0 alla fine di quel livello per la sua categoria (Avanzato = 500, 500, 666, 684, 500 punti). Gli
 * anelli interni sono le fini dei livelli sotto, asse per asse: per questo non sono pentagoni regolari.
 */
export function pentagonScale(summary: LevelSummary): PentagonScale {
  const top = Math.max(0, ...summary.categories.map((c) => rank(c.band)));
  const axes = AXES.map((id): PentagonAxis => {
    const cat = summary.categories.find((c) => c.categoryId === id)!;
    const bands = BANDS[id];
    const end = bands[top].to;
    return {
      id,
      code: SIGLA[id],
      label: categoryName(id),
      level: cat.name,
      percent: cat.percent,
      at: Math.min(1, Math.max(0, cat.points / end)),
      rings: bands.slice(0, top).map((b) => b.to / end),
    };
  });
  return { band: BANDS.complessivo[top].id, name: BANDS.complessivo[top].name, axes };
}

/** Testo alternativo del pentagono: nomi e valori per intero. */
export function pentagonText(scale: PentagonScale): string {
  return `Livello per categoria, scala fino alla fine del livello ${scale.name}: ${scale.axes.map((a) => `${a.label} ${a.level} ${a.percent}%`).join('; ')}.`;
}

// ---------------------------------------------------------------------------------------------------------
// Testi di catene, livelli e record

const UNIT: Record<Measure, string> = { reps: 'rip.', seconds: 's', kg: 'kg' };

const num = (n: number) => new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 }).format(n);

const entryRule = (chainId: string, entryId: string) => chainRule(chainId)?.entries.find((e) => e.id === entryId);

/**
 * Testo di un record: "Trazioni zavorrate 30 kg", "Straddle · 5 s", "Trazioni a ripetizioni · 8 rip.". Una voce che
 * le regole non conoscono si legge col suo identificativo.
 */
export function recordText(r: { subId: string; stage: string; value: number }): string {
  const entry = entryRule(r.subId, r.stage);
  if (!entry) return `${r.stage} · ${num(r.value)}`;
  if (entry.measure === 'kg') return `${entry.name} ${num(r.value)} kg`;
  return `${entry.name} · ${num(r.value)} ${UNIT[entry.measure]}`;
}

/**
 * Livello attuale di una catena come si scrive in pagina: la voce e la lettera ("Trazioni zavorrate, livello C"),
 * mai il nome del livello nelle regole, che porta percentuali del peso corporeo valide solo a 60 kg (30, decisione
 * 16). null se la catena non ha ancora un livello.
 */
export function chainLevelText(chain: Pick<ChainScore, 'chainId' | 'level'>): string | null {
  if (!chain.level) return null;
  const entry = chainRule(chain.chainId)?.entries.find((e) => e.levels.includes(chain.level!));
  return entry ? `${entry.name}, livello ${chain.level}` : `Livello ${chain.level}`;
}

/** % del livello attuale di una catena, intera e per difetto: 100 solo a livello pieno, mai 0 se il livello c'è. */
export function chainPercent(chain: Pick<ChainScore, 'level' | 'percent'>): number {
  return chain.level ? Math.max(1, Math.floor(chain.percent + 1e-9)) : 0;
}

/** Livelli coperti da una voce: "Livello A", "Livelli C–F". */
export function entryLevelsText(opt: Pick<EntryOption, 'levels'>): string {
  const { levels } = opt;
  return levels.length === 1 ? `Livello ${levels[0]}` : `Livelli ${levels[0]}–${levels[levels.length - 1]}`;
}

/** Etichetta del campo del valore. */
export function valueLabel(opt: Pick<EntryOption, 'measure' | 'load'>): string {
  if (opt.measure === 'reps') return 'Ripetizioni';
  if (opt.measure === 'seconds') return 'Secondi';
  return opt.load === 'bilanciere' ? 'Massimale (kg)' : 'Zavorra (kg)';
}

/** Suggerimento sotto il campo del valore. */
export function valueHint(opt: Pick<EntryOption, 'measure' | 'load' | 'min' | 'max'>): string {
  if (opt.measure === 'kg')
    return opt.load === 'bilanciere'
      ? 'Massimale su 1 ripetizione, bilanciere incluso.'
      : 'Solo la zavorra aggiunta, per 1 ripetizione. Deve essere maggiore di 0.';
  return `Da ${opt.min} a ${opt.max} ${opt.measure === 'reps' ? 'ripetizioni' : 'secondi'}.`;
}

/** Campo a cui appartiene un errore di `validateRecord`. */
export const errorField = (err: ValidationError): 'value' | 'bodyweight' | 'entry' =>
  err === 'bodyweight-missing' || err === 'bodyweight-out-of-range' ? 'bodyweight' : err === 'entry-complete' || err === 'unknown-entry' || err === 'unknown-chain' ? 'entry' : 'value';

/** Messaggio per un errore di `validateRecord`, coi limiti della voce scelta. */
export function validationMessage(err: ValidationError, opt?: Pick<EntryOption, 'measure' | 'load' | 'min' | 'max'>): string {
  switch (err) {
    case 'not-a-number':
      return 'Inserisci un numero';
    case 'not-integer':
      return 'Solo numeri interi';
    case 'below-min':
      if (opt?.measure === 'kg') return opt.load === 'bilanciere' ? 'Il massimale deve essere maggiore di 0' : 'La zavorra deve essere maggiore di 0';
      return opt ? `Il minimo è ${num(opt.min)} ${UNIT[opt.measure]}` : 'Valore troppo basso';
    case 'above-max':
      return opt ? `Il massimo è ${num(opt.max)} ${UNIT[opt.measure]}` : 'Valore troppo alto';
    case 'bodyweight-missing':
      return 'Inserisci il tuo peso corporeo';
    case 'bodyweight-out-of-range':
      return `Il peso corporeo va tra ${LIMITS.minBodyweightKg} e ${LIMITS.maxBodyweightKg} kg`;
    case 'entry-complete':
      return 'Questo esercizio è già completo: scegline un altro';
    default:
      return 'Esercizio non valido';
  }
}

/** Record che non conta finché non gli si aggiunge il peso corporeo (convertito dal formato vecchio senza peso, ticket 32). */
export const missingBodyweight = (r: LevelRecord): boolean => validateRecord(r) === 'bodyweight-missing';

/** Peso corporeo da proporre nel foglio: quello dell'ultimo record che ne ha uno (per data, poi per inserimento). */
export function lastBodyweight(records: readonly { bodyweightKg: number | null; date: string; createdAt: string }[]): number | null {
  let last: (typeof records)[number] | null = null;
  for (const r of records) {
    if (r.bodyweightKg === null) continue;
    if (!last || r.date > last.date || (r.date === last.date && r.createdAt >= last.createdAt)) last = r;
  }
  return last?.bodyweightKg ?? null;
}

// ---------------------------------------------------------------------------------------------------------
// Celebrazioni

/**
 * Cosa festeggiare passando da `before` a `after` (record nuovo o corretto): nuovo livello complessivo ("Livello
 * complessivo: Elite") e nuovo livello di una categoria ("Sei Avanzato in Skill spinta"). Vuoto se nessun livello
 * è salito.
 */
export function celebrations(before: LevelSummary, after: LevelSummary): string[] {
  const out: string[] = [];
  if (rank(after.band) > rank(before.band)) out.push(`Livello complessivo: ${after.name}`);
  for (const id of AXES) {
    const cat = after.categories.find((c) => c.categoryId === id);
    const prev = before.categories.find((c) => c.categoryId === id);
    if (cat && prev && rank(cat.band) > rank(prev.band)) out.push(`Sei ${cat.name} in ${categoryName(id)}`);
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------
// Scala dei livelli (foglio "I livelli")

export type LadderScope = 'complessivo' | CategoryId;

export interface LadderRow {
  id: BandId;
  name: string;
  /** Punti di inizio e fine della fascia, come nel PDF (0–100, 101–200…). */
  from: number;
  to: number;
  /** Già superato, quello attuale, o ancora da raggiungere. */
  state: 'done' | 'current' | 'todo';
}

export interface Ladder {
  rows: LadderRow[];
  /** Punti di chi guarda in questa scala. */
  points: number;
  /** Prossimo livello e punti che mancano per entrarci; null a Leggenda. */
  next: { name: string; missing: number } | null;
}

/**
 * I sei livelli di una scala (complessivo o una categoria) con le fasce di punti e dove si trova l'utente. Il livello
 * attuale è quello deciso dal motore (`band`), così i bordi restano i suoi: 100 punti = Base 100%, 101 = Intermedio.
 */
export function ladder(scope: LadderScope, band: BandId, points: number): Ladder {
  const bands = BANDS[scope];
  const cur = bands.findIndex((b) => b.id === band);
  const rows = bands.map((b, i): LadderRow => ({ id: b.id, name: b.name, from: b.from, to: b.to, state: i < cur ? 'done' : i === cur ? 'current' : 'todo' }));
  const nb = bands[cur + 1];
  return { rows, points, next: nb ? { name: nb.name, missing: Math.max(1, nb.from - points) } : null };
}
