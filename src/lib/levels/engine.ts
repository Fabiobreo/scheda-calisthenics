/**
 * Motore dei punteggi del sistema di livelli (ticket 08). Logica pura: niente React, niente Supabase.
 * Le soglie stanno in `rules.ts`; qui c'è solo il modo di applicarle.
 *
 * Il livello non si salva mai: si ricalcola sempre dai record (e dal peso del giorno di ciascuno), quindi un
 * cambio di soglia vale subito per tutti.
 */
import { CATEGORIES, LIMITS, SUBS, type CategoryId, type LoadStage, type Segment, type StageRule, type SubId, type SubRule, type TableStage } from './rules';

/** Record di livello come arriva dai dati (ticket 09). `bodyweightKg` = peso corporeo del giorno del record. */
export interface LevelRecord {
  subId: string;
  /** Progressione o fase (es. 'straddle', 'wide', 'zavorra'). */
  stage: string;
  /** Ripetizioni, secondi o kg secondo la progressione. */
  value: number;
  bodyweightKg?: number | null;
}

export type Zone = 'base' | 'elite';

export interface RecordScore {
  /** Punti del record; se manca il peso corporeo è il minimo garantito (l'inizio della sua fase). */
  points: number;
  /** true se il record è in kg e manca il peso corporeo del suo giorno: va completato. */
  needsBodyweight: boolean;
}

export interface SubScore<R extends LevelRecord = LevelRecord> {
  subId: SubId;
  /** Punti esatti (0 … 2 × massimo base). Non si mostrano. */
  points: number;
  /** % della parte base, per difetto (0–100). */
  basePercent: number;
  /** % della parte ELITE (tutte le fasi elite insieme), per difetto (0–100). */
  elitePercent: number;
  /** 'elite' solo oltre il 100% base; a 100% esatto la zona è ancora 'base' ma l'elite è sbloccata (0%). */
  zone: Zone;
  /** % da mostrare nella zona corrente. */
  percent: number;
  /** Fase più alta visibile: 0 = base, 1 = prima elite, 2 = seconda elite. */
  phase: number;
  /** ELITE sbloccata (base al 100%). */
  unlocked: boolean;
  /** Record che vale di più (migliore di sempre); null se non ce ne sono. */
  best: R | null;
  /** Almeno un record in kg senza peso corporeo: la Home deve chiedere il peso. */
  needsBodyweight: boolean;
}

export interface CategoryScore<R extends LevelRecord = LevelRecord> {
  categoryId: CategoryId;
  /** Somma esatta dei punti dei sotto-esercizi (0–200). */
  points: number;
  /** Valore mostrato, per difetto (0–200). */
  value: number;
  /** 'elite' oltre 100. */
  zone: Zone;
  subs: SubScore<R>[];
}

export interface AvatarStage {
  /** 0–9 fino a 100, 10–19 nella zona ELITE (il livello 200 resta nel 19). */
  stage: number;
  /** Intensità dell'aura 0–1, piena a 100. */
  aura: number;
  /** Intensità delle scosse elettriche 0–1, da 101 a piena a 200. */
  shocks: number;
}

export interface LevelSummary<R extends LevelRecord = LevelRecord> {
  categories: CategoryScore<R>[];
  level: number;
  zone: Zone;
  avatar: AvatarStage;
  needsBodyweight: boolean;
}

/** Progressione inseribile in questo momento, coi limiti del campo. */
export interface StageOption {
  stageId: string;
  name: string;
  measure: 'reps' | 'seconds' | 'kg';
  /** Fase della progressione (per le tabelle che si estendono in elite, la fase più alta raggiungibile ora). */
  phase: number;
  min: number;
  max: number;
  /** Solo per i kg: zavorra (0 ammesso) o bilanciere. */
  load?: 'zavorra' | 'bilanciere';
  definition?: string;
}

export type ValidationError =
  | 'unknown-sub'
  | 'unknown-stage'
  | 'not-a-number'
  | 'not-integer'
  | 'below-min'
  | 'above-max'
  | 'locked'
  | 'bodyweight-out-of-range';

// ---------------------------------------------------------------------------------------------------------

const EPS = 1e-9;
/** Per difetto, senza farsi ingannare dalla virgola mobile (34 · 30/75 / 34 · 100 = 39,999…). */
const floor = (x: number) => Math.floor(x + EPS);
const lim = (x: number) => Math.min(1, Math.max(0, x));

const SUB_BY_ID = new Map<string, SubRule>(SUBS.map((s) => [s.id, s]));

export function subRule(subId: string): SubRule | undefined {
  return SUB_BY_ID.get(subId);
}

export function subsOf(categoryId: CategoryId): SubRule[] {
  return SUBS.filter((s) => s.category === categoryId);
}

export const baseMax = (sub: SubRule) => sub.phases[0].max;
export const eliteMax = (sub: SubRule) => sub.phases.slice(1).reduce((t, p) => t + p.max, 0);

/** Punti a cui inizia una fase = somma dei massimi delle fasi precedenti. */
export function phaseStart(sub: SubRule, phase: number): number {
  return sub.phases.slice(0, phase).reduce((t, p) => t + p.max, 0);
}

const segmentTo = (s: Segment) => ('values' in s ? s.from + s.values.length - 1 : s.to);

function segmentPoints(sub: SubRule, s: Segment, v: number): number {
  const raw = 'values' in s ? s.values[v - s.from] : s.perUnit * v;
  const pts = s.unit === 'percent' ? (sub.phases[s.phase].max * raw) / 100 : raw;
  return phaseStart(sub, s.phase) + pts;
}

function loadPoints(sub: SubRule, stage: LoadStage, kg: number, bw: number): number {
  const start = phaseStart(sub, Math.min(...stage.terms.map((t) => t.phase)));
  return stage.terms.reduce((t, term) => t + sub.phases[term.phase].max * lim((kg - term.offset * bw) / (term.span * bw)), start);
}

const validBodyweight = (bw: number | null | undefined): bw is number =>
  typeof bw === 'number' && Number.isFinite(bw) && bw >= LIMITS.minBodyweightKg && bw <= LIMITS.maxBodyweightKg;

/** Limiti strutturali della progressione (senza guardare cosa è sbloccato). */
function stageRange(stage: StageRule): { min: number; max: number } {
  if (stage.kind === 'load') return { min: stage.load === 'zavorra' ? 0 : 1, max: LIMITS.maxLoadKg };
  return { min: Math.min(...stage.segments.map((s) => s.from)), max: Math.max(...stage.segments.map(segmentTo)) };
}

/** Fase minima per poter inserire la progressione (la fase del suo primo tratto). */
const stageMinPhase = (stage: StageRule) =>
  stage.kind === 'load' ? Math.min(...stage.terms.map((t) => t.phase)) : Math.min(...stage.segments.map((s) => s.phase));

/**
 * Punti di un singolo record, oppure null se il record non è valido (sotto-esercizio o progressione sconosciuti,
 * valore fuori dai limiti). I valori fuori limite non si "taglierebbero": non si possono inserire (05, decisione 11).
 */
export function scoreRecord(record: LevelRecord): RecordScore | null {
  const sub = SUB_BY_ID.get(record.subId);
  const stage = sub?.stages.find((s) => s.id === record.stage);
  if (!sub || !stage || structuralError(stage, record.value)) return null;
  if (stage.kind === 'load') {
    const bw = record.bodyweightKg;
    if (!validBodyweight(bw)) return { points: phaseStart(sub, stageMinPhase(stage)), needsBodyweight: true };
    return { points: loadPoints(sub, stage, record.value, bw), needsBodyweight: false };
  }
  const seg = (stage as TableStage).segments.find((s) => record.value >= s.from && record.value <= segmentTo(s))!;
  return { points: segmentPoints(sub, seg, record.value), needsBodyweight: false };
}

function structuralError(stage: StageRule, value: number): ValidationError | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'not-a-number';
  if (stage.kind === 'table' && !Number.isInteger(value)) return 'not-integer';
  const { min, max } = stageRange(stage);
  if (value < min) return 'below-min';
  if (value > max) return 'above-max';
  if (stage.kind === 'table' && !stage.segments.some((s) => value >= s.from && value <= segmentTo(s))) return 'above-max';
  return null;
}

/** Fase più alta visibile dati i punti: una fase elite compare quando la precedente è completa. */
function visiblePhase(sub: SubRule, points: number): number {
  let phase = 0;
  for (let p = 1; p < sub.phases.length; p++) if (points + EPS >= phaseStart(sub, p)) phase = p;
  return phase;
}

/** Punteggio di un sotto-esercizio dal migliore di sempre tra i record (ognuno col peso del suo giorno). */
export function scoreSub<R extends LevelRecord>(subId: SubId, records: readonly R[]): SubScore<R> {
  const sub = SUB_BY_ID.get(subId);
  if (!sub) throw new Error(`Sotto-esercizio sconosciuto: ${subId}`);
  let best: R | null = null;
  let points = 0;
  let needsBodyweight = false;
  for (const r of records) {
    if (r.subId !== subId) continue;
    const s = scoreRecord(r);
    if (!s) continue;
    needsBodyweight ||= s.needsBodyweight;
    if (best === null || s.points > points + EPS) {
      best = r;
      points = s.points;
    }
  }
  const bMax = baseMax(sub);
  const basePercent = floor((Math.min(points, bMax) / bMax) * 100);
  const elitePercent = floor((Math.max(0, points - bMax) / eliteMax(sub)) * 100);
  const zone: Zone = points > bMax + EPS ? 'elite' : 'base';
  return {
    subId: sub.id,
    points,
    basePercent,
    elitePercent,
    zone,
    percent: zone === 'elite' ? elitePercent : basePercent,
    phase: visiblePhase(sub, points),
    unlocked: points + EPS >= bMax,
    best,
    needsBodyweight,
  };
}

/** Punteggio di una macro categoria: somma dei sotto-esercizi, 0–200. */
export function scoreCategory<R extends LevelRecord>(categoryId: CategoryId, records: readonly R[]): CategoryScore<R> {
  const subs = subsOf(categoryId).map((s) => scoreSub(s.id, records));
  const points = subs.reduce((t, s) => t + s.points, 0);
  const value = Math.min(200, floor(points));
  return { categoryId, points, value, zone: value > 100 ? 'elite' : 'base', subs };
}

/** Livello generale: media delle 5 categorie già arrotondate (quelle che si vedono), per difetto. */
export function overallLevel(categoryValues: readonly number[]): number {
  if (categoryValues.length === 0) return 0;
  const sum = categoryValues.reduce((t, v) => t + Math.floor(v), 0);
  return Math.max(0, Math.min(200, Math.floor(sum / categoryValues.length)));
}

/** Stadio dell'avatar (ogni 10 livelli) e intensità di aura e scosse. */
export function avatarStage(level: number): AvatarStage {
  const l = Math.max(0, Math.min(200, Math.floor(level)));
  return { stage: Math.min(19, Math.floor(l / 10)), aura: lim(l / 100), shocks: lim((l - 100) / 100) };
}

/** Tutto il riepilogo: 5 categorie nell'ordine delle regole, livello, avatar. */
export function levelSummary<R extends LevelRecord>(records: readonly R[]): LevelSummary<R> {
  const categories = CATEGORIES.map((c) => scoreCategory(c.id, records));
  const level = overallLevel(categories.map((c) => c.value));
  return {
    categories,
    level,
    zone: level > 100 ? 'elite' : 'base',
    avatar: avatarStage(level),
    needsBodyweight: categories.some((c) => c.subs.some((s) => s.needsBodyweight)),
  };
}

/**
 * Progressioni da mostrare ora per un sotto-esercizio, coi limiti del campo. Le fasi ELITE restano nascoste
 * finché la fase precedente non è completa; le tabelle che proseguono in elite (es. OAP 3–10 rip.) allungano il
 * massimo solo quando sono sbloccate.
 */
export function availableOptions(subId: SubId, records: readonly LevelRecord[]): StageOption[] {
  const sub = SUB_BY_ID.get(subId);
  if (!sub) throw new Error(`Sotto-esercizio sconosciuto: ${subId}`);
  const phase = scoreSub(subId, records).phase;
  const out: StageOption[] = [];
  for (const stage of sub.stages) {
    if (stageMinPhase(stage) > phase) continue;
    const base = { stageId: stage.id, name: stage.name, ...(stage.definition ? { definition: stage.definition } : {}) };
    if (stage.kind === 'load') {
      out.push({ ...base, measure: 'kg', phase: stageMinPhase(stage), load: stage.load, ...stageRange(stage) });
      continue;
    }
    const segs = stage.segments.filter((s) => s.phase <= phase);
    out.push({
      ...base,
      measure: stage.measure,
      phase: Math.max(...segs.map((s) => s.phase)),
      min: Math.min(...segs.map((s) => s.from)),
      max: Math.max(...segs.map(segmentTo)),
    });
  }
  return out;
}

/**
 * Progressione da suggerire quando il valore inserito è al massimo del campo (05, decisione 11): la successiva
 * tra quelle visibili, tenendo conto anche del record appena inserito. null se non c'è o se non serve.
 */
export function suggestNext(record: LevelRecord, records: readonly LevelRecord[]): StageOption | null {
  const sub = SUB_BY_ID.get(record.subId);
  if (!sub) return null;
  const options = availableOptions(sub.id, [...records, record]);
  const i = options.findIndex((o) => o.stageId === record.stage);
  if (i < 0 || options[i].measure === 'kg' || record.value < options[i].max) return null;
  return options[i + 1] ?? null;
}

/**
 * Controlla un record prima di salvarlo. Con `records` controlla anche che la progressione e il valore siano
 * sbloccati (fasi ELITE nascoste). Il peso corporeo, se c'è, deve essere plausibile.
 */
export function validateRecord(record: LevelRecord, records?: readonly LevelRecord[]): ValidationError | null {
  const sub = SUB_BY_ID.get(record.subId);
  if (!sub) return 'unknown-sub';
  const stage = sub.stages.find((s) => s.id === record.stage);
  if (!stage) return 'unknown-stage';
  const err = structuralError(stage, record.value);
  if (err) return err;
  if (record.bodyweightKg != null && !validBodyweight(record.bodyweightKg)) return 'bodyweight-out-of-range';
  if (records) {
    const opt = availableOptions(sub.id, records).find((o) => o.stageId === stage.id);
    if (!opt || record.value > opt.max) return 'locked';
  }
  return null;
}

/**
 * Limiti strutturali di ogni progressione (senza guardare cosa è sbloccato): sono gli stessi che il database
 * controlla in `level_stages` (migration 0012). Un test verifica che coincidano.
 */
export function stageLimits(): { subId: SubId; stage: string; min: number; max: number; whole: boolean }[] {
  return SUBS.flatMap((sub) => sub.stages.map((s) => ({ subId: sub.id, stage: s.id, ...stageRange(s), whole: s.kind === 'table' })));
}

/** Peso corporeo plausibile (kg). */
export function validateBodyweight(kg: number): boolean {
  return validBodyweight(kg);
}
