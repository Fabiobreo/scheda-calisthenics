import { describe, expect, it } from 'vitest';
import type { CatalogExercise } from '../data/types';
import { byCategory, matchCatalog } from './catalog';

const c = (id: string, name: string, category: CatalogExercise['category'], aliases: string[] = []): CatalogExercise => ({
  id,
  name,
  category,
  defaultType: 'forza',
  aliases,
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
