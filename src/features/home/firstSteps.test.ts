import { describe, expect, it } from 'vitest';
import { dismissKey, firstSteps, type StepsInput } from './firstSteps';

const fresh: StepsInput = { hasBodyweight: false, hasAvatarBody: false, records: 0, trainings: 0, linked: false, plannedToday: false };

describe('primo accesso guidato', () => {
  it('account nuovo: 4 passi, nessuno fatto, si parte dal peso', () => {
    const s = firstSteps(fresh);
    expect(s.steps.map((x) => x.id)).toEqual(['peso', 'figura', 'record', 'allenamento']);
    expect(s.done).toBe(0);
    expect(s.total).toBe(4);
    expect(s.complete).toBe(false);
    expect(s.next).toBe('peso');
  });

  it('il suggerimento compare solo sul prossimo passo', () => {
    const s = firstSteps({ ...fresh, hasBodyweight: true });
    expect(s.next).toBe('figura');
    expect(s.steps.filter((x) => x.hint).map((x) => x.id)).toEqual(['figura']);
  });

  it('i passi si deducono dai dati, anche fuori ordine', () => {
    const s = firstSteps({ ...fresh, records: 3, trainings: 1 });
    expect(s.steps.map((x) => x.done)).toEqual([false, false, true, true]);
    expect(s.done).toBe(2);
    expect(s.next).toBe('peso');
  });

  it('tutto fatto: completo, nessun prossimo passo, nessun suggerimento', () => {
    const s = firstSteps({ hasBodyweight: true, hasAvatarBody: true, records: 1, trainings: 5, linked: true, plannedToday: true });
    expect(s.complete).toBe(true);
    expect(s.next).toBeNull();
    expect(s.steps.every((x) => x.hint === null)).toBe(true);
  });

  it("l'allenamento: Oggi se c'è programma, poi il trainer, altrimenti la Scheda", () => {
    const last = { ...fresh, hasBodyweight: true, hasAvatarBody: true, records: 1 };
    const hint = (i: StepsInput) => firstSteps(i).steps[3].hint;
    expect(hint({ ...last, plannedToday: true, linked: true })).toMatch(/Oggi/);
    expect(hint({ ...last, linked: true })).toMatch(/trainer/);
    expect(hint(last)).toMatch(/Scheda/);
  });

  it('"Più tardi" vale per utente', () => {
    expect(dismissKey('a')).not.toBe(dismissKey('b'));
  });
});
