/**
 * Motore dei punteggi v2 (ticket 31). Logica pura: niente React, niente Supabase.
 * Soglie, divisori ed esponenti stanno in `rules.ts`; qui c'è solo il modo di applicarli.
 *
 * Il livello non si salva mai: si ricalcola sempre dai record, ognuno col peso corporeo scritto dentro il record
 * quando la sua formula lo usa.
 */
import {
  BANDS,
  CATEGORIES,
  CATEGORY_MAX,
  CHAINS,
  ESP_SKILL_RIPETIZIONI,
  ESP_SKILL_SECONDI,
  LIMITS,
  REF_KG,
  TOTAL_MAX,
  type BandId,
  type BandScope,
  type CategoryId,
  type ChainId,
  type ChainRule,
  type EntryRule,
  type Formula,
  type Letter,
  type LevelRule,
  type LoadKind,
  type Measure,
} from './rules';

/** Record di livello. `bodyweightKg` serve solo se la voce lo usa (`usesBodyweight`), altrimenti si ignora. */
export interface LevelRecord {
  chainId: string;
  /** Voce del menu a tendina (es. 'zavorra', 'straddle'). */
  entry: string;
  /** Ripetizioni, secondi o kg secondo la voce. */
  value: number;
  bodyweightKg?: number | null;
}

export interface RecordScore {
  /** Punti esatti della catena dati da questo record: livelli sotto pieni + % × massimo del livello raggiunto. */
  points: number;
  /** Livello raggiunto (il più alto con % ≥ 1 tra quelli coperti dalla voce); null se nessuno. */
  level: Letter | null;
  /** % di completamento del livello raggiunto (1–100); 0 se nessuno. */
  percent: number;
}

export interface ChainScore<R extends LevelRecord = LevelRecord> {
  chainId: ChainId;
  /** Punti della catena, arrotondati all'intero più vicino. */
  points: number;
  /** Punti prima dell'arrotondamento. */
  exact: number;
  /** Punti massimi della catena. */
  max: number;
  /** Livello attuale (lettera); null se non c'è nessun record che vale. */
  level: Letter | null;
  /** % di completamento del livello attuale (1–100, non arrotondata); 0 senza livello. */
  percent: number;
  /** Record che vale di più (migliore di sempre); null se non ce ne sono. */
  best: R | null;
}

export interface BandPosition {
  band: BandId;
  /** Nome da mostrare ("Avanzato"). */
  name: string;
  /** % dentro la fascia, intera e per difetto: 100 solo a fascia piena. */
  percent: number;
  /** Punti a cui la fascia è a 0% (fine della fascia precedente; 0 per Base). */
  start: number;
  /** Punti a cui la fascia è al 100%. */
  end: number;
}

export interface CategoryScore<R extends LevelRecord = LevelRecord> extends BandPosition {
  categoryId: CategoryId;
  /** Somma dei punti (interi) delle catene, 0–1400. */
  points: number;
  max: number;
  chains: ChainScore<R>[];
}

export interface LevelSummary<R extends LevelRecord = LevelRecord> extends BandPosition {
  categories: CategoryScore<R>[];
  /** Punteggio complessivo: somma delle 5 categorie, 0–7000. */
  total: number;
  max: number;
}

/** Voce inseribile in questo momento, coi limiti del campo. */
export interface EntryOption {
  entryId: string;
  name: string;
  measure: Measure;
  load?: LoadKind;
  levels: readonly Letter[];
  usesBodyweight: boolean;
  min: number;
  max: number;
  /** true se il minimo è escluso (massimale > 0). */
  minExclusive: boolean;
  /** true se il valore deve essere intero (ripetizioni e secondi). */
  whole: boolean;
}

export type ValidationError =
  | 'unknown-chain'
  | 'unknown-entry'
  | 'not-a-number'
  | 'not-integer'
  | 'below-min'
  | 'above-max'
  | 'bodyweight-missing'
  | 'bodyweight-out-of-range'
  | 'entry-complete';

// ---------------------------------------------------------------------------------------------------------

const EPS = 1e-9;
/** Toglie il rumore della virgola mobile attorno agli interi (99,99999999 → 100): non è un arrotondamento. */
const snap = (x: number) => (Math.abs(x - Math.round(x)) < EPS ? Math.round(x) : x);

const CHAIN_BY_ID = new Map<string, ChainRule>(CHAINS.map((c) => [c.id, c]));

export function chainRule(chainId: string): ChainRule | undefined {
  return CHAIN_BY_ID.get(chainId);
}

export function chainsOf(categoryId: CategoryId): ChainRule[] {
  return CHAINS.filter((c) => c.category === categoryId);
}

/** Punti massimi della catena. */
export const chainMax = (chain: ChainRule) => chain.levels.reduce((t, l) => t + l.max, 0);

/** Punti a cui inizia un livello = somma dei massimi dei livelli sotto. */
export function levelStart(chain: ChainRule, letter: Letter): number {
  const i = chain.levels.findIndex((l) => l.letter === letter);
  return chain.levels.slice(0, i).reduce((t, l) => t + l.max, 0);
}

const validBodyweight = (bw: number | null | undefined): bw is number =>
  typeof bw === 'number' && Number.isFinite(bw) && bw >= LIMITS.minBodyweightKg && bw <= LIMITS.maxBodyweightKg;

/** Peso corporeo ammesso (30–250 kg). */
export function validateBodyweight(kg: number): boolean {
  return validBodyweight(kg);
}

/**
 * Applica una formula del PDF. `bw` è il peso corporeo (ignorato dalle formule che non lo usano), `exponent`
 * quello della catena, `load` il tipo di carico della voce.
 */
function formulaPercent(f: Formula, value: number, bw: number, exponent: number | null, load: LoadKind | undefined): number {
  const d = exponent === null ? 1 : Math.pow(REF_KG / bw, exponent);
  const clamp = (x: number) => Math.min(100, Math.max(1, x));
  switch (f.kind) {
    case 'reps':
      return value >= 1 ? snap(Math.min(100, (100 / f.target) * value * (f.normalized ? (bw * d) / REF_KG : 1))) : 0;
    case 'window': {
      const g = load === 'bilanciere' ? value * d : (bw + value) * d;
      const loaded = value > 0;
      const reached = g >= f.start - EPS;
      const ok = f.gate === 'load' ? loaded : f.gate === 'threshold' ? reached : loaded && reached;
      return ok ? snap(clamp((100 * (g - f.start)) / f.width)) : 0;
    }
    case 'oap':
      return value >= 1 ? snap(clamp((100 * (bw * (1 + value / f.repsDivisor) * d - f.start)) / f.width)) : 0;
    case 'hold':
      return value >= 1 ? snap(clamp((100 * value) / f.target)) : 0;
    case 'hold-window':
      return value >= f.start ? snap(clamp((100 * (value - f.start)) / f.width)) : 0;
    case 'skill': {
      const esp = f.exponent === 'seconds' ? ESP_SKILL_SECONDI : ESP_SKILL_RIPETIZIONI;
      return value >= 1 ? snap(clamp((100 * value * Math.pow(bw / REF_KG, esp)) / f.target)) : 0;
    }
  }
}

const entryOfLevel = (chain: ChainRule, letter: Letter): EntryRule | undefined => chain.entries.find((e) => e.levels.includes(letter));

/**
 * % di completamento di un livello per un valore e un peso corporeo: la formula del PDF così com'è, senza
 * controllare i limiti di inserimento (serve ai test e alla tabella di verifica: 7,5 s non si può inserire ma
 * si può calcolare). Il peso corporeo è ignorato dalle formule che non lo usano.
 */
export function levelPercent(chainId: ChainId, letter: Letter, value: number, bodyweightKg: number = REF_KG): number {
  const chain = CHAIN_BY_ID.get(chainId);
  const level = chain?.levels.find((l) => l.letter === letter);
  if (!chain || !level) throw new Error(`Livello sconosciuto: ${chainId} ${letter}`);
  return formulaPercent(level.formula, value, bodyweightKg, chain.exponent, entryOfLevel(chain, letter)?.load);
}

/** Limiti del campo di una voce. */
function entryRange(entry: EntryRule): { min: number; max: number; minExclusive: boolean; whole: boolean } {
  if (entry.measure === 'reps') return { min: LIMITS.minReps, max: LIMITS.maxReps, minExclusive: false, whole: true };
  if (entry.measure === 'seconds') return { min: LIMITS.minSeconds, max: LIMITS.maxSeconds, minExclusive: false, whole: true };
  return { min: 0, max: LIMITS.maxLoadKg, minExclusive: entry.load === 'bilanciere', whole: false };
}

function structuralError(entry: EntryRule, record: LevelRecord): ValidationError | null {
  const { value } = record;
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'not-a-number';
  const { min, max, minExclusive, whole } = entryRange(entry);
  if (whole && !Number.isInteger(value)) return 'not-integer';
  if (value < min || (minExclusive && value <= min)) return 'below-min';
  if (value > max) return 'above-max';
  if (entry.usesBodyweight) {
    if (record.bodyweightKg == null) return 'bodyweight-missing';
    if (!validBodyweight(record.bodyweightKg)) return 'bodyweight-out-of-range';
  }
  return null;
}

/**
 * Punti di un singolo record, oppure null se il record non è valido (catena o voce sconosciute, valore fuori
 * dai limiti, peso corporeo mancante o fuori dai limiti quando la voce lo usa): fuori range non si calcola.
 * Un record valido può valere 0 (es. zavorra sotto la soglia del primo livello a carico).
 */
export function scoreRecord(record: LevelRecord): RecordScore | null {
  const chain = CHAIN_BY_ID.get(record.chainId);
  const entry = chain?.entries.find((e) => e.id === record.entry);
  if (!chain || !entry || structuralError(entry, record)) return null;
  const bw = entry.usesBodyweight ? (record.bodyweightKg as number) : REF_KG;
  let best: { level: LevelRule; percent: number } | null = null;
  for (const level of chain.levels) {
    if (!entry.levels.includes(level.letter)) continue;
    const percent = formulaPercent(level.formula, record.value, bw, chain.exponent, entry.load);
    if (percent >= 1) best = { level, percent };
  }
  if (!best) return { points: 0, level: null, percent: 0 };
  return {
    points: levelStart(chain, best.level.letter) + (best.percent / 100) * best.level.max,
    level: best.level.letter,
    percent: best.percent,
  };
}

/** Punteggio di una catena dal migliore di sempre tra i suoi record. I record non validi si ignorano. */
export function scoreChain<R extends LevelRecord>(chainId: ChainId, records: readonly R[]): ChainScore<R> {
  const chain = CHAIN_BY_ID.get(chainId);
  if (!chain) throw new Error(`Catena sconosciuta: ${chainId}`);
  let best: R | null = null;
  let score: RecordScore = { points: 0, level: null, percent: 0 };
  for (const r of records) {
    if (r.chainId !== chainId) continue;
    const s = scoreRecord(r);
    if (!s || s.level === null) continue;
    if (best === null || s.points > score.points + EPS) {
      best = r;
      score = s;
    }
  }
  return {
    chainId: chain.id,
    points: Math.round(snap(score.points)),
    exact: score.points,
    max: chainMax(chain),
    level: score.level,
    percent: score.percent,
    best,
  };
}

/**
 * Livello con nome e % dentro la fascia per un punteggio (di una categoria o del complessivo).
 * La fascia va dalla fine della precedente alla propria fine: 100 → Base 100%, 101 → Intermedio 1%.
 */
export function bandPosition(scope: BandScope, points: number): BandPosition {
  const bands = BANDS[scope];
  const found = bands.findIndex((b) => points <= b.to);
  const index = found < 0 ? bands.length - 1 : found;
  const band = bands[index];
  const start = index === 0 ? 0 : bands[index - 1].to;
  const percent = Math.min(100, Math.max(0, Math.floor(((points - start) / (band.to - start)) * 100 + EPS)));
  return { band: band.id, name: band.name, percent, start, end: band.to };
}

/** Punteggio di una macro categoria: somma delle sue catene (0–1400), livello con nome e % nella fascia. */
export function scoreCategory<R extends LevelRecord>(categoryId: CategoryId, records: readonly R[]): CategoryScore<R> {
  const chains = chainsOf(categoryId).map((c) => scoreChain(c.id, records));
  const points = chains.reduce((t, c) => t + c.points, 0);
  return { categoryId, points, max: CATEGORY_MAX, chains, ...bandPosition(categoryId, points) };
}

/** Tutto il riepilogo: 5 categorie nell'ordine delle regole e punteggio complessivo (somma, 0–7000). */
export function levelSummary<R extends LevelRecord>(records: readonly R[]): LevelSummary<R> {
  const categories = CATEGORIES.map((c) => scoreCategory(c.id, records));
  const total = categories.reduce((t, c) => t + c.points, 0);
  return { categories, total, max: TOTAL_MAX, ...bandPosition('complessivo', total) };
}

const toOption = (entry: EntryRule): EntryOption => ({
  entryId: entry.id,
  name: entry.name,
  measure: entry.measure,
  ...(entry.load ? { load: entry.load } : {}),
  levels: entry.levels,
  usesBodyweight: entry.usesBodyweight,
  ...entryRange(entry),
});

/**
 * Voci da mostrare ora nel menu a tendina di una catena: quelle con almeno un livello non pieno. Una voce
 * sparisce quando tutti i suoi livelli sono pieni, anche se li ha riempiti un record più alto (30, decisione 6).
 */
export function availableEntries(chainId: ChainId, records: readonly LevelRecord[]): EntryOption[] {
  const chain = CHAIN_BY_ID.get(chainId);
  if (!chain) throw new Error(`Catena sconosciuta: ${chainId}`);
  const { exact } = scoreChain(chainId, records);
  const full = (letter: Letter) => {
    const level = chain.levels.find((l) => l.letter === letter)!;
    return exact + EPS >= levelStart(chain, letter) + level.max;
  };
  return chain.entries.filter((e) => !e.levels.every(full)).map(toOption);
}

/**
 * Controlla un record prima di salvarlo. Con `records` controlla anche che la voce sia ancora nel menu (non
 * tutta piena): da non passare quando si corregge un record dello storico, che resta modificabile.
 */
export function validateRecord(record: LevelRecord, records?: readonly LevelRecord[]): ValidationError | null {
  const chain = CHAIN_BY_ID.get(record.chainId);
  if (!chain) return 'unknown-chain';
  const entry = chain.entries.find((e) => e.id === record.entry);
  if (!entry) return 'unknown-entry';
  const err = structuralError(entry, record);
  if (err) return err;
  if (records && !availableEntries(chain.id, records).some((o) => o.entryId === entry.id)) return 'entry-complete';
  return null;
}

/**
 * Limiti di ogni voce, per la tabella di controllo del database (ticket 32): un test verificherà che coincidano.
 */
export function stageLimits(): { chainId: ChainId; entry: string; min: number; max: number; minExclusive: boolean; whole: boolean; usesBodyweight: boolean }[] {
  return CHAINS.flatMap((chain) =>
    chain.entries.map((e) => ({ chainId: chain.id, entry: e.id, ...entryRange(e), usesBodyweight: e.usesBodyweight })),
  );
}
