import { CATEGORIES, type CatalogExercise, type Exercise, type ExerciseType } from '../data/types';

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

/** Voce del catalogo che ha questo nome o sinonimo, maiuscole e spazi a parte. */
export function matchCatalog(catalog: CatalogExercise[], name: string): CatalogExercise | undefined {
  const n = norm(name);
  return catalog.find((c) => norm(c.name) === n || c.aliases.includes(n));
}

/** Voci in ordine di categoria (tirata, spinta, gambe, core, skill), poi come arrivano dal catalogo. */
export const byCategory = (catalog: CatalogExercise[]) =>
  [...catalog].sort((a, b) => CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category));

/** Tipo da proporre per un esercizio mai programmato: il predefinito della sua voce del catalogo, altrimenti volume. */
export const defaultType = (catalog: CatalogExercise[], ex: Pick<Exercise, 'catalogId'> | undefined): ExerciseType =>
  catalog.find((c) => c.id === ex?.catalogId)?.defaultType ?? 'volume';

/** Minuscole, senza accenti e spazi doppi: "Pistol  squàt" e "pistol squat" sono la stessa ricerca. */
const fold = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * Ricerca nel catalogo (ticket 35): per nome, sinonimo o nome del gruppo (`groupLabel`, es. "Skill").
 * Ricerca vuota = tutto il catalogo, nello stesso ordine.
 */
export function searchCatalog(catalog: CatalogExercise[], query: string, groupLabel: (c: CatalogExercise) => string = () => ''): CatalogExercise[] {
  const q = fold(query);
  return q ? catalog.filter((c) => [c.name, groupLabel(c), ...c.aliases].some((t) => fold(t).includes(q))) : catalog;
}
