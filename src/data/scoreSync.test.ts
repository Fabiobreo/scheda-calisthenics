import { describe, expect, it } from 'vitest';
import { CATEGORIES, levelScores, levelSummary, RULES_VERSION, SCORE_KEY, type LevelRecord, type LevelScores } from '../lib/levels';
import { scoreToSave } from './scoreSync';

// Tre record veri: trazioni zavorrate, planche straddle, verticale.
const TRAZIONI: LevelRecord = { chainId: 'trazioni', entry: 'zavorra', value: 40, bodyweightKg: 75 };
const PLANCHE: LevelRecord = { chainId: 'planche', entry: 'straddle', value: 6, bodyweightKg: 75 };
const VERTICALE: LevelRecord = { chainId: 'verticale', entry: 'verticale', value: 45 };

const scoresOf = (records: LevelRecord[]) => levelScores(levelSummary(records));
const ZERO: LevelScores = { total: 0, ft: 0, fs: 0, st: 0, ss: 0, hb: 0, rulesVersion: RULES_VERSION };

describe('i 6 numeri da salvare', () => {
  it('sono quelli del riepilogo: 5 categorie e la loro somma', () => {
    const summary = levelSummary([TRAZIONI, PLANCHE, VERTICALE]);
    const s = levelScores(summary);
    for (const c of summary.categories) expect(s[SCORE_KEY[c.categoryId]]).toBe(c.points);
    expect(s.total).toBe(summary.total);
    expect(s.ft + s.fs + s.st + s.ss + s.hb).toBe(s.total);
    expect(s.rulesVersion).toBe(RULES_VERSION);
    expect(s.ft).toBeGreaterThan(0);
    expect(s.ss).toBeGreaterThan(0);
    expect(s.hb).toBeGreaterThan(0);
    expect(s.fs).toBe(0);
    expect(s.st).toBe(0);
  });

  it('ogni categoria ha la sua colonna', () => {
    expect(new Set(CATEGORIES.map((c) => SCORE_KEY[c.id])).size).toBe(5);
  });

  it('rispettano i vincoli del database: interi, 0–1400 per categoria e 0–7000 in tutto', () => {
    const s = scoresOf([TRAZIONI, PLANCHE, VERTICALE]);
    for (const k of ['ft', 'fs', 'st', 'ss', 'hb'] as const) {
      expect(Number.isInteger(s[k])).toBe(true);
      expect(s[k]).toBeGreaterThanOrEqual(0);
      expect(s[k]).toBeLessThanOrEqual(1400);
    }
    expect(s.total).toBeLessThanOrEqual(7000);
  });
});

describe('i punti sul server seguono i record', () => {
  it('senza record e senza riga non si scrive niente', () => {
    expect(scoreToSave(scoresOf([]), null)).toBeNull();
  });

  it('al primo record si scrive la riga', () => {
    const local = scoresOf([TRAZIONI]);
    expect(scoreToSave(local, null)).toEqual(local);
  });

  it('se i punti salvati sono già quelli giusti non si riscrive', () => {
    const local = scoresOf([TRAZIONI, PLANCHE]);
    expect(scoreToSave(local, { ...local })).toBeNull();
  });

  it('un record nuovo cambia i punti da salvare', () => {
    const before = scoresOf([TRAZIONI]);
    const after = scoresOf([TRAZIONI, PLANCHE]);
    expect(after.total).toBeGreaterThan(before.total);
    expect(scoreToSave(after, before)).toEqual(after);
  });

  it('un record corretto al ribasso abbassa i punti salvati', () => {
    const before = scoresOf([TRAZIONI]);
    const after = scoresOf([{ ...TRAZIONI, value: 20 }]);
    expect(after.ft).toBeLessThan(before.ft);
    expect(scoreToSave(after, before)).toEqual(after);
  });

  it('eliminando un record i punti scendono', () => {
    const before = scoresOf([TRAZIONI, PLANCHE, VERTICALE]);
    const after = scoresOf([TRAZIONI, VERTICALE]);
    expect(after.ss).toBe(0);
    expect(after.total).toBe(before.total - before.ss);
    expect(scoreToSave(after, before)).toEqual(after);
  });

  it('eliminando l\'ultimo record la riga torna a zero (e si esce dalle classifiche)', () => {
    const before = scoresOf([TRAZIONI]);
    expect(scoreToSave(scoresOf([]), before)).toEqual(ZERO);
    // e una volta a zero non si riscrive più
    expect(scoreToSave(scoresOf([]), ZERO)).toBeNull();
  });

  it('punti uguali ma salvati con regole più vecchie: si riscrivono con la versione nuova', () => {
    const local = { ...scoresOf([TRAZIONI]), rulesVersion: 2 };
    expect(scoreToSave(local, { ...local, rulesVersion: 1 })).toEqual(local);
  });

  it('un\'app con regole più vecchie di quelle salvate non tocca la riga', () => {
    const local = scoresOf([TRAZIONI]);
    expect(scoreToSave(local, { ...ZERO, rulesVersion: local.rulesVersion + 1 })).toBeNull();
  });
});
