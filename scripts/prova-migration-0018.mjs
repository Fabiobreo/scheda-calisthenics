// Prova della migration 0018 (ticket 39) senza Docker: un Postgres in memoria (PGlite) al posto di Supabase locale,
// come scripts/prova-migration-0017.mjs.
//
//   npm install --no-save @electric-sql/pglite
//   node scripts/prova-migration-0018.mjs
//
// (oppure PGLITE=file:///percorso/di/@electric-sql/pglite/dist/index.js se il pacchetto è installato altrove)
//
// Cosa fa:
//   1. crea il minimo di Supabase che serve alle migration (schema auth, ruoli, privilegi di default);
//   2. applica le migration fino alla 0017, crea tre account "di prima" con record, punti e chi segue chi, applica la
//      0018 e controlla che niente di quello che c'era sia cambiato e che non nascano novità da sole;
//   3. esegue supabase/tests/database/social.test.sql, rankings.test.sql e levels.test.sql con una versione ridotta
//      di pgTAP (le classifiche sono state riscritte per i blocchi: i 72 test del 38 devono restare verdi);
//   4. carica 50.000 account, fa seguire una persona da 2.000 e misura: la classifica nazionale (riscritta), la
//      scrittura dei punti di chi ha 2.000 persone che lo seguono (il trigger dei sorpassi), le novità, la ricerca.
// Non sostituisce `supabase test db`: auth e pgTAP qui sono imitazioni, e i tempi sono quelli di un Postgres in
// WebAssembly, non di Supabase. Serve dove Docker non c'è.
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
for (const f of migrations.filter((f) => f < '0018')) await apply(f);

const rows = async (sql, params) => (await db.query(sql, params)).rows;
const one = async (sql, params) => Object.values((await rows(sql, params))[0])[0];

// --- Account di prima ------------------------------------------------------------------------------------------
const OLD = [1, 2, 3].map((n) => `11111111-0000-0000-0000-00000000000${n}`);
await db.exec(`
  insert into auth.users (id, email) values ('${OLD[0]}', 'michael@test.local'), ('${OLD[1]}', 'fabio@test.local'), ('${OLD[2]}', 'senza-nome@test.local');
  update public.profiles set display_name = 'Michael', is_trainer = true, country = 'IT', province = 'MI', is_private = false where id = '${OLD[0]}';
  update public.profiles set display_name = 'Fabio', country = 'IT', province = 'BG' where id = '${OLD[1]}';
  insert into public.level_records (user_id, sub_id, stage, value, bodyweight_kg, date) values
    ('${OLD[0]}', 'trazioni', 'zavorra', 40, 78, current_date - 5),
    ('${OLD[0]}', 'verticale', 'verticale', 45, null, current_date - 4),
    ('${OLD[1]}', 'verticale', 'muro', 20, null, current_date - 3);
  insert into public.level_scores (user_id, ft, fs, st, ss, hb, total, rules_version) values
    ('${OLD[0]}', 600, 0, 0, 0, 400, 1000, 1), ('${OLD[1]}', 0, 0, 0, 0, 80, 80, 1);
  insert into public.follows (follower, followee, status) values ('${OLD[1]}', '${OLD[0]}', 'accepted'), ('${OLD[0]}', '${OLD[1]}', 'pending');
`);
const snapshot = async () => ({
  profiles: await rows(`select id, display_name, is_trainer, country, province, region, is_private, created_at::text from public.profiles order by id`),
  records: await rows(`select id, user_id, sub_id, stage, value, bodyweight_kg, date::text, note, created_at::text, updated_at::text from public.level_records order by id`),
  scores: await rows(`select * from public.level_scores order by user_id`),
  follows: await rows(`select * from public.follows order by follower`),
});
const before = await snapshot();

await apply('0018_social.sql');

assert.deepEqual(await snapshot(), before, 'profili, record, punti e chi segue chi: niente di quello che c\'era cambia');
assert.deepEqual(await rows(`select distinct share_records from public.profiles`), [{ share_records: true }], 'condivisione dei record accesa per tutti');
assert.deepEqual(await rows(`select distinct shared from public.level_records`), [{ shared: true }], 'record esistenti condivisibili');
for (const t of ['feed_events', 'record_candidates', 'shared_workouts', 'blocks', 'reports', 'follow_invites', 'feed_reads', 'follow_log'])
  assert.equal(await one(`select count(*)::int from public.${t}`), 0, `${t} nasce vuota`);
// i punti di chi c'era non cambiano con la migration: nessuna novità retroattiva. La prima scrittura dei punti da
// parte dell'app, a parità di punti, non ne crea.
await db.exec(`update public.level_scores set total = total`);
assert.equal(await one(`select count(*)::int from public.feed_events`), 0, 'riscrivere gli stessi punti non crea novità');
console.log('0018 applicata: dati esistenti invariati, tabelle nuove vuote, nessuna novità retroattiva');
await db.exec(`delete from auth.users where id::text like '11111111-%'`);

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
for (const file of ['social.test.sql', 'rankings.test.sql', 'levels.test.sql']) {
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

// --- 50.000 account: tempi ---------------------------------------------------------------------------------------
const N = 50_000;
const t0 = performance.now();
await db.exec(`
  insert into auth.users (id, email, raw_user_meta_data)
  select ('22222222-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid, 'u' || g || '@test.local',
         jsonb_build_object('country', 'IT', 'province', (array(select code from public.provinces order by code))[1 + (g * 7919) % 107])
  from generate_series(1, ${N}) g;
  update public.profiles set display_name = 'Atleta ' || right(id::text, 5), is_private = (right(id::text, 5)::int % 5 <> 0)
  where id::text like '22222222-%';
  insert into public.level_scores (user_id, ft, fs, st, ss, hb, total, rules_version)
  select id, ft, fs, st, ss, hb, ft + fs + st + ss + hb, 1
  from (
    select id, (random() * 1300)::int as ft, (random() * 1300)::int as fs, (random() * 1300)::int as st,
           (random() * 1300)::int as ss, (random() * 1300)::int as hb
    from public.profiles where id::text like '22222222-%'
  ) s;
`);
const uid = (g) => `22222222-0000-0000-0000-${String(g).padStart(12, '0')}`;
const STAR = uid(5); // pubblico: lo seguono in 2.000
const ME = uid(4242); // privato: segue 40 persone, tra cui STAR
await db.exec(`
  insert into public.follows (follower, followee, status)
  select ('22222222-0000-0000-0000-' || lpad((g * 23)::text, 12, '0'))::uuid, '${STAR}', 'accepted' from generate_series(1, 2000) g where g * 23 <> 5;
  insert into public.follows (follower, followee, status)
  select '${ME}', ('22222222-0000-0000-0000-' || lpad((g * 1237)::text, 12, '0'))::uuid, 'accepted' from generate_series(1, 40) g;
  insert into public.follows (follower, followee, status) values ('${ME}', '${STAR}', 'accepted') on conflict do nothing;
  insert into public.blocks (blocker, blocked) select '${ME}', ('22222222-0000-0000-0000-' || lpad((g * 311)::text, 12, '0'))::uuid from generate_series(1, 20) g;
  -- 30 novità a testa per chi è seguito da ME
  insert into public.shared_workouts (user_id, name, date, items)
  select f.followee, 'Giorno ' || g, current_date - g, '[{"name": "x"}]' from public.follows f, generate_series(11, 15) g where f.follower = '${ME}';
  analyze;
`);
console.log(`\n${N} account caricati in ${((performance.now() - t0) / 1000).toFixed(1)} s`);

const asUser = (id) => db.exec(`set role authenticated; select set_config('request.jwt.claims', '{"sub":"${id}","role":"authenticated"}', false);`);
const time = async (fn, n = 5) => {
  await fn();
  const ms = [];
  for (let i = 0; i < n; i++) {
    const t = performance.now();
    await fn();
    ms.push(performance.now() - t);
  }
  return ms.sort((a, b) => a - b)[Math.floor(n / 2)];
};

await asUser(ME);
const times = {};
times['classifica nazione / generale'] = await time(() => one(`select public.ranking('nazione', 'generale')`));
times['riepilogo dei 5 ambiti / generale'] = await time(() => one(`select public.ranking_overview('generale')`));
times['novità (30)'] = await time(() => one(`select public.feed(30)`));
times['le mie persone'] = await time(() => one(`select public.my_people()`));
times['ricerca "atleta 12"'] = await time(() => one(`select public.search_people('atleta 12')`));
const feed = await one(`select public.feed(30)`);
assert.equal(feed.events.length, 30, 'novità: 30 righe');
const found = await one(`select public.search_people('atleta 12')`);
assert.equal(found.length, 20, 'ricerca: 20 risultati');
assert.equal(found.every((p) => p.isPrivate && p.relation !== 'accepted' ? p.country === null : true), true, 'ricerca: dei privati non seguiti niente luogo');

// il trigger dei sorpassi quando scrive i punti chi è seguito da 2.000 persone
await asUser(STAR);
let step = 0;
times['punti di chi ha 2.000 persone che lo seguono'] = await time(async () => {
  step += 1;
  await db.exec(`update public.level_scores set hb = ${step}, total = ft + fs + st + ss + ${step} where user_id = '${STAR}'`);
}, 5);
await db.exec('reset role');
const overtakes = await one(`select count(*)::int from public.feed_events where kind = 'overtake' and actor = '${STAR}'`);
await db.exec(`update public.level_scores set ft = 1400, fs = 1400, st = 1400, ss = 1400, hb = 1400, total = 7000 where user_id = '${STAR}'`);
const all = await one(`select count(*)::int from public.feed_events where kind = 'overtake' and actor = '${STAR}'`);
const people = await one(`select count(distinct target)::int from public.feed_events where kind = 'overtake' and actor = '${STAR}'`);
const followers = await one(`select count(*)::int from public.follows where followee = '${STAR}'`);
console.log(`sorpassi creati: ${overtakes} con piccoli aumenti, ${all} portando i punti al massimo (${people} persone su ${followers} che lo seguono)`);
// uno per persona a ogni scrittura dei punti; una persona può averne più di uno solo in classifiche diverse
assert.ok(people > 1500 && people <= followers, 'salendo al massimo quasi tutti quelli che lo seguono ricevono un sorpasso');

for (const [k, v] of Object.entries(times)) console.log(`  ${k.padEnd(48)} ${v.toFixed(1)} ms`);
assert.ok(times['classifica nazione / generale'] < 200, 'classifica nazionale sotto 200 ms anche con i blocchi');
console.log('tempi su PGlite: da rimisurare su Supabase');
