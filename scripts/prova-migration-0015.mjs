// Prova della migration 0015 (ticket 32) senza Docker: un Postgres in memoria (PGlite) al posto di Supabase locale.
//
//   npm install --no-save @electric-sql/pglite
//   node scripts/prova-migration-0015.mjs
//
// (oppure PGLITE=file:///percorso/di/@electric-sql/pglite/dist/index.js se il pacchetto è installato altrove)
//
// Cosa fa:
//   1. crea il minimo di Supabase che serve alle migration (schema auth, ruoli, privilegi di default);
//   2. applica le migration fino alla 0014 e inserisce record e pesi nel formato vecchio, uno per ogni riga della
//      tabella di conversione del ticket 32;
//   3. applica la 0015 e controlla, record per record, che cosa è diventato;
//   4. esegue supabase/tests/database/levels.test.sql con una versione ridotta di pgTAP (plan, is, lives_ok,
//      throws_ok, finish).
// Non sostituisce `supabase test db`: auth e pgTAP qui sono imitazioni. Serve dove Docker non c'è.
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
  create table auth.users (id uuid primary key default gen_random_uuid(), email text);
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
for (const f of migrations.filter((f) => f < '0015')) await apply(f);

// --- Dati nel formato vecchio ----------------------------------------------------------------------------------
const A = '00000000-0000-0000-0000-00000000000a'; // tre pesi nello storico
const B = '00000000-0000-0000-0000-00000000000b'; // nessun peso
const C = '00000000-0000-0000-0000-00000000000c'; // un solo peso, fuori dai limiti nuovi (25 kg)
await db.exec(`
  insert into auth.users (id, email) values ('${A}', 'a@test.local'), ('${B}', 'b@test.local'), ('${C}', 'c@test.local');
  insert into public.body_weights (user_id, date, kg) values
    ('${A}', '2026-10-01', 76), ('${A}', '2026-10-20', 75.5), ('${A}', '2026-11-10', 75),
    ('${C}', '2026-10-01', 25);
`);
// [utente, catena, voce vecchia, valore, data] → atteso: null = eliminato, oppure [voce nuova, valore, peso]
const cases = [
  [A, 'trazioni', 'zavorra', 20, '2026-09-15', ['zavorra', 20, 76]], // più vecchio di ogni peso: il primo dopo
  [A, 'trazioni', 'zavorra', 30, '2026-10-20', ['zavorra', 30, 75.5]], // peso dello stesso giorno
  [A, 'trazioni', 'zavorra', 0, '2026-10-21', null], // zavorra 0: eliminato
  [A, 'muscle-up', 'zavorra', 5, '2026-11-20', ['zavorra', 5, 75]], // l'ultimo peso fino a quel giorno
  [A, 'dip', 'zavorra', 40.5, '2026-10-05', ['zavorra', 40.5, 76]],
  [A, 'hspu', 'zavorra', 10, '2026-10-05', ['zavorra', 10, 76]],
  [A, 'hspu', 'libera', 6, '2026-10-05', ['liberi', 6, 76]],
  [A, 'military', 'bilanciere', 50, '2026-10-05', ['massimale', 50, 76]],
  [A, 'panca-piana', 'bilanciere', 90, '2026-10-05', ['massimale', 90, 76]],
  [A, 'oap', 'gomito', 3, '2026-10-05', ['avambraccio', 3, 76]],
  [A, 'oap', 'bicipite', 2, '2026-10-05', ['bicipite', 2, 76]],
  [A, 'oap', 'spalla', 4, '2026-10-05', ['spalla', 4, 76]],
  [A, 'oap', 'oap', 1, '2026-10-05', ['ripetizioni', 1, 76]],
  [A, 'planche', 'tuck', 8, '2026-10-05', ['tuck', 8, 76]],
  [A, 'planche', 'advanced-tuck', 7, '2026-10-05', ['advanced-tuck', 7, 76]],
  [A, 'planche', 'one-leg', 6, '2026-10-05', ['one-leg', 6, 76]],
  [A, 'planche', 'straddle', 5, '2026-10-05', ['straddle', 5, 76]],
  [A, 'planche', 'half-lay', 3, '2026-10-05', ['straddle', 10, 76]], // tolta: Straddle al massimo
  [A, 'planche', 'full', 4, '2026-10-05', ['full', 4, 76]],
  [A, 'planche', 'wide', 2, '2026-10-05', ['full', 10, 76]], // tolta: Full al massimo
  [A, 'planche', 'maltese', 1, '2026-10-05', ['maltese', 1, 76]],
  [A, 'planche-push-up', 'straddle', 2, '2026-10-05', ['straddle', 2, 76]],
  [A, 'planche-push-up', 'half-lay', 1, '2026-10-05', ['straddle', 5, 76]],
  [A, 'planche-push-up', 'full', 7, '2026-10-05', ['full', 7, 76]],
  [A, 'planche-press', 'tuck', 1, '2026-10-05', ['tuck', 1, 76]],
  [A, 'planche-press', 'half-lay', 1, '2026-10-05', ['straddle', 3, 76]],
  [A, 'front-lever', 'tuck', 10, '2026-10-05', ['tuck', 10, 76]],
  [A, 'front-lever', 'half-lay', 6, '2026-10-05', ['half-lay', 6, 76]],
  [A, 'front-lever', 'wide', 3, '2026-10-05', ['wide', 3, 76]],
  [A, 'front-lever', 'victorian', 2, '2026-10-05', ['victorian', 2, 76]],
  [A, 'front-lever-touch', 'tuck', 4, '2026-10-05', null], // non esiste più
  [A, 'front-lever-touch', 'advanced-tuck', 3, '2026-10-05', ['advanced-tuck', 3, 76]],
  [A, 'front-lever-touch', 'wide', 9, '2026-10-05', ['wide', 9, 76]],
  [A, 'front-lever-pull-up', 'tuck', 2, '2026-10-05', null], // non esiste più
  [A, 'front-lever-pull-up', 'half-lay', 4, '2026-10-05', ['half-lay', 4, 76]],
  [A, 'verticale', 'verticale', 120, '2026-10-05', ['verticale', 60, null]], // oltre 60 s: 60; niente peso
  [A, 'verticale', 'verticale', 45, '2026-10-05', ['verticale', 45, null]],
  [A, 'verticale', 'straddle-mono-braccio', 2, '2026-10-05', ['oahs-straddle', 2, null]],
  [A, 'verticale', 'full-mono-braccio', 3, '2026-10-05', ['oahs', 3, null]],
  [B, 'trazioni', 'zavorra', 15, '2026-10-05', ['zavorra', 15, null]], // nessun peso nello storico: resta senza
  [B, 'verticale', 'verticale', 30, '2026-10-05', ['verticale', 30, null]],
  [C, 'planche', 'tuck', 5, '2026-10-05', ['tuck', 5, null]], // peso fuori dai limiti nuovi: non si copia
];
const idOf = (i) => `00000000-0000-0000-0000-${String(i + 1).padStart(12, '0')}`;
await db.exec(
  'insert into public.level_records (id, user_id, sub_id, stage, value, date, note) values ' +
    cases.map(([u, sub, stage, value, date], i) => `('${idOf(i)}', '${u}', '${sub}', '${stage}', ${value}, '${date}', 'nota ${i}')`).join(',\n'),
);
const before = (await db.query('select id, updated_at from public.level_records')).rows;

// --- La migration ----------------------------------------------------------------------------------------------
await apply('0015_levels_v2.sql');

const rows = (await db.query('select id, user_id, sub_id, stage, value, bodyweight_kg, date::text as date, note, updated_at from public.level_records')).rows;
const byId = new Map(rows.map((r) => [r.id, r]));
let kept = 0;
cases.forEach(([user, sub, oldStage, , date, want], i) => {
  const got = byId.get(idOf(i));
  const label = `${sub}/${oldStage}`;
  if (want === null) return assert.equal(got, undefined, `${label}: doveva essere eliminato`);
  kept++;
  assert.ok(got, `${label}: è sparito`);
  assert.deepEqual(
    [got.sub_id, got.stage, Number(got.value), got.bodyweight_kg === null ? null : Number(got.bodyweight_kg)],
    [sub, ...want],
    label,
  );
  assert.deepEqual([got.user_id, got.date, got.note], [user, date, `nota ${i}`], `${label}: utente, data e nota non cambiano`);
  assert.equal(String(got.updated_at), String(before.find((b) => b.id === got.id).updated_at), `${label}: updated_at non cambia`);
});
assert.equal(rows.length, kept, 'nessun record in più');
console.log(`conversione: ${kept} record convertiti, ${cases.length - kept} eliminati, come da tabella del ticket 32`);

const one = async (sql) => Object.values((await db.query(sql)).rows[0])[0];
assert.equal(await one(`select to_regclass('public.body_weights') is null`), true, 'body_weights eliminata');
assert.equal(await one(`select count(*)::int from pg_proc where proname = 'check_body_weight'`), 0, 'check_body_weight eliminata');
assert.equal(await one(`select count(*)::int from public.level_stages`), 64);
assert.equal(
  await one(`select string_agg(policyname, ', ' order by policyname) from pg_policies where tablename in ('level_records', 'level_stages', 'body_weights')`),
  'level stages: read, own level records, trainer reads athlete level records',
  'restano le policy dei record e delle voci',
);
assert.equal(await one(`select has_function_privilege('authenticated', 'public.check_level_record()', 'execute')`), false, 'check_level_record non è richiamabile');
// un record convertito senza peso si può correggere solo aggiungendo il peso
await assert.rejects(db.query(`update public.level_records set note = 'x' where id = '${idOf(39)}'`), /peso corporeo/);
await db.query(`update public.level_records set bodyweight_kg = 70 where id = '${idOf(39)}'`);
console.log('schema: body_weights e il suo controllo eliminati, 64 voci, policy dei record invariate');

// --- pgTAP ridotto -----------------------------------------------------------------------------------------------
await db.exec(`
  create table public._tap (n serial, ok boolean, msg text);
  grant all on public._tap, public._tap_n_seq to public;
  create function public._tap(ok boolean, msg text) returns text language sql as $$
    insert into public._tap (ok, msg) values (ok, msg) returning case when ok then 'ok ' else 'not ok ' end || msg
  $$;
  create function public.plan(int) returns text language sql as $$ select '1..' || $1 $$;
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
const test = read('supabase/tests/database/levels.test.sql')
  .replace(/^create extension .*$/m, '')
  .replace(/^rollback;\s*$/m, '');
const planned = Number(test.match(/select plan\((\d+)\)/)[1]);
await db.exec(test);
await db.exec('reset role');
const tap = (await db.query('select ok, msg from public._tap order by n')).rows;
await db.exec('rollback');
const failed = tap.filter((t) => !t.ok);
for (const t of failed) console.error('not ok', t.msg);
assert.equal(failed.length, 0, 'levels.test.sql: test falliti');
assert.equal(tap.length, planned, 'levels.test.sql: il numero di test non è quello del plan');
console.log(`levels.test.sql: ${tap.length} test su ${planned}, tutti verdi (pgTAP imitato)`);
