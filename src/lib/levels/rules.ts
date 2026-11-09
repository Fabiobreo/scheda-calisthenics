/**
 * Regole del sistema di livelli (ticket 05), scritte come dati.
 *
 * Qui stanno TUTTE le soglie: per cambiare un valore si cambia un numero in questo file, e il motore
 * (`engine.ts`) lo applica ovunque (Home, riepilogo compatto, vista trainer). Nessuna formula va mostrata
 * nell'interfaccia (05, decisione 15).
 *
 * Notazione: PC = peso corporeo del giorno del record (kg). Ogni sotto-esercizio ha una fase base (indice 0)
 * e una o due fasi ELITE (indici 1, 2): la somma dei massimi elite è uguale al massimo base.
 */

export type CategoryId = 'fondamentali-tirata' | 'fondamentali-spinta' | 'skill-spinta' | 'skill-tirata' | 'handbalance';

export type SubId =
  | 'trazioni'
  | 'muscle-up'
  | 'oap'
  | 'dip'
  | 'military'
  | 'panca-piana'
  | 'planche'
  | 'planche-push-up'
  | 'planche-press'
  | 'front-lever'
  | 'front-lever-pull-up'
  | 'front-lever-touch'
  | 'verticale'
  | 'hspu';

/** Una fase del sotto-esercizio: 0 = base, 1-2 = ELITE. `max` = punti della fase. */
export interface PhaseRule {
  /** Nome della fase elite (es. "Maltese"); null per la base. Solo descrittivo. */
  name: string | null;
  max: number;
}

/**
 * Tratto di una tabella: il valore inserito `v` (ripetizioni o secondi) vale
 * - `values[v - from]` se la tabella è esplicita,
 * - `perUnit · v` se è lineare (`from`…`to`).
 * `unit: 'percent'` = numeri su 100 della fase (come nel 05 per planche e OAP base), `'points'` = punti.
 * I punti finali si sommano all'inizio della fase (somma dei massimi delle fasi precedenti).
 */
export type Segment =
  | { phase: number; from: number; values: readonly number[]; unit: 'percent' | 'points' }
  | { phase: number; from: number; to: number; perUnit: number; unit: 'percent' | 'points' };

/** Progressione con valore a ripetizioni o secondi. */
export interface TableStage {
  kind: 'table';
  id: string;
  name: string;
  measure: 'reps' | 'seconds';
  segments: readonly Segment[];
  definition?: string;
}

/**
 * Record in kg per 1 ripetizione. Ogni termine vale `max(fase) · lim((R − offset·PC) / (span·PC))`;
 * i termini si sommano (quando il termine elite è > 0 quello base è già pieno).
 * `load`: 'zavorra' (solo il peso aggiunto, 0 ammesso: vale 0) o 'bilanciere' (bilanciere incluso, > 0).
 */
export interface LoadStage {
  kind: 'load';
  id: string;
  name: string;
  measure: 'kg';
  load: 'zavorra' | 'bilanciere';
  terms: readonly { phase: number; offset: number; span: number }[];
  definition?: string;
}

export type StageRule = TableStage | LoadStage;

export interface SubRule {
  id: SubId;
  name: string;
  category: CategoryId;
  /** Testo breve accanto al sotto-esercizio (05, "Definizioni dei movimenti"). */
  definition: string;
  phases: readonly PhaseRule[];
  /** Progressioni in ordine dalla più facile; le elite in coda. */
  stages: readonly StageRule[];
}

export interface CategoryRule {
  id: CategoryId;
  name: string;
}

/** Limiti degli input in kg (zavorra o bilanciere) e del peso corporeo. */
export const LIMITS = {
  maxLoadKg: 400,
  minBodyweightKg: 20,
  maxBodyweightKg: 300,
} as const;

export const CATEGORIES: readonly CategoryRule[] = [
  { id: 'fondamentali-tirata', name: 'Fondamentali tirata' },
  { id: 'fondamentali-spinta', name: 'Fondamentali spinta' },
  { id: 'skill-spinta', name: 'Skill spinta' },
  { id: 'skill-tirata', name: 'Skill tirata' },
  { id: 'handbalance', name: 'Handbalance' },
];

// ---------------------------------------------------------------------------------------------------------
// Tabelle condivise

/** Planche e front lever base, 1–10 s, valori su 100. */
const LEVER_BASE: readonly [id: string, name: string, values: readonly number[]][] = [
  ['tuck', 'Tuck', [2, 4, 6, 8, 10, 12, 14, 16, 18, 20]],
  ['advanced-tuck', 'Advanced tuck', [22, 24, 26, 28, 30, 32, 34, 36, 38, 40]],
  ['one-leg', 'One leg', [42, 44, 46, 48, 50, 52, 54, 56, 58, 60]],
  ['straddle', 'Straddle', [61, 62, 63, 64, 65, 66, 67, 68, 69, 70]],
  ['half-lay', 'Half lay', [71, 72, 73, 74, 75, 76, 77, 78, 79, 80]],
  ['full', 'Full', [82, 84, 86, 88, 90, 92, 94, 96, 98, 100]],
];

/** Fasi elite da 1 a 10 (secondi o ripetizioni), in punti: Wide planche/front lever, Maltese, Victorian, Wide touch/pull up. */
const WIDE_TABLE = [2, 4, 7, 9, 11, 14, 16, 18, 21, 25] as const;

/** Front lever touch (1–4 s) e front lever pull up (1–4 rip.), in punti. */
const TOUCH_BASE: readonly [id: string, name: string, values: readonly number[]][] = [
  ['tuck', 'Tuck', [1, 2, 3, 4]],
  ['advanced-tuck', 'Advanced tuck', [5, 6, 7, 8]],
  ['one-leg', 'One leg', [9, 10, 11, 12]],
  ['straddle', 'Straddle', [13, 14, 15, 16]],
  ['half-lay', 'Half lay', [17, 18, 19, 20]],
  ['full', 'Full', [21, 22, 23, 25]],
];

const leverBase = (): TableStage[] =>
  LEVER_BASE.map(([id, name, values]) => ({
    kind: 'table',
    id,
    name,
    measure: 'seconds',
    segments: [{ phase: 0, from: 1, values, unit: 'percent' }],
  }));

const touchBase = (measure: 'reps' | 'seconds'): TableStage[] =>
  TOUCH_BASE.map(([id, name, values]) => ({
    kind: 'table',
    id,
    name,
    measure,
    segments: [{ phase: 0, from: 1, values, unit: 'points' }],
  }));

const WIDE_DEF = 'Stessa esecuzione con presa larga.';

// ---------------------------------------------------------------------------------------------------------
// Sotto-esercizi

export const SUBS: readonly SubRule[] = [
  // Fondamentali tirata: Trazioni 34 · Muscle up 33 · OAP 33
  {
    id: 'trazioni',
    name: 'Trazioni',
    category: 'fondamentali-tirata',
    definition: 'Presa prona, partenza a braccia tese, mento sopra la sbarra. Record = zavorra massima per 1 ripetizione.',
    phases: [{ name: null, max: 34 }, { name: 'Elite', max: 34 }],
    stages: [
      {
        kind: 'load',
        id: 'zavorra',
        name: 'Zavorra',
        measure: 'kg',
        load: 'zavorra',
        terms: [
          { phase: 0, offset: 0, span: 1 },
          { phase: 1, offset: 1, span: 0.3 },
        ],
      },
    ],
  },
  {
    id: 'muscle-up',
    name: 'Muscle up',
    category: 'fondamentali-tirata',
    definition:
      'Alla sbarra, dalla sospensione a braccia tese fino al sostegno a braccia tese sopra la sbarra, senza kipping. Record = zavorra massima per 1 ripetizione.',
    phases: [{ name: null, max: 33 }, { name: 'Elite', max: 33 }],
    stages: [
      {
        kind: 'load',
        id: 'zavorra',
        name: 'Zavorra',
        measure: 'kg',
        load: 'zavorra',
        terms: [
          { phase: 0, offset: 0, span: 1 / 3 },
          { phase: 1, offset: 1 / 3, span: 1 / 3 },
        ],
      },
    ],
  },
  {
    id: 'oap',
    name: 'OAP',
    category: 'fondamentali-tirata',
    definition:
      'Trazione a un braccio, partenza a braccio teso, mento sopra la sbarra. Nelle propedeutiche la mano libera assiste afferrando il braccio che tira al gomito, al bicipite o alla spalla (più in alto = meno aiuto).',
    phases: [{ name: null, max: 33 }, { name: 'Elite', max: 33 }],
    stages: [
      { kind: 'table', id: 'gomito', name: 'Assistito mano al gomito', measure: 'reps', segments: [{ phase: 0, from: 1, values: [5, 10, 15, 20, 25], unit: 'percent' }] },
      { kind: 'table', id: 'bicipite', name: 'Assistito mano al bicipite', measure: 'reps', segments: [{ phase: 0, from: 1, values: [30, 35, 40, 45, 50], unit: 'percent' }] },
      { kind: 'table', id: 'spalla', name: 'Assistito mano alla spalla', measure: 'reps', segments: [{ phase: 0, from: 1, values: [55, 60, 65, 70, 75], unit: 'percent' }] },
      {
        kind: 'table',
        id: 'oap',
        name: 'OAP',
        measure: 'reps',
        segments: [
          { phase: 0, from: 1, values: [85, 100], unit: 'percent' },
          { phase: 1, from: 3, values: [4, 8, 12, 16, 20, 24, 28, 33], unit: 'points' },
        ],
      },
    ],
  },

  // Fondamentali spinta: Dip 34 · Military 33 · Panca piana 33
  {
    id: 'dip',
    name: 'Dip',
    category: 'fondamentali-spinta',
    definition: 'Alle parallele, dalle braccia tese fino a spalle sotto i gomiti, poi di nuovo a braccia tese. Record = zavorra massima per 1 ripetizione.',
    phases: [{ name: null, max: 34 }, { name: 'Elite', max: 34 }],
    stages: [
      {
        kind: 'load',
        id: 'zavorra',
        name: 'Zavorra',
        measure: 'kg',
        load: 'zavorra',
        terms: [
          { phase: 0, offset: 0, span: 1 },
          { phase: 1, offset: 1, span: 1 },
        ],
      },
    ],
  },
  {
    id: 'military',
    name: 'Military',
    category: 'fondamentali-spinta',
    definition: 'In piedi, bilanciere dalle clavicole sopra la testa a braccia tese, senza spinta delle gambe. Record = peso sul bilanciere, bilanciere incluso.',
    phases: [{ name: null, max: 33 }, { name: 'Elite', max: 33 }],
    stages: [
      {
        kind: 'load',
        id: 'bilanciere',
        name: 'Bilanciere',
        measure: 'kg',
        load: 'bilanciere',
        terms: [
          { phase: 0, offset: 0, span: 1 },
          { phase: 1, offset: 1, span: 0.4 },
        ],
      },
    ],
  },
  {
    id: 'panca-piana',
    name: 'Panca piana',
    category: 'fondamentali-spinta',
    definition: 'Bilanciere al petto e spinta a braccia tese, glutei sulla panca. Record = peso sul bilanciere, bilanciere incluso.',
    phases: [{ name: null, max: 33 }, { name: 'Elite', max: 33 }],
    stages: [
      {
        kind: 'load',
        id: 'bilanciere',
        name: 'Bilanciere',
        measure: 'kg',
        load: 'bilanciere',
        terms: [
          { phase: 0, offset: 0, span: 1.6 },
          { phase: 1, offset: 1.6, span: 0.6 },
        ],
      },
    ],
  },

  // Skill spinta: Planche 50 · Planche push up 25 · Planche press 25
  {
    id: 'planche',
    name: 'Planche',
    category: 'skill-spinta',
    definition: 'Corpo sospeso parallelo al suolo in appoggio sulle mani, braccia tese. Progressioni dalla più raccolta (Tuck) al corpo teso (Full).',
    phases: [{ name: null, max: 50 }, { name: 'Wide planche', max: 25 }, { name: 'Maltese', max: 25 }],
    stages: [
      ...leverBase(),
      { kind: 'table', id: 'wide', name: 'Wide planche', measure: 'seconds', definition: WIDE_DEF, segments: [{ phase: 1, from: 1, values: WIDE_TABLE, unit: 'points' }] },
      {
        kind: 'table',
        id: 'maltese',
        name: 'Maltese',
        measure: 'seconds',
        definition: 'Planche con le mani molto larghe e il corpo vicino al suolo.',
        segments: [{ phase: 2, from: 1, values: WIDE_TABLE, unit: 'points' }],
      },
    ],
  },
  {
    id: 'planche-push-up',
    name: 'Planche push up',
    category: 'skill-spinta',
    definition: 'Piegamento completo mantenendo la posizione di planche della progressione scelta.',
    phases: [{ name: null, max: 25 }, { name: 'Elite', max: 25 }],
    stages: [
      { kind: 'table', id: 'tuck', name: 'Tuck', measure: 'reps', segments: [{ phase: 0, from: 1, values: [2, 4], unit: 'points' }] },
      { kind: 'table', id: 'advanced-tuck', name: 'Advanced tuck', measure: 'reps', segments: [{ phase: 0, from: 1, values: [6, 8], unit: 'points' }] },
      { kind: 'table', id: 'one-leg', name: 'One leg', measure: 'reps', segments: [{ phase: 0, from: 1, values: [10, 12], unit: 'points' }] },
      { kind: 'table', id: 'straddle', name: 'Straddle', measure: 'reps', segments: [{ phase: 0, from: 1, values: [14, 16], unit: 'points' }] },
      { kind: 'table', id: 'half-lay', name: 'Half lay', measure: 'reps', segments: [{ phase: 0, from: 1, values: [18, 20], unit: 'points' }] },
      {
        kind: 'table',
        id: 'full',
        name: 'Full',
        measure: 'reps',
        segments: [
          { phase: 0, from: 1, values: [22, 25], unit: 'points' },
          { phase: 1, from: 3, values: [3, 6, 9, 12, 15, 18, 21, 25], unit: 'points' },
        ],
      },
    ],
  },
  {
    id: 'planche-press',
    name: 'Planche press',
    category: 'skill-spinta',
    definition: 'Dalla planche della progressione scelta si sale in verticale senza toccare terra coi piedi, braccia tese.',
    phases: [{ name: null, max: 25 }, { name: 'Elite', max: 25 }],
    stages: [
      { kind: 'table', id: 'tuck', name: 'Tuck', measure: 'reps', segments: [{ phase: 0, from: 1, values: [4], unit: 'points' }] },
      { kind: 'table', id: 'advanced-tuck', name: 'Advanced tuck', measure: 'reps', segments: [{ phase: 0, from: 1, values: [8], unit: 'points' }] },
      { kind: 'table', id: 'one-leg', name: 'One leg', measure: 'reps', segments: [{ phase: 0, from: 1, values: [12], unit: 'points' }] },
      { kind: 'table', id: 'straddle', name: 'Straddle', measure: 'reps', segments: [{ phase: 0, from: 1, values: [16], unit: 'points' }] },
      { kind: 'table', id: 'half-lay', name: 'Half lay', measure: 'reps', segments: [{ phase: 0, from: 1, values: [20], unit: 'points' }] },
      {
        kind: 'table',
        id: 'full',
        name: 'Full',
        measure: 'reps',
        segments: [
          { phase: 0, from: 1, values: [25], unit: 'points' },
          { phase: 1, from: 2, values: [6, 12, 18, 25], unit: 'points' },
        ],
      },
    ],
  },

  // Skill tirata: Front lever 50 · Front lever pull up 25 · Front lever touch 25
  {
    id: 'front-lever',
    name: 'Front lever',
    category: 'skill-tirata',
    definition: 'Appesi alla sbarra, corpo orizzontale a pancia in su, braccia tese.',
    phases: [{ name: null, max: 50 }, { name: 'Wide front lever', max: 25 }, { name: 'Victorian', max: 25 }],
    stages: [
      ...leverBase(),
      { kind: 'table', id: 'wide', name: 'Wide front lever', measure: 'seconds', definition: WIDE_DEF, segments: [{ phase: 1, from: 1, values: WIDE_TABLE, unit: 'points' }] },
      {
        kind: 'table',
        id: 'victorian',
        name: 'Victorian',
        measure: 'seconds',
        definition: 'Tenuta a corpo teso sotto la sbarra, orizzontale e a pancia in giù, con le braccia tese lungo i fianchi.',
        segments: [{ phase: 2, from: 1, values: WIDE_TABLE, unit: 'points' }],
      },
    ],
  },
  {
    id: 'front-lever-pull-up',
    name: 'Front lever pull up',
    category: 'skill-tirata',
    definition: 'Dalla posizione di front lever si tira il corpo verso la sbarra mantenendolo orizzontale, e si torna a braccia tese.',
    phases: [{ name: null, max: 25 }, { name: 'Wide front lever pull up', max: 25 }],
    stages: [
      ...touchBase('reps'),
      { kind: 'table', id: 'wide', name: 'Wide front lever pull up', measure: 'reps', definition: WIDE_DEF, segments: [{ phase: 1, from: 1, values: WIDE_TABLE, unit: 'points' }] },
    ],
  },
  {
    id: 'front-lever-touch',
    name: 'Front lever touch',
    category: 'skill-tirata',
    definition:
      'In posizione di front lever si tira fino a portare la sbarra a contatto con il corpo (all’altezza dell’addome) e si tiene la posizione; si misurano i secondi di tenuta.',
    phases: [{ name: null, max: 25 }, { name: 'Wide front lever touch', max: 25 }],
    stages: [
      ...touchBase('seconds'),
      { kind: 'table', id: 'wide', name: 'Wide front lever touch', measure: 'seconds', definition: WIDE_DEF, segments: [{ phase: 1, from: 1, values: WIDE_TABLE, unit: 'points' }] },
    ],
  },

  // Handbalance: Verticale 60 · Hand stand push up 40
  {
    id: 'verticale',
    name: 'Verticale',
    category: 'handbalance',
    definition: 'In equilibrio sulle mani, corpo allineato, senza appoggi.',
    phases: [{ name: null, max: 60 }, { name: 'Verticale straddle mono braccio', max: 30 }, { name: 'Verticale full mono braccio', max: 30 }],
    stages: [
      { kind: 'table', id: 'verticale', name: 'Verticale', measure: 'seconds', segments: [{ phase: 0, from: 1, to: 120, perUnit: 0.5, unit: 'points' }] },
      {
        kind: 'table',
        id: 'straddle-mono-braccio',
        name: 'Verticale straddle mono braccio',
        measure: 'seconds',
        definition: 'Su una mano sola, a gambe divaricate.',
        segments: [{ phase: 1, from: 1, to: 10, perUnit: 3, unit: 'points' }],
      },
      {
        kind: 'table',
        id: 'full-mono-braccio',
        name: 'Verticale full mono braccio',
        measure: 'seconds',
        definition: 'Su una mano sola, a gambe unite.',
        segments: [{ phase: 2, from: 1, to: 10, perUnit: 3, unit: 'points' }],
      },
    ],
  },
  {
    id: 'hspu',
    name: 'Hand stand push up',
    category: 'handbalance',
    definition: 'In verticale senza muro, testa fino a terra e risalita a braccia tese. Elite = zavorra massima per 1 ripetizione.',
    phases: [{ name: null, max: 40 }, { name: 'Hand stand push up zavorrato', max: 40 }],
    stages: [
      { kind: 'table', id: 'libera', name: 'In libera', measure: 'reps', segments: [{ phase: 0, from: 1, to: 10, perUnit: 4, unit: 'points' }] },
      { kind: 'load', id: 'zavorra', name: 'Zavorra', measure: 'kg', load: 'zavorra', terms: [{ phase: 1, offset: 0, span: 0.5 }] },
    ],
  },
];
