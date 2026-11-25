import { describe, expect, it } from 'vitest';
import type { RankingPlace, RankingRow } from '../../data/types';
import { CATEGORIES } from '../../lib/levels';
import { privacyEmail, publicProfilesEnabled } from '../../lib/privacy';
import { METRICS, metricName, rowLevel, scopePlace, scopeTitle, tileLabel, tileText, unavailableText, withGaps } from './rankingView';

const MILANO = { country: 'IT', province: 'MI', region: 'Lombardia' };
const PARIGI = { country: 'FR', province: null, region: null };
const NESSUNO = { country: null, province: null, region: null };

const place = (p: Partial<RankingPlace>): RankingPlace => ({ scope: 'mondo', metric: 'generale', available: true, position: 1, participants: 1, score: 100, ...p });
const row = (position: number, name: string, me = false): RankingRow => ({ position, userId: name, name, score: 1000 - position, me });

describe('metriche', () => {
  it('la prima è "Generale", poi le 5 categorie del motore coi loro nomi', () => {
    expect(METRICS[0]).toBe('generale');
    expect(metricName('generale')).toBe('Generale');
    expect([...METRICS.slice(1)].sort()).toEqual(CATEGORIES.map((c) => c.id).sort());
    expect(metricName('skill-spinta')).toBe('Skill spinta');
  });

  it('il livello di una riga usa le fasce della sua metrica', () => {
    expect(rowLevel('generale', 300)).toBe('Base');
    expect(rowLevel('generale', 301)).toBe('Intermedio');
    expect(rowLevel('skill-tirata', 300)).toBe('Intermedio');
    expect(rowLevel('handbalance', 300)).toBe('Avanzato');
  });
});

describe('ambiti', () => {
  it('prendono il nome dal luogo del profilo', () => {
    expect(scopePlace('provincia', MILANO)).toBe('Milano');
    expect(scopePlace('regione', MILANO)).toBe('Lombardia');
    expect(scopePlace('nazione', MILANO)).toBe('Italia');
    expect(scopePlace('nazione', PARIGI)).toBe('Francia');
    expect(scopePlace('provincia', PARIGI)).toBeNull();
    expect(scopePlace('mondo', MILANO)).toBeNull();
    expect(scopeTitle('amici', MILANO)).toBe('Amici');
    expect(scopeTitle('provincia', NESSUNO)).toBe('Provincia');
  });

  it('chi non è in Italia non ha provincia e regione: il riquadro mostra "—"', () => {
    expect(tileText(place({ available: false, position: null, participants: 0 }))).toEqual({ big: '—', small: 'non disponibile' });
    expect(unavailableText('provincia', PARIGI)).toMatch(/solo per chi si allena in Italia/);
    expect(unavailableText('nazione', NESSUNO)).toMatch(/Indica dove ti alleni/);
  });

  it('riquadro: posizione e partecipanti, con le migliaia', () => {
    expect(tileText(place({ position: 3, participants: 12 }))).toEqual({ big: '#3', small: 'su 12' });
    expect(tileText(place({ position: 41214, participants: 42500 }))).toEqual({ big: '#41.214', small: 'su 42.500' });
    expect(tileText(place({ position: null, participants: 8 }))).toEqual({ big: '—', small: 'su 8' });
    expect(tileText(place({ position: null, participants: 0 }))).toEqual({ big: '—', small: 'ancora nessuno' });
    expect(tileText(undefined).big).toBe('…');
  });

  it('riquadro letto ad alta voce', () => {
    expect(tileLabel('provincia', MILANO, place({ position: 4, participants: 12 }))).toBe('Provincia, Milano: posizione 4 su 12');
    expect(tileLabel('regione', PARIGI, place({ available: false }))).toBe('Regione: non disponibile');
    expect(tileLabel('mondo', MILANO, place({ position: null, participants: 8 }))).toBe('Mondo: nessuna posizione, 8 partecipanti');
  });
});

describe('righe coi salti', () => {
  const kinds = (rows: RankingRow[]) => withGaps(rows).map((i) => (i.kind === 'gap' ? '⋯' : i.row.position));

  it('nessun salto tra righe consecutive', () => {
    expect(kinds([row(1, 'a'), row(2, 'b'), row(3, 'c')])).toEqual([1, 2, 3]);
  });

  it('un salto tra le prime 3 e i vicini, e dove c\'è un profilo nascosto', () => {
    expect(kinds([row(1, 'a'), row(2, 'b'), row(4, 'c'), row(40, 'd'), row(41, 'io', true)])).toEqual([1, 2, '⋯', 4, '⋯', 40, 41]);
  });

  it('a pari punti stessa posizione: non è un salto', () => {
    expect(kinds([row(1, 'a'), row(1, 'b'), row(3, 'c'), row(3, 'd'), row(5, 'e')])).toEqual([1, 1, 3, 3, 5]);
    expect(kinds([row(1, 'a'), row(3, 'b'), row(3, 'c'), row(5, 'd')])).toEqual([1, '⋯', 3, 3, 5]);
  });
});

describe('informativa', () => {
  it('senza un\'email di contatto valida i profili pubblici restano spenti', () => {
    expect(privacyEmail(undefined)).toBeNull();
    expect(privacyEmail('   ')).toBeNull();
    expect(privacyEmail('da decidere')).toBeNull();
    expect(publicProfilesEnabled('')).toBe(false);
    expect(privacyEmail(' privacy@example.com ')).toBe('privacy@example.com');
    expect(publicProfilesEnabled('privacy@example.com')).toBe(true);
  });
});
