import { describe, expect, it } from 'vitest';
import { metalUnlocked, parseLook } from './look';

describe('aspetto: scelta salvata', () => {
  it('senza niente di salvato parte da Notte e oro', () => {
    expect(parseLook(null)).toEqual({ ground: 'notte', metal: 'oro' });
  });
  it('legge fondo e metallo salvati', () => {
    expect(parseLook('{"ground":"marmo","metal":"cobalto"}')).toEqual({ ground: 'marmo', metal: 'cobalto' });
  });
  it('un valore sconosciuto o un testo rovinato tornano a quelli di partenza, senza perdere il resto', () => {
    expect(parseLook('{"ground":"neon","metal":"rame"}')).toEqual({ ground: 'notte', metal: 'rame' });
    expect(parseLook('{"ground":"marmo","metal":"plutonio"}')).toEqual({ ground: 'marmo', metal: 'oro' });
    expect(parseLook('{')).toEqual({ ground: 'notte', metal: 'oro' });
  });
});

describe('aspetto: metalli legati al livello', () => {
  it('i metalli liberi si scelgono da subito', () => {
    expect(metalUnlocked('cobalto', 'base')).toBe(true);
  });
  it('Ametista si apre da Elite in su', () => {
    expect(metalUnlocked('ametista', 'avanzato')).toBe(false);
    expect(metalUnlocked('ametista', 'elite')).toBe(true);
    expect(metalUnlocked('ametista', 'leggenda')).toBe(true);
  });
});
