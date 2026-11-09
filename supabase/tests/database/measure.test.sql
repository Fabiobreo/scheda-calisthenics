-- Esercizi a tempo (secondi) oltre a quelli a ripetizioni, con le versioni vecchie dell'app che scrivono solo ripetizioni.
begin;
create extension if not exists pgtap with schema extensions;
select plan(26);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'tea@test.local'),
  ('00000000-0000-0000-0000-0000000000e2', 'leo@test.local');
update public.profiles set is_trainer = true, display_name = 'Tea' where id = '00000000-0000-0000-0000-0000000000e1';

create function pg_temp.as_user(uid uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

select pg_temp.as_user('00000000-0000-0000-0000-0000000000e2');

-- Misura degli esercizi.
insert into public.exercises (id, catalog_id, measure) values
  ('00000000-0000-0000-0000-00000000a001', 'straddle-planche', 'reps'),
  ('00000000-0000-0000-0000-00000000a002', 'dip', 'time');
insert into public.exercises (id, name) values ('00000000-0000-0000-0000-00000000a003', 'Circuito');
insert into public.exercises (id, name, measure) values ('00000000-0000-0000-0000-00000000a004', 'Tenuta agli anelli', 'time');
select is(
  (select string_agg(coalesce(catalog_id, name) || ' ' || measure, ', ' order by id) from public.exercises),
  'straddle-planche time, dip reps, Circuito reps, Tenuta agli anelli time',
  'del catalogo: la misura della voce; personalizzati: quella scelta, ripetizioni se non la dice');
select throws_ok($$ insert into public.exercises (name, measure) values ('Corsa', 'km') $$, '23514', null, 'solo ripetizioni o secondi');

-- Schemi: "Straddle planche 4 × 8 s".
insert into public.plan_items (id, exercise_id, date, sets, reps, seconds, weight, rest_seconds, type) values
  ('00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-00000000a001', '2026-11-16', 4, 8, 8, 0, 120, 'forza');
select is((select reps || '/' || seconds from public.plan_items where id = '00000000-0000-0000-0000-00000000b001'), '8/8',
  'schema a tempo: i secondi, e le ripetizioni uguali per le versioni vecchie');

-- Versione vecchia: scrive solo le ripetizioni.
insert into public.plan_items (id, exercise_id, date, sets, reps, weight, rest_seconds) values
  ('00000000-0000-0000-0000-00000000b002', '00000000-0000-0000-0000-00000000a001', '2026-11-17', 3, 6, 0, 120);
select is((select seconds from public.plan_items where id = '00000000-0000-0000-0000-00000000b002'), 6,
  'versione vecchia, esercizio a tempo: le ripetizioni diventano secondi');
update public.plan_items set reps = 10 where id = '00000000-0000-0000-0000-00000000b001';
select is((select reps || '/' || seconds from public.plan_items where id = '00000000-0000-0000-0000-00000000b001'), '10/10',
  'versione vecchia che cambia le ripetizioni: cambiano i secondi');
update public.plan_items set reps = 12, seconds = 12 where id = '00000000-0000-0000-0000-00000000b001';
update public.plan_items set seconds = 15 where id = '00000000-0000-0000-0000-00000000b001';
select is((select reps || '/' || seconds from public.plan_items where id = '00000000-0000-0000-0000-00000000b001'), '15/15',
  'app nuova che cambia i secondi: le ripetizioni seguono');
update public.plan_items set sets = 5, weight = 2.5 where id = '00000000-0000-0000-0000-00000000b001';
select is((select sets || '×' || seconds from public.plan_items where id = '00000000-0000-0000-0000-00000000b001'), '5×15',
  'cambiare serie e peso non tocca i secondi');

insert into public.plan_items (id, exercise_id, date, sets, reps, seconds, weight, rest_seconds) values
  ('00000000-0000-0000-0000-00000000b003', '00000000-0000-0000-0000-00000000a002', '2026-11-16', 3, 8, 8, 0, 90);
select is((select coalesce(seconds::text, 'null') || ' ' || reps from public.plan_items where id = '00000000-0000-0000-0000-00000000b003'),
  'null 8', 'esercizio a ripetizioni: niente secondi nello schema');
select throws_ok(
  $$ insert into public.plan_items (exercise_id, date, sets, reps, seconds, weight, rest_seconds) values
     ('00000000-0000-0000-0000-00000000a001', '2026-11-18', 3, 5000, 5000, 0, 90) $$,
  '23514', null, 'secondi dello schema fino a 3600');
select lives_ok(
  $$ insert into public.plan_items (exercise_id, date, sets, reps, seconds, weight, rest_seconds) values
     ('00000000-0000-0000-0000-00000000a001', '2026-11-18', 1, 1200, 1200, 0, 90) $$,
  'una tenuta oltre le 1000 ripetizioni massime (20 minuti) si programma');

-- Serie registrate.
insert into public.entries (id, exercise_id, date, sets) values
  ('00000000-0000-0000-0000-00000000c001', '00000000-0000-0000-0000-00000000a001', '2026-11-16',
   '[{"weight":0,"reps":8,"seconds":8},{"weight":0,"reps":7,"seconds":7}]');
select is((select sets from public.entries where id = '00000000-0000-0000-0000-00000000c001'),
  '[{"reps":8,"weight":0,"seconds":8},{"reps":7,"weight":0,"seconds":7}]'::jsonb, 'serie a tempo dell''app nuova');

insert into public.entries (id, exercise_id, date, sets) values
  ('00000000-0000-0000-0000-00000000c002', '00000000-0000-0000-0000-00000000a001', '2026-11-17', '[{"weight":0,"reps":9},{"weight":5,"reps":4}]');
select is((select sets from public.entries where id = '00000000-0000-0000-0000-00000000c002'),
  '[{"reps":9,"weight":0,"seconds":9},{"reps":4,"weight":5,"seconds":4}]'::jsonb,
  'versione vecchia, esercizio a tempo: le ripetizioni diventano secondi, in ordine');
update public.entries set sets = '[{"weight":0,"reps":11}]' where id = '00000000-0000-0000-0000-00000000c001';
select is((select sets from public.entries where id = '00000000-0000-0000-0000-00000000c001'),
  '[{"reps":11,"weight":0,"seconds":11}]'::jsonb, 'versione vecchia che modifica una registrazione a tempo');

insert into public.entries (id, exercise_id, date, sets) values
  ('00000000-0000-0000-0000-00000000c003', '00000000-0000-0000-0000-00000000a002', '2026-11-16', '[{"weight":10,"reps":6,"seconds":6}]');
select is((select sets from public.entries where id = '00000000-0000-0000-0000-00000000c003'),
  '[{"reps":6,"weight":10}]'::jsonb, 'esercizio a ripetizioni: niente secondi nelle serie');

select throws_ok(
  $$ insert into public.entries (exercise_id, date, sets) values ('00000000-0000-0000-0000-00000000a001', '2026-11-19', '[{"weight":0,"reps":0}]') $$,
  '22023', null, 'una serie a tempo senza secondi non si salva');
select throws_ok(
  $$ insert into public.entries (exercise_id, date, sets) values ('00000000-0000-0000-0000-00000000a001', '2026-11-19', '[{"weight":0,"seconds":2.5}]') $$,
  '22023', null, 'secondi interi');

update public.entries set note = 'ok' where id = '00000000-0000-0000-0000-00000000c003';
select is((select note from public.entries where id = '00000000-0000-0000-0000-00000000c003'), 'ok', 'cambiare la nota non passa dalle serie');

-- Cambio di misura di un personalizzato: solo senza registrazioni, e il programma segue.
insert into public.plan_items (id, exercise_id, date, sets, reps, weight, rest_seconds) values
  ('00000000-0000-0000-0000-00000000b004', '00000000-0000-0000-0000-00000000a003', '2026-11-16', 3, 30, 0, 60);
update public.exercises set measure = 'time' where id = '00000000-0000-0000-0000-00000000a003';
select is((select reps || '/' || seconds from public.plan_items where id = '00000000-0000-0000-0000-00000000b004'), '30/30',
  'un personalizzato mai registrato passa a secondi, con il suo programma');
insert into public.entries (exercise_id, date, sets) values ('00000000-0000-0000-0000-00000000a003', '2026-11-16', '[{"weight":0,"seconds":30}]');
select throws_ok($$ update public.exercises set measure = 'reps' where id = '00000000-0000-0000-0000-00000000a003' $$,
  'P0001', null, 'con delle registrazioni la misura non cambia più');
select lives_ok($$ update public.exercises set measure = 'reps' where id = '00000000-0000-0000-0000-00000000a001' $$,
  'una voce del catalogo ignora la misura scritta…');
select is((select measure from public.exercises where id = '00000000-0000-0000-0000-00000000a001'), 'time', '…e resta quella della voce');

-- Trainer: schede modello, assegnazione, giorno singolo.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000e1');
create temp table vars (k text primary key, v text);
grant all on vars to authenticated;
insert into vars values ('code', public.rotate_invite_code());
select pg_temp.as_user('00000000-0000-0000-0000-0000000000e2');
select public.accept_invite((select v from vars where k = 'code'));

select pg_temp.as_user('00000000-0000-0000-0000-0000000000e1');
insert into public.programs (id, name, weeks) values ('00000000-0000-0000-0000-00000000f001', 'Tenute', 1);
insert into public.program_items (id, program_id, week, weekday, catalog_id, custom_name, sort_order, sets, reps, seconds, weight, rest_seconds) values
  ('00000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-00000000f001', 1, 0, 'tuck-front-lever', null, 1, 4, 10, null, 0, 90),
  ('00000000-0000-0000-0000-00000000d002', '00000000-0000-0000-0000-00000000f001', 1, 0, null, 'Skin the cat tenuta', 2, 3, 20, 20, 0, 90),
  ('00000000-0000-0000-0000-00000000d003', '00000000-0000-0000-0000-00000000f001', 1, 0, 'dip', null, 3, 3, 8, 8, 0, 90);
select is(
  (select string_agg(coalesce(catalog_id, custom_name) || ' ' || coalesce(seconds::text, '-'), ', ' order by sort_order) from public.program_items),
  'tuck-front-lever 10, Skin the cat tenuta 20, dip -',
  'scheda modello: decide la voce del catalogo, per i nomi personalizzati lo schema');
update public.program_items set reps = 25 where id = '00000000-0000-0000-0000-00000000d002';
select is((select seconds from public.program_items where id = '00000000-0000-0000-0000-00000000d002'), 25,
  'versione vecchia che cambia le ripetizioni di un personalizzato a tempo: restano secondi');

select public.assign_program('00000000-0000-0000-0000-00000000f001', '00000000-0000-0000-0000-0000000000e2', '2026-11-23');
select lives_ok($$ select public.coach_add_plan_item('00000000-0000-0000-0000-0000000000e2', '2026-11-24', null, 'Dead hang', 3, 45, 0, 60, null, 'volume', 45) $$,
  'il trainer aggiunge un giorno a tempo');
select lives_ok($$ select public.coach_add_plan_item('00000000-0000-0000-0000-0000000000e2', '2026-11-25', 'l-sit', null, 3, 15, 0, 60, null) $$,
  'e come la versione precedente, solo con le ripetizioni');

select pg_temp.as_user('00000000-0000-0000-0000-0000000000e2');
select is(
  (select string_agg(p.date || ' ' || coalesce(e.catalog_id, e.name) || ' ' || e.measure || ' ' || coalesce(p.seconds::text, '-'), ', '
                     order by p.date, p.sort_order)
   from public.plan_items p join public.exercises e on e.id = p.exercise_id where p.assigned_by is not null),
  '2026-11-23 tuck-front-lever time 10, 2026-11-23 Skin the cat tenuta time 25, 2026-11-23 dip reps -, '
  || '2026-11-24 Dead hang time 45, 2026-11-25 l-sit time 15',
  'nel calendario dell''atleta arrivano i secondi, e i personalizzati nuovi nascono a tempo');

select * from finish();
rollback;
