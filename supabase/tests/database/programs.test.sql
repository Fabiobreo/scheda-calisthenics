-- Schede del trainer: proprietà, assegnazione a un atleta, chi può modificare cosa nel calendario.
begin;
create extension if not exists pgtap with schema extensions;
select plan(25);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000b1', 'tina@test.local'),
  ('00000000-0000-0000-0000-0000000000b2', 'andrea@test.local'),
  ('00000000-0000-0000-0000-0000000000b3', 'carla@test.local');
update public.profiles set is_trainer = true, display_name = 'Tina' where id = '00000000-0000-0000-0000-0000000000b1';
update public.profiles set is_trainer = true, display_name = 'Carla' where id = '00000000-0000-0000-0000-0000000000b3';

create function pg_temp.as_user(uid uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

-- Andrea ha già le Trazioni (archiviate) e un suo esercizio il lunedì 9.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b2');
insert into public.exercises (id, catalog_id, type, archived_at) values ('00000000-0000-0000-0000-0000000000e1', 'trazioni', 'forza', now());
insert into public.exercises (id, catalog_id, type) values ('00000000-0000-0000-0000-0000000000e2', 'squat', 'volume');
insert into public.plan_items (exercise_id, date, sets, reps, weight, rest_seconds)
  values ('00000000-0000-0000-0000-0000000000e2', '2026-11-09', 3, 20, 0, 60);

-- Tina si fa seguire da Andrea.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
create temp table vars (k text primary key, v text);
grant all on vars to authenticated;
insert into vars values ('code', public.rotate_invite_code());
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b2');
select public.accept_invite((select v from vars where k = 'code'));

-- Tina scrive una scheda di 2 settimane: trazioni lun, squat lun, "Circuito" gio.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
insert into public.programs (id, name, weeks) values ('00000000-0000-0000-0000-0000000000f1', 'Forza base', 2);
insert into public.program_items (program_id, week, weekday, catalog_id, custom_name, sort_order, sets, reps, weight, rest_seconds, note) values
  ('00000000-0000-0000-0000-0000000000f1', 1, 0, 'trazioni', null, 1, 5, 5, 0, 150, 'scapole attive'),
  ('00000000-0000-0000-0000-0000000000f1', 1, 0, 'squat', null, 2, 4, 15, 0, 90, null),
  ('00000000-0000-0000-0000-0000000000f1', 2, 3, null, 'Circuito finale', 1, 3, 10, 0, 60, null);
select is((select count(*)::int from public.program_items), 3, 'il trainer scrive la sua scheda');
select throws_ok(
  $$ insert into public.program_items (program_id, week, weekday, sets, reps, weight, rest_seconds) values ('00000000-0000-0000-0000-0000000000f1', 1, 1, 3, 5, 0, 90) $$,
  '23514', null, 'ogni riga è una voce del catalogo o un nome personalizzato');

-- Gli altri non vedono né toccano la scheda.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b3');
select is((select count(*)::int from public.programs) + (select count(*)::int from public.program_items), 0, 'un altro trainer non vede la scheda');
select throws_ok($$ select public.assign_program('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000b2', '2026-11-09') $$,
  'P0002', null, 'un altro trainer non assegna la scheda');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b2');
select is((select count(*)::int from public.programs), 0, 'l''atleta non vede le schede modello');

-- Assegnazione.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
select throws_ok($$ select public.assign_program('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000b2', '2026-11-10') $$,
  'P0001', null, 'la scheda parte di lunedì');
select throws_ok($$ select public.assign_program('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000b3', '2026-11-09') $$,
  'P0001', null, 'solo ai propri atleti');
select is(public.assign_program('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000b2', '2026-11-09'), 3,
  'assegnata dal lunedì 9: tre righe nel calendario');

select pg_temp.as_user('00000000-0000-0000-0000-0000000000b2');
select is(
  (select string_agg(p.date || ' ' || coalesce(e.catalog_id, e.name) || ' ' || p.sets || 'x' || p.reps, ', ' order by p.date, p.sort_order)
   from public.plan_items p join public.exercises e on e.id = p.exercise_id),
  '2026-11-09 squat 4x15, 2026-11-09 trazioni 5x5, 2026-11-19 Circuito finale 3x10',
  'giorni giusti; lo squat già in programma prende lo schema della scheda');
select is((select note from public.plan_items where date = '2026-11-09' and exercise_id = '00000000-0000-0000-0000-0000000000e1'), 'scapole attive',
  'la nota del trainer arriva all''atleta');
select is((select count(*)::int from public.plan_items where assigned_by = '00000000-0000-0000-0000-0000000000b1'), 3, 'tutte le righe sono del trainer');
select ok((select archived_at is null from public.exercises where id = '00000000-0000-0000-0000-0000000000e1'), 'le Trazioni archiviate tornano attive');
select is((select count(*)::int from public.exercises where catalog_id is null and name = 'Circuito finale'), 1, 'l''esercizio personalizzato viene creato');
select is((select program_name from public.program_assignments), 'Forza base', 'l''atleta vede l''assegnazione');

-- L'atleta registra ma non modifica le righe del trainer; le sue sì.
update public.plan_items set sets = 1 where assigned_by is not null;
delete from public.plan_items where assigned_by is not null;
select is((select count(*)::int from public.plan_items where assigned_by is not null and sets <> 1), 3, 'l''atleta non modifica né cancella le righe del trainer');
select throws_ok(
  $$ insert into public.plan_items (exercise_id, date, sets, reps, weight, rest_seconds, assigned_by) values ('00000000-0000-0000-0000-0000000000e2', '2026-11-10', 3, 5, 0, 90, '00000000-0000-0000-0000-0000000000b1') $$,
  '42501', null, 'l''atleta non scrive righe a nome del trainer');
select lives_ok(
  $$ insert into public.entries (exercise_id, date, sets, note) values ('00000000-0000-0000-0000-0000000000e1', '2026-11-09', '[{"weight":0,"reps":5}]', 'ultima serie dura') $$,
  'l''atleta registra l''esercizio del trainer, con una nota');

-- Il trainer ritocca e aggiunge, solo sulle righe sue.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
update public.plan_items set sets = 6, note = 'aggiungi una serie' where exercise_id = '00000000-0000-0000-0000-0000000000e1';
select is((select sets from public.plan_items where exercise_id = '00000000-0000-0000-0000-0000000000e1'), 6, 'il trainer ritocca le sue righe');
select is((select note from public.entries where user_id = '00000000-0000-0000-0000-0000000000b2'), 'ultima serie dura', 'il trainer legge la nota dell''atleta');
select lives_ok($$ select public.coach_add_plan_item('00000000-0000-0000-0000-0000000000b2', '2026-11-11', 'dip', null, 3, 8, 0, 120, 'lento') $$,
  'il trainer aggiunge un esercizio a un giorno');
select throws_ok($$ select public.coach_add_plan_item('00000000-0000-0000-0000-0000000000b2', '2026-11-11', 'dip', null, 3, 8, 0, 120, null) $$,
  'P0001', null, 'non due volte lo stesso esercizio nello stesso giorno');
select throws_ok($$ select public.ensure_athlete_exercise('00000000-0000-0000-0000-0000000000b2', 'dip', null) $$,
  '42501', null, 'la funzione interna non è chiamabile');

-- Fine del collegamento: le righe del trainer passano all'atleta.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b2');
select public.end_coach_link((select id from public.coach_links where status = 'active'));
update public.plan_items set sets = 2 where exercise_id = '00000000-0000-0000-0000-0000000000e1';
select is((select sets from public.plan_items where exercise_id = '00000000-0000-0000-0000-0000000000e1'), 2, 'scollegato, l''atleta modifica le righe del vecchio trainer');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
update public.plan_items set sets = 9;
select is((select count(*)::int from public.plan_items), 0, 'scollegato, il trainer non vede più il calendario');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b2');
select is((select max(sets) from public.plan_items where exercise_id = '00000000-0000-0000-0000-0000000000e1'), 2, 'e non lo modifica');

select * from finish();
rollback;
