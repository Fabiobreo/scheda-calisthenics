import { describe, expect, it } from 'vitest';
import { countryName, countryOptions, placeError, placeOf, province, provinceOptions, PROVINCES } from './places';

describe('province', () => {
  it('sono 107, in 20 regioni, con sigle uniche', () => {
    expect(PROVINCES).toHaveLength(107);
    expect(new Set(PROVINCES.map((p) => p.code)).size).toBe(107);
    expect(new Set(PROVINCES.map((p) => p.region)).size).toBe(20);
    expect(PROVINCES.every((p) => /^[A-Z]{2}$/.test(p.code))).toBe(true);
  });

  /**
   * Il database controlla la provincia e ricava la regione con la tabella `provinces` (migration 0017): deve avere le
   * stesse righe di questo file. Se cambi una provincia, scrivi una migration che aggiorna la tabella.
   */
  it('coincidono con la tabella provinces del database', () => {
    const files = import.meta.glob<string>('../../supabase/migrations/*.sql', { query: '?raw', import: 'default', eager: true });
    const sql = Object.keys(files)
      .sort()
      .map((f) => files[f])
      .join('\n');
    const block = [...sql.matchAll(/insert into public\.provinces[^;]*;/g)].at(-1)?.[0];
    expect(block, 'insert in provinces').toBeTruthy();
    const unquote = (s: string) => s.replace(/''/g, "'");
    const rows = [...block!.matchAll(/\('([A-Z]{2})', '((?:[^']|'')+)', '((?:[^']|'')+)'\)/g)].map((m) => ({ code: m[1], name: unquote(m[2]), region: unquote(m[3]) }));
    expect(rows).toEqual(PROVINCES);
  });

  it('si cercano per sigla', () => {
    expect(province('MI')).toEqual({ code: 'MI', name: 'Milano', region: 'Lombardia' });
    expect(province('AO')?.region).toBe("Valle d'Aosta");
    expect(province('ZZ')).toBeUndefined();
    expect(province(null)).toBeUndefined();
  });

  it('nel menu sono in ordine alfabetico, con la sigla', () => {
    const opts = provinceOptions();
    expect(opts).toHaveLength(107);
    expect(opts[0]).toEqual({ v: 'AG', l: 'Agrigento (AG)' });
    expect(opts.at(-1)).toEqual({ v: 'VT', l: 'Viterbo (VT)' });
  });
});

describe('nazioni', () => {
  it('hanno il nome in italiano, e Italia è la prima del menu', () => {
    expect(countryName('IT')).toBe('Italia');
    expect(countryName('FR')).toBe('Francia');
    const opts = countryOptions();
    expect(opts[0]).toEqual({ v: 'IT', l: 'Italia' });
    expect(new Set(opts.map((o) => o.v)).size).toBe(opts.length);
    // ogni codice ha un nome vero, non il codice stesso
    expect(opts.filter((o) => o.l === o.v || !/^[A-Z]{2}$/.test(o.v))).toEqual([]);
    expect(opts.length).toBeGreaterThan(230);
  });
});

describe('luogo scelto', () => {
  it('la nazione serve sempre, la provincia solo in Italia', () => {
    expect(placeError('', '')).toBe('country');
    expect(placeError('Italia', 'MI')).toBe('country');
    expect(placeError('IT', '')).toBe('province');
    expect(placeError('IT', 'ZZ')).toBe('province');
    expect(placeError('IT', 'MI')).toBeNull();
    expect(placeError('FR', '')).toBeNull();
  });

  it('fuori dall\'Italia la provincia non si salva', () => {
    expect(placeOf('IT', 'MI')).toEqual({ country: 'IT', province: 'MI' });
    expect(placeOf('FR', 'MI')).toEqual({ country: 'FR', province: null });
  });
});
