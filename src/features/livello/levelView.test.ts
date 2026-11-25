import { describe, expect, it } from 'vitest';
import { availableEntries, CATEGORIES, CHAINS, levelSummary, type LevelRecord } from '../../lib/levels';
import {
  AXES,
  CARDS,
  SIGLA,
  celebrations,
  chainLevelText,
  chainPercent,
  entryLevelsText,
  errorField,
  ladder,
  lastBodyweight,
  missingBodyweight,
  pentagonScale,
  pentagonText,
  recordText,
  validationMessage,
  valueHint,
  valueLabel,
} from './levelView';

/** Record a 60 kg di peso corporeo: a 60 kg la normalizzazione non cambia niente e i conti si fanno a mano. */
const at60 = (chainId: string, entry: string, value: number): LevelRecord => ({ chainId, entry, value, bodyweightKg: 60 });

// Trazioni: A e B pieni con 10 ripetizioni (200 punti, Intermedio al 100%); con 18 kg di zavorra G = 78, metà del
// livello C (69–87): 250 punti, Avanzato (200–500) al 16%.
const TRAZIONI_10 = at60('trazioni', 'ripetizioni', 10);
const ZAVORRA_18 = at60('trazioni', 'zavorra', 18);
// Planche tuck 10 s: livello A pieno, 100 punti: Skill spinta Base al 100%.
const TUCK_10 = at60('planche', 'tuck', 10);

const axis = (records: LevelRecord[], code: string) => pentagonScale(levelSummary(records)).axes.find((a) => a.code === code)!;

describe('ordine e sigle delle categorie', () => {
  it('ci sono tutte e 5 le categorie, una volta sola, nell\'ordine HB, SS, FT, FS, ST', () => {
    expect([...AXES].sort()).toEqual(CATEGORIES.map((c) => c.id).sort());
    expect(AXES.map((id) => SIGLA[id])).toEqual(['HB', 'SS', 'FT', 'FS', 'ST']);
  });

  it('le schede seguono il mockup: HB, SS, FS, ST, FT', () => {
    expect([...CARDS].sort()).toEqual([...AXES].sort());
    expect(CARDS.map((id) => SIGLA[id])).toEqual(['HB', 'SS', 'FS', 'ST', 'FT']);
  });
});

describe('scala del pentagono (30, decisione 5)', () => {
  it('senza record: contorno Base, tutto a zero, nessun anello interno', () => {
    const s = pentagonScale(levelSummary([]));
    expect(s.band).toBe('base');
    expect(s.axes.map((a) => a.code)).toEqual(['HB', 'SS', 'FT', 'FS', 'ST']);
    expect(s.axes.every((a) => a.at === 0 && a.percent === 0 && a.level === 'Base' && a.rings.length === 0)).toBe(true);
  });

  it('il contorno è la fine del livello più alto tra le categorie, ogni asse sulla fine di quel livello per la sua categoria', () => {
    const records = [TRAZIONI_10, ZAVORRA_18, TUCK_10];
    const s = pentagonScale(levelSummary(records));
    expect(s.band).toBe('avanzato');
    expect(s.name).toBe('Avanzato');
    // Avanzato finisce a 500, 684, 500, 500, 666 punti
    expect(axis(records, 'FT').at).toBeCloseTo(250 / 500);
    expect(axis(records, 'SS').at).toBeCloseTo(100 / 684);
    expect(axis(records, 'HB').at).toBe(0);
    // anelli interni: fine di Base e di Intermedio, asse per asse
    expect(axis(records, 'FT').rings).toEqual([100 / 500, 200 / 500]);
    expect(axis(records, 'SS').rings).toEqual([100 / 684, 500 / 684]);
    expect(axis(records, 'ST').rings).toEqual([200 / 666, 500 / 666]);
  });

  it('accanto al vertice va la % dentro il livello della categoria, non la posizione sull\'asse', () => {
    const records = [TRAZIONI_10, ZAVORRA_18, TUCK_10];
    expect(axis(records, 'FT')).toMatchObject({ level: 'Avanzato', percent: 16, label: 'Fondamentali tirata' });
    expect(axis(records, 'SS')).toMatchObject({ level: 'Base', percent: 100, label: 'Skill spinta' });
  });

  it('passando da Intermedio ad Avanzato il contorno cambia scala', () => {
    const before = [TRAZIONI_10];
    expect(pentagonScale(levelSummary(before)).band).toBe('intermedio');
    // 200 punti su 200: sul contorno
    expect(axis(before, 'FT').at).toBe(1);
    expect(axis(before, 'FT').rings).toEqual([100 / 200]);
    const after = [...before, ZAVORRA_18];
    expect(pentagonScale(levelSummary(after)).band).toBe('avanzato');
    expect(axis(after, 'FT').at).toBeCloseTo(0.5);
  });

  it('testo alternativo con nomi e valori per intero', () => {
    const text = pentagonText(pentagonScale(levelSummary([TRAZIONI_10, ZAVORRA_18, TUCK_10])));
    expect(text).toContain('fine del livello Avanzato');
    expect(text).toContain('Fondamentali tirata Avanzato 16%');
    expect(text).toContain('Skill spinta Base 100%');
    expect(text).toContain('Handbalance Base 0%');
  });
});

describe('testi', () => {
  it('record leggibili', () => {
    expect(recordText({ subId: 'trazioni', stage: 'zavorra', value: 30 })).toBe('Trazioni zavorrate 30 kg');
    expect(recordText({ subId: 'trazioni', stage: 'zavorra', value: 32.5 })).toBe('Trazioni zavorrate 32,5 kg');
    expect(recordText({ subId: 'military', stage: 'massimale', value: 60 })).toBe('Military massimale 60 kg');
    expect(recordText({ subId: 'planche', stage: 'straddle', value: 5 })).toBe('Straddle · 5 s');
    expect(recordText({ subId: 'trazioni', stage: 'ripetizioni', value: 8 })).toBe('Trazioni a ripetizioni · 8 rip.');
    // voce che le regole non conoscono: col suo identificativo
    expect(recordText({ subId: 'planche', stage: 'half-lay', value: 3 })).toBe('half-lay · 3');
  });

  it('livello di una catena: voce e lettera', () => {
    expect(chainLevelText({ chainId: 'trazioni', level: 'C' })).toBe('Trazioni zavorrate, livello C');
    expect(chainLevelText({ chainId: 'trazioni', level: 'A' })).toBe('Australian pull up, livello A');
    expect(chainLevelText({ chainId: 'front-lever', level: 'D' })).toBe('Straddle, livello D');
    expect(chainLevelText({ chainId: 'trazioni', level: null })).toBeNull();
  });

  it('mai le percentuali del peso corporeo delle regole (30, decisione 16)', () => {
    for (const chain of CHAINS)
      for (const level of chain.levels) {
        const text = chainLevelText({ chainId: chain.id, level: level.letter })!;
        expect(text, `${chain.id} ${level.letter}`).not.toMatch(/%|PC/);
        expect(text).toMatch(new RegExp(`, livello ${level.letter}$`));
      }
  });

  it('% del livello di una catena: intera, per difetto, mai 0 se il livello c\'è', () => {
    expect(chainPercent({ level: 'C', percent: 50.4 })).toBe(50);
    expect(chainPercent({ level: 'C', percent: 99.99 })).toBe(99);
    expect(chainPercent({ level: 'C', percent: 100 })).toBe(100);
    expect(chainPercent({ level: 'A', percent: 1 })).toBe(1);
    expect(chainPercent({ level: null, percent: 0 })).toBe(0);
  });

  it('campo del valore: etichetta, suggerimento e livelli della voce', () => {
    const entry = (chain: 'trazioni' | 'panca-piana' | 'planche' | 'verticale', id: string) => availableEntries(chain, []).find((o) => o.entryId === id)!;
    expect(valueLabel(entry('trazioni', 'zavorra'))).toBe('Zavorra (kg)');
    expect(valueHint(entry('trazioni', 'zavorra'))).toMatch(/Solo la zavorra.*maggiore di 0/);
    expect(valueLabel(entry('panca-piana', 'massimale'))).toBe('Massimale (kg)');
    expect(valueHint(entry('panca-piana', 'massimale'))).toMatch(/Massimale su 1 ripetizione/);
    expect(valueLabel(entry('trazioni', 'ripetizioni'))).toBe('Ripetizioni');
    expect(valueHint(entry('trazioni', 'ripetizioni'))).toBe('Da 1 a 50 ripetizioni.');
    expect(valueLabel(entry('planche', 'tuck'))).toBe('Secondi');
    expect(valueHint(entry('planche', 'tuck'))).toBe('Da 1 a 60 secondi.');
    expect(entryLevelsText(entry('trazioni', 'zavorra'))).toBe('Livelli C–F');
    expect(entryLevelsText(entry('verticale', 'verticale'))).toBe('Livelli B–C');
    expect(entryLevelsText(entry('planche', 'tuck'))).toBe('Livello A');
  });

  it('messaggi di errore coi limiti della voce, sul campo giusto', () => {
    const tuck = availableEntries('planche', []).find((o) => o.entryId === 'tuck');
    const zavorra = availableEntries('trazioni', []).find((o) => o.entryId === 'zavorra');
    const massimale = availableEntries('military', []).find((o) => o.entryId === 'massimale');
    expect(validationMessage('above-max', tuck)).toBe('Il massimo è 60 s');
    expect(validationMessage('below-min', tuck)).toBe('Il minimo è 1 s');
    expect(validationMessage('not-integer', tuck)).toBe('Solo numeri interi');
    expect(validationMessage('below-min', zavorra)).toBe('La zavorra deve essere maggiore di 0');
    expect(validationMessage('above-max', zavorra)).toBe('Il massimo è 400 kg');
    expect(validationMessage('below-min', massimale)).toBe('Il massimale deve essere maggiore di 0');
    expect(validationMessage('bodyweight-missing', zavorra)).toBe('Inserisci il tuo peso corporeo');
    expect(validationMessage('bodyweight-out-of-range', zavorra)).toBe('Il peso corporeo va tra 30 e 250 kg');
    expect(validationMessage('entry-complete', tuck)).toMatch(/già completo/);
    expect(errorField('bodyweight-missing')).toBe('bodyweight');
    expect(errorField('bodyweight-out-of-range')).toBe('bodyweight');
    expect(errorField('below-min')).toBe('value');
    expect(errorField('entry-complete')).toBe('entry');
  });
});

describe('peso corporeo nel foglio del record', () => {
  it('si propone quello dell\'ultimo record che ne ha uno', () => {
    const row = (date: string, createdAt: string, bodyweightKg: number | null) => ({ date, createdAt, bodyweightKg });
    expect(lastBodyweight([])).toBeNull();
    expect(lastBodyweight([row('2026-11-01', 'a', null)])).toBeNull();
    expect(lastBodyweight([row('2026-11-01', 'a', 74), row('2026-11-10', 'b', 76.5), row('2026-11-20', 'c', null)])).toBe(76.5);
    // stesso giorno: vale l'ultimo inserito
    expect(lastBodyweight([row('2026-11-10', 'b', 76), row('2026-11-10', 'a', 75)])).toBe(76);
  });

  it('un record che usa il peso e non ce l\'ha si riconosce (non conta finché non lo si aggiunge)', () => {
    expect(missingBodyweight({ chainId: 'trazioni', entry: 'zavorra', value: 20, bodyweightKg: null })).toBe(true);
    expect(missingBodyweight({ chainId: 'trazioni', entry: 'zavorra', value: 20, bodyweightKg: 70 })).toBe(false);
    // l'australian non usa il peso
    expect(missingBodyweight({ chainId: 'trazioni', entry: 'australian', value: 10, bodyweightKg: null })).toBe(false);
  });
});

describe('celebrazioni', () => {
  it('niente se nessun livello sale', () => {
    const s = levelSummary([TRAZIONI_10]);
    expect(celebrations(s, s)).toEqual([]);
    // stessa fascia, solo più punti
    expect(celebrations(levelSummary([at60('trazioni', 'ripetizioni', 6)]), s)).toEqual([]);
    // record peggiore: nessuna festa
    expect(celebrations(s, levelSummary([TRAZIONI_10, at60('trazioni', 'ripetizioni', 3)]))).toEqual([]);
    // un livello che scende (record corretto al ribasso) non si festeggia
    expect(celebrations(levelSummary([TRAZIONI_10, ZAVORRA_18]), s)).toEqual([]);
  });

  it('nuovo livello di una categoria', () => {
    expect(celebrations(levelSummary([TRAZIONI_10]), levelSummary([TRAZIONI_10, ZAVORRA_18]))).toEqual(['Sei Avanzato in Fondamentali tirata']);
    expect(celebrations(levelSummary([]), levelSummary([TRAZIONI_10]))).toEqual(['Sei Intermedio in Fondamentali tirata']);
  });

  it('nuovo livello complessivo, per primo', () => {
    // 250 + 100 = 350 punti: il complessivo passa da Base (fino a 300) a Intermedio; Skill spinta resta Base
    const after = levelSummary([TRAZIONI_10, ZAVORRA_18, TUCK_10]);
    expect(after.total).toBe(350);
    expect(celebrations(levelSummary([TRAZIONI_10]), after)).toEqual(['Livello complessivo: Intermedio', 'Sei Avanzato in Fondamentali tirata']);
  });
});

describe('ladder', () => {
  it('elenca i sei livelli con le fasce e segna quello attuale', () => {
    const l = ladder('complessivo', 'intermedio', 350);
    expect(l.rows.map((r) => [r.name, r.from, r.to, r.state])).toEqual([
      ['Base', 0, 300, 'done'],
      ['Intermedio', 301, 800, 'current'],
      ['Avanzato', 801, 2500, 'todo'],
      ['Elite', 2501, 4000, 'todo'],
      ['Titano', 4001, 5500, 'todo'],
      ['Leggenda', 5501, 7000, 'todo'],
    ]);
    expect(l.next).toEqual({ name: 'Avanzato', missing: 451 });
  });

  it('usa le fasce della categoria e a Leggenda non c’è un prossimo livello', () => {
    expect(ladder('skill-tirata', 'base', 200).next).toEqual({ name: 'Intermedio', missing: 1 });
    expect(ladder('handbalance', 'leggenda', 1400).next).toBeNull();
  });
});
