import { describe, expect, it } from 'vitest';
import {
  BANDS,
  CATEGORIES,
  CATEGORY_MAX,
  CHAINS,
  ESP_SKILL_RIPETIZIONI,
  ESP_SKILL_SECONDI,
  EXPONENTS,
  LIMITS,
  REF_KG,
  RULES_VERSION,
  TOTAL_MAX,
  availableEntries,
  bandPosition,
  chainMax,
  chainsOf,
  levelPercent,
  levelSummary,
  scoreCategory,
  scoreChain,
  scoreRecord,
  stageLimits,
  validateBodyweight,
  validateRecord,
  type BandId,
  type ChainId,
  type Letter,
  type LevelRecord,
} from '.';

const rec = (chainId: ChainId, entry: string, value: number, bodyweightKg?: number | null): LevelRecord => ({ chainId, entry, value, bodyweightKg });

/**
 * Ogni formula del PDF a 60 kg agli estremi del livello: [catena, livello, valore di inizio, % attesa, valore di
 * fine]. A fine livello la % attesa è sempre 100. I numeri sono ricavati a mano dal PDF, non dalle regole.
 * Per i livelli a carico l'inizio è la soglia (MAX(1; 0) = 1%); per quelli a ripetizioni o secondi è 1.
 */
const PDF_AT_60: readonly [ChainId, Letter, number, number, number][] = [
  // TRAZIONI — zavorra = G − 60
  ['trazioni', 'A', 1, 100 / 15, 15],
  ['trazioni', 'B', 1, 10, 10],
  ['trazioni', 'C', 9, 1, 27],
  ['trazioni', 'D', 27, 1, 45],
  ['trazioni', 'E', 45, 1, 64.2],
  ['trazioni', 'F', 64.2, 1, 78],
  // MUSCLE UP
  ['muscle-up', 'A', 1, 20, 5],
  ['muscle-up', 'B', 0.01, 1, 9],
  ['muscle-up', 'C', 9, 1, 21],
  ['muscle-up', 'D', 21, 1, 34.2],
  ['muscle-up', 'E', 34.2, 1, 39],
  // OAP — 1 rip. = 100 × (60 × (1 + 1/30) − 60) / 6 = 33,3
  ['oap', 'A', 1, 100 / 3, 3],
  ['oap', 'B', 1, 100 / 3, 3],
  ['oap', 'C', 1, 100 / 3, 3],
  ['oap', 'D', 1, 100 / 3, 3],
  ['oap', 'E', 3, 1, 18],
  // DIP
  ['dip', 'A', 1, 5, 20],
  ['dip', 'B', 1, 100 / 15, 15],
  ['dip', 'C', 9, 1, 39],
  ['dip', 'D', 39, 1, 64.2],
  ['dip', 'E', 64.2, 1, 91.2],
  ['dip', 'F', 91.2, 1, 120],
  // PANCA PIANA — massimale = G
  ['panca-piana', 'A', 1, 5, 20],
  ['panca-piana', 'B', 21, 1, 52.8],
  ['panca-piana', 'C', 52.8, 1, 72],
  ['panca-piana', 'D', 72, 1, 94.8],
  ['panca-piana', 'E', 94.8, 1, 119.4],
  ['panca-piana', 'F', 119.4, 1, 156],
  // MILITARY
  ['military', 'A', 21, 1, 33],
  ['military', 'B', 33, 1, 46.2],
  ['military', 'C', 46.2, 1, 61.2],
  ['military', 'D', 61.2, 1, 76.8],
  ['military', 'E', 76.8, 1, 81],
  // HSPU — E e F: zavorra = H8 × 60 (5% = 3 kg, 30% = 18 kg, 65% = 39 kg; PDF del 26/11)
  ['hspu', 'A', 1, 100 / 15, 15],
  ['hspu', 'B', 1, 10, 10],
  ['hspu', 'C', 1, 20, 5],
  ['hspu', 'D', 1, 10, 10],
  ['hspu', 'E', 3, 1, 18],
  ['hspu', 'F', 18, 1, 39],
  // VERTICALE E OAHS
  ['verticale', 'A', 1, 100 / 60, 60],
  ['verticale', 'B', 1, 100 / 15, 15],
  ['verticale', 'C', 15, 1, 60],
  ['verticale', 'D', 1, 10, 10],
  ['verticale', 'E', 1, 10, 10],
  ['verticale', 'F', 1, 10, 10],
  ['verticale', 'G', 1, 10, 10],
  ['verticale', 'H', 1, 10, 10],
  // FRONT LEVER (T = 10)
  ...(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as const).map((l): [ChainId, Letter, number, number, number] => ['front-lever', l, 1, 10, 10]),
  // FRONT LEVER TOUCH (T = 10 per tutti, anche il full: PDF del 26/11)
  ...(['A', 'B', 'C', 'D', 'E', 'F'] as const).map((l): [ChainId, Letter, number, number, number] => ['front-lever-touch', l, 1, 10, 10]),
  // FRONT LEVER PULL UPS (T = 5)
  ...(['A', 'B', 'C', 'D', 'E', 'F'] as const).map((l): [ChainId, Letter, number, number, number] => ['front-lever-pull-up', l, 1, 20, 5]),
  // PLANCHE (T = 10, dal frog stand al maltese), PUSH UPS (T = 5), PRESS (T = 3)
  ...(['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const).map((l): [ChainId, Letter, number, number, number] => ['planche', l, 1, 10, 10]),
  ...(['A', 'B', 'C', 'D', 'E'] as const).map((l): [ChainId, Letter, number, number, number] => ['planche-push-up', l, 1, 20, 5]),
  ...(['A', 'B', 'C', 'D', 'E'] as const).map((l): [ChainId, Letter, number, number, number] => ['planche-press', l, 1, 100 / 3, 3]),
];

describe('formule del PDF a 60 kg', () => {
  it('la tabella copre tutti i livelli di tutte le catene', () => {
    const inTable = PDF_AT_60.map(([c, l]) => `${c} ${l}`).sort();
    const inRules = CHAINS.flatMap((c) => c.levels.map((l) => `${c.id} ${l.letter}`)).sort();
    expect(inTable).toEqual(inRules);
  });

  it.each(PDF_AT_60)('%s %s: %d → inizio, fine a %d (attesa %d%% all’inizio)', (chainId, letter, startValue, startPercent, endValue) => {
    expect(levelPercent(chainId, letter, startValue, 60)).toBeCloseTo(startPercent, 9);
    expect(levelPercent(chainId, letter, endValue, 60)).toBe(100);
  });

  it('sotto la soglia un livello a carico vale 0', () => {
    expect(levelPercent('trazioni', 'C', 8.9, 60)).toBe(0);
    expect(levelPercent('trazioni', 'D', 26.9, 60)).toBe(0);
    expect(levelPercent('dip', 'C', 8.9, 60)).toBe(0);
    expect(levelPercent('panca-piana', 'C', 52.7, 60)).toBe(0);
    expect(levelPercent('military', 'B', 32.9, 60)).toBe(0);
    expect(levelPercent('verticale', 'C', 14, 60)).toBe(0);
  });

  it('a metà finestra vale 50%', () => {
    expect(levelPercent('trazioni', 'C', 18, 60)).toBeCloseTo(50, 9);
    expect(levelPercent('trazioni', 'E', 45 + 9.6, 60)).toBeCloseTo(50, 9);
    expect(levelPercent('panca-piana', 'F', 119.4 + 18.3, 60)).toBeCloseTo(50, 9);
    expect(levelPercent('military', 'E', 76.8 + 2.1, 60)).toBeCloseTo(50, 9);
  });

  it('carico sempre > 0; panca e military dalla soglia del 35% (Michael, 24/11)', () => {
    // muscle up B parte "da 0%": basta un carico > 0
    expect(levelPercent('muscle-up', 'B', 0, 60)).toBe(0);
    expect(levelPercent('muscle-up', 'B', 0.1, 60)).toBeGreaterThanOrEqual(1);
    // panca B e military A: sotto 21 kg (35% di 60) valgono 0
    expect(levelPercent('panca-piana', 'B', 5, 60)).toBe(0);
    expect(levelPercent('panca-piana', 'B', 20.9, 60)).toBe(0);
    expect(levelPercent('panca-piana', 'B', 21, 60)).toBe(1);
    expect(levelPercent('military', 'A', 5, 60)).toBe(0);
    expect(levelPercent('military', 'A', 20.9, 60)).toBe(0);
    expect(levelPercent('military', 'A', 21, 60)).toBe(1);
    // persone molto pesanti: senza zavorra non si entra nei livelli zavorrati, con zavorra sì
    expect(levelPercent('trazioni', 'C', 0, 140)).toBe(0);
    expect(levelPercent('trazioni', 'C', 0.5, 140)).toBeGreaterThanOrEqual(1);
    expect(levelPercent('dip', 'C', 0, 160)).toBe(0);
    expect(levelPercent('hspu', 'F', 0, 180)).toBe(0);
    // OAP E e HSPU E: carico > 0 e soglia
    expect(levelPercent('oap', 'E', 0, 60)).toBe(0);
    expect(levelPercent('oap', 'E', 2.9, 60)).toBe(0);
    expect(levelPercent('hspu', 'E', 2.9, 60)).toBe(0);
    // a 100 kg G = 100 × (60/100)^0,85 = 64,8 ≥ 63 anche senza zavorra, ma C2 = 0 → 0
    expect(levelPercent('oap', 'E', 0, 100)).toBe(0);
    expect(levelPercent('oap', 'E', 0.5, 100)).toBeGreaterThan(1);
  });

  it('le ripetizioni oltre il completamento valgono 100%', () => {
    expect(levelPercent('trazioni', 'A', 50, 60)).toBe(100);
    expect(levelPercent('oap', 'D', 50, 60)).toBe(100);
    expect(levelPercent('planche', 'A', 60, 60)).toBe(100);
  });
});

describe('normalizzazione sul peso corporeo', () => {
  it('costanti del PDF', () => {
    expect(REF_KG).toBe(60);
    expect(EXPONENTS).toEqual({ trazioni: 0.83, 'muscle-up': 0.95, oap: 0.85, dip: 0.85, 'panca-piana': 0.9, military: 0.9, hspu: 0.75 });
    expect(ESP_SKILL_SECONDI).toBe(1);
    expect(ESP_SKILL_RIPETIZIONI).toBe(2);
  });

  it('trazioni zavorrate: G = (PC + zavorra) × (60/PC)^0,83', () => {
    const g = (80 + 30) * Math.pow(60 / 80, 0.83); // 86,63 → livello C
    expect(levelPercent('trazioni', 'C', 30, 80)).toBeCloseTo((100 * (g - 69)) / 18, 9);
    expect(levelPercent('trazioni', 'D', 30, 80)).toBe(0);
  });

  it('panca e military: G = massimale × (60/PC)^0,9', () => {
    const g = 100 * Math.pow(60 / 80, 0.9); // 77,19 → livello D
    expect(levelPercent('panca-piana', 'D', 100, 80)).toBeCloseTo((100 * (g - 72)) / 22.8, 9);
    expect(levelPercent('military', 'E', 100, 80)).toBeCloseTo((100 * (g - 76.8)) / 4.2, 9);
  });

  it('ripetizioni normalizzate: × PC × D / 60', () => {
    expect(levelPercent('trazioni', 'B', 5, 80)).toBeCloseTo(50 * ((80 * Math.pow(60 / 80, 0.83)) / 60), 9);
    expect(levelPercent('dip', 'B', 3, 70)).toBeCloseTo(20 * ((70 * Math.pow(60 / 70, 0.85)) / 60), 9);
    expect(levelPercent('hspu', 'C', 2, 70)).toBeCloseTo(40 * ((70 * Math.pow(60 / 70, 0.75)) / 60), 9);
  });

  it('OAP a ripetizioni: 100 × (PC × (1 + rip/30) × D − 60) / 6', () => {
    const d = Math.pow(60 / 80, 0.85);
    expect(levelPercent('oap', 'A', 1, 80)).toBeCloseTo((100 * (80 * (1 + 1 / 30) * d - 60)) / 6, 9);
    // a 40 kg una ripetizione resta sotto la soglia (40 × 1,033 × D = 58,3 < 60): MAX(1; …) = 1%
    expect(levelPercent('oap', 'D', 1, 40)).toBe(1);
  });

  it('i livelli non normalizzati ignorano il peso', () => {
    for (const bw of [40, 60, 120]) {
      expect(levelPercent('trazioni', 'A', 3, bw)).toBeCloseTo(20, 9);
      expect(levelPercent('muscle-up', 'A', 2, bw)).toBe(40);
      expect(levelPercent('dip', 'A', 10, bw)).toBe(50);
      expect(levelPercent('panca-piana', 'A', 10, bw)).toBe(50);
      expect(levelPercent('verticale', 'B', 3, bw)).toBe(20);
      expect(levelPercent('verticale', 'H', 5, bw)).toBe(50);
    }
  });
});

describe('esempi scritti nel PDF (skill)', () => {
  it('a 60 kg 10 secondi (T = 10) valgono 100%', () => {
    expect(levelPercent('front-lever', 'A', 10, 60)).toBe(100);
    expect(levelPercent('front-lever', 'A', 9, 60)).toBe(90);
  });

  it('a 80 kg bastano 7,5 secondi', () => {
    expect(levelPercent('front-lever', 'F', 7.5, 80)).toBe(100);
    expect(levelPercent('front-lever', 'F', 7, 80)).toBeLessThan(100);
    expect(levelPercent('planche', 'E', 7.5, 80)).toBe(100);
  });

  it('a 50 kg ne servono 12', () => {
    expect(levelPercent('front-lever', 'F', 12, 50)).toBe(100);
    expect(levelPercent('front-lever', 'F', 11, 50)).toBeLessThan(100);
  });

  it('pull ups con T = 5: 5 ripetizioni a 60 kg, 4 a 70 kg, 3 a 80 kg', () => {
    expect(levelPercent('front-lever-pull-up', 'E', 5, 60)).toBe(100);
    expect(levelPercent('front-lever-pull-up', 'E', 4, 60)).toBeLessThan(100);
    expect(levelPercent('front-lever-pull-up', 'E', 4, 70)).toBe(100);
    expect(levelPercent('front-lever-pull-up', 'E', 3, 70)).toBeLessThan(100);
    expect(levelPercent('front-lever-pull-up', 'E', 3, 80)).toBe(100);
    expect(levelPercent('front-lever-pull-up', 'E', 2, 80)).toBeLessThan(100);
  });

  it('full front lever touch con T = 10 come tutti gli altri touch', () => {
    expect(levelPercent('front-lever-touch', 'E', 10, 60)).toBe(100);
    expect(levelPercent('front-lever-touch', 'E', 5, 60)).toBe(50);
    expect(levelPercent('front-lever-touch', 'D', 5, 60)).toBe(50);
  });

  it('frog stand, planche e maltese (T = 10): 7,5 s a 80 kg, 12 s a 50 kg', () => {
    for (const l of ['A', 'B', 'F', 'G'] as const) {
      expect(levelPercent('planche', l, 10, 60)).toBe(100);
      expect(levelPercent('planche', l, 7.5, 80)).toBe(100);
      expect(levelPercent('planche', l, 7, 80)).toBeLessThan(100);
      expect(levelPercent('planche', l, 12, 50)).toBe(100);
      expect(levelPercent('planche', l, 11, 50)).toBeLessThan(100);
    }
  });

  it('planche push ups con T = 5: 5 ripetizioni a 60 kg, 4 a 70 kg (~3,67), 3 a 80 kg (~2,81)', () => {
    expect(levelPercent('planche-push-up', 'A', 5, 60)).toBe(100);
    expect(levelPercent('planche-push-up', 'A', 4, 60)).toBe(80);
    expect(levelPercent('planche-push-up', 'C', 4, 70)).toBe(100);
    expect(levelPercent('planche-push-up', 'C', 3, 70)).toBeLessThan(100);
    expect(levelPercent('planche-push-up', 'E', 3, 80)).toBe(100);
    expect(levelPercent('planche-push-up', 'E', 2, 80)).toBeLessThan(100);
    // i valori esatti del PDF: 5 / (70/60)² = 3,67 e 5 / (80/60)² = 2,81
    expect(levelPercent('planche-push-up', 'A', 5 / Math.pow(70 / 60, 2), 70)).toBeCloseTo(100, 9);
    expect(levelPercent('planche-push-up', 'A', 2.81, 80)).toBeCloseTo(99.9, 1);
  });

  it('planche press con T = 3: 3 ripetizioni a 60 kg, ~2,2 a 70 kg, ~1,7 a 80 kg (2 ripetizioni = 100%)', () => {
    expect(levelPercent('planche-press', 'A', 3, 60)).toBe(100);
    expect(levelPercent('planche-press', 'A', 2, 60)).toBeCloseTo(200 / 3, 9);
    expect(levelPercent('planche-press', 'C', 3, 70)).toBe(100);
    expect(levelPercent('planche-press', 'C', 2, 70)).toBeLessThan(100); // ne servono 2,2
    expect(levelPercent('planche-press', 'E', 2, 80)).toBe(100);
    expect(levelPercent('planche-press', 'E', 1, 80)).toBeLessThan(100); // ne servono 1,7
  });
});

describe('HSPU zavorrati (PDF del 26/11): H8 = (zavorra / 60) × (60/PC)^0,75', () => {
  const d80 = Math.pow(60 / 80, 0.75);

  it('a 60 kg: livello E da 3 a 18 kg, livello F da 18 a 39 kg', () => {
    expect(levelPercent('hspu', 'E', 2.9, 60)).toBe(0);
    expect(levelPercent('hspu', 'E', 3, 60)).toBe(1);
    expect(levelPercent('hspu', 'E', 10.5, 60)).toBeCloseTo(50, 9);
    expect(levelPercent('hspu', 'E', 18, 60)).toBe(100);
    expect(levelPercent('hspu', 'F', 17.9, 60)).toBe(0);
    expect(levelPercent('hspu', 'F', 18, 60)).toBe(1);
    expect(levelPercent('hspu', 'F', 28.5, 60)).toBeCloseTo(50, 9);
    expect(levelPercent('hspu', 'F', 39, 60)).toBe(100);
    // punti: A 50 + B 50 + C 150 + D 150 = 400, poi E 175 e F 180
    expect(scoreRecord(rec('hspu', 'zavorra', 10.5, 60))).toEqual({ points: 400 + 87.5, level: 'E', percent: 50 });
    expect(scoreRecord(rec('hspu', 'zavorra', 18, 60))).toEqual({ points: 575 + 1.8, level: 'F', percent: 1 });
    expect(scoreRecord(rec('hspu', 'zavorra', 39, 60))).toEqual({ points: 755, level: 'F', percent: 100 });
  });

  it('a 80 kg conta solo la zavorra, non il peso del corpo: 0,1 kg vale 0', () => {
    expect(levelPercent('hspu', 'E', 0.1, 80)).toBe(0);
    expect(scoreRecord(rec('hspu', 'zavorra', 0.1, 80))).toEqual({ points: 0, level: null, percent: 0 });
    // soglia del 5%: 3 / d = 3,72 kg
    expect(levelPercent('hspu', 'E', 3.7, 80)).toBe(0);
    expect(levelPercent('hspu', 'E', 3.8, 80)).toBeGreaterThanOrEqual(1);
    expect(levelPercent('hspu', 'E', 10, 80)).toBeCloseTo((100 * ((10 / 60) * d80 - 0.05)) / 0.25, 9);
    expect(levelPercent('hspu', 'F', 30, 80)).toBeCloseTo((100 * ((30 / 60) * d80 - 0.3)) / 0.35, 9);
    // fine del livello F: 39 / d = 48,39 kg
    expect(levelPercent('hspu', 'F', 48.3, 80)).toBeLessThan(100);
    expect(levelPercent('hspu', 'F', 48.4, 80)).toBe(100);
  });

  it('senza zavorra non si entra, a nessun peso', () => {
    for (const bw of [40, 60, 120, 250]) expect(levelPercent('hspu', 'E', 0, bw)).toBe(0);
  });
});

describe('struttura delle regole', () => {
  it('14 catene, 5 categorie', () => {
    expect(CHAINS).toHaveLength(14);
    expect(CATEGORIES).toHaveLength(5);
  });

  it('la somma dei massimi è 1400 per categoria, 1300 per le skill; 6800 in tutto', () => {
    expect(CATEGORY_MAX).toEqual({ 'fondamentali-tirata': 1400, 'fondamentali-spinta': 1400, 'skill-tirata': 1300, 'skill-spinta': 1300, handbalance: 1400 });
    for (const c of CATEGORIES) {
      expect(chainsOf(c.id).reduce((t, ch) => t + chainMax(ch), 0), c.id).toBe(CATEGORY_MAX[c.id]);
    }
    expect(TOTAL_MAX).toBe(6800);
    expect(Object.values(CATEGORY_MAX).reduce((t, x) => t + x, 0)).toBe(TOTAL_MAX);
    // i punteggi cambiano: le app devono riscrivere i punti sul server
    expect(RULES_VERSION).toBe(2);
  });

  it('punti di ogni livello delle skill e di handbalance come nel PDF del 26/11', () => {
    const points = (id: ChainId) => CHAINS.find((c) => c.id === id)!.levels.map((l) => [l.band, l.max]);
    expect(points('front-lever')).toEqual([['intermedio', 100], ['avanzato', 45], ['avanzato', 55], ['elite', 40], ['elite', 45], ['titano', 45], ['titano', 70], ['leggenda', 120]]);
    expect(points('front-lever-touch')).toEqual([['avanzato', 55], ['avanzato', 65], ['elite', 55], ['elite', 65], ['titano', 60], ['leggenda', 80]]);
    expect(points('front-lever-pull-up')).toEqual([['avanzato', 80], ['elite', 35], ['elite', 60], ['titano', 50], ['titano', 75], ['leggenda', 100]]);
    expect(points('planche')).toEqual([['intermedio', 100], ['avanzato', 80], ['elite', 45], ['elite', 55], ['titano', 70], ['leggenda', 50], ['leggenda', 100]]);
    expect(points('planche-push-up')).toEqual([['avanzato', 100], ['elite', 60], ['elite', 75], ['titano', 80], ['leggenda', 70]]);
    expect(points('planche-press')).toEqual([['avanzato', 120], ['elite', 65], ['titano', 60], ['titano', 90], ['leggenda', 80]]);
    expect(points('hspu')).toEqual([['base', 50], ['intermedio', 50], ['avanzato', 150], ['elite', 150], ['titano', 175], ['leggenda', 180]]);
    expect(points('verticale')).toEqual([['base', 50], ['intermedio', 50], ['avanzato', 150], ['elite', 50], ['elite', 50], ['elite', 50], ['titano', 125], ['leggenda', 120]]);
  });

  it('voci delle skill: frog stand prima del tuck, victorian alle parallele in cima al front lever', () => {
    const entries = (id: ChainId) => CHAINS.find((c) => c.id === id)!.entries.map((e) => e.id);
    expect(entries('planche')).toEqual(['frog-stand', 'tuck', 'advanced-tuck', 'one-leg', 'straddle', 'full', 'maltese']);
    expect(entries('front-lever')).toEqual(['tuck', 'advanced-tuck', 'one-leg', 'straddle', 'half-lay', 'full', 'wide', 'victorian']);
    expect(CHAINS.find((c) => c.id === 'front-lever')!.entries.at(-1)!.name).toBe('Victorian alle parallele');
    expect(CHAINS.find((c) => c.id === 'planche')!.entries[0].name).toBe('Frog stand');
  });

  it('massimi delle catene (fondamentali dal ticket 30, skill e handbalance dal PDF del 26/11)', () => {
    const max = Object.fromEntries(CHAINS.map((c) => [c.id, chainMax(c)]));
    expect(max).toEqual({
      trazioni: 600,
      'muscle-up': 400,
      oap: 400,
      dip: 484,
      'panca-piana': 483,
      military: 433,
      hspu: 755,
      verticale: 645,
      'front-lever': 520,
      'front-lever-touch': 380,
      'front-lever-pull-up': 400,
      planche: 500,
      'planche-push-up': 385,
      'planche-press': 415,
    });
  });

  it('budget di ogni fascia come nel PDF: 100 fino a Intermedio, poi 300; le skill senza Base', () => {
    const budget = (id: (typeof CATEGORIES)[number]['id']) => {
      const out: Partial<Record<BandId, number>> = {};
      for (const l of chainsOf(id).flatMap((ch) => ch.levels)) out[l.band] = (out[l.band] ?? 0) + l.max;
      return out;
    };
    const six = { base: 100, intermedio: 100, avanzato: 300, elite: 300, titano: 300, leggenda: 300 };
    const five = { intermedio: 100, avanzato: 300, elite: 300, titano: 300, leggenda: 300 };
    expect(budget('fondamentali-tirata')).toEqual(six);
    expect(budget('fondamentali-spinta')).toEqual(six);
    expect(budget('handbalance')).toEqual(six);
    expect(budget('skill-tirata')).toEqual(five);
    expect(budget('skill-spinta')).toEqual(five);
  });

  it('l’ampiezza di ogni fascia è la somma dei punti dei suoi livelli', () => {
    for (const c of CATEGORIES) {
      const bands = BANDS[c.id];
      bands.forEach((band, i) => {
        const width = band.to - (i === 0 ? 0 : bands[i - 1].to);
        const sum = chainsOf(c.id)
          .flatMap((ch) => ch.levels)
          .filter((l) => l.band === band.id)
          .reduce((t, l) => t + l.max, 0);
        expect(sum, `${c.id} ${band.id}`).toBe(width);
      });
    }
  });

  it('fasce del PDF', () => {
    const ranges = (scope: keyof typeof BANDS) => BANDS[scope].map((b) => [b.from, b.to]);
    const fondamentali = [[0, 100], [101, 200], [201, 500], [501, 800], [801, 1100], [1101, 1400]];
    expect(ranges('fondamentali-tirata')).toEqual(fondamentali);
    expect(ranges('fondamentali-spinta')).toEqual(fondamentali);
    expect(ranges('handbalance')).toEqual(fondamentali);
    // le skill partono da Intermedio (PDF del 26/11)
    const skill = [[0, 100], [101, 400], [401, 700], [701, 1000], [1001, 1300]];
    expect(ranges('skill-tirata')).toEqual(skill);
    expect(ranges('skill-spinta')).toEqual(skill);
    expect(BANDS['skill-tirata'].map((b) => b.id)).toEqual(['intermedio', 'avanzato', 'elite', 'titano', 'leggenda']);
    expect(BANDS['skill-spinta'].map((b) => b.id)).toEqual(['intermedio', 'avanzato', 'elite', 'titano', 'leggenda']);
    // punteggio utente (Michael, 26/11)
    expect(ranges('complessivo')).toEqual([[0, 300], [301, 800], [801, 2300], [2301, 3800], [3801, 5300], [5301, 6800]]);
    expect(BANDS.complessivo.map((b) => b.name)).toEqual(['Base', 'Intermedio', 'Avanzato', 'Elite', 'Titano', 'Leggenda']);
    expect(BANDS.handbalance.map((b) => b.id)).toEqual(['base', 'intermedio', 'avanzato', 'elite', 'titano', 'leggenda']);
  });

  it('ogni livello è coperto da una sola voce, lettere in ordine da A', () => {
    for (const chain of CHAINS) {
      expect(chain.levels.map((l) => l.letter).join(''), chain.id).toBe('ABCDEFGH'.slice(0, chain.levels.length));
      expect(chain.entries.flatMap((e) => e.levels).join(''), chain.id).toBe('ABCDEFGH'.slice(0, chain.levels.length));
      expect(new Set(chain.entries.map((e) => e.id)).size, chain.id).toBe(chain.entries.length);
    }
  });

  it('chiede il peso solo dove la formula lo usa (30, decisione 9)', () => {
    const without = CHAINS.flatMap((c) => c.entries.filter((e) => !e.usesBodyweight).map((e) => `${c.id}/${e.id}`));
    expect(without).toEqual([
      'trazioni/australian',
      'muscle-up/ripetizioni',
      'dip/bench-dip',
      'panca-piana/push-up',
      'verticale/muro',
      'verticale/verticale',
      'verticale/oahs-5-dita',
      'verticale/oahs-3-dita',
      'verticale/oahs-1-dito',
      'verticale/oahs-straddle',
      'verticale/oahs',
    ]);
    // coerenza: una voce usa il peso se e solo se una sua formula lo usa
    for (const chain of CHAINS) {
      for (const entry of chain.entries) {
        const uses = chain.levels
          .filter((l) => entry.levels.includes(l.letter))
          .some((l) => l.formula.kind === 'window' || l.formula.kind === 'ratio' || l.formula.kind === 'oap' || l.formula.kind === 'skill' || (l.formula.kind === 'reps' && l.formula.normalized));
        expect(entry.usesBodyweight, `${chain.id}/${entry.id}`).toBe(uses);
      }
    }
  });

  it('voci a carico: zavorra o bilanciere', () => {
    const loads = CHAINS.flatMap((c) => c.entries.filter((e) => e.measure === 'kg').map((e) => `${c.id}/${e.id}:${e.load}:${e.levels.join('')}`));
    expect(loads).toEqual([
      'trazioni/zavorra:zavorra:CDEF',
      'muscle-up/zavorra:zavorra:BCDE',
      'oap/zavorra:zavorra:E',
      'dip/zavorra:zavorra:CDEF',
      'panca-piana/massimale:bilanciere:BCDEF',
      'military/massimale:bilanciere:ABCDE',
      'hspu/zavorra:zavorra:EF',
    ]);
  });
});

describe('scoreRecord', () => {
  it('chi è a un livello ha pieni tutti i livelli sotto', () => {
    // trazioni zavorrate 18 kg a 60 kg: C al 50% → A 100 + B 100 + 50
    expect(scoreRecord(rec('trazioni', 'zavorra', 18, 60))).toEqual({ points: 250, level: 'C', percent: 50 });
    // one leg front lever 5 s a 60 kg: A 100 + B 45 + metà di 55
    expect(scoreRecord(rec('front-lever', 'one-leg', 5, 60))).toEqual({ points: 172.5, level: 'C', percent: 50 });
    // OAHS full 1 s: tutta la catena sotto (50+50+150+50+50+50+125) + 10% di 120
    expect(scoreRecord(rec('verticale', 'oahs', 1))).toEqual({ points: 537, level: 'H', percent: 10 });
  });

  it('catena planche: dal frog stand in su, un valore valido in alto riempie i livelli sotto', () => {
    expect(scoreRecord(rec('planche', 'frog-stand', 5, 60))).toEqual({ points: 50, level: 'A', percent: 50 });
    expect(scoreRecord(rec('planche', 'frog-stand', 10, 60))).toEqual({ points: 100, level: 'A', percent: 100 });
    // tuck 5 s: frog stand pieno (100) + metà di 80
    expect(scoreRecord(rec('planche', 'tuck', 5, 60))).toEqual({ points: 140, level: 'B', percent: 50 });
    // basta 1 secondo di full planche: 100 + 80 + 45 + 55 + 70 = 350, più il 10% di 50
    expect(scoreRecord(rec('planche', 'full', 1, 60))).toEqual({ points: 355, level: 'F', percent: 10 });
    // maltese 1 s: 400 sotto + 10% di 100; 10 s: tutta la catena
    expect(scoreRecord(rec('planche', 'maltese', 1, 60))).toEqual({ points: 410, level: 'G', percent: 10 });
    expect(scoreRecord(rec('planche', 'maltese', 10, 60))).toEqual({ points: 500, level: 'G', percent: 100 });
  });

  it('i punti non si ereditano tra catene diverse', () => {
    const maltese = rec('planche', 'maltese', 10, 60);
    expect(scoreChain('planche', [maltese]).points).toBe(500);
    expect(scoreChain('planche-push-up', [maltese]).points).toBe(0);
    expect(scoreChain('planche-press', [maltese]).points).toBe(0);
    expect(scoreCategory('skill-spinta', [maltese]).points).toBe(500);
    const victorian = rec('front-lever', 'victorian', 10, 60);
    expect(scoreCategory('skill-tirata', [victorian]).chains.map((c) => c.points)).toEqual([520, 0, 0]);
  });

  it('catene delle skill tirata: punti dei livelli sotto pieni', () => {
    // full front lever 10 s: 100 + 45 + 55 + 40 + 45 + 45
    expect(scoreRecord(rec('front-lever', 'full', 10, 60))).toEqual({ points: 330, level: 'F', percent: 100 });
    // full front lever touch 5 s: 55 + 65 + 55 + 65 + metà di 60
    expect(scoreRecord(rec('front-lever-touch', 'full', 5, 60))).toEqual({ points: 270, level: 'E', percent: 50 });
    // one leg front lever pull ups 5 rip.: 80 + 35
    expect(scoreRecord(rec('front-lever-pull-up', 'one-leg', 5, 60))).toEqual({ points: 115, level: 'B', percent: 100 });
    // one leg planche press 3 rip.: 120 + 65 + 60; straddle push ups 5 rip.: 100 + 60 + 75 + 80
    expect(scoreRecord(rec('planche-press', 'one-leg', 3, 60))).toEqual({ points: 245, level: 'C', percent: 100 });
    expect(scoreRecord(rec('planche-push-up', 'straddle', 5, 60))).toEqual({ points: 315, level: 'D', percent: 100 });
  });

  it('una voce che copre più livelli prende il più alto raggiunto', () => {
    expect(scoreRecord(rec('trazioni', 'zavorra', 27, 60))).toEqual({ points: 301, level: 'D', percent: 1 });
    expect(scoreRecord(rec('trazioni', 'zavorra', 78, 60))).toEqual({ points: 600, level: 'F', percent: 100 });
    expect(scoreRecord(rec('military', 'massimale', 81, 60))).toEqual({ points: 433, level: 'E', percent: 100 });
  });

  it('verticale a 15 s: B al 100% e C all’1% (30, interpretazione 2)', () => {
    expect(scoreRecord(rec('verticale', 'verticale', 14))!.level).toBe('B');
    expect(scoreRecord(rec('verticale', 'verticale', 15))).toEqual({ points: 50 + 50 + 1.5, level: 'C', percent: 1 });
    expect(scoreRecord(rec('verticale', 'verticale', 60))).toEqual({ points: 250, level: 'C', percent: 100 });
  });

  it('un record valido può non raggiungere nessun livello', () => {
    expect(scoreRecord(rec('trazioni', 'zavorra', 5, 60))).toEqual({ points: 0, level: null, percent: 0 });
    expect(scoreRecord(rec('oap', 'zavorra', 2, 60))).toEqual({ points: 0, level: null, percent: 0 });
    // zavorra 0 non è un record valido
    expect(scoreRecord(rec('trazioni', 'zavorra', 0, 60))).toBeNull();
  });

  it('la panca entra nel livello B solo dal 35% del peso (a 60 kg: 21 kg)', () => {
    expect(scoreRecord(rec('panca-piana', 'massimale', 10, 60))).toEqual({ points: 0, level: null, percent: 0 });
    const s = scoreRecord(rec('panca-piana', 'massimale', 21, 60))!;
    expect(s.level).toBe('B');
    expect(s.points).toBeCloseTo(50 + 0.33, 9);
    expect(scoreRecord(rec('military', 'massimale', 10, 60))).toEqual({ points: 0, level: null, percent: 0 });
  });

  it('il peso corporeo è ignorato dalle voci che non lo usano', () => {
    expect(scoreRecord(rec('trazioni', 'australian', 15))).toEqual({ points: 100, level: 'A', percent: 100 });
    expect(scoreRecord(rec('trazioni', 'australian', 15, 999))).toEqual({ points: 100, level: 'A', percent: 100 });
  });

  it('record non valido → null', () => {
    expect(scoreRecord(rec('trazioni', 'zavorra', 20))).toBeNull(); // peso mancante
    expect(scoreRecord(rec('trazioni', 'zavorra', 20, 29))).toBeNull();
    expect(scoreRecord(rec('trazioni', 'ripetizioni', 51, 60))).toBeNull();
    expect(scoreRecord(rec('trazioni', 'ripetizioni', 2.5, 60))).toBeNull();
    expect(scoreRecord(rec('trazioni', 'inesistente', 2, 60))).toBeNull();
    expect(scoreRecord({ chainId: 'inesistente', entry: 'x', value: 1 })).toBeNull();
    // front lever touch e pull ups in tuck non esistono più (30, decisione 8)
    expect(scoreRecord(rec('front-lever-touch', 'tuck', 5, 60))).toBeNull();
    expect(scoreRecord(rec('front-lever-pull-up', 'tuck', 5, 60))).toBeNull();
    // half lay e wide planche tolte (30, decisione 7)
    expect(scoreRecord(rec('planche', 'half-lay', 5, 60))).toBeNull();
  });
});

describe('scoreChain', () => {
  it('senza record vale 0', () => {
    expect(scoreChain('trazioni', [])).toEqual({ chainId: 'trazioni', points: 0, exact: 0, max: 600, level: null, percent: 0, best: null });
  });

  it('conta il migliore di sempre: il record non regredisce', () => {
    const top = rec('trazioni', 'zavorra', 30, 60);
    const records = [rec('trazioni', 'ripetizioni', 8, 60), top, rec('trazioni', 'zavorra', 10, 60), rec('trazioni', 'australian', 3)];
    const s = scoreChain('trazioni', records);
    expect(s.best).toBe(top);
    expect(s.level).toBe('D');
    expect(s.points).toBe(317); // 300 + 100 × 3/18 = 316,67
    // aggiungere un record peggiore non cambia nulla
    expect(scoreChain('trazioni', [...records, rec('trazioni', 'zavorra', 12, 60)]).points).toBe(317);
  });

  it('ognuno col proprio peso corporeo', () => {
    // stessi 30 kg di zavorra: a 60 kg G = 90, a 90 kg G = 120 × (60/90)^0,83 = 85,7
    const light = rec('trazioni', 'zavorra', 30, 60);
    const heavy = rec('trazioni', 'zavorra', 30, 90);
    expect(scoreChain('trazioni', [heavy, light]).best).toBe(light);
    expect(scoreChain('trazioni', [heavy]).level).toBe('C');
  });

  it('ignora i record di altre catene e quelli non validi', () => {
    const s = scoreChain('dip', [rec('trazioni', 'zavorra', 30, 60), rec('dip', 'zavorra', 30), rec('dip', 'bench-dip', 10)]);
    expect(s.points).toBe(25);
    expect(s.level).toBe('A');
  });

  it('arrotonda i punti della catena all’intero più vicino, non i calcoli intermedi', () => {
    // dip a ripetizioni, 34 punti: 7 rip. a 60 kg = 46,67% → 50 + 15,87 = 65,87 → 66
    const a = scoreChain('dip', [rec('dip', 'ripetizioni', 7, 60)]);
    expect(a.exact).toBeCloseTo(50 + (34 * 7) / 15, 9);
    expect(a.points).toBe(66);
    // 4 rip. = 26,67% → 59,07 → 59
    expect(scoreChain('dip', [rec('dip', 'ripetizioni', 4, 60)]).points).toBe(59);
    // metà esatta: verticale 15 s = 101,5 → 102
    expect(scoreChain('verticale', [rec('verticale', 'verticale', 15)]).points).toBe(102);
    // australian 1 rip. = 6,67 → 7; 2 rip. = 13,33 → 13
    expect(scoreChain('trazioni', [rec('trazioni', 'australian', 1)]).points).toBe(7);
    expect(scoreChain('trazioni', [rec('trazioni', 'australian', 2)]).points).toBe(13);
    // la % del livello resta non arrotondata
    expect(scoreChain('trazioni', [rec('trazioni', 'australian', 1)]).percent).toBeCloseTo(100 / 15, 9);
  });

  it('catena completa = massimo', () => {
    for (const chain of CHAINS) {
      const top = chain.entries[chain.entries.length - 1];
      const value = top.measure === 'kg' ? 400 : top.measure === 'reps' ? 50 : 60;
      const s = scoreChain(chain.id, [rec(chain.id, top.id, value, 60)]);
      expect(s.points, chain.id).toBe(chainMax(chain));
      expect(s.percent, chain.id).toBe(100);
    }
  });
});

describe('fasce e percentuale nella fascia', () => {
  it('bordi delle fasce', () => {
    const at = (p: number) => {
      const b = bandPosition('fondamentali-tirata', p);
      return [b.band, b.percent] as [BandId, number];
    };
    expect(at(0)).toEqual(['base', 0]);
    expect(at(50)).toEqual(['base', 50]);
    expect(at(100)).toEqual(['base', 100]);
    expect(at(101)).toEqual(['intermedio', 1]);
    expect(at(200)).toEqual(['intermedio', 100]);
    expect(at(201)).toEqual(['avanzato', 0]); // 1/300 = 0,33% → per difetto
    expect(at(350)).toEqual(['avanzato', 50]);
    expect(at(500)).toEqual(['avanzato', 100]);
    expect(at(501)).toEqual(['elite', 0]);
    expect(at(1099)).toEqual(['titano', 99]); // 299/300 non è ancora 100%
    expect(at(1100)).toEqual(['titano', 100]);
    expect(at(1101)).toEqual(['leggenda', 0]);
    expect(at(1400)).toEqual(['leggenda', 100]);
  });

  it('le skill partono da Intermedio: 0–100, poi 300 punti per fascia fino a 1300', () => {
    for (const id of ['skill-tirata', 'skill-spinta'] as const) {
      expect(bandPosition(id, 0)).toMatchObject({ band: 'intermedio', name: 'Intermedio', percent: 0, start: 0, end: 100 });
      expect(bandPosition(id, 50)).toMatchObject({ band: 'intermedio', percent: 50 });
      expect(bandPosition(id, 100)).toMatchObject({ band: 'intermedio', percent: 100 });
      expect(bandPosition(id, 101)).toMatchObject({ band: 'avanzato', percent: 0, start: 100, end: 400 });
      expect(bandPosition(id, 250)).toMatchObject({ band: 'avanzato', percent: 50 });
      expect(bandPosition(id, 400)).toMatchObject({ band: 'avanzato', percent: 100 });
      expect(bandPosition(id, 401)).toMatchObject({ band: 'elite', start: 400, end: 700 });
      expect(bandPosition(id, 700)).toMatchObject({ band: 'elite', percent: 100 });
      expect(bandPosition(id, 701)).toMatchObject({ band: 'titano', start: 700, end: 1000 });
      expect(bandPosition(id, 1000)).toMatchObject({ band: 'titano', percent: 100 });
      expect(bandPosition(id, 1001)).toMatchObject({ band: 'leggenda', start: 1000, end: 1300 });
      expect(bandPosition(id, 1300)).toMatchObject({ band: 'leggenda', percent: 100 });
    }
  });

  it('fasce del complessivo (Michael, 26/11)', () => {
    expect(bandPosition('complessivo', 0)).toMatchObject({ band: 'base', percent: 0 });
    expect(bandPosition('complessivo', 300)).toMatchObject({ band: 'base', name: 'Base', percent: 100 });
    expect(bandPosition('complessivo', 301)).toMatchObject({ band: 'intermedio', percent: 0 });
    expect(bandPosition('complessivo', 800)).toMatchObject({ band: 'intermedio', percent: 100 });
    expect(bandPosition('complessivo', 801)).toMatchObject({ band: 'avanzato', start: 800, end: 2300 });
    expect(bandPosition('complessivo', 1550)).toMatchObject({ band: 'avanzato', name: 'Avanzato', percent: 50 });
    expect(bandPosition('complessivo', 2300)).toMatchObject({ band: 'avanzato', percent: 100 });
    expect(bandPosition('complessivo', 2301)).toMatchObject({ band: 'elite', start: 2300, end: 3800 });
    expect(bandPosition('complessivo', 3801)).toMatchObject({ band: 'titano', start: 3800, end: 5300 });
    expect(bandPosition('complessivo', 5301)).toMatchObject({ band: 'leggenda', start: 5300, end: 6800 });
    expect(bandPosition('complessivo', 6800)).toMatchObject({ band: 'leggenda', percent: 100 });
  });
});

describe('scoreCategory e levelSummary', () => {
  const records = [
    rec('trazioni', 'zavorra', 18, 60), // 250
    rec('muscle-up', 'ripetizioni', 3), // 30
    rec('oap', 'avambraccio', 3, 60), // 50
    rec('dip', 'ripetizioni', 7, 60), // 66
    rec('planche', 'tuck', 10, 60), // frog stand 100 + tuck 80 = 180
    rec('verticale', 'verticale', 15), // 102
  ];

  it('categoria = somma delle catene arrotondate', () => {
    const c = scoreCategory('fondamentali-tirata', records);
    expect(c.chains.map((ch) => ch.points)).toEqual([250, 30, 50]);
    expect(c.points).toBe(330);
    expect(c.max).toBe(1400);
    expect(c).toMatchObject({ band: 'avanzato', name: 'Avanzato', percent: 43, start: 200, end: 500 });
  });

  it('riepilogo: 5 categorie e complessivo come somma', () => {
    const s = levelSummary(records);
    expect(s.categories.map((c) => c.categoryId)).toEqual(['fondamentali-tirata', 'fondamentali-spinta', 'skill-tirata', 'skill-spinta', 'handbalance']);
    expect(s.categories.map((c) => c.points)).toEqual([330, 66, 0, 180, 102]);
    // skill tirata a 0 punti è Intermedio 0%; skill spinta 180 è Avanzato (101–400)
    expect(s.categories.map((c) => c.band)).toEqual(['avanzato', 'base', 'intermedio', 'avanzato', 'intermedio']);
    expect(s.categories.map((c) => c.max)).toEqual([1400, 1400, 1300, 1300, 1400]);
    expect(s.total).toBe(678);
    expect(s.max).toBe(6800);
    // (678 − 300) / 500 = 75,6%
    expect(s).toMatchObject({ band: 'intermedio', percent: 75, start: 300, end: 800 });
  });

  it('senza record: tutto a 0, Base (le skill Intermedio 0%: non hanno Base)', () => {
    const s = levelSummary([]);
    expect(s.total).toBe(0);
    expect(s).toMatchObject({ band: 'base', percent: 0 });
    expect(s.categories.every((c) => c.points === 0 && c.percent === 0)).toBe(true);
    expect(s.categories.map((c) => c.band)).toEqual(['base', 'base', 'intermedio', 'intermedio', 'base']);
  });

  it('tutto al massimo: 1400 per categoria (1300 le skill), 6800 in totale, Leggenda 100%', () => {
    const all = CHAINS.map((chain) => {
      const top = chain.entries[chain.entries.length - 1];
      return rec(chain.id, top.id, top.measure === 'kg' ? 400 : top.measure === 'reps' ? 50 : 60, 60);
    });
    const s = levelSummary(all);
    expect(s.categories.map((c) => c.points)).toEqual([1400, 1400, 1300, 1300, 1400]);
    expect(s.categories.every((c) => c.band === 'leggenda' && c.percent === 100)).toBe(true);
    expect(s.total).toBe(6800);
    expect(s).toMatchObject({ band: 'leggenda', percent: 100 });
  });
});

describe('availableEntries', () => {
  const ids = (chainId: ChainId, records: LevelRecord[]) => availableEntries(chainId, records).map((o) => o.entryId);

  it('senza record ci sono tutte le voci, coi limiti del campo', () => {
    expect(availableEntries('trazioni', [])).toEqual([
      { entryId: 'australian', name: 'Australian pull up', measure: 'reps', levels: ['A'], usesBodyweight: false, min: 1, max: 50, minExclusive: false, whole: true },
      { entryId: 'ripetizioni', name: 'Trazioni a ripetizioni', measure: 'reps', levels: ['B'], usesBodyweight: true, min: 1, max: 50, minExclusive: false, whole: true },
      { entryId: 'zavorra', name: 'Trazioni zavorrate', measure: 'kg', load: 'zavorra', levels: ['C', 'D', 'E', 'F'], usesBodyweight: true, min: 0, max: 400, minExclusive: true, whole: false },
    ]);
    expect(availableEntries('military', [])[0]).toMatchObject({ entryId: 'massimale', load: 'bilanciere', min: 0, minExclusive: true, max: 400 });
    expect(availableEntries('verticale', [])[0]).toMatchObject({ entryId: 'muro', measure: 'seconds', min: 1, max: 60, whole: true });
  });

  it('una voce sparisce quando i suoi livelli sono pieni', () => {
    expect(ids('trazioni', [rec('trazioni', 'australian', 14)])).toEqual(['australian', 'ripetizioni', 'zavorra']);
    expect(ids('trazioni', [rec('trazioni', 'australian', 15)])).toEqual(['ripetizioni', 'zavorra']);
  });

  it('anche se li ha riempiti un record più alto', () => {
    expect(ids('trazioni', [rec('trazioni', 'ripetizioni', 1, 60)])).toEqual(['ripetizioni', 'zavorra']);
    expect(ids('trazioni', [rec('trazioni', 'zavorra', 9, 60)])).toEqual(['zavorra']);
    expect(ids('oap', [rec('oap', 'spalla', 1, 60)])).toEqual(['spalla', 'ripetizioni', 'zavorra']);
  });

  it('una voce a più livelli resta finché l’ultimo non è pieno', () => {
    expect(ids('trazioni', [rec('trazioni', 'zavorra', 77, 60)])).toEqual(['zavorra']);
    expect(ids('trazioni', [rec('trazioni', 'zavorra', 78, 60)])).toEqual([]);
    expect(ids('verticale', [rec('verticale', 'verticale', 59)])).toContain('verticale');
    expect(ids('verticale', [rec('verticale', 'verticale', 60)])).toEqual(['oahs-5-dita', 'oahs-3-dita', 'oahs-1-dito', 'oahs-straddle', 'oahs']);
  });
});

describe('validazione', () => {
  it('peso corporeo 30–250 kg', () => {
    expect(validateBodyweight(30)).toBe(true);
    expect(validateBodyweight(250)).toBe(true);
    expect(validateBodyweight(29.9)).toBe(false);
    expect(validateBodyweight(250.1)).toBe(false);
    expect(validateBodyweight(Number.NaN)).toBe(false);
    expect(validateRecord(rec('trazioni', 'ripetizioni', 5, 29))).toBe('bodyweight-out-of-range');
    expect(validateRecord(rec('trazioni', 'ripetizioni', 5, 251))).toBe('bodyweight-out-of-range');
    expect(validateRecord(rec('trazioni', 'ripetizioni', 5))).toBe('bodyweight-missing');
    expect(validateRecord(rec('trazioni', 'ripetizioni', 5, null))).toBe('bodyweight-missing');
    expect(validateRecord(rec('trazioni', 'ripetizioni', 5, 30))).toBeNull();
  });

  it('il peso non si chiede alle voci che non lo usano', () => {
    expect(validateRecord(rec('trazioni', 'australian', 5))).toBeNull();
    expect(validateRecord(rec('verticale', 'oahs', 5))).toBeNull();
    expect(validateRecord(rec('muscle-up', 'ripetizioni', 5, 10))).toBeNull();
  });

  it('ripetizioni intere 1–50', () => {
    expect(validateRecord(rec('trazioni', 'australian', 0))).toBe('below-min');
    expect(validateRecord(rec('trazioni', 'australian', 1))).toBeNull();
    expect(validateRecord(rec('trazioni', 'australian', 50))).toBeNull();
    expect(validateRecord(rec('trazioni', 'australian', 51))).toBe('above-max');
    expect(validateRecord(rec('trazioni', 'australian', 2.5))).toBe('not-integer');
    expect(validateRecord(rec('trazioni', 'australian', Number.NaN))).toBe('not-a-number');
  });

  it('secondi interi 1–60', () => {
    expect(validateRecord(rec('verticale', 'muro', 0))).toBe('below-min');
    expect(validateRecord(rec('verticale', 'muro', 60))).toBeNull();
    expect(validateRecord(rec('verticale', 'muro', 61))).toBe('above-max');
    expect(validateRecord(rec('front-lever', 'full', 7.5, 80))).toBe('not-integer');
  });

  it('zavorra e massimale > 0 e ≤ 400', () => {
    expect(validateRecord(rec('trazioni', 'zavorra', -1, 60))).toBe('below-min');
    expect(validateRecord(rec('trazioni', 'zavorra', 0, 60))).toBe('below-min');
    expect(validateRecord(rec('trazioni', 'zavorra', 0.5, 60))).toBeNull();
    expect(validateRecord(rec('trazioni', 'zavorra', 12.5, 60))).toBeNull();
    expect(validateRecord(rec('panca-piana', 'massimale', 0, 60))).toBe('below-min');
    expect(validateRecord(rec('panca-piana', 'massimale', 0.5, 60))).toBeNull();
    expect(validateRecord(rec('panca-piana', 'massimale', 400, 60))).toBeNull();
    expect(validateRecord(rec('panca-piana', 'massimale', 400.5, 60))).toBe('above-max');
    expect(validateRecord(rec('military', 'massimale', 401, 60))).toBe('above-max');
  });

  it('catena o voce sconosciute', () => {
    expect(validateRecord({ chainId: 'inesistente', entry: 'x', value: 1 })).toBe('unknown-chain');
    expect(validateRecord(rec('planche', 'wide', 5, 60))).toBe('unknown-entry');
    // il frog stand è l'unica voce nuova (PDF del 26/11): secondi, col peso corporeo
    expect(validateRecord(rec('planche', 'frog-stand', 5, 60))).toBeNull();
    expect(validateRecord(rec('planche', 'frog-stand', 5))).toBe('bodyweight-missing');
    expect(validateRecord(rec('planche', 'frog-stand', 61, 60))).toBe('above-max');
  });

  it('con i record: una voce già piena non si inserisce più', () => {
    const records = [rec('trazioni', 'zavorra', 9, 60)];
    expect(validateRecord(rec('trazioni', 'australian', 15), records)).toBe('entry-complete');
    expect(validateRecord(rec('trazioni', 'zavorra', 20, 60), records)).toBeNull();
    // senza i record (correzione dello storico) passa
    expect(validateRecord(rec('trazioni', 'australian', 15))).toBeNull();
  });

  it('limiti delle voci per il database', () => {
    const limits = stageLimits();
    expect(limits).toHaveLength(CHAINS.reduce((t, c) => t + c.entries.length, 0));
    expect(limits).toHaveLength(65);
    expect(limits.find((l) => l.chainId === 'planche' && l.entry === 'frog-stand')).toEqual({ chainId: 'planche', entry: 'frog-stand', min: 1, max: 60, minExclusive: false, whole: true, usesBodyweight: true });
    expect(limits[2]).toEqual({ chainId: 'trazioni', entry: 'zavorra', min: 0, max: 400, minExclusive: true, whole: false, usesBodyweight: true });
    expect(LIMITS).toEqual({ minBodyweightKg: 30, maxBodyweightKg: 250, minReps: 1, maxReps: 50, minSeconds: 1, maxSeconds: 60, maxLoadKg: 400 });
  });
});
