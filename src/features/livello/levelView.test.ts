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
  shownLetter,
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
// Planche tuck 10 s: frog stand pieno (100) + tuck pieno (80) = 180 punti: Skill spinta Avanzato (100–400) al 26%.
const TUCK_10 = at60('planche', 'tuck', 10);
// Frog stand 5 s: metà del primo livello, 50 punti: Skill spinta Intermedio (0–100) al 50%.
const FROG_5 = at60('planche', 'frog-stand', 5);

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
    expect(s.axes.every((a) => a.at === 0 && a.percent === 0 && a.rings.length === 0)).toBe(true);
    // le skill non hanno Base: a 0 punti sono Intermedio 0%, ma non alzano il contorno
    expect(s.axes.map((a) => a.level)).toEqual(['Base', 'Intermedio', 'Base', 'Base', 'Intermedio']);
    expect(s.name).toBe('Base');
  });

  it('una skill coi suoi primi punti porta il contorno a Intermedio', () => {
    const s = pentagonScale(levelSummary([FROG_5]));
    expect(s.band).toBe('intermedio');
    // Intermedio finisce a 100 punti nelle skill, a 200 nelle altre
    expect(axis([FROG_5], 'SS')).toMatchObject({ at: 0.5, level: 'Intermedio', percent: 50, rings: [] });
    expect(axis([FROG_5], 'ST')).toMatchObject({ at: 0, level: 'Intermedio', percent: 0, rings: [] });
    expect(axis([FROG_5], 'HB')).toMatchObject({ at: 0, level: 'Base', rings: [100 / 200] });
    expect(axis([FROG_5], 'FT').rings).toEqual([100 / 200]);
  });

  it('il contorno è la fine del livello più alto tra le categorie, ogni asse sulla fine di quel livello per la sua categoria', () => {
    const records = [TRAZIONI_10, ZAVORRA_18, TUCK_10];
    const s = pentagonScale(levelSummary(records));
    expect(s.band).toBe('avanzato');
    expect(s.name).toBe('Avanzato');
    // Avanzato finisce a 500, 400, 500, 500, 400 punti (HB, SS, FT, FS, ST)
    expect(axis(records, 'FT').at).toBeCloseTo(250 / 500);
    expect(axis(records, 'SS').at).toBeCloseTo(180 / 400);
    expect(axis(records, 'HB').at).toBe(0);
    // anelli interni: fine di Base e di Intermedio, asse per asse (le skill hanno solo Intermedio sotto)
    expect(axis(records, 'FT').rings).toEqual([100 / 500, 200 / 500]);
    expect(axis(records, 'HB').rings).toEqual([100 / 500, 200 / 500]);
    expect(axis(records, 'SS').rings).toEqual([100 / 400]);
    expect(axis(records, 'ST').rings).toEqual([100 / 400]);
  });

  it('accanto al vertice va la % dentro il livello della categoria, non la posizione sull\'asse', () => {
    const records = [TRAZIONI_10, ZAVORRA_18, TUCK_10];
    expect(axis(records, 'FT')).toMatchObject({ level: 'Avanzato', percent: 16, label: 'Fondamentali tirata' });
    expect(axis(records, 'SS')).toMatchObject({ level: 'Avanzato', percent: 26, label: 'Skill spinta' });
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
    expect(text).toContain('Skill spinta Avanzato 26%');
    expect(text).toContain('Skill tirata Intermedio 0%');
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

  it('lettere in pagina: A è il livello più difficile della catena (Michael, 25/11)', () => {
    // front lever, 8 livelli: il victorian (H nelle regole) è A, il tuck (A nelle regole) è H
    expect(shownLetter('front-lever', 'H')).toBe('A');
    expect(shownLetter('front-lever', 'G')).toBe('B');
    expect(shownLetter('front-lever', 'A')).toBe('H');
    // planche, 7 livelli: maltese A, frog stand G
    expect(shownLetter('planche', 'G')).toBe('A');
    expect(shownLetter('planche', 'A')).toBe('G');
    // military, 5 livelli
    expect(shownLetter('military', 'E')).toBe('A');
    expect(shownLetter('military', 'A')).toBe('E');
    // in ogni catena: l'ultimo livello è A, il primo ha la lettera del numero dei livelli, nessuna lettera doppia
    for (const chain of CHAINS) {
      const shown = chain.levels.map((l) => shownLetter(chain.id, l.letter));
      expect(shown.join(''), chain.id).toBe([...'ABCDEFGH'.slice(0, chain.levels.length)].reverse().join(''));
    }
    // catena o livello che le regole non conoscono: la lettera resta com'è
    expect(shownLetter('inesistente', 'C')).toBe('C');
    expect(shownLetter('military', 'H')).toBe('H');
  });

  it('livello di una catena: voce e lettera (A = il più difficile)', () => {
    // trazioni, 6 livelli: C nelle regole è il terzo → D in pagina; il primo è F
    expect(chainLevelText({ chainId: 'trazioni', level: 'C' })).toBe('Trazioni zavorrate, livello D');
    expect(chainLevelText({ chainId: 'trazioni', level: 'A' })).toBe('Australian pull up, livello F');
    expect(chainLevelText({ chainId: 'trazioni', level: 'F' })).toBe('Trazioni zavorrate, livello A');
    expect(chainLevelText({ chainId: 'front-lever', level: 'D' })).toBe('Straddle, livello E');
    expect(chainLevelText({ chainId: 'front-lever', level: 'H' })).toBe('Victorian alle parallele, livello A');
    expect(chainLevelText({ chainId: 'planche', level: 'A' })).toBe('Frog stand, livello G');
    expect(chainLevelText({ chainId: 'trazioni', level: null })).toBeNull();
  });

  it('mai le percentuali del peso corporeo delle regole (30, decisione 16)', () => {
    for (const chain of CHAINS)
      for (const level of chain.levels) {
        const text = chainLevelText({ chainId: chain.id, level: level.letter })!;
        expect(text, `${chain.id} ${level.letter}`).not.toMatch(/%|PC/);
        expect(text).toMatch(new RegExp(`, livello ${shownLetter(chain.id, level.letter)}$`));
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
    // dal più facile al più difficile, con le lettere della pagina (A = il più difficile)
    expect(entryLevelsText('trazioni', entry('trazioni', 'zavorra'))).toBe('Livelli D–A');
    expect(entryLevelsText('verticale', entry('verticale', 'verticale'))).toBe('Livelli G–F');
    expect(entryLevelsText('planche', entry('planche', 'tuck'))).toBe('Livello F');
    expect(entryLevelsText('planche', entry('planche', 'frog-stand'))).toBe('Livello G');
    expect(entryLevelsText('planche', entry('planche', 'maltese'))).toBe('Livello A');
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
    // 250 + 180 = 430 punti: il complessivo passa da Base (fino a 300) a Intermedio; Skill spinta da Intermedio
    // (0 punti) ad Avanzato (180), Fondamentali tirata da Intermedio ad Avanzato. Le categorie nell'ordine degli assi.
    const after = levelSummary([TRAZIONI_10, ZAVORRA_18, TUCK_10]);
    expect(after.total).toBe(430);
    expect(celebrations(levelSummary([TRAZIONI_10]), after)).toEqual(['Livello complessivo: Intermedio', 'Sei Avanzato in Skill spinta', 'Sei Avanzato in Fondamentali tirata']);
  });

  it('i primi punti in una skill non sono un nuovo livello: era già Intermedio a 0', () => {
    expect(celebrations(levelSummary([]), levelSummary([FROG_5]))).toEqual([]);
    // superati i 100 punti sì
    expect(celebrations(levelSummary([FROG_5]), levelSummary([FROG_5, TUCK_10]))).toEqual(['Sei Avanzato in Skill spinta']);
  });
});

describe('ladder', () => {
  it('elenca i sei livelli con le fasce e segna quello attuale', () => {
    const l = ladder('complessivo', 'intermedio', 350);
    expect(l.rows.map((r) => [r.name, r.from, r.to, r.state])).toEqual([
      ['Base', 0, 300, 'done'],
      ['Intermedio', 301, 800, 'current'],
      ['Avanzato', 801, 2300, 'todo'],
      ['Elite', 2301, 3800, 'todo'],
      ['Titano', 3801, 5300, 'todo'],
      ['Leggenda', 5301, 6800, 'todo'],
    ]);
    expect(l.next).toEqual({ name: 'Avanzato', missing: 451 });
  });

  it('usa le fasce della categoria e a Leggenda non c’è un prossimo livello', () => {
    expect(ladder('handbalance', 'base', 100).next).toEqual({ name: 'Intermedio', missing: 1 });
    expect(ladder('handbalance', 'leggenda', 1400).next).toBeNull();
    expect(ladder('skill-spinta', 'leggenda', 1300).next).toBeNull();
  });

  it('le skill hanno cinque livelli, da Intermedio', () => {
    const l = ladder('skill-tirata', 'avanzato', 180);
    expect(l.rows.map((r) => [r.name, r.from, r.to, r.state])).toEqual([
      ['Intermedio', 0, 100, 'done'],
      ['Avanzato', 101, 400, 'current'],
      ['Elite', 401, 700, 'todo'],
      ['Titano', 701, 1000, 'todo'],
      ['Leggenda', 1001, 1300, 'todo'],
    ]);
    expect(l.next).toEqual({ name: 'Elite', missing: 221 });
    expect(ladder('skill-tirata', 'intermedio', 0).next).toEqual({ name: 'Avanzato', missing: 101 });
  });
});
