import { describe, expect, it } from 'vitest';
import { completeCurrent, current, durationMin, isFinished, position, reconcile, skipCurrent, startSession, totalItems, upNext } from './workout';

const start = (done: string[] = []) => startSession('2026-11-10', ['a', 'b', 'c'], (id) => done.includes(id), 1_000);

describe('modalità sessione', () => {
  it('parte dalla prima riga non ancora registrata', () => {
    const s = start(['a']);
    expect(current(s)).toBe('b');
    expect(upNext(s)).toBe('c');
    expect(totalItems(s)).toBe(3);
    expect(position(s)).toBe(2);
  });

  it('salvando passa alla prossima e conta serie e record', () => {
    let s = start();
    s = completeCurrent(s, 3, { name: 'Trazioni', text: '12 rip.' });
    s = completeCurrent(s, 4);
    expect(current(s)).toBe('c');
    expect(s.done).toEqual(['a', 'b']);
    expect(s.sets).toBe(7);
    expect(s.records).toHaveLength(1);
    s = completeCurrent(s, 2);
    expect(isFinished(s)).toBe(true);
    expect(current(s)).toBeNull();
    // a sessione finita non cambia più nulla
    expect(completeCurrent(s, 5)).toBe(s);
    expect(skipCurrent(s)).toBe(s);
  });

  it('saltare la prima volta manda in fondo, la seconda toglie dalla coda', () => {
    let s = skipCurrent(start());
    expect(s.queue).toEqual(['b', 'c', 'a']);
    expect(position(s)).toBe(1);
    s = completeCurrent(completeCurrent(s, 3), 3);
    expect(current(s)).toBe('a');
    s = skipCurrent(s);
    expect(isFinished(s)).toBe(true);
    expect(s.skipped).toEqual(['a']);
    expect(s.skippedOnce).toEqual([]);
    expect(totalItems(s)).toBe(3);
  });

  it('una riga saltata e poi fatta non risulta saltata', () => {
    let s = skipCurrent(start());
    s = completeCurrent(completeCurrent(s, 1), 1);
    s = completeCurrent(s, 1);
    expect(s.done).toEqual(['b', 'c', 'a']);
    expect(s.skippedOnce).toEqual([]);
    expect(s.skipped).toEqual([]);
  });

  it('riallinea la coda col programma e con quanto registrato fuori', () => {
    const s = start();
    const r = reconcile(s, (id) => id !== 'c', (id) => id === 'b');
    expect(r.queue).toEqual(['a']);
    expect(r.done).toEqual(['b']);
    expect(totalItems(r)).toBe(2);
    // niente da cambiare: stesso oggetto
    expect(reconcile(s, () => true, () => false)).toBe(s);
  });

  it('durata in minuti, almeno 1', () => {
    const s = start();
    expect(durationMin(s, 1_000 + 10_000)).toBe(1);
    expect(durationMin(s, 1_000 + 42 * 60_000)).toBe(42);
  });
});
