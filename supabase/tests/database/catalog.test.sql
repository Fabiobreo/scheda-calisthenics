-- Catalogo esercizi comune: contenuto coerente, sola lettura per gli utenti, collegamento con gli esercizi dell'utente.
begin;
create extension if not exists pgtap with schema extensions;
select plan(25);

-- Ogni nome o sinonimo porta a una sola voce: altrimenti l'abbinamento per nome sarebbe ambiguo.
select is(
  (select count(*)::int from (
    select k from (
      select lower(name) as k from public.catalog_exercises
      union all
      select unnest(aliases) from public.catalog_exercises
    ) all_names group by k having count(*) > 1
  ) dup),
  0, 'nessun nome o sinonimo ripetuto tra voci diverse');
select is(
  (select count(*)::int from public.catalog_exercises, unnest(aliases) a where a <> lower(btrim(a))),
  0, 'i sinonimi sono in minuscolo e senza spazi esterni');

-- Contenuto del catalogo (0010, meno le cinque voci tolte dalla 0016).
select is(
  (select string_agg(category || ' ' || n, ', ' order by category) from (select category, count(*) n from public.catalog_exercises group by category) x),
  'core 7, gambe 8, skill 20, spinta 8, tirata 11', 'voci per categoria');
select is(
  (select string_agg(name, ', ' order by sort_order) from public.catalog_exercises where category = 'tirata'),
  'Trazioni prone, Trazioni supine, Trazioni presa neutra, Muscle up, Muscle up agli anelli, OAP, OAP assistito, Row agli anelli, Australian pull up, Rematore, Lat machine',
  'tirata come concordato');
select is(
  (select string_agg(name, ', ' order by sort_order) from public.catalog_exercises where category = 'spinta'),
  'Push up, Pike push up, Piegamenti in verticale, Dip, Dip agli anelli, Military, Panca piana, Pseudo planche push up',
  'spinta come concordato');
select is(
  (select count(*)::int from public.catalog_exercises
   where id = any ('{trazioni-arciere,trazioni-scapolari,piegamenti-diamante,piegamenti-declinati,piegamenti-arciere,dip-sbarra,v-sit,front-lever,planche}')),
  0, 'le voci tolte non ci sono più');
select is(
  (select count(*)::int from public.catalog_exercises
   where id = any ('{wide-planche,planche-push-up,planche-press,front-lever-pull-up,front-lever-touch}')),
  0, 'le cinque voci tolte dalla 0016 non ci sono più');
select is(
  (select count(*)::int from public.catalog_exercises
   where lower(name) = any ('{wide planche,planche push up,planche press,front lever pull up,front lever touch}')
      or aliases && '{wide planche,planche push up,planche push-up,planche press,front lever pull up,front lever pull-up,front lever touch}'),
  0, 'e i loro nomi non portano a nessuna voce: restano liberi per gli esercizi personalizzati');
select is(
  (select string_agg(name, ', ' order by sort_order) from public.catalog_exercises where category = 'skill' and name like '%planche' and measure = 'time'),
  'Tuck planche, Advanced tuck planche, One leg planche, Straddle planche, Half lay planche, Full planche',
  'le progressioni della planche sono voci a tempo');
select is((select measure from public.catalog_exercises where id = 'trazioni'), 'reps', 'gli esercizi a ripetizioni restano tali');

insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000a', 'anna@test.local');

create function pg_temp.as_user(uid uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select ok((select count(*) from public.catalog_exercises) > 0, 'gli utenti leggono il catalogo');

update public.catalog_exercises set name = 'Hack' where id = 'trazioni';
delete from public.catalog_exercises where id = 'dip';
select is((select name from public.catalog_exercises where id = 'trazioni'), 'Trazioni prone', 'gli utenti non modificano il catalogo');
select ok(exists (select 1 from public.catalog_exercises where id = 'dip'), 'gli utenti non cancellano dal catalogo');
select throws_ok(
  $$ insert into public.catalog_exercises (id, name, category, default_type) values ('nuovo', 'Nuovo', 'core', 'volume') $$,
  '42501', null, 'gli utenti non aggiungono voci al catalogo');

-- Esercizi dell'utente: dal catalogo (nome copiato dalla voce) oppure personalizzati (nome proprio).
select lives_ok(
  $$ insert into public.exercises (catalog_id, type) values ('trazioni', 'forza') $$,
  'un esercizio dal catalogo si crea senza nome');
select is((select name from public.exercises where catalog_id = 'trazioni'), 'Trazioni prone',
  'il nome viene copiato dal catalogo (lo legge la versione precedente dell''app)');
select throws_ok(
  $$ insert into public.exercises (catalog_id, type) values ('trazioni', 'volume') $$,
  '23505', null, 'una voce del catalogo una volta sola per utente');
insert into public.exercises (catalog_id, name, type) values ('dip', 'Nome a caso', 'forza');
select is((select name from public.exercises where catalog_id = 'dip'), 'Dip', 'un esercizio dal catalogo prende sempre il nome del catalogo');
update public.exercises set name = 'Rinominato' where catalog_id = 'dip';
select is((select name from public.exercises where catalog_id = 'dip'), 'Dip', 'e non si rinomina');
select throws_ok(
  $$ insert into public.exercises (type) values ('forza') $$,
  '23502', null, 'un esercizio personalizzato ha sempre un nome');
insert into public.exercises (name, type) values ('Squat', 'volume');
insert into public.exercises (catalog_id, type) values ('squat', 'volume');
select is((select name from public.exercises where catalog_id = 'squat'), 'Squat (catalogo)', 'con un personalizzato omonimo il nome del catalogo prende un suffisso');
select throws_ok(
  $$ insert into public.exercises (catalog_id, name, type) values ('inesistente', 'Inesistente', 'forza') $$,
  '23503', null, 'solo voci che esistono nel catalogo');

-- Le voci tolte dalla 0016: non si scelgono più dal catalogo, ma il nome si usa per un esercizio personalizzato
-- (è quello che diventano gli esercizi di chi le aveva).
select throws_ok(
  $$ insert into public.exercises (catalog_id, name, type) values ('planche-press', 'Planche press', 'forza') $$,
  '23503', null, 'una voce tolta non si sceglie più dal catalogo');
select lives_ok(
  $$ insert into public.exercises (name, type, measure) values ('Front lever touch', 'forza', 'time') $$,
  'il nome di una voce tolta va bene per un esercizio personalizzato');
select is(
  (select coalesce(catalog_id, 'personalizzato') || ', ' || measure from public.exercises where name = 'Front lever touch'),
  'personalizzato, time', 'che resta personalizzato, con la misura scelta');

select * from finish();
rollback;
