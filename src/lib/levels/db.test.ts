import { expect, it } from 'vitest';
import { stageLimits } from '.';

/**
 * Il database controlla i valori dei record con la tabella `level_stages` (migration 0012): deve avere le stesse
 * progressioni e gli stessi limiti delle regole. Se cambi i limiti in rules.ts, scrivi una migration che aggiorna
 * `level_stages` e fai leggere a questo test lo stato finale.
 */
it('level_stages nel database coincide con le regole', () => {
  const files = import.meta.glob<string>('../../../supabase/migrations/*.sql', { query: '?raw', import: 'default', eager: true });
  const sql = Object.keys(files)
    .sort()
    .map((f) => files[f])
    .join('\n');
  const block = sql.match(/insert into public\.level_stages[^;]*;/)?.[0];
  expect(block, 'insert in level_stages').toBeTruthy();
  const rows = [...block!.matchAll(/\('([^']+)', '([^']+)', ([\d.]+), ([\d.]+), (true|false)\)/g)].map((m) => ({
    subId: m[1],
    stage: m[2],
    min: Number(m[3]),
    max: Number(m[4]),
    whole: m[5] === 'true',
  }));
  expect(rows).toEqual(stageLimits());
});
