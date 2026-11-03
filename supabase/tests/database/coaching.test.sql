-- Trainer e atleti: inviti, collegamento, cosa può leggere il trainer e cosa no, chiusura del collegamento.
begin;
create extension if not exists pgtap with schema extensions;
select plan(30);

-- Tina trainer, Andrea atleta, Carla estranea, Teo altro trainer.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'tina@test.local'),
  ('00000000-0000-0000-0000-0000000000a2', 'andrea@test.local'),
  ('00000000-0000-0000-0000-0000000000a3', 'carla@test.local'),
  ('00000000-0000-0000-0000-0000000000a4', 'teo@test.local');
update public.profiles set display_name = 'Tina' where id = '00000000-0000-0000-0000-0000000000a1';
update public.profiles set display_name = 'Andrea' where id = '00000000-0000-0000-0000-0000000000a2';

create function pg_temp.as_user(uid uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

-- Dati di Andrea.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
insert into public.exercises (id, catalog_id, type) values ('00000000-0000-0000-0000-0000000000e1', 'trazioni', 'forza');
insert into public.entries (exercise_id, date, sets) values ('00000000-0000-0000-0000-0000000000e1', '2026-11-02', '[{"weight":0,"reps":5}]');
insert into public.plan_items (exercise_id, date, sets, reps, weight, rest_seconds) values ('00000000-0000-0000-0000-0000000000e1', '2026-11-03', 3, 5, 0, 90);

-- Codice d'invito: solo per chi ha attivato la modalità trainer.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select throws_ok($$ select public.rotate_invite_code() $$, 'P0001', null, 'senza modalità trainer niente codice');
update public.profiles set is_trainer = true where id = '00000000-0000-0000-0000-0000000000a1';
create temp table codes (who text primary key, code text);
grant all on codes to authenticated;
insert into codes values ('tina-vecchio', public.rotate_invite_code());
insert into codes values ('tina', public.rotate_invite_code());
select matches((select code from codes where who = 'tina'), '^[A-Z2-9]{8}$', 'il codice ha 8 caratteri leggibili');
select is((select count(*)::int from public.exercises), 0, 'prima del collegamento il trainer non vede nulla');
select throws_ok(
  $$ insert into public.coach_links (trainer_id, athlete_id) values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2') $$,
  '42501', null, 'i collegamenti non si creano direttamente');

-- Andrea vede chi c'è dietro il codice e accetta.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
select is((select trainer_name from public.preview_invite((select lower(code) from codes where who = 'tina'))), 'Tina', 'l''anteprima mostra il nome del trainer, maiuscole a parte');
select is((select count(*)::int from public.preview_invite((select code from codes where who = 'tina-vecchio'))), 0, 'il codice vecchio non vale più');
select is(public.accept_invite((select code from codes where who = 'tina-vecchio')), null, 'accettare un codice vecchio non collega nessuno');
select lives_ok(format('select public.accept_invite(%L)', (select code from codes where who = 'tina')), 'Andrea accetta l''invito di Tina');
select lives_ok(format('select public.accept_invite(%L)', (select code from codes where who = 'tina')), 'accettare di nuovo lo stesso invito non dà errore');
select is((select count(*)::int from public.coach_links), 1, 'un solo collegamento');
select is((select display_name from public.profiles where id = '00000000-0000-0000-0000-0000000000a1'), 'Tina', 'l''atleta vede il nome del suo trainer');

-- Un secondo trainer non si aggiunge finché c'è il primo.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a4');
update public.profiles set is_trainer = true where id = '00000000-0000-0000-0000-0000000000a4';
insert into codes values ('teo', public.rotate_invite_code());
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
select throws_ok(format('select public.accept_invite(%L)', (select code from codes where who = 'teo')), 'P0001', null, 'un solo trainer attivo per atleta');

-- Tina legge i dati di Andrea, ma non li modifica.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select throws_ok(format('select public.accept_invite(%L)', (select code from codes where who = 'tina')), 'P0001', null, 'un trainer non si collega a se stesso');
select is((select count(*)::int from public.exercises where user_id = '00000000-0000-0000-0000-0000000000a2'), 1, 'il trainer vede gli esercizi dell''atleta');
select is((select count(*)::int from public.entries where user_id = '00000000-0000-0000-0000-0000000000a2'), 1, 'il trainer vede le registrazioni dell''atleta');
select is((select count(*)::int from public.plan_items where user_id = '00000000-0000-0000-0000-0000000000a2'), 1, 'il trainer vede il programma dell''atleta');
select is((select display_name from public.profiles where id = '00000000-0000-0000-0000-0000000000a2'), 'Andrea', 'il trainer vede il nome dell''atleta');
update public.plan_items set sets = 10;
delete from public.entries;
select throws_ok(
  $$ insert into public.entries (user_id, exercise_id, date, sets) values ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000e1', '2026-11-04', '[{"weight":0,"reps":5}]') $$,
  '42501', null, 'il trainer non registra al posto dell''atleta');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
select is((select sets from public.plan_items), 3, 'il trainer non cambia il programma dell''atleta (per ora)');
select is((select count(*)::int from public.entries), 1, 'il trainer non cancella le registrazioni dell''atleta');

-- Chi non è collegato non vede niente.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a3');
select is((select count(*)::int from public.exercises) + (select count(*)::int from public.entries) + (select count(*)::int from public.coach_links), 0,
  'un estraneo non vede dati né collegamenti');
select throws_ok(format('select public.end_coach_link(%L)', (select id from public.coach_links limit 1)), 'P0002', null, 'un estraneo non chiude collegamenti altrui');

-- Spegnere la modalità trainer toglie subito l'accesso.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
update public.profiles set is_trainer = false where id = '00000000-0000-0000-0000-0000000000a1';
select is((select count(*)::int from public.exercises where user_id = '00000000-0000-0000-0000-0000000000a2'), 0, 'senza modalità trainer niente accesso');
update public.profiles set is_trainer = true where id = '00000000-0000-0000-0000-0000000000a1';

-- L'atleta chiude il collegamento: il trainer non vede più nulla, lo storico del collegamento resta.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
select lives_ok(format('select public.end_coach_link(%L)', (select id from public.coach_links where status = 'active')), 'l''atleta chiude il collegamento');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select is((select count(*)::int from public.exercises where user_id = '00000000-0000-0000-0000-0000000000a2'), 0, 'dopo la chiusura il trainer non vede più gli esercizi');
select is((select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-0000000000a2'), 0, 'né il nome dell''atleta');
select is((select status from public.coach_links), 'ended', 'il collegamento resta, chiuso');

-- Troppi codici sbagliati bloccano gli inviti per un'ora (Carla ne ha già sbagliati 0).
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a3');
select count(*) from generate_series(1, 10) as g, lateral public.preview_invite(left('ZZZZZZZZ' || g, 8));
select is((select count(*)::int from public.invite_failures), 0, 'i tentativi falliti non sono leggibili dal client');
select throws_ok($$ select * from public.preview_invite('ZZZZZZZZ') $$, 'P0001', null, 'dopo 10 codici sbagliati l''anteprima si blocca');
select throws_ok(format('select public.accept_invite(%L)', (select code from codes where who = 'teo')), 'P0001', null, 'e anche l''accettazione, pure con un codice giusto');

select * from finish();
rollback;
