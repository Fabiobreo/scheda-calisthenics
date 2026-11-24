-- Sistema di livelli v2 (migration 0012 e 0015): record di livello col peso corporeo dentro. Voci e limiti del
-- motore v2, peso obbligatorio solo dove la formula lo usa, isolamento tra utenti, lettura del trainer collegato,
-- eliminazione dell'account. La conversione dei record vecchi si prova con scripts/prova-migration-0015.mjs.
begin;
create extension if not exists pgtap with schema extensions;
select plan(43);

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

select is((select count(*)::int from public.level_stages), 64, 'tutte le voci delle 14 catene');
select is((select count(distinct sub_id)::int from public.level_stages), 14, '14 catene');
select is((select count(*)::int from public.level_stages where not whole and not (min_exclusive and min_value = 0 and uses_bodyweight)), 0,
  'ogni voce in kg vuole un valore maggiore di zero e il peso corporeo');
select is(
  (select string_agg(sub_id || '/' || stage, ' ' order by sub_id, stage) from public.level_stages where not uses_bodyweight),
  'dip/bench-dip muscle-up/ripetizioni panca-piana/push-up trazioni/australian verticale/muro verticale/oahs verticale/oahs-1-dito verticale/oahs-3-dita verticale/oahs-5-dita verticale/oahs-straddle verticale/verticale',
  'le voci che non chiedono il peso sono quelle della decisione 9');
select is(to_regclass('public.body_weights') is null, true, 'lo storico del peso non esiste più');

-- Andrea inserisce i record.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c2');
select is((select count(*)::int from public.level_stages), 64, 'le voci si leggono dall''app');
select lives_ok($$
  insert into public.level_records (id, sub_id, stage, value, bodyweight_kg, date) values
    ('00000000-0000-0000-0000-0000000000d1', 'trazioni', 'zavorra', 30, 75, '2026-11-02'),
    ('00000000-0000-0000-0000-0000000000d2', 'planche', 'straddle', 5, 74.5, '2026-11-03'),
    ('00000000-0000-0000-0000-0000000000d3', 'military', 'massimale', 52.5, 75, '2026-11-04'),
    ('00000000-0000-0000-0000-0000000000d4', 'verticale', 'verticale', 60, null, '2026-11-04')
$$, 'Andrea inserisce i record, col peso dove serve');
select is((select bodyweight_kg from public.level_records where id = '00000000-0000-0000-0000-0000000000d2'), 74.50::numeric, 'il peso resta nel record');

-- Peso corporeo: obbligatorio e tra 30 e 250 kg solo dove la voce lo usa, mai salvato dove non lo usa.
select throws_ok($$ insert into public.level_records (sub_id, stage, value, date) values ('trazioni', 'zavorra', 20, '2026-11-02') $$, '23514', null, 'zavorra senza peso corporeo no');
select throws_ok($$ insert into public.level_records (sub_id, stage, value, date) values ('planche', 'tuck', 5, '2026-11-02') $$, '23514', null, 'skill senza peso corporeo no');
select throws_ok($$ insert into public.level_records (sub_id, stage, value, bodyweight_kg, date) values ('planche', 'tuck', 5, 29.9, '2026-11-02') $$, '23514', null, 'peso sotto i 30 kg no');
select throws_ok($$ insert into public.level_records (sub_id, stage, value, bodyweight_kg, date) values ('planche', 'tuck', 5, 250.5, '2026-11-02') $$, '23514', null, 'peso sopra i 250 kg no');
select lives_ok($$ insert into public.level_records (id, sub_id, stage, value, bodyweight_kg, date) values ('00000000-0000-0000-0000-0000000000d5', 'planche', 'tuck', 5, 30, '2026-11-02') $$, '30 kg ammessi');
select lives_ok($$ insert into public.level_records (id, sub_id, stage, value, date) values ('00000000-0000-0000-0000-0000000000d6', 'trazioni', 'australian', 12, '2026-11-02') $$, 'australian senza peso');
select lives_ok($$ insert into public.level_records (id, sub_id, stage, value, bodyweight_kg, date) values ('00000000-0000-0000-0000-0000000000d7', 'verticale', 'muro', 40, 75, '2026-11-02') $$, 'un peso mandato dove non serve non blocca il record');
select is((select bodyweight_kg from public.level_records where id = '00000000-0000-0000-0000-0000000000d7'), null::numeric, 'ma non si salva');
select throws_ok($$ update public.level_records set stage = 'ripetizioni' where id = '00000000-0000-0000-0000-0000000000d6' $$, '23514', null, 'passando a una voce che usa il peso, il peso serve');
select lives_ok($$ update public.level_records set stage = 'ripetizioni', bodyweight_kg = 75 where id = '00000000-0000-0000-0000-0000000000d6' $$, 'voce cambiata insieme al peso');
select lives_ok($$ update public.level_records set stage = 'australian' where id = '00000000-0000-0000-0000-0000000000d6' $$, 'tornando a una voce senza peso');
select is((select bodyweight_kg from public.level_records where id = '00000000-0000-0000-0000-0000000000d6'), null::numeric, 'il peso si toglie da solo');

-- Vincoli dei valori.
select throws_ok($$ insert into public.level_records (sub_id, stage, value, bodyweight_kg, date) values ('planche', 'tuck', 61, 75, '2026-11-02') $$, '23514', null, 'oltre i 60 secondi no');
select throws_ok($$ insert into public.level_records (sub_id, stage, value, bodyweight_kg, date) values ('planche-press', 'tuck', 51, 75, '2026-11-02') $$, '23514', null, 'oltre le 50 ripetizioni no');
select throws_ok($$ insert into public.level_records (sub_id, stage, value, bodyweight_kg, date) values ('planche', 'tuck', 0, 75, '2026-11-02') $$, '23514', null, 'sotto il minimo no');
select throws_ok($$ insert into public.level_records (sub_id, stage, value, bodyweight_kg, date) values ('planche', 'tuck', 2.5, 75, '2026-11-02') $$, '23514', null, 'secondi interi');
select lives_ok($$ insert into public.level_records (sub_id, stage, value, bodyweight_kg, date) values ('dip', 'zavorra', 12.5, 75, '2026-11-02') $$, 'kg con decimali');
select throws_ok($$ insert into public.level_records (sub_id, stage, value, bodyweight_kg, date) values ('dip', 'zavorra', 0, 75, '2026-11-02') $$, '23514', null, 'zavorra 0 no');
select throws_ok($$ insert into public.level_records (sub_id, stage, value, bodyweight_kg, date) values ('military', 'massimale', 0, 75, '2026-11-02') $$, '23514', null, 'massimale 0 no');
select throws_ok($$ insert into public.level_records (sub_id, stage, value, bodyweight_kg, date) values ('military', 'massimale', 400.5, 75, '2026-11-02') $$, '23514', null, 'oltre i 400 kg no');
select throws_ok($$ insert into public.level_records (sub_id, stage, value, bodyweight_kg, date) values ('planche', 'half-lay', 3, 75, '2026-11-02') $$, '23503', 'Questa voce non esiste più: aggiorna l''app e riprova', 'una voce tolta (app vecchia) dice di aggiornare l''app');
select throws_ok($$ insert into public.level_records (sub_id, stage, value, bodyweight_kg, date) values ('front-lever-touch', 'tuck', 3, 75, '2026-11-02') $$, '23503', null, 'front lever touch in tuck non esiste più');
select throws_ok($$ insert into public.level_records (sub_id, stage, value, bodyweight_kg, date) values ('gambe', 'tuck', 3, 75, '2026-11-02') $$, '23503', null, 'catena sconosciuta no');
select throws_ok($$ insert into public.level_records (sub_id, stage, value, bodyweight_kg, date) values ('planche', 'tuck', 3, 75, current_date + 5) $$, '23514', null, 'record nel futuro no');
select throws_ok($$ update public.level_records set value = 61 where id = '00000000-0000-0000-0000-0000000000d2' $$, '23514', null, 'anche le modifiche rispettano i limiti');
select lives_ok($$ update public.level_records set value = 8, note = 'video in palestra' where id = '00000000-0000-0000-0000-0000000000d2' $$, 'Andrea corregge un suo record');
select lives_ok($$ delete from public.level_records where id = '00000000-0000-0000-0000-0000000000d3' $$, 'Andrea cancella un suo record');
select throws_ok($$ insert into public.level_records (user_id, sub_id, stage, value, bodyweight_kg, date) values ('00000000-0000-0000-0000-0000000000c3', 'planche', 'tuck', 3, 75, '2026-11-02') $$, '42501', null, 'Andrea non scrive record a nome di Carla');

-- Il trainer collegato legge e basta (record e peso dentro il record).
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select is((select count(*)::int from public.level_records), 7, 'il trainer collegato vede i record dell''atleta');
select is((select bodyweight_kg from public.level_records where id = '00000000-0000-0000-0000-0000000000d1'), 75.00::numeric, 'e il peso scritto nel record');
update public.level_records set value = 10 where id = '00000000-0000-0000-0000-0000000000d2';
delete from public.level_records;
select throws_ok($$ insert into public.level_records (user_id, sub_id, stage, value, bodyweight_kg, date) values ('00000000-0000-0000-0000-0000000000c2', 'planche', 'tuck', 3, 75, '2026-11-02') $$, '42501', null, 'il trainer non inserisce record per l''atleta');

-- Chi non è collegato non vede niente.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c4');
select is((select count(*)::int from public.level_records), 0, 'un trainer non collegato non vede niente');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c3');
select is((select count(*)::int from public.level_records), 0, 'un estraneo non vede niente');
update public.level_records set value = 1;
delete from public.level_records;

select pg_temp.as_user('00000000-0000-0000-0000-0000000000c2');
select is((select value from public.level_records where id = '00000000-0000-0000-0000-0000000000d2') * 10 + (select count(*)::int from public.level_records), 87.00::numeric,
  'trainer ed estranei non modificano e non cancellano i record');

-- Eliminando l'account spariscono i record.
select public.delete_own_account();
reset role;
select is((select count(*)::int from public.level_records where user_id = '00000000-0000-0000-0000-0000000000c2'), 0, 'eliminando l''account spariscono i record');

select * from finish();
rollback;
