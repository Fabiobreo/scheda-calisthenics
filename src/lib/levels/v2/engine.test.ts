import { describe, expect, it } from 'vitest';
import {
  BANDS,
  CATEGORIES,
  CHAINS,
  ESP_SKILL_RIPETIZIONI,
  ESP_SKILL_SECONDI,
  EXPONENTS,
  LIMITS,
  REF_KG,
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
  // HSPU
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
  // FRONT LEVER TOUCH (T = 10, full T = 5)
  ['front-lever-touch', 'A', 1, 10, 10],
  ['front-lever-touch', 'B', 1, 10, 10],
  ['front-lever-touch', 'C', 1, 10, 10],
  ['front-lever-touch', 'D', 1, 10, 10],
  ['front-lever-touch', 'E', 1, 20, 5],
  ['front-lever-touch', 'F', 1, 10, 10],
  // FRONT LEVER PULL UPS (T = 5)
  ...(['A', 'B', 'C', 'D', 'E', 'F'] as const).map((l): [ChainId, Letter, number, number, number] => ['front-lever-pull-up', l, 1, 20, 5]),
  // PLANCHE (T = 10), PUSH UPS (T = 5), PRESS (T = 3)
  ...(['A', 'B', 'C', 'D', 'E', 'F'] as const).map((l): [ChainId, Letter, number, number, number] => ['planche', l, 1, 10, 10]),
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

  it('full front lever touch con T = 5', () => {
    expect(levelPercent('front-lever-touch', 'E', 5, 60)).toBe(100);
    expect(levelPercent('front-lever-touch', 'D', 5, 60)).toBe(50);
  });
});

describe('struttura delle regole', () => {
  it('14 catene, 5 categorie', () => {
    expect(CHAINS).toHaveLength(14);
    expect(CATEGORIES).toHaveLength(5);
  });

  it('la somma dei massimi è 1400 per categoria', () => {
    for (const c of CATEGORIES) {
      expect(chainsOf(c.id).reduce((t, ch) => t + chainMax(ch), 0), c.id).toBe(1400);
    }
  });

  it('massimi delle catene come nel ticket 30', () => {
    const max = Object.fromEntries(CHAINS.map((c) => [c.id, chainMax(c)]));
    expect(max).toEqual({
      trazioni: 600,
      'muscle-up': 400,
      oap: 400,
      dip: 484,
      'panca-piana': 483,
      military: 433,
      hspu: 700,
      verticale: 700,
      'front-lever': 800,
      'front-lever-touch': 300,
      'front-lever-pull-up': 300,
      planche: 534,
      'planche-push-up': 433,
      'planche-press': 433,
    });
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
    expect(ranges('skill-tirata')).toEqual([[0, 200], [201, 500], [501, 666], [667, 800], [801, 1100], [1101, 1400]]);
    expect(ranges('skill-spinta')).toEqual([[0, 100], [101, 500], [501, 684], [685, 850], [851, 1100], [1101, 1400]]);
    expect(ranges('complessivo')).toEqual([[0, 300], [301, 800], [801, 2500], [2501, 4000], [4001, 5500], [5501, 7000]]);
    expect(BANDS.complessivo.map((b) => b.name)).toEqual(['Base', 'Intermedio', 'Avanzato', 'Elite', 'Titano', 'Leggenda']);
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
          .some((l) => l.formula.kind === 'window' || l.formula.kind === 'oap' || l.formula.kind === 'skill' || (l.formula.kind === 'reps' && l.formula.normalized));
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
    // one leg front lever 5 s a 60 kg: A 200 + B 150 + 75
    expect(scoreRecord(rec('front-lever', 'one-leg', 5, 60))).toEqual({ points: 425, level: 'C', percent: 50 });
    // OAHS 1 s: tutta la catena sotto (50+50+150+50+50+50+150) + 15
    expect(scoreRecord(rec('verticale', 'oahs', 1))).toEqual({ points: 565, level: 'H', percent: 10 });
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

  it('ogni categoria usa le proprie fasce', () => {
    expect(bandPosition('skill-tirata', 200)).toMatchObject({ band: 'base', percent: 100, start: 0, end: 200 });
    expect(bandPosition('skill-tirata', 583)).toMatchObject({ band: 'avanzato', percent: 50, start: 500, end: 666 });
    expect(bandPosition('skill-tirata', 667)).toMatchObject({ band: 'elite', start: 666, end: 800 });
    expect(bandPosition('skill-spinta', 300)).toMatchObject({ band: 'intermedio', percent: 50, start: 100, end: 500 });
    expect(bandPosition('skill-spinta', 685)).toMatchObject({ band: 'elite', start: 684, end: 850 });
    expect(bandPosition('skill-spinta', 850)).toMatchObject({ band: 'elite', percent: 100 });
  });

  it('fasce del complessivo', () => {
    expect(bandPosition('complessivo', 300)).toMatchObject({ band: 'base', name: 'Base', percent: 100 });
    expect(bandPosition('complessivo', 301)).toMatchObject({ band: 'intermedio', percent: 0 });
    expect(bandPosition('complessivo', 1650)).toMatchObject({ band: 'avanzato', name: 'Avanzato', percent: 50 });
    expect(bandPosition('complessivo', 7000)).toMatchObject({ band: 'leggenda', percent: 100 });
  });
});

describe('scoreCategory e levelSummary', () => {
  const records = [
    rec('trazioni', 'zavorra', 18, 60), // 250
    rec('muscle-up', 'ripetizioni', 3), // 30
    rec('oap', 'avambraccio', 3, 60), // 50
    rec('dip', 'ripetizioni', 7, 60), // 66
    rec('planche', 'tuck', 10, 60), // 100
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
    expect(s.categories.map((c) => c.points)).toEqual([330, 66, 0, 100, 102]);
    expect(s.categories.map((c) => c.band)).toEqual(['avanzato', 'base', 'base', 'base', 'intermedio']);
    expect(s.total).toBe(598);
    expect(s.max).toBe(7000);
    expect(s).toMatchObject({ band: 'intermedio', percent: 59, start: 300, end: 800 });
  });

  it('senza record: tutto Base a 0', () => {
    const s = levelSummary([]);
    expect(s.total).toBe(0);
    expect(s).toMatchObject({ band: 'base', percent: 0 });
    expect(s.categories.every((c) => c.points === 0 && c.band === 'base')).toBe(true);
  });

  it('tutto al massimo: 1400 per categoria, 7000 in totale, Leggenda 100%', () => {
    const all = CHAINS.map((chain) => {
      const top = chain.entries[chain.entries.length - 1];
      return rec(chain.id, top.id, top.measure === 'kg' ? 400 : top.measure === 'reps' ? 50 : 60, 60);
    });
    const s = levelSummary(all);
    expect(s.categories.map((c) => c.points)).toEqual([1400, 1400, 1400, 1400, 1400]);
    expect(s.total).toBe(7000);
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
    expect(limits).toHaveLength(64);
    expect(limits[2]).toEqual({ chainId: 'trazioni', entry: 'zavorra', min: 0, max: 400, minExclusive: true, whole: false, usesBodyweight: true });
    expect(LIMITS).toEqual({ minBodyweightKg: 30, maxBodyweightKg: 250, minReps: 1, maxReps: 50, minSeconds: 1, maxSeconds: 60, maxLoadKg: 400 });
  });
});
