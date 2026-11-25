import { describe, expect, it } from 'vitest';
import type { CatalogExercise } from '../data/types';
import { byCategory, matchCatalog, searchCatalog } from './catalog';

const c = (id: string, name: string, category: CatalogExercise['category'], aliases: string[] = []): CatalogExercise => ({
  id,
  name,
  category,
  defaultType: 'forza',
  aliases,
  measure: 'reps',
});

const catalog = [c('plank', 'Plank', 'core'), c('trazioni', 'Trazioni', 'tirata', ['pull up', 'pull-up']), c('dip', 'Dip alle parallele', 'spinta', ['dip'])];

describe('matchCatalog', () => {
  it('trova la voce dal nome, maiuscole e spazi a parte', () => {
    expect(matchCatalog(catalog, '  trazioni ')?.id).toBe('trazioni');
    expect(matchCatalog(catalog, 'DIP  ALLE   PARALLELE')?.id).toBe('dip');
  });

  it('trova la voce da un sinonimo', () => {
    expect(matchCatalog(catalog, 'Pull Up')?.id).toBe('trazioni');
    expect(matchCatalog(catalog, 'dip')?.id).toBe('dip');
  });

  it('non inventa abbinamenti', () => {
    expect(matchCatalog(catalog, 'Trazioni zavorrate')).toBeUndefined();
    expect(matchCatalog(catalog, '')).toBeUndefined();
  });
});

describe('byCategory', () => {
  it('ordina per categoria: tirata, spinta, gambe, core, skill', () => {
    expect(byCategory(catalog).map((x) => x.id)).toEqual(['trazioni', 'dip', 'plank']);
  });
});

describe('searchCatalog', () => {
  it('senza testo dà tutto il catalogo', () => {
    expect(searchCatalog(catalog, '  ')).toEqual(catalog);
  });
  it('cerca per nome, senza badare a maiuscole, accenti e spazi doppi', () => {
    expect(searchCatalog(catalog, 'PLÀNK').map((x) => x.id)).toEqual(['plank']);
    expect(searchCatalog(catalog, 'alle  parallele').map((x) => x.id)).toEqual(['dip']);
  });
  it('cerca per sinonimo e per nome del gruppo', () => {
    expect(searchCatalog(catalog, 'pull').map((x) => x.id)).toEqual(['trazioni']);
    expect(searchCatalog(catalog, 'spin', (x) => (x.category === 'spinta' ? 'Spinta' : '')).map((x) => x.id)).toEqual(['dip']);
  });
  it('niente che corrisponde: elenco vuoto', () => {
    expect(searchCatalog(catalog, 'zzz')).toEqual([]);
  });
});
