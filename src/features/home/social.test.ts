import { describe, expect, it } from 'vitest';
import type { FeedEvent } from '../../data/types';
import { BANDS } from '../../lib/levels';
import { bandName, followButton, followLink, initial, newsLine, overtakeMetric, personName, personPlace, personSub, recordNews, requestsText, timeAgo } from './socialView';

/**
 * Il database dà il livello di una persona come fascia (`level_band`, migration 0018), senza far uscire i punti: le
 * soglie devono essere quelle di `BANDS.complessivo`. Se cambiano nelle regole, serve una migration che riscrive la
 * funzione.
 */
it('level_band nel database ha le soglie del livello complessivo del motore', () => {
  const files = import.meta.glob<string>('../../../supabase/migrations/*.sql', { query: '?raw', import: 'default', eager: true });
  const sql = Object.keys(files)
    .sort()
    .map((f) => files[f])
    .join('\n');
  const body = [...sql.matchAll(/function public\.level_band\(p_total integer\)[\s\S]*?\$\$;/g)].at(-1)?.[0];
  expect(body, 'funzione level_band').toBeTruthy();
  const ends = [...body!.matchAll(/<= (\d+) then (\d+)/g)].map((m) => [Number(m[2]), Number(m[1])]);
  expect(ends).toEqual(BANDS.complessivo.slice(0, -1).map((b, i) => [i, b.to]));
  expect(body).toMatch(new RegExp(`else ${BANDS.complessivo.length - 1}\\b`));
});

describe('una persona', () => {
  it('il livello è il nome della fascia', () => {
    expect([0, 1, 2, 3, 4, 5].map(bandName)).toEqual(['Base', 'Intermedio', 'Avanzato', 'Elite', 'Titano', 'Leggenda']);
    expect(bandName(-1)).toBe('Base');
    expect(bandName(9)).toBe('Leggenda');
    expect(bandName(Number.NaN)).toBe('Base');
  });

  it('il luogo si scrive solo se arriva', () => {
    expect(personPlace({ country: 'IT', province: 'MI' })).toBe('Milano');
    expect(personPlace({ country: 'FR', province: null })).toBe('Francia');
    expect(personPlace({ country: null, province: null })).toBeNull();
    expect(personSub({ band: 2, country: 'IT', province: 'MI' })).toBe('Avanzato · Milano');
    // profilo privato che non seguo: solo il livello
    expect(personSub({ band: 2, country: null, province: null })).toBe('Avanzato');
  });

  it('nome, iniziale e bottone', () => {
    expect(personName(null)).toBe('Senza nome');
    expect(initial(' anna')).toBe('A');
    expect(initial(null)).toBe('?');
    expect(followButton('none')).toEqual({ label: 'Segui', disabled: false });
    expect(followButton('pending')).toEqual({ label: 'Richiesta inviata', disabled: true });
    expect(followButton('accepted')).toEqual({ label: 'Segui già', disabled: true });
  });

  it('le richieste in una riga', () => {
    expect(requestsText(['Carla'])).toBe('Carla vuole seguirti');
    expect(requestsText(['Carla', 'Dario'])).toBe('Carla e Dario vogliono seguirti');
    expect(requestsText(['Carla', 'Dario', null, 'Elena'])).toBe('Carla e altre 3 persone vogliono seguirti');
  });

  it('il link "seguimi"', () => {
    expect(followLink('https://app.test', 'ABCD2345')).toBe('https://app.test/segui/ABCD2345');
  });
});

const event = (kind: string, payload: Record<string, unknown>, workoutId: string | null = null) => ({ kind: kind as FeedEvent['kind'], payload, workoutId });

describe('novità', () => {
  it('record: la voce e il valore, col bottone "Record"', () => {
    const e = event('record', { subId: 'planche', stage: 'straddle', value: 8, date: '2026-11-25', gained: 35 });
    expect(newsLine(e)).toEqual({ text: 'nuovo record: Straddle · 8 s', action: 'Record' });
    expect(recordNews(e)).toEqual({ subId: 'planche', stage: 'straddle', value: 8, date: '2026-11-25', gained: 35 });
    // il valore arriva dal database come numero o come testo ("30.00")
    expect(recordNews(event('record', { subId: 'trazioni', stage: 'zavorra', value: '30.00' }))).toMatchObject({ value: 30, gained: null });
    expect(newsLine(event('record', { subId: 'trazioni', stage: 'zavorra', value: 30 })).text).toBe('nuovo record: Trazioni zavorrate 30 kg');
  });

  it('nessuna percentuale del peso corporeo e nessun peso corporeo nei testi', () => {
    const e = event('record', { subId: 'trazioni', stage: 'zavorra', value: 30, bodyweightKg: 75, gained: 10 });
    expect(newsLine(e).text).not.toMatch(/%|75|corporeo/);
    expect(recordNews(e)).not.toHaveProperty('bodyweightKg');
  });

  it('allenamento condiviso e sorpasso', () => {
    expect(newsLine(event('workout', { name: 'Push day', exercises: 5 }, 'w1'))).toEqual({ text: "ha condiviso l'allenamento «Push day»", action: 'Vedi' });
    expect(newsLine(event('workout', {}, null))).toEqual({ text: "ha condiviso l'allenamento «Allenamento»", action: null });
    expect(newsLine(event('overtake', { metric: 'generale' }))).toEqual({ text: 'ti ha superato in classifica: Generale', action: 'Classifica' });
    expect(newsLine(event('overtake', { metric: 'skill-tirata' })).text).toBe('ti ha superato in classifica: Skill tirata');
    expect(overtakeMetric(event('overtake', { metric: 'handbalance' }))).toBe('handbalance');
  });

  it('una novità scritta in modo inatteso resta leggibile e non si apre', () => {
    expect(newsLine(event('record', { subId: 'planche' }))).toEqual({ text: 'ha fatto un nuovo record', action: null });
    expect(newsLine(event('overtake', { metric: 'gambe' }))).toEqual({ text: 'ti ha superato in classifica', action: null });
    expect(newsLine(event('sfida', {}))).toEqual({ text: 'ha una novità', action: null });
  });

  it('quando', () => {
    const now = new Date('2026-11-25T12:00:00');
    const ago = (ms: number) => timeAgo(new Date(now.getTime() - ms).toISOString(), now);
    const MIN = 60_000;
    expect(ago(20_000)).toBe('adesso');
    expect(ago(5 * MIN)).toBe('5 min fa');
    expect(ago(3 * 60 * MIN)).toBe('3 h fa');
    expect(ago(30 * 60 * MIN)).toBe('ieri');
    expect(ago(4 * 24 * 60 * MIN)).toBe('4 g fa');
    expect(ago(10 * 24 * 60 * MIN)).toBe('15 nov');
    expect(timeAgo('boh', now)).toBe('');
  });
});
