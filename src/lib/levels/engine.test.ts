import { describe, expect, it } from 'vitest';
import {
  availableOptions,
  avatarStage,
  baseMax,
  CATEGORIES,
  eliteMax,
  levelSummary,
  overallLevel,
  scoreCategory,
  scoreRecord,
  scoreSub,
  subsOf,
  suggestNext,
  SUBS,
  validateRecord,
  type LevelRecord,
  type SubId,
} from '.';

const PC = 75;
const rec = (subId: SubId, stage: string, value: number, bodyweightKg: number | null = PC): LevelRecord => ({ subId, stage, value, bodyweightKg });
/** Punteggio di un solo record come sotto-esercizio. */
const one = (subId: SubId, stage: string, value: number, bw: number | null = PC) => scoreSub(subId, [rec(subId, stage, value, bw)]);

describe('regole: coerenza dei dati', () => {
  it('ogni categoria vale 100 in base e 100 in elite', () => {
    for (const c of CATEGORIES) {
      const subs = subsOf(c.id);
      expect(subs.reduce((t, s) => t + baseMax(s), 0), c.id).toBe(100);
      expect(subs.reduce((t, s) => t + eliteMax(s), 0), c.id).toBe(100);
    }
  });

  it('14 sotto-esercizi con id unici, progressioni uniche per sotto-esercizio', () => {
    expect(SUBS).toHaveLength(14);
    expect(new Set(SUBS.map((s) => s.id)).size).toBe(14);
    for (const s of SUBS) expect(new Set(s.stages.map((x) => x.id)).size, s.id).toBe(s.stages.length);
  });

  it('il massimo di ogni tabella è il massimo della sua fase', () => {
    for (const sub of SUBS) {
      for (const stage of sub.stages) {
        if (stage.kind !== 'table') continue;
        const last = stage.segments[stage.segments.length - 1];
        const to = 'values' in last ? last.from + last.values.length - 1 : last.to;
        const pts = scoreRecord(rec(sub.id, stage.id, to))!.points;
        // ogni progressione finisce al più al massimo della sua fase, e la Full / l'ultima fase esattamente lì
        const phaseEnd = sub.phases.slice(0, last.phase + 1).reduce((t, p) => t + p.max, 0);
        expect(pts, `${sub.id}/${stage.id}`).toBeLessThanOrEqual(phaseEnd + 1e-9);
      }
    }
    expect(one('planche', 'full', 10).points).toBe(50);
    expect(one('planche', 'maltese', 10).points).toBe(100);
    expect(one('front-lever', 'victorian', 10).points).toBe(100);
    expect(one('planche-push-up', 'full', 10).points).toBe(50);
    expect(one('planche-press', 'full', 5).points).toBe(50);
    expect(one('front-lever-pull-up', 'wide', 10).points).toBe(50);
    expect(one('oap', 'oap', 10).points).toBe(66);
    expect(one('hspu', 'libera', 10).points).toBe(40);
  });

  it('i valori di una tabella non scendono mai salendo di ripetizioni o secondi', () => {
    for (const sub of SUBS) {
      for (const stage of sub.stages) {
        if (stage.kind !== 'table') continue;
        let prev = -Infinity;
        const max = Math.max(...stage.segments.map((s) => ('values' in s ? s.from + s.values.length - 1 : s.to)));
        for (let v = 1; v <= max; v++) {
          const s = scoreRecord(rec(sub.id, stage.id, v));
          if (!s) continue;
          expect(s.points, `${sub.id}/${stage.id}/${v}`).toBeGreaterThan(prev);
          prev = s.points;
        }
      }
    }
  });
});

describe('casi di prova del ticket 05 (PC 75 kg)', () => {
  const cases: [string, SubId, string, number, number, 'base' | 'elite', number][] = [
    // descrizione, sotto-esercizio, progressione, valore, punti, zona, % mostrata
    ['Trazioni, zavorra 0', 'trazioni', 'zavorra', 0, 0, 'base', 0],
    ['Trazioni, zavorra 30 kg', 'trazioni', 'zavorra', 30, 13.6, 'base', 40],
    ['Trazioni, zavorra 75 kg', 'trazioni', 'zavorra', 75, 34, 'base', 100],
    ['Trazioni, zavorra 90 kg', 'trazioni', 'zavorra', 90, 34 + (34 * 15) / 22.5, 'elite', 66],
    ['Muscle up, zavorra 10 kg', 'muscle-up', 'zavorra', 10, 13.2, 'base', 40],
    ['Muscle up, zavorra 50 kg', 'muscle-up', 'zavorra', 50, 66, 'elite', 100],
    ['OAP assistito gomito, 5 rip.', 'oap', 'gomito', 5, 8.25, 'base', 25],
    ['OAP assistito spalla, 3 rip.', 'oap', 'spalla', 3, 21.45, 'base', 65],
    ['OAP, 2 rip.', 'oap', 'oap', 2, 33, 'base', 100],
    ['OAP elite, 6 rip.', 'oap', 'oap', 6, 49, 'elite', 48],
    ['Dip, zavorra 75 kg', 'dip', 'zavorra', 75, 34, 'base', 100],
    ['Military 60 kg', 'military', 'bilanciere', 60, 26.4, 'base', 80],
    ['Panca piana 100 kg', 'panca-piana', 'bilanciere', 100, 27.5, 'base', 83],
    ['Panca piana 150 kg', 'panca-piana', 'bilanciere', 150, 55, 'elite', 66],
    ['Straddle planche 5 s', 'planche', 'straddle', 5, 32.5, 'base', 65],
    ['Full planche 10 s', 'planche', 'full', 10, 50, 'base', 100],
    ['Wide planche 4 s', 'planche', 'wide', 4, 59, 'elite', 18],
    ['Maltese 3 s', 'planche', 'maltese', 3, 82, 'elite', 64],
    ['Planche press Full, 3 rip.', 'planche-press', 'full', 3, 37, 'elite', 48],
    ['Front lever touch Full 4 s', 'front-lever-touch', 'full', 4, 25, 'base', 100],
    ['Wide front lever touch 5 s', 'front-lever-touch', 'wide', 5, 36, 'elite', 44],
    ['Verticale 60 s', 'verticale', 'verticale', 60, 30, 'base', 50],
    ['Verticale straddle mono braccio 4 s', 'verticale', 'straddle-mono-braccio', 4, 72, 'elite', 20],
    ['Verticale full mono braccio 10 s', 'verticale', 'full-mono-braccio', 10, 120, 'elite', 100],
    ['HSPU 6 rip.', 'hspu', 'libera', 6, 24, 'base', 60],
    ['HSPU elite, zavorra 20 kg', 'hspu', 'zavorra', 20, 40 + (40 * 20) / 37.5, 'elite', 53],
  ];

  it.each(cases)('%s', (_, subId, stage, value, points, zone, percent) => {
    const s = one(subId, stage, value);
    expect(s.points).toBeCloseTo(points, 9);
    expect(s.zone).toBe(zone);
    expect(s.percent).toBe(percent);
  });

  it('a 100% esatto si sblocca l’ELITE allo 0%', () => {
    for (const s of [one('trazioni', 'zavorra', 75), one('oap', 'oap', 2), one('dip', 'zavorra', 75), one('planche', 'full', 10), one('front-lever-touch', 'full', 4)]) {
      expect(s).toMatchObject({ basePercent: 100, elitePercent: 0, unlocked: true, phase: 1, zone: 'base' });
    }
    expect(one('trazioni', 'zavorra', 74.9)).toMatchObject({ basePercent: 99, unlocked: false, phase: 0 });
  });

  it('il peso che sale dopo non cambia un record vecchio (peso del giorno del record)', () => {
    const old = rec('trazioni', 'zavorra', 30, 75);
    expect(scoreSub('trazioni', [old]).points).toBeCloseTo(13.6, 9);
    expect(scoreSub('trazioni', [old, rec('trazioni', 'zavorra', 30, 80)])).toMatchObject({ best: old, percent: 40 });
  });

  it('esempio di livello: 60, 70, 30, 25, 50 → 47, avatar stadio 4', () => {
    const level = overallLevel([60, 70, 30, 25, 50]);
    expect(level).toBe(47);
    expect(avatarStage(level).stage).toBe(4);
  });
});

describe('migliore di sempre', () => {
  it('conta il record che vale più punti, non l’ultimo', () => {
    const a = rec('planche', 'straddle', 8);
    const b = rec('planche', 'one-leg', 10); // 60, meno di straddle 8 s (68)
    const c = rec('planche', 'tuck', 10);
    const s = scoreSub('planche', [a, b, c]);
    expect(s.best).toBe(a);
    expect(s.percent).toBe(68);
  });

  it('a parità di punti resta il primo', () => {
    const a = rec('trazioni', 'zavorra', 30);
    const b = rec('trazioni', 'zavorra', 30);
    expect(scoreSub('trazioni', [a, b]).best).toBe(a);
  });

  it('i kg si confrontano col peso del giorno: 30 kg a 60 kg di peso battono 35 kg a 90', () => {
    const light = rec('trazioni', 'zavorra', 30, 60); // 50%
    const heavy = rec('trazioni', 'zavorra', 35, 90); // 38%
    expect(scoreSub('trazioni', [heavy, light])).toMatchObject({ best: light, percent: 50 });
  });

  it('ignora record di altri sotto-esercizi e record non validi', () => {
    const s = scoreSub('planche', [rec('front-lever', 'full', 10), rec('planche', 'tuck', 11), rec('planche', 'boh', 3)]);
    expect(s).toMatchObject({ points: 0, best: null, percent: 0, zone: 'base', phase: 0, unlocked: false });
  });

  it('nessun record = tutto a zero', () => {
    expect(scoreSub('verticale', [])).toMatchObject({ points: 0, basePercent: 0, elitePercent: 0, best: null, needsBodyweight: false });
  });
});

describe('fasi elite', () => {
  it('Maltese implica Wide planche completa', () => {
    expect(one('planche', 'maltese', 1).points).toBe(77);
    expect(one('planche', 'wide', 10)).toMatchObject({ points: 75, elitePercent: 50, phase: 2 });
  });

  it('oltre il massimo non si arrotonda: non vale', () => {
    expect(scoreRecord(rec('planche', 'tuck', 15))).toBeNull();
    expect(scoreRecord(rec('verticale', 'verticale', 121))).toBeNull();
    expect(scoreRecord(rec('oap', 'gomito', 6))).toBeNull();
    expect(scoreRecord(rec('trazioni', 'zavorra', 500))).toBeNull();
  });

  it('il massimo assoluto è 2 × base', () => {
    expect(one('trazioni', 'zavorra', 400)).toMatchObject({ points: 68, elitePercent: 100, zone: 'elite' });
    expect(one('verticale', 'full-mono-braccio', 10)).toMatchObject({ points: 120, elitePercent: 100, phase: 2 });
  });
});

describe('peso corporeo mancante', () => {
  it('i kg senza peso restano da completare, senza errori', () => {
    const s = one('trazioni', 'zavorra', 40, null);
    expect(s).toMatchObject({ points: 0, percent: 0, needsBodyweight: true });
    expect(scoreSub('military', [{ subId: 'military', stage: 'bilanciere', value: 60 }]).needsBodyweight).toBe(true);
  });

  it('un peso assurdo vale come mancante', () => {
    expect(one('dip', 'zavorra', 40, 0).needsBodyweight).toBe(true);
    expect(one('dip', 'zavorra', 40, Number.NaN).needsBodyweight).toBe(true);
  });

  it('HSPU zavorrato senza peso tiene almeno la base completa', () => {
    expect(one('hspu', 'zavorra', 20, null)).toMatchObject({ points: 40, basePercent: 100, elitePercent: 0, needsBodyweight: true });
  });

  it('le tabelle non hanno bisogno del peso', () => {
    expect(one('planche', 'straddle', 5, null)).toMatchObject({ percent: 65, needsBodyweight: false });
  });

  it('il riepilogo segnala che serve il peso', () => {
    expect(levelSummary([rec('trazioni', 'zavorra', 10, null)]).needsBodyweight).toBe(true);
    expect(levelSummary([rec('trazioni', 'zavorra', 10)]).needsBodyweight).toBe(false);
  });
});

describe('categorie, livello e avatar', () => {
  it('categoria = somma dei punti, mostrata per difetto', () => {
    const c = scoreCategory('fondamentali-tirata', [rec('trazioni', 'zavorra', 30), rec('muscle-up', 'zavorra', 10), rec('oap', 'spalla', 3)]);
    expect(c.points).toBeCloseTo(13.6 + 13.2 + 21.45, 9);
    expect(c).toMatchObject({ value: 48, zone: 'base' });
    expect(c.subs.map((s) => s.subId)).toEqual(['trazioni', 'muscle-up', 'oap']);
  });

  it('categoria piena e in elite', () => {
    const full = [rec('verticale', 'verticale', 120), rec('hspu', 'libera', 10)];
    expect(scoreCategory('handbalance', full)).toMatchObject({ value: 100, zone: 'base' });
    expect(scoreCategory('handbalance', [...full, rec('verticale', 'straddle-mono-braccio', 1)])).toMatchObject({ value: 103, zone: 'elite' });
    expect(scoreCategory('handbalance', [rec('verticale', 'full-mono-braccio', 10), rec('hspu', 'zavorra', 37.5)])).toMatchObject({ value: 200 });
  });

  it('livello = media delle categorie arrotondate, per difetto', () => {
    expect(overallLevel([59.9, 59.9, 59.9, 59.9, 60.4])).toBe(59);
    expect(overallLevel([0, 0, 0, 0, 0])).toBe(0);
    expect(overallLevel([200, 200, 200, 200, 200])).toBe(200);
    expect(overallLevel([])).toBe(0);
  });

  it('riepilogo completo', () => {
    const r = levelSummary([rec('planche', 'full', 10), rec('verticale', 'verticale', 120), rec('hspu', 'libera', 10)]);
    expect(r.categories.map((c) => c.value)).toEqual([0, 0, 50, 0, 100]);
    expect(r).toMatchObject({ level: 30, zone: 'base', avatar: { stage: 3, aura: 0.3, shocks: 0 } });
  });

  it('avatar: stadio ogni 10, aura piena a 100, scosse da 101 a 200', () => {
    expect(avatarStage(0)).toEqual({ stage: 0, aura: 0, shocks: 0 });
    expect(avatarStage(9)).toMatchObject({ stage: 0 });
    expect(avatarStage(10)).toMatchObject({ stage: 1 });
    expect(avatarStage(99)).toMatchObject({ stage: 9, aura: 0.99, shocks: 0 });
    expect(avatarStage(100)).toEqual({ stage: 10, aura: 1, shocks: 0 });
    expect(avatarStage(101)).toMatchObject({ stage: 10, aura: 1, shocks: 0.01 });
    expect(avatarStage(199)).toMatchObject({ stage: 19 });
    expect(avatarStage(200)).toEqual({ stage: 19, aura: 1, shocks: 1 });
    expect(avatarStage(-5)).toEqual({ stage: 0, aura: 0, shocks: 0 });
    expect(avatarStage(250).stage).toBe(19);
  });
});

describe('progressioni disponibili', () => {
  const ids = (subId: SubId, rs: LevelRecord[]) => availableOptions(subId, rs).map((o) => o.stageId);

  it('planche: elite nascoste finché la base non è completa, Maltese dopo Wide', () => {
    expect(ids('planche', [])).toEqual(['tuck', 'advanced-tuck', 'one-leg', 'straddle', 'half-lay', 'full']);
    expect(ids('planche', [rec('planche', 'full', 9)])).not.toContain('wide');
    expect(ids('planche', [rec('planche', 'full', 10)])).toEqual(['tuck', 'advanced-tuck', 'one-leg', 'straddle', 'half-lay', 'full', 'wide']);
    expect(ids('planche', [rec('planche', 'wide', 10)])).toContain('maltese');
  });

  it('limiti del campo: secondi 1–10, verticale 1–120', () => {
    expect(availableOptions('planche', [])[0]).toMatchObject({ measure: 'seconds', min: 1, max: 10, phase: 0 });
    expect(availableOptions('verticale', [])).toEqual([{ stageId: 'verticale', name: 'Verticale', measure: 'seconds', phase: 0, min: 1, max: 120 }]);
  });

  it('OAP: 2 rip. finché l’elite è chiusa, poi fino a 10', () => {
    expect(availableOptions('oap', []).find((o) => o.stageId === 'oap')).toMatchObject({ min: 1, max: 2, phase: 0 });
    expect(availableOptions('oap', [rec('oap', 'oap', 2)]).find((o) => o.stageId === 'oap')).toMatchObject({ min: 1, max: 10, phase: 1 });
  });

  it('HSPU: la zavorra compare a 10 rip.', () => {
    expect(ids('hspu', [rec('hspu', 'libera', 9)])).toEqual(['libera']);
    expect(availableOptions('hspu', [rec('hspu', 'libera', 10)])).toContainEqual(expect.objectContaining({ stageId: 'zavorra', measure: 'kg', load: 'zavorra', min: 0 }));
  });

  it('kg: zavorra da 0, bilanciere da 1', () => {
    expect(availableOptions('trazioni', [])).toEqual([expect.objectContaining({ stageId: 'zavorra', measure: 'kg', min: 0, max: 400 })]);
    expect(availableOptions('panca-piana', [])).toEqual([expect.objectContaining({ stageId: 'bilanciere', min: 1 })]);
  });

  it('al massimo suggerisce la progressione successiva', () => {
    expect(suggestNext(rec('planche', 'tuck', 10), [])?.stageId).toBe('advanced-tuck');
    expect(suggestNext(rec('planche', 'tuck', 9), [])).toBeNull();
    expect(suggestNext(rec('planche', 'full', 10), [])?.stageId).toBe('wide');
    expect(suggestNext(rec('planche', 'maltese', 10), [])).toBeNull();
    expect(suggestNext(rec('front-lever-touch', 'full', 4), [])?.stageId).toBe('wide');
    expect(suggestNext(rec('hspu', 'libera', 10), [])?.stageId).toBe('zavorra');
    expect(suggestNext(rec('trazioni', 'zavorra', 400), [])).toBeNull();
    // OAP 2 rip.: il campo si allunga a 10, non c'è una progressione successiva da suggerire
    expect(suggestNext(rec('oap', 'oap', 2), [])).toBeNull();
    expect(suggestNext(rec('oap', 'spalla', 5), [])?.stageId).toBe('oap');
  });
});

describe('validazione', () => {
  it('sotto-esercizio e progressione', () => {
    expect(validateRecord({ subId: 'gambe', stage: 'x', value: 1 })).toBe('unknown-sub');
    expect(validateRecord({ subId: 'planche', stage: 'boh', value: 1 })).toBe('unknown-stage');
  });

  it('limiti dei valori', () => {
    expect(validateRecord(rec('planche', 'tuck', 0))).toBe('below-min');
    expect(validateRecord(rec('planche', 'tuck', 11))).toBe('above-max');
    expect(validateRecord(rec('planche', 'tuck', 2.5))).toBe('not-integer');
    expect(validateRecord(rec('planche', 'tuck', Number.NaN))).toBe('not-a-number');
    expect(validateRecord(rec('verticale', 'verticale', 120))).toBeNull();
    expect(validateRecord(rec('trazioni', 'zavorra', 0))).toBeNull();
    expect(validateRecord(rec('trazioni', 'zavorra', -1))).toBe('below-min');
    expect(validateRecord(rec('trazioni', 'zavorra', 12.5))).toBeNull();
    expect(validateRecord(rec('military', 'bilanciere', 0))).toBe('below-min');
    expect(validateRecord(rec('oap', 'oap', 11))).toBe('above-max');
  });

  it('peso corporeo', () => {
    expect(validateRecord(rec('trazioni', 'zavorra', 10, null))).toBeNull();
    expect(validateRecord(rec('trazioni', 'zavorra', 10, 5))).toBe('bodyweight-out-of-range');
  });

  it('con i record controlla che sia sbloccato', () => {
    expect(validateRecord(rec('planche', 'wide', 3), [])).toBe('locked');
    expect(validateRecord(rec('planche', 'wide', 3), [rec('planche', 'full', 10)])).toBeNull();
    expect(validateRecord(rec('oap', 'oap', 5), [])).toBe('locked');
    expect(validateRecord(rec('oap', 'oap', 5), [rec('oap', 'oap', 2)])).toBeNull();
    expect(validateRecord(rec('hspu', 'zavorra', 10), [rec('hspu', 'libera', 8)])).toBe('locked');
  });
});
