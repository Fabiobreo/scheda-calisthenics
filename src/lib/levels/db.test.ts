import { expect, it } from 'vitest';
import { stageLimits } from './v2';

/**
 * Il database controlla i record con la tabella `level_stages` (migration 0012, riscritta dalla 0015 per il motore
 * v2): deve avere le stesse voci, gli stessi limiti e lo stesso uso del peso corporeo di `v2/rules.ts`. Se cambi
 * voci o limiti, scrivi una migration che aggiorna `level_stages`: questo test legge l'ultimo `insert`, cioè lo
 * stato finale (una migration che cambia righe una per una va fatta leggere qui).
 */
it('level_stages nel database coincide con le regole del motore v2', () => {
  const files = import.meta.glob<string>('../../../supabase/migrations/*.sql', { query: '?raw', import: 'default', eager: true });
  const sql = Object.keys(files)
    .sort()
    .map((f) => files[f])
    .join('\n');
  const block = [...sql.matchAll(/insert into public\.level_stages[^;]*;/g)].at(-1)?.[0];
  expect(block, 'insert in level_stages').toBeTruthy();
  expect(block).toContain('(sub_id, stage, min_value, max_value, min_exclusive, whole, uses_bodyweight)');
  const rows = [...block!.matchAll(/\('([^']+)', '([^']+)', ([\d.]+), ([\d.]+), (true|false), (true|false), (true|false)\)/g)].map((m) => ({
    chainId: m[1],
    entry: m[2],
    min: Number(m[3]),
    max: Number(m[4]),
    minExclusive: m[5] === 'true',
    whole: m[6] === 'true',
    usesBodyweight: m[7] === 'true',
  }));
  expect(rows).toEqual(stageLimits());
});
