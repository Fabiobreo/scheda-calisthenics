// Prova della migration 0017 (ticket 38) senza Docker: un Postgres in memoria (PGlite) al posto di Supabase locale,
// come scripts/prova-migration-0015.mjs e 0016.
//
//   npm install --no-save @electric-sql/pglite
//   node scripts/prova-migration-0017.mjs
//
// (oppure PGLITE=file:///percorso/di/@electric-sql/pglite/dist/index.js se il pacchetto è installato altrove)
//
// Cosa fa:
//   1. crea il minimo di Supabase che serve alle migration (schema auth, ruoli, privilegi di default);
//   2. applica le migration fino alla 0016, crea due account "di prima" con nome e record, applica la 0017 e controlla
//      che i profili esistenti siano privati e senza luogo e che il resto non sia cambiato;
//   3. esegue supabase/tests/database/rankings.test.sql e levels.test.sql con una versione ridotta di pgTAP;
//   4. carica 50.000 account con punti a caso e confronta ranking() con un conto fatto a parte (5 ambiti × 6
//      metriche per alcuni utenti), poi misura i tempi.
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
for (const f of migrations.filter((f) => f < '0017')) await apply(f);

const rows = async (sql, params) => (await db.query(sql, params)).rows;
const one = async (sql, params) => Object.values((await rows(sql, params))[0])[0];

// --- Account di prima ------------------------------------------------------------------------------------------
const OLD1 = '11111111-0000-0000-0000-000000000001';
const OLD2 = '11111111-0000-0000-0000-000000000002';
await db.exec(`
  insert into auth.users (id, email) values ('${OLD1}', 'michael@test.local'), ('${OLD2}', 'senza-nome@test.local');
  update public.profiles set display_name = 'Michael', is_trainer = true where id = '${OLD1}';
  insert into public.level_records (user_id, sub_id, stage, value, bodyweight_kg, date) values
    ('${OLD1}', 'trazioni', 'zavorra', 40, 78, '2026-11-20'),
    ('${OLD1}', 'verticale', 'verticale', 45, null, '2026-11-21');
`);
const profilesBefore = await rows(`select id, display_name, is_trainer, avatar_body, created_at::text from public.profiles order by id`);
const recordsBefore = await rows(`select * from public.level_records order by id`);

await apply('0017_rankings.sql');

assert.deepEqual(await rows(`select id, display_name, is_trainer, avatar_body, created_at::text from public.profiles order by id`), profilesBefore, 'profili: le colonne di prima non cambiano');
assert.deepEqual(await rows(`select * from public.level_records order by id`), recordsBefore, 'record di livello invariati');
assert.deepEqual(
  await rows(`select is_private, country, province, region from public.profiles order by id`),
  [1, 2].map(() => ({ is_private: true, country: null, province: null, region: null })),
  'i profili esistenti sono privati e senza luogo',
);
assert.equal(await one(`select count(*)::int from public.level_scores`), 0, 'nessun punto finché l\'app non li scrive');
assert.equal(await one(`select count(*)::int from public.provinces`), 107);
console.log('0017 applicata: profili esistenti privati e senza luogo, record invariati, 107 province');

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
for (const file of ['rankings.test.sql', 'levels.test.sql']) {
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

// --- 50.000 account: posizioni giuste e tempi -------------------------------------------------------------------
// 90% in Italia sparsi sulle 107 province, il resto in Francia, Germania e Spagna; 4 su 5 privati (è il valore di
// partenza); il 5% con 0 punti. Chi guarda segue 40 persone.
const N = 50_000;
const t0 = performance.now();
await db.exec(`
  insert into auth.users (id, email, raw_user_meta_data)
  select ('22222222-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid, 'u' || g || '@test.local',
         case when g % 10 = 0 then jsonb_build_object('country', (array['FR', 'DE', 'ES'])[1 + (g / 10) % 3])
              else jsonb_build_object('country', 'IT', 'province', (array(select code from public.provinces order by code))[1 + (g * 7919) % 107]) end
  from generate_series(1, ${N}) g;
  update public.profiles set display_name = 'Atleta ' || right(id::text, 5), is_private = (right(id::text, 5)::int % 5 <> 0)
  where id::text like '22222222-%';
  insert into public.level_scores (user_id, ft, fs, st, ss, hb, total, rules_version)
  select id, ft, fs, st, ss, hb, ft + fs + st + ss + hb, 1
  from (
    select id, z * (random() * 1400)::int as ft, z * (random() * 1400)::int as fs, z * (random() * 1400)::int as st,
           z * (random() * 1400)::int as ss, z * (random() * 1400)::int as hb
    from (select id, case when right(id::text, 5)::int % 20 = 7 then 0 else 1 end as z from public.profiles where id::text like '22222222-%') p
  ) s;
  analyze;
`);
console.log(`\n${N} account caricati in ${((performance.now() - t0) / 1000).toFixed(1)} s`);
const uid = (g) => `22222222-0000-0000-0000-${String(g).padStart(12, '0')}`;
const ME = uid(4242); // Italia, privato
await db.exec(`
  insert into public.follows (follower, followee, status)
  select '${ME}', ('22222222-0000-0000-0000-' || lpad((g * 1237)::text, 12, '0'))::uuid, case when g % 8 = 0 then 'pending' else 'accepted' end
  from generate_series(1, 40) g;
`);

const SCOPES = ['amici', 'provincia', 'regione', 'nazione', 'mondo'];
const METRICS = { generale: 'total', 'fondamentali-tirata': 'ft', 'fondamentali-spinta': 'fs', 'skill-tirata': 'st', 'skill-spinta': 'ss', handbalance: 'hb' };
const asUser = (id) => db.exec(`set role authenticated; select set_config('request.jwt.claims', '{"sub":"${id}","role":"authenticated"}', false);`);
const ranking = async (scope, metric) => one(`select public.ranking($1, $2)`, [scope, metric]);

// Conto fatto a parte, senza la funzione: partecipanti, posizione e righe visibili con una finestra su tutto l'ambito.
const naive = async (id, scope, col) => {
  const me = (await rows(`select country, province, region from public.profiles where id = $1`, [id]))[0];
  const cond = {
    mondo: 'true',
    nazione: `s.country = '${me.country}'`,
    regione: `s.region = '${String(me.region).replace(/'/g, "''")}'`,
    provincia: `s.province = '${me.province}'`,
    amici: `(s.user_id = '${id}' or s.user_id in (select followee from public.follows where follower = '${id}' and status = 'accepted'))`,
  }[scope];
  const all = await rows(`
    select s.user_id, s.${col} as score, rank() over (order by s.${col} desc)::int as position,
           (not s.is_private or s.user_id = '${id}' or exists (select 1 from public.follows f where f.follower = '${id}' and f.followee = s.user_id and f.status = 'accepted')) as visible
    from public.level_scores s where s.total > 0 and ${cond}
    order by s.${col} desc, s.user_id`);
  const visible = all.filter((r) => r.visible);
  const i = visible.findIndex((r) => r.user_id === id);
  const shown = visible.filter((_, k) => k < 3 || (i >= 0 && Math.abs(k - i) <= 2));
  return { participants: all.length, position: i < 0 ? null : visible[i].position, rows: shown.map((r) => ({ userId: r.user_id, position: r.position, score: r.score })) };
};

await db.exec('reset role');
const sample = [ME, uid(5), uid(10), uid(20007), uid(31415), uid(49999)]; // 10: Francia; 20007: 0 punti
let checked = 0;
for (const id of sample) {
  for (const scope of SCOPES)
    for (const [metric, col] of Object.entries(METRICS)) {
      await db.exec('reset role');
      const place = (await rows(`select country, province from public.profiles where id = $1`, [id]))[0];
      const want = (scope === 'provincia' || scope === 'regione') && !place.province ? null : await naive(id, scope, col);
      await asUser(id);
      const got = await ranking(scope, metric);
      const label = `${id.slice(-5)} ${scope} ${metric}`;
      if (!want) {
        assert.equal(got.available, false, `${label}: non disponibile`);
      } else {
        assert.equal(got.participants, want.participants, `${label}: partecipanti`);
        assert.equal(got.position, want.position, `${label}: posizione`);
        assert.deepEqual(got.rows.map((r) => ({ userId: r.userId, position: r.position, score: r.score })), want.rows, `${label}: righe`);
        assert.equal(got.rows.every((r) => r.name), true, `${label}: ogni riga ha il nome`);
      }
      checked++;
    }
}
await db.exec('reset role');
console.log(`posizioni, partecipanti e righe uguali al conto fatto a parte: ${checked} classifiche (${sample.length} utenti × 5 ambiti × 6 metriche)`);

// Tempi: mediana di 5 chiamate, dopo una a vuoto.
await asUser(ME);
const time = async (fn) => {
  await fn();
  const ms = [];
  for (let i = 0; i < 5; i++) {
    const t = performance.now();
    await fn();
    ms.push(performance.now() - t);
  }
  return ms.sort((a, b) => a - b)[2];
};
const times = {};
for (const scope of SCOPES) for (const metric of ['generale', 'handbalance']) times[`${scope} / ${metric}`] = await time(() => ranking(scope, metric));
times['riepilogo dei 5 ambiti / generale'] = await time(() => one(`select public.ranking_overview('generale')`));
const mine = await ranking('nazione', 'generale');
await db.exec('reset role');
console.log(`\nnazione / generale per ${ME.slice(-5)}: posizione ${mine.position} su ${mine.participants}`);
for (const [k, v] of Object.entries(times)) console.log(`  ${k.padEnd(36)} ${v.toFixed(1)} ms`);
const LIMIT = 200;
assert.ok(times['nazione / generale'] < LIMIT, `classifica nazionale: ${times['nazione / generale'].toFixed(1)} ms, il criterio è sotto ${LIMIT} ms`);
console.log(`classifica nazionale sotto ${LIMIT} ms con ${N} righe (su PGlite: da rimisurare su Supabase)`);
