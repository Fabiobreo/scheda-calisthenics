/**
 * Regole dei punteggi v2 (ticket 30 e 31), scritte come dati. Fonte: `Correzioni punteggi.pdf` di Michael
 * (22 novembre 2026). Soglie e divisori sono copiati dal PDF numero per numero: per cambiarne uno si cambia
 * un numero in questo file e il motore (`engine.ts`) lo applica ovunque.
 *
 * Notazione del PDF: A2 = peso corporeo (PC), B2 = ripetizioni o secondi, C2 = zavorra o massimale,
 * F2 = peso di riferimento, D = (F2/A2)^esponente, G = (A2+C2)×D oppure C2×D per panca e military.
 */

export type CategoryId = 'fondamentali-tirata' | 'fondamentali-spinta' | 'skill-tirata' | 'skill-spinta' | 'handbalance';

export type ChainId =
  | 'trazioni'
  | 'muscle-up'
  | 'oap'
  | 'dip'
  | 'panca-piana'
  | 'military'
  | 'hspu'
  | 'verticale'
  | 'front-lever'
  | 'front-lever-touch'
  | 'front-lever-pull-up'
  | 'planche'
  | 'planche-push-up'
  | 'planche-press';

export type BandId = 'base' | 'intermedio' | 'avanzato' | 'elite' | 'titano' | 'leggenda';

/** Le fasce valgono per una categoria oppure per il punteggio complessivo. */
export type BandScope = CategoryId | 'complessivo';

export type Letter = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H';

export type Measure = 'reps' | 'seconds' | 'kg';

/** 'zavorra' = peso aggiunto al corpo (G = (PC + zavorra) × D); 'bilanciere' = massimale (G = massimale × D). */
export type LoadKind = 'zavorra' | 'bilanciere';

/**
 * Formula di un livello: dà la % di completamento (0 se non raggiunto, fino a 100).
 *
 * - `reps`: `SE(rip>=1; MIN(100; (100/target) × rip [× PC×D/F2]); 0)`. Senza MAX(1), come nel PDF.
 * - `window`: `SE(condizione; MIN(100; MAX(1; 100 × (G − start) / width)); 0)`. La condizione (`gate`) è
 *   `E(C2 > 0; G >= start)` ('threshold') oppure solo `C2 > 0` ('load', per il muscle up B che parte "da 0%").
 *   Il carico deve essere sempre maggiore di zero e la panca e il military partono dalla soglia del 35%
 *   (Michael, 24 novembre 2026): nel PDF trazioni, dip e HSPU F avevano solo `G >= start`, panca B e
 *   military A solo `C2 > 0`.
 * - `oap`: `SE(rip>=1; MIN(100; MAX(1; 100 × (PC × (1 + rip/repsDivisor) × D − start) / width)); 0)`.
 * - `hold`: `SE(s>=1; MIN(100; MAX(1; 100 × s / target)); 0)`. Non usa il peso.
 * - `hold-window`: `SE(s>=start; MIN(100; MAX(1; 100 × (s − start) / width)); 0)`. Non usa il peso.
 * - `skill`: `SE(v>=1; MIN(100; MAX(1; 100 × v × (PC/F2)^esp / target)); 0)`, esp = ESP_SKILL_SECONDI o
 *   ESP_SKILL_RIPETIZIONI secondo `exponent`.
 */
export type Formula =
  | { kind: 'reps'; target: number; normalized: boolean }
  | { kind: 'window'; gate: 'threshold' | 'load'; start: number; width: number }
  | { kind: 'oap'; repsDivisor: number; start: number; width: number }
  | { kind: 'hold'; target: number }
  | { kind: 'hold-window'; start: number; width: number }
  | { kind: 'skill'; exponent: 'seconds' | 'reps'; target: number };

export interface LevelRule {
  letter: Letter;
  /** Come nella tabella dei livelli del PDF (es. "Trazioni 15%–45% PC"). */
  name: string;
  /** Fascia della categoria a cui il livello appartiene. */
  band: BandId;
  /** Punti massimi del livello. */
  max: number;
  formula: Formula;
}

/** Voce del menu a tendina: un esercizio con un solo tipo di valore. Può coprire più livelli. */
export interface EntryRule {
  id: string;
  name: string;
  measure: Measure;
  /** Solo per i kg. */
  load?: LoadKind;
  /** Livelli coperti, dal più basso: quale si raggiunge lo decide la formula. */
  levels: readonly Letter[];
  /** La formula usa il peso corporeo: va chiesto dentro il record (30, decisione 9). */
  usesBodyweight: boolean;
}

export interface ChainRule {
  id: ChainId;
  name: string;
  category: CategoryId;
  /** Esponente della normalizzazione sul peso (da `EXPONENTS`); null se la catena non ne ha uno. */
  exponent: number | null;
  levels: readonly LevelRule[];
  entries: readonly EntryRule[];
}

export interface CategoryRule {
  id: CategoryId;
  name: string;
}

export interface Band {
  id: BandId;
  name: string;
  /** Primo punteggio della fascia, come nel PDF (0, 101, 201…). */
  from: number;
  /** Ultimo punteggio della fascia. */
  to: number;
}

// ---------------------------------------------------------------------------------------------------------
// Costanti

/**
 * Versione delle regole. I punti di ogni utente sono salvati sul server per le classifiche (ticket 38) insieme a
 * questo numero: va aumentato ogni volta che cambia qualcosa che sposta i punteggi (soglie, divisori, esponenti,
 * punti di un livello, catene), così al primo avvio ogni app riscrive i suoi punti con le regole nuove.
 */
export const RULES_VERSION = 1;

/** F2: peso corporeo di riferimento (kg). */
export const REF_KG = 60;

/** Esponenti della normalizzazione sul peso (F5, F6, F3, F7, F8, F9, F10 del PDF). */
export const EXPONENTS = {
  trazioni: 0.83,
  'muscle-up': 0.95,
  oap: 0.85,
  dip: 0.85,
  'panca-piana': 0.9,
  military: 0.9,
  hspu: 0.75,
} as const;

/** Esponenti delle skill (front lever, planche e le loro catene): secondi e ripetizioni. */
export const ESP_SKILL_SECONDI = 1.0;
export const ESP_SKILL_RIPETIZIONI = 2.0;

/**
 * Limiti di validazione (PDF, "Normalizzazione e controlli"). Il PDF non dà un massimo per la zavorra: si usa
 * lo stesso del massimale. Massimale e zavorra devono essere > 0 (Michael, 24 novembre 2026).
 */
export const LIMITS = {
  minBodyweightKg: 30,
  maxBodyweightKg: 250,
  minReps: 1,
  maxReps: 50,
  minSeconds: 1,
  maxSeconds: 60,
  maxLoadKg: 400,
} as const;

/** Punti massimi di una categoria e del complessivo. */
export const CATEGORY_MAX = 1400;
export const TOTAL_MAX = 7000;

export const CATEGORIES: readonly CategoryRule[] = [
  { id: 'fondamentali-tirata', name: 'Fondamentali tirata' },
  { id: 'fondamentali-spinta', name: 'Fondamentali spinta' },
  { id: 'skill-tirata', name: 'Skill tirata' },
  { id: 'skill-spinta', name: 'Skill spinta' },
  { id: 'handbalance', name: 'Handbalance' },
];

export const BAND_NAMES: Record<BandId, string> = {
  base: 'Base',
  intermedio: 'Intermedio',
  avanzato: 'Avanzato',
  elite: 'Elite',
  titano: 'Titano',
  leggenda: 'Leggenda',
};

const BAND_ORDER: readonly BandId[] = ['base', 'intermedio', 'avanzato', 'elite', 'titano', 'leggenda'];

/** Dalle sei fini di fascia alle fasce "da … a …" del PDF (la prima parte da 0, le altre dalla fine precedente + 1). */
const bands = (...ends: [number, number, number, number, number, number]): readonly Band[] =>
  BAND_ORDER.map((id, i) => ({ id, name: BAND_NAMES[id], from: i === 0 ? 0 : ends[i - 1] + 1, to: ends[i] }));

/** Fasce dei 6 livelli: diverse per categoria, e quelle del complessivo valgono solo per il complessivo. */
export const BANDS: Record<BandScope, readonly Band[]> = {
  'fondamentali-tirata': bands(100, 200, 500, 800, 1100, 1400),
  'fondamentali-spinta': bands(100, 200, 500, 800, 1100, 1400),
  'skill-tirata': bands(200, 500, 666, 800, 1100, 1400),
  'skill-spinta': bands(100, 500, 684, 850, 1100, 1400),
  handbalance: bands(100, 200, 500, 800, 1100, 1400),
  complessivo: bands(300, 800, 2500, 4000, 5500, 7000),
};

// ---------------------------------------------------------------------------------------------------------
// Aiuti per scrivere le catene (solo forma dei dati, nessun calcolo)

const L = (letter: Letter, name: string, band: BandId, max: number, formula: Formula): LevelRule => ({ letter, name, band, max, formula });

const reps = (target: number, normalized: boolean): Formula => ({ kind: 'reps', target, normalized });
/** `SE(E(C2>0;G>=start); …(G−start)/width…)` */
const win = (start: number, width: number): Formula => ({ kind: 'window', gate: 'threshold', start, width });
/** `SE(C2>0; …(G−start)/width…)` */
const winLoad = (start: number, width: number): Formula => ({ kind: 'window', gate: 'load', start, width });
/** `100×((A2×(1+B2/30)×D3)−60)/6`, uguale per i livelli A–D dell'OAP. */
const OAP_REPS: Formula = { kind: 'oap', repsDivisor: 30, start: 60, width: 6 };
const hold = (target: number): Formula => ({ kind: 'hold', target });
const skillSeconds = (target: number): Formula => ({ kind: 'skill', exponent: 'seconds', target });
const skillReps = (target: number): Formula => ({ kind: 'skill', exponent: 'reps', target });

const E = (id: string, name: string, measure: Measure, levels: readonly Letter[], usesBodyweight: boolean, load?: LoadKind): EntryRule => ({
  id,
  name,
  measure,
  ...(load ? { load } : {}),
  levels,
  usesBodyweight,
});

// ---------------------------------------------------------------------------------------------------------
// Le 14 catene

export const CHAINS: readonly ChainRule[] = [
  // ---- Fondamentali tirata: Trazioni 600 · Muscle up 400 · OAP 400
  {
    id: 'trazioni',
    name: 'Trazioni',
    category: 'fondamentali-tirata',
    exponent: EXPONENTS.trazioni,
    levels: [
      L('A', 'Australian pull up 1–15 rip.', 'base', 100, reps(15, false)),
      L('B', 'Trazioni 1–10 rip.', 'intermedio', 100, reps(10, true)),
      L('C', 'Trazioni 15%–45% PC', 'avanzato', 100, win(69, 18)),
      L('D', 'Trazioni 45%–75% PC', 'elite', 100, win(87, 18)),
      L('E', 'Trazioni 75%–107% PC', 'titano', 100, win(105, 19.2)),
      L('F', 'Trazioni 107%–130% PC', 'leggenda', 100, win(124.2, 13.8)),
    ],
    entries: [
      E('australian', 'Australian pull up', 'reps', ['A'], false),
      E('ripetizioni', 'Trazioni a ripetizioni', 'reps', ['B'], true),
      E('zavorra', 'Trazioni zavorrate', 'kg', ['C', 'D', 'E', 'F'], true, 'zavorra'),
    ],
  },
  {
    id: 'muscle-up',
    name: 'Muscle up',
    category: 'fondamentali-tirata',
    exponent: EXPONENTS['muscle-up'],
    levels: [
      L('A', 'Muscle up 1–5 rip.', 'avanzato', 50, reps(5, false)),
      L('B', 'Muscle up 0%–15% PC', 'avanzato', 50, winLoad(60, 9)),
      L('C', 'Muscle up 15%–35% PC', 'elite', 100, win(69, 12)),
      L('D', 'Muscle up 35%–57% PC', 'titano', 100, win(81, 13.2)),
      L('E', 'Muscle up 57%–65% PC', 'leggenda', 100, win(94.2, 4.8)),
    ],
    entries: [
      E('ripetizioni', 'Muscle up a ripetizioni', 'reps', ['A'], false),
      E('zavorra', 'Muscle up zavorrato', 'kg', ['B', 'C', 'D', 'E'], true, 'zavorra'),
    ],
  },
  {
    id: 'oap',
    name: 'OAP',
    category: 'fondamentali-tirata',
    exponent: EXPONENTS.oap,
    levels: [
      L('A', 'OAP assistenza mano-avambraccio 1–3 rip.', 'avanzato', 50, OAP_REPS),
      L('B', 'OAP assistenza mano-bicipite 1–3 rip.', 'avanzato', 50, OAP_REPS),
      L('C', 'OAP assistenza mano-spalla 1–3 rip.', 'elite', 100, OAP_REPS),
      L('D', 'OAP 1–3 rip.', 'titano', 100, OAP_REPS),
      L('E', 'OAP 5%–30% PC', 'leggenda', 100, win(63, 15)),
    ],
    entries: [
      E('avambraccio', 'OAP assistenza mano-avambraccio', 'reps', ['A'], true),
      E('bicipite', 'OAP assistenza mano-bicipite', 'reps', ['B'], true),
      E('spalla', 'OAP assistenza mano-spalla', 'reps', ['C'], true),
      E('ripetizioni', 'OAP a ripetizioni', 'reps', ['D'], true),
      E('zavorra', 'OAP zavorrato', 'kg', ['E'], true, 'zavorra'),
    ],
  },

  // ---- Fondamentali spinta: Dip 484 · Panca piana 483 · Military 433
  {
    id: 'dip',
    name: 'Dip',
    category: 'fondamentali-spinta',
    exponent: EXPONENTS.dip,
    levels: [
      L('A', 'Bench dip 1–20 rip.', 'base', 50, reps(20, false)),
      L('B', 'Dip 1–15 rip.', 'intermedio', 34, reps(15, true)),
      L('C', 'Dip 15%–65% PC', 'avanzato', 100, win(69, 30)),
      L('D', 'Dip 65%–107% PC', 'elite', 100, win(99, 25.2)),
      L('E', 'Dip 107%–152% PC', 'titano', 100, win(124.2, 27)),
      L('F', 'Dip 152%–200% PC', 'leggenda', 100, win(151.2, 28.8)),
    ],
    entries: [
      E('bench-dip', 'Bench dip', 'reps', ['A'], false),
      E('ripetizioni', 'Dip a ripetizioni', 'reps', ['B'], true),
      E('zavorra', 'Dip zavorrati', 'kg', ['C', 'D', 'E', 'F'], true, 'zavorra'),
    ],
  },
  {
    id: 'panca-piana',
    name: 'Panca piana',
    category: 'fondamentali-spinta',
    exponent: EXPONENTS['panca-piana'],
    levels: [
      L('A', 'Push up 1–20 rip.', 'base', 50, reps(20, false)),
      L('B', 'Panca piana 35%–88% PC', 'intermedio', 33, win(21, 31.8)),
      L('C', 'Panca piana 88%–120% PC', 'avanzato', 100, win(52.8, 19.2)),
      L('D', 'Panca piana 120%–158% PC', 'elite', 100, win(72, 22.8)),
      L('E', 'Panca piana 158%–199% PC', 'titano', 100, win(94.8, 24.6)),
      L('F', 'Panca piana 199%–260% PC', 'leggenda', 100, win(119.4, 36.6)),
    ],
    entries: [
      E('push-up', 'Push up', 'reps', ['A'], false),
      E('massimale', 'Panca piana massimale', 'kg', ['B', 'C', 'D', 'E', 'F'], true, 'bilanciere'),
    ],
  },
  {
    id: 'military',
    name: 'Military',
    category: 'fondamentali-spinta',
    exponent: EXPONENTS.military,
    levels: [
      L('A', 'Military 35%–55% PC', 'intermedio', 33, win(21, 12)),
      L('B', 'Military 55%–77% PC', 'avanzato', 100, win(33, 13.2)),
      L('C', 'Military 77%–102% PC', 'elite', 100, win(46.2, 15)),
      L('D', 'Military 102%–128% PC', 'titano', 100, win(61.2, 15.6)),
      L('E', 'Military 128%–135% PC', 'leggenda', 100, win(76.8, 4.2)),
    ],
    entries: [E('massimale', 'Military massimale', 'kg', ['A', 'B', 'C', 'D', 'E'], true, 'bilanciere')],
  },

  // ---- Handbalance: HSPU 700 · Verticale e OAHS 700
  {
    id: 'hspu',
    name: 'HSPU',
    category: 'handbalance',
    exponent: EXPONENTS.hspu,
    levels: [
      L('A', 'Pike push up a terra 1–15 rip.', 'base', 50, reps(15, true)),
      L('B', 'Pike push up su rialzo 1–10 rip.', 'intermedio', 50, reps(10, true)),
      L('C', 'HSPU a muro 1–5 rip.', 'avanzato', 150, reps(5, true)),
      L('D', 'HSPU 1–10 rip.', 'elite', 150, reps(10, true)),
      L('E', 'HSPU 5%–30% PC', 'titano', 150, win(63, 15)),
      L('F', 'HSPU 30%–65% PC', 'leggenda', 150, win(78, 21)),
    ],
    entries: [
      E('pike-terra', 'Pike push up a terra', 'reps', ['A'], true),
      E('pike-rialzo', 'Pike push up su rialzo', 'reps', ['B'], true),
      E('muro', 'HSPU a muro', 'reps', ['C'], true),
      E('liberi', 'HSPU liberi', 'reps', ['D'], true),
      E('zavorra', 'HSPU zavorrati', 'kg', ['E', 'F'], true, 'zavorra'),
    ],
  },
  {
    id: 'verticale',
    name: 'Verticale e OAHS',
    category: 'handbalance',
    exponent: null,
    levels: [
      L('A', 'Verticale a muro 1–60 s', 'base', 50, hold(60)),
      L('B', 'Verticale 1–15 s', 'intermedio', 50, hold(15)),
      L('C', 'Verticale 15–60 s', 'avanzato', 150, { kind: 'hold-window', start: 15, width: 45 }),
      L('D', 'OAHS assistito 5 dita 1–10 s', 'elite', 50, hold(10)),
      L('E', 'OAHS assistito 3 dita 1–10 s', 'elite', 50, hold(10)),
      L('F', 'OAHS assistito 1 dito 1–10 s', 'elite', 50, hold(10)),
      L('G', 'OAHS straddle 1–10 s', 'titano', 150, hold(10)),
      L('H', 'OAHS 1–10 s', 'leggenda', 150, hold(10)),
    ],
    entries: [
      E('muro', 'Verticale a muro', 'seconds', ['A'], false),
      E('verticale', 'Verticale', 'seconds', ['B', 'C'], false),
      E('oahs-5-dita', 'OAHS assistito 5 dita', 'seconds', ['D'], false),
      E('oahs-3-dita', 'OAHS assistito 3 dita', 'seconds', ['E'], false),
      E('oahs-1-dito', 'OAHS assistito 1 dito', 'seconds', ['F'], false),
      E('oahs-straddle', 'OAHS straddle', 'seconds', ['G'], false),
      E('oahs', 'OAHS', 'seconds', ['H'], false),
    ],
  },

  // ---- Skill tirata: Front lever 800 · Front lever touch 300 · Front lever pull ups 300
  {
    id: 'front-lever',
    name: 'Front lever',
    category: 'skill-tirata',
    exponent: null,
    levels: [
      L('A', 'Tuck front lever 1–10 s', 'base', 200, skillSeconds(10)),
      L('B', 'Tuck advanced front lever 1–10 s', 'intermedio', 150, skillSeconds(10)),
      L('C', 'One leg front lever 1–10 s', 'intermedio', 150, skillSeconds(10)),
      L('D', 'Straddle front lever 1–10 s', 'avanzato', 33, skillSeconds(10)),
      L('E', 'Half lay front lever 1–10 s', 'avanzato', 33, skillSeconds(10)),
      L('F', 'Full front lever 1–10 s', 'elite', 34, skillSeconds(10)),
      L('G', 'Wide full front lever 1–10 s', 'titano', 100, skillSeconds(10)),
      L('H', 'Victorian 1–10 s', 'leggenda', 100, skillSeconds(10)),
    ],
    entries: [
      E('tuck', 'Tuck', 'seconds', ['A'], true),
      E('advanced-tuck', 'Tuck advanced', 'seconds', ['B'], true),
      E('one-leg', 'One leg', 'seconds', ['C'], true),
      E('straddle', 'Straddle', 'seconds', ['D'], true),
      E('half-lay', 'Half lay', 'seconds', ['E'], true),
      E('full', 'Full', 'seconds', ['F'], true),
      E('wide', 'Wide full', 'seconds', ['G'], true),
      E('victorian', 'Victorian', 'seconds', ['H'], true),
    ],
  },
  {
    id: 'front-lever-touch',
    name: 'Front lever touch',
    category: 'skill-tirata',
    exponent: null,
    levels: [
      L('A', 'Tuck advanced front lever touch 1–10 s', 'avanzato', 25, skillSeconds(10)),
      L('B', 'One leg front lever touch 1–10 s', 'avanzato', 25, skillSeconds(10)),
      L('C', 'Straddle front lever touch 1–10 s', 'elite', 25, skillSeconds(10)),
      L('D', 'Half lay front lever touch 1–10 s', 'elite', 25, skillSeconds(10)),
      L('E', 'Full front lever touch 1–5 s', 'titano', 100, skillSeconds(5)),
      L('F', 'Wide full front lever touch 1–10 s', 'leggenda', 100, skillSeconds(10)),
    ],
    entries: [
      E('advanced-tuck', 'Tuck advanced', 'seconds', ['A'], true),
      E('one-leg', 'One leg', 'seconds', ['B'], true),
      E('straddle', 'Straddle', 'seconds', ['C'], true),
      E('half-lay', 'Half lay', 'seconds', ['D'], true),
      E('full', 'Full', 'seconds', ['E'], true),
      E('wide', 'Wide full', 'seconds', ['F'], true),
    ],
  },
  {
    id: 'front-lever-pull-up',
    name: 'Front lever pull ups',
    category: 'skill-tirata',
    exponent: null,
    levels: [
      L('A', 'Tuck advanced front lever pull ups 1–5 rip.', 'avanzato', 25, skillReps(5)),
      L('B', 'One leg front lever pull ups 1–5 rip.', 'avanzato', 25, skillReps(5)),
      L('C', 'Straddle front lever pull ups 1–5 rip.', 'elite', 50, skillReps(5)),
      L('D', 'Half lay front lever pull ups 1–5 rip.', 'titano', 50, skillReps(5)),
      L('E', 'Full front lever pull ups 1–5 rip.', 'titano', 50, skillReps(5)),
      L('F', 'Wide full front lever pull ups 1–5 rip.', 'leggenda', 100, skillReps(5)),
    ],
    entries: [
      E('advanced-tuck', 'Tuck advanced', 'reps', ['A'], true),
      E('one-leg', 'One leg', 'reps', ['B'], true),
      E('straddle', 'Straddle', 'reps', ['C'], true),
      E('half-lay', 'Half lay', 'reps', ['D'], true),
      E('full', 'Full', 'reps', ['E'], true),
      E('wide', 'Wide full', 'reps', ['F'], true),
    ],
  },

  // ---- Skill spinta: Planche 534 · Planche push ups 433 · Planche press 433
  {
    id: 'planche',
    name: 'Planche',
    category: 'skill-spinta',
    exponent: null,
    levels: [
      L('A', 'Tuck planche 1–10 s', 'base', 100, skillSeconds(10)),
      L('B', 'Tuck advanced planche 1–10 s', 'intermedio', 134, skillSeconds(10)),
      L('C', 'One leg planche 1–10 s', 'avanzato', 50, skillSeconds(10)),
      L('D', 'Straddle planche 1–10 s', 'elite', 50, skillSeconds(10)),
      L('E', 'Full planche 1–10 s', 'titano', 100, skillSeconds(10)),
      L('F', 'Maltese 1–10 s', 'leggenda', 100, skillSeconds(10)),
    ],
    entries: [
      E('tuck', 'Tuck', 'seconds', ['A'], true),
      E('advanced-tuck', 'Tuck advanced', 'seconds', ['B'], true),
      E('one-leg', 'One leg', 'seconds', ['C'], true),
      E('straddle', 'Straddle', 'seconds', ['D'], true),
      E('full', 'Full', 'seconds', ['E'], true),
      E('maltese', 'Maltese', 'seconds', ['F'], true),
    ],
  },
  {
    id: 'planche-push-up',
    name: 'Planche push ups',
    category: 'skill-spinta',
    exponent: null,
    levels: [
      L('A', 'Tuck planche push ups 1–5 rip.', 'intermedio', 133, skillReps(5)),
      L('B', 'Tuck advanced planche push ups 1–5 rip.', 'avanzato', 100, skillReps(5)),
      L('C', 'One leg planche push ups 1–5 rip.', 'elite', 50, skillReps(5)),
      L('D', 'Straddle planche push ups 1–5 rip.', 'titano', 50, skillReps(5)),
      L('E', 'Full planche push ups 1–5 rip.', 'leggenda', 100, skillReps(5)),
    ],
    entries: [
      E('tuck', 'Tuck', 'reps', ['A'], true),
      E('advanced-tuck', 'Tuck advanced', 'reps', ['B'], true),
      E('one-leg', 'One leg', 'reps', ['C'], true),
      E('straddle', 'Straddle', 'reps', ['D'], true),
      E('full', 'Full', 'reps', ['E'], true),
    ],
  },
  {
    id: 'planche-press',
    name: 'Planche press',
    category: 'skill-spinta',
    exponent: null,
    levels: [
      L('A', 'Tuck planche press 1–3 rip.', 'intermedio', 133, skillReps(3)),
      L('B', 'Tuck advanced planche press 1–3 rip.', 'avanzato', 34, skillReps(3)),
      L('C', 'One leg planche press 1–3 rip.', 'elite', 66, skillReps(3)),
      L('D', 'Straddle planche press 1–3 rip.', 'titano', 100, skillReps(3)),
      L('E', 'Full planche press 1–3 rip.', 'leggenda', 100, skillReps(3)),
    ],
    entries: [
      E('tuck', 'Tuck', 'reps', ['A'], true),
      E('advanced-tuck', 'Tuck advanced', 'reps', ['B'], true),
      E('one-leg', 'One leg', 'reps', ['C'], true),
      E('straddle', 'Straddle', 'reps', ['D'], true),
      E('full', 'Full', 'reps', ['E'], true),
    ],
  },
];
