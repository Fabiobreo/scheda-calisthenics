import { describe, expect, it } from 'vitest';
import { stageLimits } from './v2';

/**
 * Conversione dei record del ticket 32 (migration 0015): ogni progressione del motore vecchio deve avere una sorte
 * precisa (resta, cambia nome, va al livello sotto, si elimina) e finire su una voce che esiste nel motore v2.
 * Qui si legge il testo della migration; l'esecuzione vera su un database è in scripts/prova-migration-0015.mjs.
 */
const sql = Object.values(import.meta.glob<string>('../../../supabase/migrations/0015_levels_v2.sql', { query: '?raw', import: 'default', eager: true }))[0];

/**
 * Le 56 progressioni del motore vecchio (migration 0012), cancellato col ticket 34: restano qui come dato fisso,
 * perché sono quello che la migration deve saper convertire.
 */
const OLD_STAGES: Record<string, string[]> = {
  trazioni: ['zavorra'],
  'muscle-up': ['zavorra'],
  oap: ['gomito', 'bicipite', 'spalla', 'oap'],
  dip: ['zavorra'],
  military: ['bilanciere'],
  'panca-piana': ['bilanciere'],
  planche: ['tuck', 'advanced-tuck', 'one-leg', 'straddle', 'half-lay', 'full', 'wide', 'maltese'],
  'planche-push-up': ['tuck', 'advanced-tuck', 'one-leg', 'straddle', 'half-lay', 'full'],
  'planche-press': ['tuck', 'advanced-tuck', 'one-leg', 'straddle', 'half-lay', 'full'],
  'front-lever': ['tuck', 'advanced-tuck', 'one-leg', 'straddle', 'half-lay', 'full', 'wide', 'victorian'],
  'front-lever-pull-up': ['tuck', 'advanced-tuck', 'one-leg', 'straddle', 'half-lay', 'full', 'wide'],
  'front-lever-touch': ['tuck', 'advanced-tuck', 'one-leg', 'straddle', 'half-lay', 'full', 'wide'],
  verticale: ['verticale', 'straddle-mono-braccio', 'full-mono-braccio'],
  hspu: ['libera', 'zavorra'],
};
const oldStageLimits = () => Object.entries(OLD_STAGES).flatMap(([subId, stages]) => stages.map((stage) => ({ subId, stage })));

const key = (sub: string, stage: string) => `${sub}/${stage}`;
const v2 = new Set(stageLimits().map((l) => key(l.chainId, l.entry)));

/** `('catena', 'voce vecchia', 'voce nuova')` dentro l'update che rinomina le voci. */
const renamed = new Map(
  [...sql.match(/set stage = m\.new_stage[\s\S]*?as m \(sub_id, old_stage, new_stage\)/)![0].matchAll(/\('([^']+)', '([^']+)', '([^']+)'\)/g)].map((m) => [key(m[1], m[2]), m[3]]),
);
/** `update … set stage = 'x', value = n where sub_id = 'catena' and stage = 'voce'`: progressioni tolte, al livello sotto. */
const moved = new Map(
  [...sql.matchAll(/set stage = '([^']+)', value = (\d+) where sub_id = '([^']+)' and stage = '([^']+)'/g)].map((m) => [key(m[3], m[4]), { stage: m[1], value: Number(m[2]) }]),
);
/** `delete … where sub_id in ('a', 'b') and stage = 'voce'`. */
const deleted = new Set(
  [...sql.matchAll(/delete from public\.level_records\s+where sub_id in \(([^)]+)\) and stage = '([^']+)'/g)].flatMap((m) =>
    [...m[1].matchAll(/'([^']+)'/g)].map((s) => key(s[1], m[2])),
  ),
);

/** Che fine fa una progressione vecchia: la voce v2, oppure null se si elimina. */
function fate(sub: string, stage: string): string | null {
  const k = key(sub, stage);
  if (deleted.has(k)) return null;
  return moved.get(k)?.stage ?? renamed.get(k) ?? stage;
}

describe('conversione dei record al formato v2 (migration 0015)', () => {
  it('le progressioni vecchie sono 56', () => {
    expect(oldStageLimits()).toHaveLength(56);
  });

  it('ogni progressione vecchia finisce su una voce del motore v2, oppure è tra quelle eliminate', () => {
    for (const { subId, stage } of oldStageLimits()) {
      const to = fate(subId, stage);
      if (to !== null) expect(v2.has(key(subId, to)), `${subId}/${stage} → ${to}`).toBe(true);
    }
  });

  it('la tabella del ticket 32', () => {
    // stesso significato
    for (const sub of ['trazioni', 'muscle-up', 'dip', 'hspu']) expect(fate(sub, 'zavorra')).toBe('zavorra');
    expect(fate('military', 'bilanciere')).toBe('massimale');
    expect(fate('panca-piana', 'bilanciere')).toBe('massimale');
    expect(['gomito', 'bicipite', 'spalla', 'oap'].map((s) => fate('oap', s))).toEqual(['avambraccio', 'bicipite', 'spalla', 'ripetizioni']);
    expect(['tuck', 'advanced-tuck', 'one-leg', 'straddle', 'full', 'maltese'].map((s) => fate('planche', s))).toEqual(['tuck', 'advanced-tuck', 'one-leg', 'straddle', 'full', 'maltese']);
    expect(fate('verticale', 'verticale')).toBe('verticale');
    expect(fate('verticale', 'straddle-mono-braccio')).toBe('oahs-straddle');
    expect(fate('verticale', 'full-mono-braccio')).toBe('oahs');
    expect(fate('hspu', 'libera')).toBe('liberi');
    // tolte: al livello subito sotto, pieno
    expect(moved.get('planche/half-lay')).toEqual({ stage: 'straddle', value: 10 });
    expect(moved.get('planche/wide')).toEqual({ stage: 'full', value: 10 });
    expect(moved.get('planche-push-up/half-lay')).toEqual({ stage: 'straddle', value: 5 });
    expect(moved.get('planche-press/half-lay')).toEqual({ stage: 'straddle', value: 3 });
    expect(moved.size).toBe(4);
    // eliminate (30, decisione 8)
    expect([...deleted].sort()).toEqual(['front-lever-pull-up/tuck', 'front-lever-touch/tuck']);
    // verticale oltre 60 secondi e zavorra a zero
    expect(sql).toContain(`set value = 60 where sub_id = 'verticale' and stage = 'verticale' and value > 60`);
    expect(sql).toContain(`delete from public.level_records where stage = 'zavorra' and value <= 0`);
  });

  it('solo le voci elencate cambiano: le altre hanno lo stesso identificativo nei due motori', () => {
    const changed = oldStageLimits().filter(({ subId, stage }) => fate(subId, stage) !== stage).map(({ subId, stage }) => key(subId, stage));
    expect(changed.sort()).toEqual([...renamed.keys(), ...moved.keys(), ...deleted].sort());
  });
});
