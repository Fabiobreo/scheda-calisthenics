-- Isolamento tra utenti (RLS), vincoli dello schema e ciclo di vita dell'account.
-- Si lancia con `npx supabase test db` sul database locale: tutto gira in una transazione annullata alla fine.
begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

-- Due utenti: Anna e Bruno. Il trigger crea il loro profilo.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'anna@test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'bruno@test.local');

select is(
  (select count(*)::int from public.profiles where id in ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b')),
  2, 'ogni nuovo utente ha un profilo');

-- Agisce come l'utente indicato, con il ruolo che usa l'app.
create function pg_temp.as_user(uid uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

-- Dati di Bruno.
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
insert into public.exercises (id, name, type) values ('00000000-0000-0000-0000-0000000000b1', 'Trazioni', 'forza');
insert into public.entries (exercise_id, date, sets) values ('00000000-0000-0000-0000-0000000000b1', '2026-11-02', '[{"weight":0,"reps":5}]');
insert into public.plan_items (exercise_id, date, sets, reps, weight, rest_seconds)
  values ('00000000-0000-0000-0000-0000000000b1', '2026-11-02', 3, 5, 0, 90);
update public.profiles set display_name = 'Bruno' where id = '00000000-0000-0000-0000-00000000000b';

-- Anna non vede niente di Bruno.
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select is((select count(*)::int from public.exercises), 0, 'Anna non vede gli esercizi di Bruno');
select is((select count(*)::int from public.entries), 0, 'Anna non vede le registrazioni di Bruno');
select is((select count(*)::int from public.plan_items), 0, 'Anna non vede il programma di Bruno');
select is((select count(*)::int from public.profiles), 1, 'Anna vede solo il proprio profilo');

-- ...e non lo può toccare.
update public.exercises set name = 'Hack' where id = '00000000-0000-0000-0000-0000000000b1';
delete from public.entries;
update public.profiles set display_name = 'Hack' where id = '00000000-0000-0000-0000-00000000000b';
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select is((select name from public.exercises), 'Trazioni', 'Anna non rinomina gli esercizi di Bruno');
select is((select count(*)::int from public.entries), 1, 'Anna non cancella le registrazioni di Bruno');
select is((select display_name from public.profiles), 'Bruno', 'Anna non modifica il profilo di Bruno');

-- Anna non scrive righe a nome di Bruno, né usa i suoi esercizi.
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select throws_ok(
  $$ insert into public.exercises (user_id, name, type) values ('00000000-0000-0000-0000-00000000000b', 'Dip', 'volume') $$,
  '42501', null, 'Anna non crea esercizi a nome di Bruno');
select throws_ok(
  $$ insert into public.entries (exercise_id, date, sets) values ('00000000-0000-0000-0000-0000000000b1', '2026-11-02', '[{"weight":0,"reps":5}]') $$,
  '23503', null, 'Anna non registra sugli esercizi di Bruno');
select throws_ok(
  $$ insert into public.plan_items (exercise_id, date, sets, reps, weight, rest_seconds) values ('00000000-0000-0000-0000-0000000000b1', '2026-11-02', 3, 5, 0, 90) $$,
  '23503', null, 'Anna non programma gli esercizi di Bruno');
select throws_ok(
  $$ insert into public.profiles (id) values ('00000000-0000-0000-0000-0000000000ff') $$,
  '42501', null, 'il client non crea profili');

-- Vincoli dello schema.
insert into public.exercises (id, name, type) values ('00000000-0000-0000-0000-0000000000a1', 'Trazioni', 'forza');
select ok(true, 'Anna può avere un esercizio con lo stesso nome di uno di Bruno');
select throws_ok(
  $$ insert into public.exercises (name, type) values ('  trazioni ', 'forza') $$,
  '23505', null, 'niente doppioni di nome per lo stesso utente, maiuscole e spazi a parte');
select throws_ok(
  $$ insert into public.plan_items (exercise_id, date) values ('00000000-0000-0000-0000-0000000000a1', '2026-11-03') $$,
  '23502', null, 'un esercizio in programma ha sempre il suo schema');
insert into public.plan_items (exercise_id, date, sets, reps, weight, rest_seconds)
  values ('00000000-0000-0000-0000-0000000000a1', '2026-11-03', 3, 5, 0, 90);
select throws_ok(
  $$ insert into public.plan_items (exercise_id, date, sets, reps, weight, rest_seconds) values ('00000000-0000-0000-0000-0000000000a1', '2026-11-03', 5, 5, 0, 90) $$,
  '23505', null, 'un esercizio al massimo una volta per giorno');
select lives_ok(
  $$ insert into public.plan_items (exercise_id, date, sets, reps, weight, rest_seconds) values ('00000000-0000-0000-0000-0000000000a1', '2026-11-10', 5, 5, 0, 90) $$,
  'lo stesso esercizio in un altro giorno va bene');

-- Eliminazione dell'account: via Anna e tutti i suoi dati, Bruno resta com'è.
select lives_ok($$ select public.delete_own_account() $$, 'Anna elimina il proprio account');
reset role;
select is((select count(*)::int from auth.users where email = 'anna@test.local'), 0, 'l''utente di Anna non c''è più');
select is(
  (select count(*)::int from public.exercises where user_id = '00000000-0000-0000-0000-00000000000a')
  + (select count(*)::int from public.plan_items where user_id = '00000000-0000-0000-0000-00000000000a')
  + (select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-00000000000a'),
  0, 'con lei spariscono esercizi, programma e profilo');
select is((select count(*)::int from public.entries where user_id = '00000000-0000-0000-0000-00000000000b'), 1, 'i dati di Bruno restano');

select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select throws_ok($$ select public.create_profile() $$, '42501', null, 'il client non chiama le funzioni interne');

select * from finish();
rollback;
