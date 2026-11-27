// Prova della migration 0020 (classifica degli amici per intero) senza Docker: un Postgres in memoria (PGlite) al
// posto di Supabase locale, come scripts/prova-migration-0018.mjs.
//
//   npm install --no-save @electric-sql/pglite
//   node scripts/prova-migration-0020.mjs
//
// Cosa fa: applica tutte le migration ed esegue rankings.test.sql e social.test.sql con una versione
// ridotta di pgTAP. La 0020 riscrive `ranking()`: i test delle classifiche e degli amici devono restare verdi, più i
// due nuovi (tra amici tutte le righe, negli altri ambiti le prime 3 e i vicini).
// Non sostituisce `supabase db reset && supabase test db`: auth e pgTAP qui sono imitazioni.
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
for (const f of migrations) await apply(f);

const rows = async (sql, params) => (await db.query(sql, params)).rows;

// --- pgTAP ridotto -----------------------------------------------------------------------------------------------
await db.exec(`
  create table public._tap (n serial, ok boolean, msg text);
  grant all on public._tap, public._tap_n_seq to public;
  create function public._tap(ok boolean, msg text) returns text language sql as $$
    insert into public._tap (ok, msg) values (ok, msg) returning case when ok then 'ok ' else 'not ok ' end || msg
  $$;
  create function public.plan(int) returns text language sql as $$ select '1..' || $1 $$;
  create function public.ok(got boolean, descr text) returns text language sql as $$ select public._tap(coalesce(got, false), descr) $$;
  create function public.is(got anyelement, want anyelement, descr text) returns text language sql as $$
    select public._tap(got is not distinct from want, descr || case when got is distinct from want then ' (avuto ' || coalesce(got::text, 'null') || ')' else '' end)
  $$;
  create function public.lives_ok(q text, descr text) returns text language plpgsql as $$
  begin
    begin
      execute q;
    exception when others then
      return public._tap(false, descr || ' (' || sqlstate || ': ' || sqlerrm || ')');
    end;
    return public._tap(true, descr);
  end $$;
  create function public.throws_ok(q text, code text, msg text, descr text) returns text language plpgsql as $$
  begin
    begin
      execute q;
    exception when others then
      return public._tap(sqlstate = code and (msg is null or sqlerrm = msg), descr || ' (' || sqlstate || ': ' || sqlerrm || ')');
    end;
    return public._tap(false, descr || ' (nessun errore)');
  end $$;
  create function public.finish() returns setof text language sql as $$ select null::text where false $$;
`);
for (const file of ['social.test.sql', 'rankings.test.sql']) {
  const test = read('supabase/tests/database/' + file)
    .replace(/^create extension .*$/m, '')
    .replace(/^rollback;\s*$/m, '');
  const planned = Number(test.match(/select plan\((\d+)\)/)[1]);
  await db.exec('truncate public._tap restart identity');
  try {
    await db.exec(test);
  } catch (e) {
    await db.exec('rollback');
    throw new Error(`${file}: ${e.message}`);
  }
  await db.exec('reset role');
  const tap = await rows('select ok, msg from public._tap order by n');
  await db.exec('rollback');
  const failed = tap.filter((t) => !t.ok);
  for (const t of failed) console.error('not ok', t.msg);
  assert.equal(failed.length, 0, `${file}: test falliti`);
  assert.equal(tap.length, planned, `${file}: il numero di test (${tap.length}) non è quello del plan (${planned})`);
  console.log(`${file}: ${tap.length} test su ${planned}, tutti verdi (pgTAP imitato)`);
}
