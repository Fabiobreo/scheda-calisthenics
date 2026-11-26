// Prova della migration 0019 (ticket 40) senza Docker: un Postgres in memoria (PGlite) al posto di Supabase locale,
// come scripts/prova-migration-0018.mjs.
//
//   npm install --no-save @electric-sql/pglite
//   node scripts/prova-migration-0019.mjs
//
// Cosa fa: applica le migration fino alla 0018, crea un account "di prima" con due record e i suoi punti, applica la
// 0019 e controlla che i record siano rimasti, che la voce Frog stand si possa inserire, che le voci siano 65 e che
// `level_band` abbia le soglie nuove. Non sostituisce `supabase db reset && supabase test db`.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const { PGlite } = await import(process.env.PGLITE ?? '@electric-sql/pglite');
const root = fileURLToPath(new URL('..', import.meta.url));
const read = (p) => readFileSync(root + p, 'utf8');
const db = new PGlite();

await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create schema extensions;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb);
  create function auth.uid() returns uuid language sql stable as $$
    select (nullif(current_setting('request.jwt.claims', true), '')::json ->> 'sub')::uuid
  $$;
  -- imitazione di pgcrypto (su Supabase c'è quello vero): serve ai codici d'invito
  create function extensions.gen_random_bytes(n int) returns bytea language sql volatile as $$
    select substring(decode(md5(random()::text) || md5(random()::text), 'hex') from 1 for n)
  $$;
  grant usage on schema public, auth, extensions to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
`);

const migrations = readdirSync(root + 'supabase/migrations').sort();
const apply = async (file) => {
  try {
    await db.exec(`begin;\n${read('supabase/migrations/' + file)}\ncommit;`);
  } catch (e) {
    await db.exec('rollback');
    throw new Error(`${file}: ${e.message}`);
  }
};
for (const f of migrations.filter((f) => f < '0019')) await apply(f);

const rows = async (sql, params) => (await db.query(sql, params)).rows;
const one = async (sql, params) => Object.values((await rows(sql, params))[0])[0];

const U = '11111111-0000-0000-0000-000000000001';
await db.exec(`
  insert into auth.users (id, email) values ('${U}', 'michael@test.local');
  insert into public.level_records (user_id, sub_id, stage, value, bodyweight_kg, date) values
    ('${U}', 'planche', 'tuck', 8, 70, current_date - 5),
    ('${U}', 'front-lever-touch', 'full', 4, 70, current_date - 4);
  insert into public.level_scores (user_id, ft, fs, st, ss, hb, total, rules_version) values ('${U}', 0, 0, 600, 80, 0, 680, 1);
`);
const before = await rows('select sub_id, stage, value, bodyweight_kg from public.level_records order by sub_id');
assert.equal(await one('select count(*)::int from public.level_stages'), 64);
await assert.rejects(db.exec(`insert into public.level_records (user_id, sub_id, stage, value, bodyweight_kg, date) values ('${U}', 'planche', 'frog-stand', 5, 70, current_date)`), 'prima della 0019 la voce non esiste');

await apply(migrations.find((f) => f.startsWith('0019')));

assert.deepEqual(await rows('select sub_id, stage, value, bodyweight_kg from public.level_records order by sub_id'), before, 'i record di prima restano uguali');
assert.equal(await one('select count(*)::int from public.level_stages'), 65);
assert.deepEqual(await rows(`select min_value::int, max_value::int, min_exclusive, whole, uses_bodyweight from public.level_stages where sub_id = 'planche' and stage = 'frog-stand'`), [
  { min_value: 1, max_value: 60, min_exclusive: false, whole: true, uses_bodyweight: true },
]);
await db.exec(`insert into public.level_records (user_id, sub_id, stage, value, bodyweight_kg, date) values ('${U}', 'planche', 'frog-stand', 5, 70, current_date)`);
await assert.rejects(db.exec(`insert into public.level_records (user_id, sub_id, stage, value, date) values ('${U}', 'planche', 'frog-stand', 5, current_date)`), 'senza peso corporeo no');
await assert.rejects(db.exec(`insert into public.level_records (user_id, sub_id, stage, value, bodyweight_kg, date) values ('${U}', 'planche', 'frog-stand', 61, 70, current_date)`), 'oltre i 60 secondi no');

const bands = await one(`select array_agg(public.level_band(t) order by t) from unnest(array[0, 300, 301, 800, 801, 2300, 2301, 3800, 3801, 5300, 5301, 6800]) t`);
assert.deepEqual(bands, [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
assert.equal(await one('select public.level_band(null)'), 0);
// i punti salvati con le regole vecchie restano finché l'app non li riscrive (RULES_VERSION 2)
assert.equal(await one(`select rules_version from public.level_scores where user_id = '${U}'`), 1);

// la 0019 si può rieseguire senza errori (insert con on conflict, create or replace)
await apply(migrations.find((f) => f.startsWith('0019')));
assert.equal(await one('select count(*)::int from public.level_stages'), 65);

console.log('0019: ok (record conservati, Frog stand inseribile, 65 voci, fasce 300/800/2300/3800/5300)');
