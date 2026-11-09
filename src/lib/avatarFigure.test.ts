import { describe, expect, it } from 'vitest';
import { bolts, figure, isAvatarBody, shapeAt, stageT } from './avatarFigure';

/** Larghezza massima della figura: il punto più a destra del contorno. */
const maxX = (d: string) => Math.max(...[...d.matchAll(/(-?\d+\.?\d*) (-?\d+\.?\d*)/g)].map((m) => Number(m[1])));

describe('avatar: figura', () => {
  it('stadio fuori scala riportato tra 0 e 19', () => {
    expect(stageT(-3)).toBe(0);
    expect(stageT(25)).toBe(1);
    expect(figure('m', 25)).toEqual(figure('m', 19));
  });

  it('20 stadi diversi per corpo, stessa posa: testa sempre allo stesso posto', () => {
    for (const b of ['m', 'f'] as const) {
      const all = Array.from({ length: 20 }, (_, s) => figure(b, s));
      expect(new Set(all.map((f) => f.body)).size).toBe(20);
      expect(new Set(all.map((f) => `${f.head.cx},${f.head.cy}`)).size).toBe(1);
      for (const f of all) {
        expect(f.body).toMatch(/^M[\d. ]+ C/);
        expect(f.body.endsWith('Z')).toBe(true);
        expect(f.body).not.toMatch(/NaN|Infinity/);
      }
    }
  });

  it('salendo di stadio spalle e braccia si allargano, la vita no', () => {
    for (const b of ['m', 'f'] as const) {
      const widths = Array.from({ length: 20 }, (_, s) => maxX(figure(b, s).body));
      for (let s = 1; s < 20; s++) expect(widths[s]).toBeGreaterThan(widths[s - 1]);
      expect(shapeAt(b, 19).waist).toBeLessThanOrEqual(shapeAt(b, 0).waist);
      expect(shapeAt(b, 19).lat - shapeAt(b, 19).waist).toBeGreaterThan(shapeAt(b, 0).lat - shapeAt(b, 0).waist);
    }
  });

  it('la figura resta dentro il riquadro', () => {
    for (const b of ['m', 'f'] as const) for (let s = 0; s < 20; s++) expect(maxX(figure(b, s).body)).toBeLessThan(92);
  });

  it('donna: spalle più strette, fianchi più larghi, capelli raccolti', () => {
    expect(shapeAt('f', 10).lat).toBeLessThan(shapeAt('m', 10).lat);
    expect(shapeAt('f', 10).hip).toBeGreaterThan(shapeAt('m', 10).hip);
    expect(figure('f', 0).bun).not.toBeNull();
    expect(figure('m', 0).bun).toBeNull();
  });

  it('la definizione dei muscoli cresce con lo stadio', () => {
    const ink = (s: number) => figure('m', s).lines.reduce((a, l) => a + l.o, 0);
    expect(ink(19)).toBeGreaterThan(ink(10));
    expect(ink(10)).toBeGreaterThan(ink(0));
  });

  it('valori ammessi per la scelta', () => {
    expect(isAvatarBody('m')).toBe(true);
    expect(isAvatarBody('f')).toBe(true);
    expect(isAvatarBody('x')).toBe(false);
    expect(isAvatarBody(null)).toBe(false);
  });
});

describe('avatar: scosse', () => {
  it('nessuna a zero, metà a metà, tutte a 1', () => {
    expect(bolts(0)).toEqual([]);
    expect(bolts(0.5)).toHaveLength(4);
    expect(bolts(1)).toHaveLength(8);
    expect(bolts(3)).toHaveLength(8);
  });
  it('sempre le stesse (niente tremolio tra un disegno e l\'altro)', () => {
    expect(bolts(1)).toEqual(bolts(1));
  });
});
