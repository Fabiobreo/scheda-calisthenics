// Prova della migration 0016 (ticket 35) senza Docker: un Postgres in memoria (PGlite) al posto di Supabase locale,
// come scripts/prova-migration-0015.mjs.
//
//   npm install --no-save @electric-sql/pglite
//   node scripts/prova-migration-0016.mjs
//
// (oppure PGLITE=file:///percorso/di/@electric-sql/pglite/dist/index.js se il pacchetto è installato altrove)
//
// Cosa fa:
//   1. crea il minimo di Supabase che serve alle migration (schema auth, ruoli, privilegi di default);
//   2. applica le migration fino alla 0015 e inserisce esercizi, registrazioni, programma e schede modello che usano
//      le cinque voci da togliere (più qualche riga di controllo che non le usa);
//   3. applica la 0016 e controlla che ogni riga sia rimasta com'era, tranne il collegamento al catalogo;
//   4. esegue supabase/tests/database/catalog.test.sql con una versione ridotta di pgTAP.
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
for (const f of migrations.filter((f) => f < '0016')) await apply(f);

const GONE = ['wide-planche', 'planche-push-up', 'planche-press', 'front-lever-pull-up', 'front-lever-touch'];
const rows = async (sql) => (await db.query(sql)).rows;
const one = async (sql) => Object.values((await rows(sql))[0])[0];

// --- Dati di prima ---------------------------------------------------------------------------------------------
const A = '00000000-0000-0000-0000-0000000000a1'; // atleta: usa tutte e cinque le voci
const B = '00000000-0000-0000-0000-0000000000b1'; // atleta: aveva già un personalizzato "Planche press"
const T = '00000000-0000-0000-0000-0000000000c1'; // trainer con una scheda modello
const ex = (n) => `aaaaaaaa-0000-0000-0000-${String(n).padStart(12, '0')}`;
await db.exec(`
  insert into auth.users (id, email) values ('${A}', 'a@test.local'), ('${B}', 'b@test.local'), ('${T}', 't@test.local');
  update public.profiles set is_trainer = true where id = '${T}';

  insert into public.exercises (id, user_id, catalog_id, name, type, in_records, sort_order) values
    ('${ex(1)}', '${A}', 'planche-press', null, 'forza', true, 1),
    ('${ex(2)}', '${A}', 'planche-push-up', null, 'forza', false, 2),
    ('${ex(3)}', '${A}', 'wide-planche', null, 'tecnico', true, 3),
    ('${ex(4)}', '${A}', 'front-lever-touch', null, 'forza', false, 4),
    ('${ex(5)}', '${A}', 'front-lever-pull-up', null, 'forza', false, 5),
    ('${ex(6)}', '${A}', 'trazioni', null, 'forza', true, 6),
    ('${ex(7)}', '${A}', null, 'Circuito finale', 'volume', false, 7);
  update public.exercises set archived_at = '2026-11-01T10:00:00Z' where id = '${ex(5)}';
  -- B: prima il personalizzato, poi la voce del catalogo, che prende il suffisso " (catalogo)"
  insert into public.exercises (id, user_id, catalog_id, name, type, sort_order) values ('${ex(8)}', '${B}', null, 'Planche press', 'forza', 1);
  insert into public.exercises (id, user_id, catalog_id, name, type, sort_order) values ('${ex(9)}', '${B}', 'planche-press', null, 'forza', 2);

  insert into public.entries (user_id, exercise_id, date, sets, difficulty, type, note) values
    ('${A}', '${ex(1)}', '2026-11-03', '[{"weight":0,"reps":3},{"weight":0,"reps":2}]', 'difficile', 'forza', 'prima volta'),
    ('${A}', '${ex(1)}', '2026-11-10', '[{"weight":0,"reps":4}]', 'medio', 'forza', null),
    ('${A}', '${ex(3)}', '2026-11-10', '[{"weight":0,"reps":6,"seconds":6}]', null, 'tecnico', null),
    ('${A}', '${ex(4)}', '2026-11-12', '[{"weight":0,"reps":8,"seconds":8}]', null, 'forza', null),
    ('${A}', '${ex(5)}', '2026-10-20', '[{"weight":0,"reps":2}]', null, 'forza', null),
    ('${A}', '${ex(6)}', '2026-11-12', '[{"weight":10,"reps":5}]', 'medio', 'forza', null),
    ('${B}', '${ex(9)}', '2026-11-12', '[{"weight":0,"reps":1}]', null, 'forza', null);

  insert into public.plan_items (user_id, exercise_id, date, sort_order, sets, reps, weight, rest_seconds, type) values
    ('${A}', '${ex(1)}', '2026-11-30', 1, 4, 3, 0, 180, 'forza'),
    ('${A}', '${ex(2)}', '2026-11-30', 2, 3, 5, 0, 150, 'forza'),
    ('${A}', '${ex(6)}', '2026-11-30', 3, 5, 5, 10, 150, 'forza');
  insert into public.plan_items (user_id, exercise_id, date, sort_order, sets, reps, seconds, weight, rest_seconds, type) values
    ('${A}', '${ex(3)}', '2026-12-02', 1, 5, 8, 8, 0, 120, 'tecnico');

  insert into public.programs (id, trainer_id, name, weeks) values ('bbbbbbbb-0000-0000-0000-000000000001', '${T}', 'Skill 4 settimane', 4);
  insert into public.program_items (program_id, week, weekday, catalog_id, custom_name, sort_order, sets, reps, weight, rest_seconds, note, type) values
    ('bbbbbbbb-0000-0000-0000-000000000001', 1, 0, 'planche-press', null, 1, 4, 3, 0, 180, 'lento in salita', 'forza'),
    ('bbbbbbbb-0000-0000-0000-000000000001', 1, 0, 'front-lever-pull-up', null, 2, 3, 4, 0, 150, null, 'forza'),
    ('bbbbbbbb-0000-0000-0000-000000000001', 1, 0, 'trazioni', null, 3, 5, 5, 10, 150, null, 'forza'),
    ('bbbbbbbb-0000-0000-0000-000000000001', 1, 2, null, 'Circuito finale', 1, 3, 10, 0, 60, null, 'volume'),
    ('bbbbbbbb-0000-0000-0000-000000000001', 2, 0, 'planche-push-up', null, 1, 3, 5, 0, 150, null, 'forza');
  -- a tempo: i secondi li mette il trigger della misura dalla voce del catalogo
  insert into public.program_items (program_id, week, weekday, catalog_id, custom_name, sort_order, sets, reps, seconds, weight, rest_seconds, note, type) values
    ('bbbbbbbb-0000-0000-0000-000000000001', 1, 2, 'wide-planche', null, 2, 5, 6, 6, 0, 120, null, 'tecnico'),
    ('bbbbbbbb-0000-0000-0000-000000000001', 1, 2, 'front-lever-touch', null, 3, 4, 8, 8, 0, 120, 'tocca e torna', 'forza'),
    ('bbbbbbbb-0000-0000-0000-000000000001', 1, 2, 'plank', null, 4, 3, 60, 60, 0, 60, null, 'volume');
`);

const SNAP = {
  exercises: `select id, user_id, catalog_id, name, type, in_records, measure, sort_order, archived_at::text as archived_at, created_at::text as created_at from public.exercises order by id`,
  entries: `select id, user_id, exercise_id, date::text as date, kind, sets::text as sets, difficulty, type, note, created_at::text as created_at from public.entries order by id`,
  plan_items: `select id, user_id, exercise_id, date::text as date, sort_order, sets, reps, seconds, weight::text as weight, rest_seconds, type, note, assigned_by from public.plan_items order by id`,
  program_items: `select id, program_id, week, weekday, catalog_id, custom_name, sort_order, sets, reps, seconds, weight::text as weight, rest_seconds, note, type, created_at::text as created_at from public.program_items order by id`,
};
const snap = async () => Object.fromEntries(await Promise.all(Object.entries(SNAP).map(async ([k, sql]) => [k, await rows(sql)])));
const before = await snap();
const catalogBefore = await rows(`select * from public.catalog_exercises order by id`);
const nameOf = Object.fromEntries(catalogBefore.map((c) => [c.id, c.name]));
assert.equal(GONE.every((id) => nameOf[id]), true, 'prima della 0016 le cinque voci ci sono');
assert.equal(before.exercises.find((e) => e.id === ex(9)).name, 'Planche press (catalogo)', 'B: la voce del catalogo ha il suffisso');
assert.equal(before.exercises.find((e) => e.id === ex(4)).measure, 'time', 'front lever touch nel catalogo è a tempo');

// --- La migration ----------------------------------------------------------------------------------------------
await apply('0016_catalog_trim.sql');
const after = await snap();

// catalogo: mancano solo le cinque voci, il resto è identico
const catalogAfter = await rows(`select * from public.catalog_exercises order by id`);
assert.deepEqual(catalogAfter, catalogBefore.filter((c) => !GONE.includes(c.id)), 'catalogo: tolte solo le cinque voci');
console.log(`catalogo: ${catalogBefore.length} voci → ${catalogAfter.length}`);

// esercizi: stessa riga, senza il collegamento per le cinque voci
let moved = 0;
assert.equal(after.exercises.length, before.exercises.length, 'nessun esercizio in più o in meno');
for (const b of before.exercises) {
  const a = after.exercises.find((x) => x.id === b.id);
  const gone = GONE.includes(b.catalog_id);
  if (gone) moved++;
  assert.deepEqual(a, gone ? { ...b, catalog_id: null } : b, `esercizio ${b.name}`);
}
assert.equal(moved, 6, 'sei esercizi diventati personalizzati (5 di A, 1 di B)');
assert.deepEqual(
  after.exercises.filter((e) => e.user_id === A && e.catalog_id === null).map((e) => `${e.name} [${e.measure}]`).sort(),
  ['Circuito finale [reps]', 'Front lever pull up [reps]', 'Front lever touch [time]', 'Planche press [reps]', 'Planche push up [reps]', 'Wide planche [time]'],
  'A: stessi nomi e stesse misure, ora personalizzati',
);
assert.notEqual(after.exercises.find((e) => e.id === ex(5)).archived_at, null, "l'esercizio archiviato resta archiviato");
assert.deepEqual(after.exercises.filter((e) => e.user_id === B).map((e) => e.name).sort(), ['Planche press', 'Planche press (catalogo)'], 'B: i due esercizi restano distinti');
console.log(`esercizi: ${moved} diventati personalizzati con lo stesso nome, gli altri ${before.exercises.length - moved} invariati`);

// storico e programma non cambiano di una virgola
assert.deepEqual(after.entries, before.entries, 'registrazioni invariate');
assert.deepEqual(after.plan_items, before.plan_items, 'programma invariato');
console.log(`storico e programma: ${before.entries.length} registrazioni e ${before.plan_items.length} righe di programma identiche`);

// schede modello: la voce diventa nome personalizzato, schema e nota restano
let renamed = 0;
assert.equal(after.program_items.length, before.program_items.length, 'nessuna riga di scheda in più o in meno');
for (const b of before.program_items) {
  const a = after.program_items.find((x) => x.id === b.id);
  const gone = GONE.includes(b.catalog_id);
  if (gone) renamed++;
  assert.deepEqual(a, gone ? { ...b, catalog_id: null, custom_name: nameOf[b.catalog_id] } : b, `riga di scheda ${b.catalog_id ?? b.custom_name}`);
}
assert.equal(renamed, 5);
assert.deepEqual(
  after.program_items.filter((p) => p.custom_name && p.seconds !== null).map((p) => `${p.custom_name} ${p.sets}×${p.seconds}s`).sort(),
  ['Front lever touch 4×8s', 'Wide planche 5×6s'],
  'le righe a tempo restano a tempo',
);
console.log(`schede modello: ${renamed} righe passate a nome personalizzato, schema e nota invariati`);

// dopo: le voci non si scelgono più; assegnando la scheda l'atleta ritrova il suo esercizio (stesso nome), non un doppione
await assert.rejects(db.query(`insert into public.exercises (user_id, catalog_id, name, type) values ('${A}', 'planche-press', 'Planche press 2', 'forza')`), /foreign key/);
assert.equal(await one(`select public.ensure_athlete_exercise('${A}', null, 'Planche press', 'reps')`), ex(1), 'la scheda del trainer ritrova il "Planche press" dell\'atleta');
assert.equal(await one(`select public.ensure_athlete_exercise('${A}', null, 'Front lever pull up', 'reps')`), ex(5));
assert.equal(await one(`select archived_at is null from public.exercises where id = '${ex(5)}'`), true, 'e lo ripristina se era archiviato, come sempre');
assert.equal(await one(`select count(*)::int from public.exercises where user_id = '${A}'`), 7, 'nessun doppione');
// i livelli non sono toccati: le catene con gli stessi nomi restano
assert.equal(await one(`select count(distinct sub_id)::int from public.level_stages where sub_id = any ('{planche-push-up,planche-press,front-lever-pull-up,front-lever-touch}')`), 4, 'le catene dei livelli restano');
console.log('dopo: le voci tolte non si scelgono più, la scheda del trainer ritrova gli esercizi per nome, livelli intatti');

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
const test = read('supabase/tests/database/catalog.test.sql')
  .replace(/^create extension .*$/m, '')
  .replace(/^rollback;\s*$/m, '');
const planned = Number(test.match(/select plan\((\d+)\)/)[1]);
await db.exec(test);
await db.exec('reset role');
const tap = await rows('select ok, msg from public._tap order by n');
await db.exec('rollback');
const failed = tap.filter((t) => !t.ok);
for (const t of failed) console.error('not ok', t.msg);
assert.equal(failed.length, 0, 'catalog.test.sql: test falliti');
assert.equal(tap.length, planned, 'catalog.test.sql: il numero di test non è quello del plan');
console.log(`catalog.test.sql: ${tap.length} test su ${planned}, tutti verdi (pgTAP imitato)`);
