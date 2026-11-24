import { describe, expect, it } from 'vitest';
import { dismissKey, firstSteps, type StepsInput } from './firstSteps';

const fresh: StepsInput = { records: 0, trainings: 0, linked: false, plannedToday: false };

describe('primo accesso guidato', () => {
  it('account nuovo: 2 passi, nessuno fatto, si parte dal record (peso e figura non sono più passi, ticket 32 e 34)', () => {
    const s = firstSteps(fresh);
    expect(s.steps.map((x) => x.id)).toEqual(['record', 'allenamento']);
    expect(s.done).toBe(0);
    expect(s.total).toBe(2);
    expect(s.complete).toBe(false);
    expect(s.next).toBe('record');
  });

  it('il suggerimento compare solo sul prossimo passo', () => {
    const s = firstSteps({ ...fresh, records: 1 });
    expect(s.next).toBe('allenamento');
    expect(s.steps.filter((x) => x.hint).map((x) => x.id)).toEqual(['allenamento']);
  });

  it('i passi si deducono dai dati, anche fuori ordine', () => {
    const s = firstSteps({ ...fresh, trainings: 1 });
    expect(s.steps.map((x) => x.done)).toEqual([false, true]);
    expect(s.done).toBe(1);
    expect(s.next).toBe('record');
  });

  it('tutto fatto: completo, nessun prossimo passo, nessun suggerimento', () => {
    const s = firstSteps({ records: 1, trainings: 5, linked: true, plannedToday: true });
    expect(s.complete).toBe(true);
    expect(s.next).toBeNull();
    expect(s.steps.every((x) => x.hint === null)).toBe(true);
  });

  it("l'allenamento: il programma di oggi, poi il trainer, altrimenti la Scheda", () => {
    const last = { ...fresh, records: 1 };
    const hint = (i: StepsInput) => firstSteps(i).steps[1].hint;
    expect(hint({ ...last, plannedToday: true, linked: true })).toMatch(/Oggi/);
    expect(hint({ ...last, linked: true })).toMatch(/trainer/);
    expect(hint(last)).toMatch(/Scheda/);
  });

  it('"Più tardi" vale per utente', () => {
    expect(dismissKey('a')).not.toBe(dismissKey('b'));
  });
});
