import { describe, expect, it } from 'vitest';
import { bodyweightOn, currentBodyweight, levelSummary, scoreSub, withBodyweight } from '.';

const W = [
  { date: '2026-10-01', kg: 74 },
  { date: '2026-11-01', kg: 75 },
  { date: '2026-11-08', kg: 80 },
];

describe('peso del giorno del record', () => {
  it('l’ultimo peso fino a quel giorno', () => {
    expect(bodyweightOn('2026-11-01', W)).toBe(75);
    expect(bodyweightOn('2026-11-07', W)).toBe(75);
    expect(bodyweightOn('2026-11-08', W)).toBe(80);
    expect(bodyweightOn('2027-01-01', W)).toBe(80);
    expect(bodyweightOn('2026-10-15', W)).toBe(74);
  });

  it('record più vecchio di ogni peso: il primo dopo', () => {
    expect(bodyweightOn('2026-01-01', W)).toBe(74);
  });

  it('senza pesi: null', () => {
    expect(bodyweightOn('2026-11-01', [])).toBeNull();
    expect(currentBodyweight([])).toBeNull();
  });

  it('peso attuale = l’ultimo', () => {
    expect(currentBodyweight(W)).toEqual({ date: '2026-11-08', kg: 80 });
  });

  it('il caso del 05: 30 kg con PC 75, poi il peso sale a 80 → resta 40%', () => {
    const records = withBodyweight([{ subId: 'trazioni', stage: 'zavorra', value: 30, date: '2026-11-02' }], W);
    expect(records[0].bodyweightKg).toBe(75);
    expect(scoreSub('trazioni', records).percent).toBe(40);
  });

  it('senza peso il riepilogo chiede il peso', () => {
    const records = withBodyweight([{ subId: 'trazioni', stage: 'zavorra', value: 30, date: '2026-11-02' }], []);
    expect(levelSummary(records).needsBodyweight).toBe(true);
  });
});
