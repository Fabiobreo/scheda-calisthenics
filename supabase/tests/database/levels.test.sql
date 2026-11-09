-- Sistema di livelli (migration 0012): peso corporeo e record di livello. Isolamento tra utenti, lettura del
-- trainer collegato, vincoli sui valori, eliminazione dell'account.
begin;
create extension if not exists pgtap with schema extensions;
select plan(30);

-- Tina trainer di Andrea; Teo trainer non collegato; Carla estranea.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000c1', 'tina@test.local'),
  ('00000000-0000-0000-0000-0000000000c2', 'andrea@test.local'),
  ('00000000-0000-0000-0000-0000000000c3', 'carla@test.local'),
  ('00000000-0000-0000-0000-0000000000c4', 'teo@test.local');
update public.profiles set is_trainer = true where id in ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c4');
insert into public.coach_links (trainer_id, athlete_id) values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c2');

create function pg_temp.as_user(uid uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

select is((select count(*)::int from public.level_stages), 56, 'tutte le progressioni dei 14 sotto-esercizi');
select is((select count(distinct sub_id)::int from public.level_stages), 14, '14 sotto-esercizi');

-- Andrea inserisce peso e record.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c2');
select is((select count(*)::int from public.level_stages), 56, 'le progressioni si leggono dall''app');
select lives_ok($$ insert into public.body_weights (date, kg) values ('2026-11-01', 75), ('2026-11-08', 76.5) $$, 'Andrea inserisce il suo peso');
select throws_ok($$ insert into public.body_weights (date, kg) values ('2026-11-01', 74) $$, '23505', null, 'un solo peso per giorno');
select lives_ok($$ insert into public.body_weights (date, kg) values ('2026-11-01', 74) on conflict (user_id, date) do update set kg = excluded.kg $$, 'il peso del giorno si corregge');
select is((select kg from public.body_weights where date = '2026-11-01'), 74.00::numeric, 'peso corretto');
select lives_ok($$
  insert into public.level_records (id, sub_id, stage, value, date) values
    ('00000000-0000-0000-0000-0000000000d1', 'trazioni', 'zavorra', 30, '2026-11-02'),
    ('00000000-0000-0000-0000-0000000000d2', 'planche', 'straddle', 5, '2026-11-03'),
    ('00000000-0000-0000-0000-0000000000d3', 'trazioni', 'zavorra', 0, '2026-11-04'),
    ('00000000-0000-0000-0000-0000000000d4', 'verticale', 'verticale', 120, '2026-11-04')
$$, 'Andrea inserisce i record (zavorra 0 ammessa)');

-- Vincoli dei valori.
select throws_ok($$ insert into public.level_records (sub_id, stage, value, date) values ('planche', 'tuck', 11, '2026-11-02') $$, '23514', null, 'oltre il massimo della progressione no');
select throws_ok($$ insert into public.level_records (sub_id, stage, value, date) values ('planche', 'tuck', 0, '2026-11-02') $$, '23514', null, 'sotto il minimo no');
select throws_ok($$ insert into public.level_records (sub_id, stage, value, date) values ('planche', 'tuck', 2.5, '2026-11-02') $$, '23514', null, 'secondi interi');
select lives_ok($$ insert into public.level_records (sub_id, stage, value, date) values ('dip', 'zavorra', 12.5, '2026-11-02') $$, 'kg con decimali');
select throws_ok($$ insert into public.level_records (sub_id, stage, value, date) values ('military', 'bilanciere', 0, '2026-11-02') $$, '23514', null, 'bilanciere da 1 kg');
select throws_ok($$ insert into public.level_records (sub_id, stage, value, date) values ('planche', 'boh', 3, '2026-11-02') $$, '23503', null, 'progressione sconosciuta no');
select throws_ok($$ insert into public.level_records (sub_id, stage, value, date) values ('gambe', 'tuck', 3, '2026-11-02') $$, '23503', null, 'sotto-esercizio sconosciuto no');
select throws_ok($$ insert into public.level_records (sub_id, stage, value, date) values ('planche', 'tuck', 3, current_date + 5) $$, '23514', null, 'record nel futuro no');
select throws_ok($$ insert into public.body_weights (date, kg) values (current_date + 5, 75) $$, '23514', null, 'peso nel futuro no');
select throws_ok($$ insert into public.body_weights (date, kg) values ('2026-10-01', 10) $$, '23514', null, 'peso assurdo no');
select throws_ok($$ update public.level_records set value = 20 where id = '00000000-0000-0000-0000-0000000000d2' $$, '23514', null, 'anche le modifiche rispettano i limiti');
select lives_ok($$ update public.level_records set value = 8, note = 'video in palestra' where id = '00000000-0000-0000-0000-0000000000d2' $$, 'Andrea corregge un suo record');
select lives_ok($$ delete from public.level_records where id = '00000000-0000-0000-0000-0000000000d3' $$, 'Andrea cancella un suo record');
select throws_ok($$ insert into public.level_records (user_id, sub_id, stage, value, date) values ('00000000-0000-0000-0000-0000000000c3', 'planche', 'tuck', 3, '2026-11-02') $$, '42501', null, 'Andrea non scrive record a nome di Carla');

-- Il trainer collegato legge e basta.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select is((select count(*)::int from public.level_records), 4, 'il trainer collegato vede i record dell''atleta');
select is((select count(*)::int from public.body_weights), 2, 'il trainer collegato vede il peso dell''atleta');
update public.level_records set value = 10 where id = '00000000-0000-0000-0000-0000000000d2';
delete from public.body_weights;
select throws_ok($$ insert into public.level_records (user_id, sub_id, stage, value, date) values ('00000000-0000-0000-0000-0000000000c2', 'planche', 'tuck', 3, '2026-11-02') $$, '42501', null, 'il trainer non inserisce record per l''atleta');

-- Chi non è collegato non vede niente.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c4');
select is((select count(*)::int from public.level_records) + (select count(*)::int from public.body_weights), 0, 'un trainer non collegato non vede niente');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c3');
select is((select count(*)::int from public.level_records) + (select count(*)::int from public.body_weights), 0, 'un estraneo non vede niente');
update public.level_records set value = 1;
delete from public.level_records;

select pg_temp.as_user('00000000-0000-0000-0000-0000000000c2');
select is((select value from public.level_records where id = '00000000-0000-0000-0000-0000000000d2'), 8.00::numeric, 'trainer ed estranei non modificano i record');
select is((select count(*)::int from public.level_records) * 10 + (select count(*)::int from public.body_weights), 42, 'trainer ed estranei non cancellano niente');

-- Eliminando l'account spariscono peso e record.
select public.delete_own_account();
reset role;
select is((select count(*)::int from public.level_records where user_id = '00000000-0000-0000-0000-0000000000c2')
        + (select count(*)::int from public.body_weights where user_id = '00000000-0000-0000-0000-0000000000c2'), 0,
  'eliminando l''account spariscono peso e record');

select * from finish();
rollback;
