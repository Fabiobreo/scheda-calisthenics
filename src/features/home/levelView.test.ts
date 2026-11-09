import { describe, expect, it } from 'vitest';
import { availableOptions, CATEGORIES, levelSummary, type LevelRecord } from '../../lib/levels';
import { AXES, BASE_RING, celebrations, radial, recordText, subPercentText, validationMessage } from './levelView';

describe('assi e scala del pentagono', () => {
  it('ci sono tutte e 5 le categorie, una volta sola, Fondamentali spinta in alto', () => {
    expect([...AXES].sort()).toEqual(CATEGORIES.map((c) => c.id).sort());
    expect(AXES[0]).toBe('fondamentali-spinta');
  });

  it('scala a due tratti: 100 sull\'anello, 200 sul bordo, monotona', () => {
    expect(radial(0)).toBe(0);
    expect(radial(50)).toBeCloseTo(BASE_RING / 2);
    expect(radial(100)).toBeCloseTo(BASE_RING);
    expect(radial(150)).toBeCloseTo(BASE_RING + (1 - BASE_RING) / 2);
    expect(radial(200)).toBe(1);
    expect(radial(-5)).toBe(0);
    expect(radial(250)).toBe(1);
    for (let v = 0; v < 200; v++) expect(radial(v + 1)).toBeGreaterThan(radial(v));
  });
});

describe('testi', () => {
  it('percentuale del sotto-esercizio', () => {
    expect(subPercentText({ zone: 'base', percent: 40 })).toBe('40%');
    expect(subPercentText({ zone: 'elite', percent: 66 })).toBe('ELITE 66%');
  });

  it('record leggibili', () => {
    expect(recordText({ subId: 'planche', stage: 'straddle', value: 5 })).toBe('Straddle · 5 s');
    expect(recordText({ subId: 'oap', stage: 'oap', value: 2 })).toBe('OAP · 2 rip.');
    expect(recordText({ subId: 'trazioni', stage: 'zavorra', value: 32.5 })).toBe('Zavorra 32,5 kg');
    expect(recordText({ subId: 'military', stage: 'bilanciere', value: 60 })).toBe('Bilanciere 60 kg');
  });

  it('messaggi di errore coi limiti della progressione', () => {
    const tuck = availableOptions('planche', []).find((o) => o.stageId === 'tuck');
    expect(validationMessage('above-max', tuck)).toBe('Il massimo è 10 s');
    expect(validationMessage('below-min', tuck)).toBe('Il minimo è 1 s');
    expect(validationMessage('not-integer', tuck)).toBe('Solo numeri interi');
  });
});

describe('celebrazioni', () => {
  const bw = (r: Omit<LevelRecord, 'bodyweightKg'>): LevelRecord => ({ ...r, bodyweightKg: 75 });

  it('niente se non cambia nulla di bello', () => {
    const s = levelSummary([bw({ subId: 'trazioni', stage: 'zavorra', value: 30 })]);
    expect(celebrations(s, s)).toEqual([]);
    // record peggiore: nessuna festa
    const worse = levelSummary([bw({ subId: 'trazioni', stage: 'zavorra', value: 30 }), bw({ subId: 'trazioni', stage: 'zavorra', value: 10 })]);
    expect(celebrations(s, worse)).toEqual([]);
  });

  it('livello che sale e ELITE sbloccata', () => {
    const before = levelSummary([]);
    const after = levelSummary([bw({ subId: 'trazioni', stage: 'zavorra', value: 75 }), bw({ subId: 'dip', stage: 'zavorra', value: 75 })]);
    // trazioni 34 → fondamentali tirata 34, dip 34 → spinta 34: livello (34+34)/5 = 13
    expect(after.level).toBe(13);
    expect(celebrations(before, after)).toEqual(['Livello 13!', 'ELITE sbloccata: Trazioni', 'ELITE sbloccata: Dip']);
  });

  it('categoria che entra in zona ELITE', () => {
    const base = [
      bw({ subId: 'trazioni', stage: 'zavorra', value: 75 }),
      bw({ subId: 'muscle-up', stage: 'zavorra', value: 25 }),
      bw({ subId: 'oap', stage: 'oap', value: 2 }),
    ];
    const before = levelSummary(base);
    const after = levelSummary([...base, bw({ subId: 'trazioni', stage: 'zavorra', value: 90 })]);
    expect(before.categories.find((c) => c.categoryId === 'fondamentali-tirata')!.value).toBe(100);
    expect(celebrations(before, after)).toContain('Fondamentali tirata in zona ELITE');
  });
});
