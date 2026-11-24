import { describe, expect, it } from 'vitest';
import { dismissKey, firstSteps, type StepsInput } from './firstSteps';

const fresh: StepsInput = { hasAvatarBody: false, records: 0, trainings: 0, linked: false, plannedToday: false };

describe('primo accesso guidato', () => {
  it('account nuovo: 3 passi, nessuno fatto, si parte dalla figura (il peso non è più un passo, ticket 32)', () => {
    const s = firstSteps(fresh);
    expect(s.steps.map((x) => x.id)).toEqual(['figura', 'record', 'allenamento']);
    expect(s.done).toBe(0);
    expect(s.total).toBe(3);
    expect(s.complete).toBe(false);
    expect(s.next).toBe('figura');
  });

  it('il suggerimento compare solo sul prossimo passo', () => {
    const s = firstSteps({ ...fresh, hasAvatarBody: true });
    expect(s.next).toBe('record');
    expect(s.steps.filter((x) => x.hint).map((x) => x.id)).toEqual(['record']);
  });

  it('i passi si deducono dai dati, anche fuori ordine', () => {
    const s = firstSteps({ ...fresh, records: 3, trainings: 1 });
    expect(s.steps.map((x) => x.done)).toEqual([false, true, true]);
    expect(s.done).toBe(2);
    expect(s.next).toBe('figura');
  });

  it('tutto fatto: completo, nessun prossimo passo, nessun suggerimento', () => {
    const s = firstSteps({ hasAvatarBody: true, records: 1, trainings: 5, linked: true, plannedToday: true });
    expect(s.complete).toBe(true);
    expect(s.next).toBeNull();
    expect(s.steps.every((x) => x.hint === null)).toBe(true);
  });

  it("l'allenamento: Oggi se c'è programma, poi il trainer, altrimenti la Scheda", () => {
    const last = { ...fresh, hasAvatarBody: true, records: 1 };
    const hint = (i: StepsInput) => firstSteps(i).steps[2].hint;
    expect(hint({ ...last, plannedToday: true, linked: true })).toMatch(/Oggi/);
    expect(hint({ ...last, linked: true })).toMatch(/trainer/);
    expect(hint(last)).toMatch(/Scheda/);
  });

  it('"Più tardi" vale per utente', () => {
    expect(dismissKey('a')).not.toBe(dismissKey('b'));
  });
});
