-- Tipo (forza, volume, tecnico) per giorno: sta nella scheda e nelle registrazioni, non nell'esercizio.
begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000c1', 'tom@test.local'),
  ('00000000-0000-0000-0000-0000000000c2', 'ada@test.local');
update public.profiles set is_trainer = true, display_name = 'Tom' where id = '00000000-0000-0000-0000-0000000000c1';

create function pg_temp.as_user(uid uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

select pg_temp.as_user('00000000-0000-0000-0000-0000000000c2');

-- L'app nuova crea gli esercizi senza tipo.
select lives_ok($$ insert into public.exercises (id, catalog_id) values ('00000000-0000-0000-0000-0000000000d1', 'trazioni') $$,
  'un esercizio si crea senza tipo');

-- Le stesse Trazioni in forza il lunedì e in volume il giovedì.
insert into public.plan_items (exercise_id, date, sets, reps, weight, rest_seconds, type) values
  ('00000000-0000-0000-0000-0000000000d1', '2026-11-09', 5, 3, 10, 180, 'forza'),
  ('00000000-0000-0000-0000-0000000000d1', '2026-11-12', 4, 12, 0, 60, 'volume');
select is((select string_agg(type, ',' order by date) from public.plan_items), 'forza,volume', 'lo stesso esercizio ha un tipo diverso per giorno');
select throws_ok(
  $$ insert into public.plan_items (exercise_id, date, sets, reps, weight, rest_seconds, type) values ('00000000-0000-0000-0000-0000000000d1', '2026-11-13', 3, 5, 0, 90, 'cardio') $$,
  '23514', null, 'solo forza, volume o tecnico');

-- Versione precedente dell'app: righe senza tipo.
insert into public.plan_items (exercise_id, date, sets, reps, weight, rest_seconds)
  values ('00000000-0000-0000-0000-0000000000d1', '2026-11-14', 3, 5, 0, 90);
select is((select type from public.plan_items where date = '2026-11-14'), 'forza', 'riga senza tipo: il predefinito del catalogo (trazioni = forza)');

insert into public.exercises (id, name, type) values ('00000000-0000-0000-0000-0000000000d2', 'Circuito', 'tecnico');
insert into public.plan_items (exercise_id, date, sets, reps, weight, rest_seconds)
  values ('00000000-0000-0000-0000-0000000000d2', '2026-11-14', 3, 5, 0, 90);
select is((select type from public.plan_items where exercise_id = '00000000-0000-0000-0000-0000000000d2'), 'tecnico',
  'riga senza tipo: prima il tipo che l''utente aveva dato all''esercizio');

-- Registrazioni.
insert into public.entries (exercise_id, date, sets) values ('00000000-0000-0000-0000-0000000000d1', '2026-11-12', '[{"weight":0,"reps":12}]');
select is((select type from public.entries where date = '2026-11-12'), 'volume', 'registrazione senza tipo: quello del giorno in programma');
insert into public.entries (exercise_id, date, sets) values ('00000000-0000-0000-0000-0000000000d1', '2026-11-20', '[{"weight":0,"reps":5}]');
select is((select type from public.entries where date = '2026-11-20'), 'forza', 'fuori programma: il predefinito dell''esercizio');
insert into public.entries (exercise_id, date, sets, type) values ('00000000-0000-0000-0000-0000000000d1', '2026-11-09', '[{"weight":10,"reps":3}]', 'tecnico');
select is((select type from public.entries where date = '2026-11-09'), 'tecnico', 'il tipo scelto registrando vince');

-- Trainer: scheda modello e assegnazione.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
create temp table vars (k text primary key, v text);
grant all on vars to authenticated;
insert into vars values ('code', public.rotate_invite_code());
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c2');
select public.accept_invite((select v from vars where k = 'code'));

select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
insert into public.programs (id, name, weeks) values ('00000000-0000-0000-0000-0000000000f9', 'Misto', 1);
insert into public.program_items (program_id, week, weekday, catalog_id, sort_order, sets, reps, weight, rest_seconds, type) values
  ('00000000-0000-0000-0000-0000000000f9', 1, 1, 'dip', 1, 5, 3, 20, 180, 'forza');
insert into public.program_items (program_id, week, weekday, catalog_id, sort_order, sets, reps, weight, rest_seconds) values
  ('00000000-0000-0000-0000-0000000000f9', 1, 2, 'piegamenti', 1, 3, 20, 0, 60);
select is((select type from public.program_items where catalog_id = 'piegamenti'), 'volume', 'riga di scheda modello senza tipo: il predefinito del catalogo');

select public.assign_program('00000000-0000-0000-0000-0000000000f9', '00000000-0000-0000-0000-0000000000c2', '2026-11-23');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c2');
select is(
  (select string_agg(p.date || ' ' || e.catalog_id || ' ' || p.type, ', ' order by p.date)
   from public.plan_items p join public.exercises e on e.id = p.exercise_id where p.assigned_by is not null),
  '2026-11-24 dip forza, 2026-11-25 piegamenti volume',
  'assegnando una scheda il tipo arriva nel calendario');

select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select lives_ok($$ select public.coach_add_plan_item('00000000-0000-0000-0000-0000000000c2', '2026-11-26', 'dip', null, 3, 8, 0, 120, null, 'tecnico') $$,
  'il trainer aggiunge un giorno con il tipo');
select lives_ok($$ select public.coach_add_plan_item('00000000-0000-0000-0000-0000000000c2', '2026-11-27', 'dip', null, 3, 8, 0, 120, null) $$,
  'e senza tipo, come la versione precedente dell''app');
select is(
  (select string_agg(date || ' ' || type, ', ' order by date) from public.plan_items where date in ('2026-11-26', '2026-11-27')),
  '2026-11-26 tecnico, 2026-11-27 forza',
  'tipo scelto dal trainer, altrimenti quello di ripiego');

select * from finish();
rollback;
