-- Classifiche (migration 0017, ticket 38): luogo e visibilità del profilo, punti sul server, posizioni nei 5 ambiti
-- e nelle 6 metriche, profili privati invisibili fuori da chi li segue, nessuna lettura di record e peso altrui.
begin;
create extension if not exists pgtap with schema extensions;
select plan(72);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'anna@test.local'),
  ('00000000-0000-0000-0000-0000000000b1', 'bruno@test.local'),
  ('00000000-0000-0000-0000-0000000000c1', 'carla@test.local'),
  ('00000000-0000-0000-0000-0000000000d1', 'dario@test.local'),
  ('00000000-0000-0000-0000-0000000000e1', 'elena@test.local'),
  ('00000000-0000-0000-0000-0000000000f1', 'furio@test.local'),
  ('00000000-0000-0000-0000-000000000091', 'gina@test.local'),
  ('00000000-0000-0000-0000-000000000092', 'hugo@test.local'),
  ('00000000-0000-0000-0000-000000000093', 'ivo@test.local'),
  ('00000000-0000-0000-0000-000000000094', 'katia@test.local');

select is((select count(*)::int from public.profiles where id::text like '00000000-0000-0000-0000-0000000000%' and is_private), 10,
  'chi si iscrive nasce privato');
select is((select count(*)::int from public.provinces), 107, '107 province');
select is((select count(distinct region)::int from public.provinces), 20, '20 regioni');

-- Luogo dai metadati della registrazione: valori giusti accettati, sbagliati lasciati vuoti senza bloccare.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000095', 'luca@test.local', '{"country": "it", "province": "na"}'),
  ('00000000-0000-0000-0000-000000000096', 'mara@test.local', '{"country": "Francia", "province": "XX"}'),
  ('00000000-0000-0000-0000-000000000097', 'nico@test.local', '{"country": "DE", "province": "MI"}');
select is((select country || '/' || province || '/' || region from public.profiles where id = '00000000-0000-0000-0000-000000000095'),
  'IT/NA/Campania', 'registrazione: nazione e provincia dai metadati, regione ricavata');
select is((select coalesce(country, '-') || '/' || coalesce(province, '-') from public.profiles where id = '00000000-0000-0000-0000-000000000096'),
  '-/-', 'registrazione: valori sbagliati restano vuoti');
select is((select country || '/' || coalesce(province, '-') from public.profiles where id = '00000000-0000-0000-0000-000000000097'),
  'DE/-', 'registrazione: fuori dall''Italia niente provincia');

--            nome     nazione  provincia  privato   ft    fs   st   ss   hb   totale
-- Anna       IT       MI       no        1000   800  400  300  500   3000
-- Bruno      IT       MI       sì         500   500  500  500  500   2500   (Furio lo segue)
-- Carla      IT       BG       no         400   400  400  400  400   2000
-- Dario      IT       RM       no         300   300  300  300  300   1500
-- Elena      FR       —        no         800   800  800  800  800   4000
-- Furio      IT       MI       sì         100   200  300  400    0   1000
-- Gina       IT       MI       no           0     0    0    0    0      0   (nessun punto: non partecipa)
-- Hugo       —        —        no         100   100  100  100  100    500
-- Ivo        IT       MI       sì         nessuna riga di punti
-- Katia      IT       MI       sì         600   600  600  500  500   2800   (richiesta di Furio in attesa)
update public.profiles p set display_name = v.name, country = v.country, province = v.province, is_private = v.priv
from (values
  ('00000000-0000-0000-0000-0000000000a1'::uuid, 'Anna', 'IT', 'MI', false),
  ('00000000-0000-0000-0000-0000000000b1', 'Bruno', 'IT', 'MI', true),
  ('00000000-0000-0000-0000-0000000000c1', 'Carla', 'IT', 'BG', false),
  ('00000000-0000-0000-0000-0000000000d1', 'Dario', 'IT', 'RM', false),
  ('00000000-0000-0000-0000-0000000000e1', 'Elena', 'FR', null, false),
  ('00000000-0000-0000-0000-0000000000f1', 'Furio', 'IT', 'MI', true),
  ('00000000-0000-0000-0000-000000000091', 'Gina', 'IT', 'MI', false),
  ('00000000-0000-0000-0000-000000000092', 'Hugo', null, null, false),
  ('00000000-0000-0000-0000-000000000093', null, 'IT', 'MI', true),
  ('00000000-0000-0000-0000-000000000094', 'Katia', 'IT', 'MI', true)
) as v (id, name, country, province, priv)
where p.id = v.id;

insert into public.level_scores (user_id, ft, fs, st, ss, hb, total, rules_version) values
  ('00000000-0000-0000-0000-0000000000a1', 1000, 800, 400, 300, 500, 3000, 1),
  ('00000000-0000-0000-0000-0000000000b1', 500, 500, 500, 500, 500, 2500, 1),
  ('00000000-0000-0000-0000-0000000000c1', 400, 400, 400, 400, 400, 2000, 1),
  ('00000000-0000-0000-0000-0000000000d1', 300, 300, 300, 300, 300, 1500, 1),
  ('00000000-0000-0000-0000-0000000000e1', 800, 800, 800, 800, 800, 4000, 1),
  ('00000000-0000-0000-0000-0000000000f1', 100, 200, 300, 400, 0, 1000, 1),
  ('00000000-0000-0000-0000-000000000091', 0, 0, 0, 0, 0, 0, 1),
  ('00000000-0000-0000-0000-000000000092', 100, 100, 100, 100, 100, 500, 1),
  ('00000000-0000-0000-0000-000000000094', 600, 600, 600, 500, 500, 2800, 1);

insert into public.follows (follower, followee, status) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000b1', 'accepted'),
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-000000000094', 'pending');

-- Un record di Bruno col peso corporeo: nessun altro lo deve leggere.
insert into public.level_records (user_id, sub_id, stage, value, bodyweight_kg, date) values
  ('00000000-0000-0000-0000-0000000000b1', 'trazioni', 'zavorra', 30, 75, '2026-11-02');

create function pg_temp.as_user(uid uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;
-- "Elena 1, Anna 2": nomi e posizioni delle righe, nell'ordine in cui arrivano
create function pg_temp.names(r jsonb) returns text language sql as $$
  select string_agg((x ->> 'name') || ' ' || (x ->> 'position'), ', ' order by n)
  from jsonb_array_elements(r -> 'rows') with ordinality as t (x, n)
$$;
-- "7/8": posizione / partecipanti
create function pg_temp.pos(r jsonb) returns text language sql as $$
  select coalesce(r ->> 'position', '-') || '/' || (r ->> 'participants')
$$;

select is((select province || '/' || region || '/' || is_private from public.level_scores where user_id = '00000000-0000-0000-0000-0000000000c1'),
  'BG/Lombardia/false', 'i punti portano la copia di luogo e visibilità del profilo');

-- Furio: privato, Milano, segue Bruno (accettato) e ha chiesto a Katia (in attesa).
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f1');
select is(pg_temp.pos(public.ranking('mondo', 'generale')), '7/8', 'mondo: settimo su 8 (chi ha 0 punti o nessuna riga non partecipa)');
select is(pg_temp.pos(public.ranking('nazione', 'generale')), '6/6', 'nazione: sesto su 6');
select is(pg_temp.pos(public.ranking('regione', 'generale')), '5/5', 'regione: quinto su 5');
select is(pg_temp.pos(public.ranking('provincia', 'generale')), '4/4', 'provincia: quarto su 4');
select is(pg_temp.pos(public.ranking('amici', 'generale')), '2/2', 'amici: chi seguo (accettato) più me');
select is(pg_temp.names(public.ranking('mondo', 'generale')), 'Elena 1, Anna 2, Bruno 4, Carla 5, Dario 6, Furio 7, Hugo 8',
  'mondo: prime 3 visibili e vicini; Katia (privata, richiesta in attesa) non compare ma occupa la terza posizione');
select is(pg_temp.names(public.ranking('provincia', 'generale')), 'Anna 1, Bruno 3, Furio 4', 'provincia: Katia è seconda e non si vede');
select is(pg_temp.names(public.ranking('amici', 'generale')), 'Bruno 1, Furio 2', 'amici: le due righe');
select is((public.ranking('mondo', 'generale') ->> 'score')::int, 1000, 'i miei punti nella metrica');
select is((select count(*)::int from jsonb_array_elements(public.ranking('mondo', 'generale') -> 'rows') x where (x ->> 'me')::boolean), 1, 'una sola riga è la mia');
select is((select array_agg(k order by k) from jsonb_object_keys(public.ranking('mondo', 'generale') -> 'rows' -> 0) k),
  array['me', 'name', 'position', 'score', 'userId'], 'di una riga escono solo nome, punti, posizione e identificativo');

-- Le 5 categorie.
select is(pg_temp.pos(public.ranking('mondo', 'fondamentali-tirata')), '7/8', 'fondamentali tirata: settimo a pari merito con Hugo');
select is(pg_temp.pos(public.ranking('mondo', 'fondamentali-spinta')), '7/8', 'fondamentali spinta');
select is(pg_temp.pos(public.ranking('mondo', 'skill-tirata')), '6/8', 'skill tirata: sesto a pari merito con Dario');
select is(pg_temp.pos(public.ranking('mondo', 'skill-spinta')), '4/8', 'skill spinta: quarto a pari merito con Carla');
select is(pg_temp.pos(public.ranking('mondo', 'handbalance')), '8/8', 'handbalance: 0 punti nella categoria, ultimo');
select is(pg_temp.pos(public.ranking('provincia', 'skill-spinta')), '3/4', 'una categoria dentro la provincia');
select is(pg_temp.names(public.ranking('nazione', 'skill-spinta')), 'Bruno 1, Carla 3, Furio 3, Anna 5, Dario 5',
  'a pari punti stessa posizione');

-- I 5 riquadri in una chiamata.
select is((select string_agg(k || ' ' || pg_temp.pos(v), ', ' order by k) from jsonb_each(public.ranking_overview('generale')) as t (k, v)),
  'amici 2/2, mondo 7/8, nazione 6/6, provincia 4/4, regione 5/5', 'riepilogo dei 5 ambiti');
select is((public.ranking_overview('generale') -> 'mondo') ? 'rows', false, 'il riepilogo non porta le righe');
select throws_ok($$ select public.ranking('mondo', 'gambe') $$, '22023', null, 'metrica sconosciuta');
select throws_ok($$ select public.ranking('quartiere', 'generale') $$, '22023', null, 'ambito sconosciuto');

-- RLS: si legge solo la propria riga di punti e il proprio profilo; niente record o peso degli altri.
select is((select count(*)::int from public.level_scores), 1, 'dalla tabella leggo solo i miei punti');
select is((select count(*)::int from public.profiles), 1, 'e solo il mio profilo');
select is((select count(*)::int from public.level_records), 0, 'nessun record degli altri, nemmeno di chi seguo');
select is((select count(*)::int from public.follows), 2, 'vedo le mie due righe di chi seguo');
select throws_ok($$ insert into public.follows (follower, followee, status) values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a1', 'accepted') $$,
  '42501', null, 'non si segue scrivendo nella tabella');
update public.follows set status = 'accepted';
select throws_ok($$ insert into public.level_scores (user_id, ft, fs, st, ss, hb, total, rules_version) values ('00000000-0000-0000-0000-000000000093', 1, 0, 0, 0, 0, 1, 1) $$,
  '42501', null, 'non scrivo i punti di un altro');
update public.level_scores set total = 7000, ft = 1400, fs = 1400, st = 1400, ss = 1400, hb = 1400;
select is(pg_temp.pos(public.ranking('mondo', 'generale')), '1/8', 'un aggiornamento senza filtro tocca solo la mia riga');
select is(pg_temp.names(public.ranking('mondo', 'generale')), 'Furio 1, Elena 2, Anna 3', 'e Katia resta nascosta (richiesta ancora in attesa)');

-- Vincoli dei punti.
select throws_ok($$ update public.level_scores set total = 999 $$, '23514', null, 'il complessivo è la somma delle categorie');
select throws_ok($$ update public.level_scores set ft = 1401, total = 7001 $$, '23514', null, 'una categoria arriva a 1400');
select throws_ok($$ update public.level_scores set ft = -1, total = 6999 $$, '23514', null, 'niente punti negativi');
select lives_ok($$ update public.level_scores set ft = 100, fs = 200, st = 300, ss = 400, hb = 0, total = 1000, rules_version = 2 $$, 'punti ricalcolati con regole nuove');
select throws_ok($$ update public.level_scores set rules_version = 1 $$, '23514', 'Punti calcolati con regole vecchie: aggiorna l''app e riprova',
  'un''app con regole vecchie non sovrascrive');
select lives_ok($$ insert into public.level_scores (ft, fs, st, ss, hb, total, rules_version) values (100, 200, 300, 400, 0, 1000, 2)
  on conflict (user_id) do update set ft = excluded.ft, fs = excluded.fs, st = excluded.st, ss = excluded.ss, hb = excluded.hb, total = excluded.total, rules_version = excluded.rules_version $$,
  'l''app salva con un upsert');

-- Luogo e visibilità: li decide il profilo, la copia nei punti segue.
update public.level_scores set is_private = false, province = 'RM', region = 'Lazio', country = 'FR';
select is((select country || '/' || province || '/' || region || '/' || is_private from public.level_scores), 'IT/MI/Lombardia/true',
  'scrivere luogo e visibilità nella riga dei punti non ha effetto');
update public.profiles set province = 'RM', region = 'Sicilia';
select is((select province || '/' || region from public.profiles), 'RM/Lazio', 'la regione la decide la provincia');
select is((select province || '/' || region from public.level_scores), 'RM/Lazio', 'e i punti seguono il profilo');
select is(pg_temp.pos(public.ranking('provincia', 'generale')), '2/2', 'ora sono nella classifica di Roma');
select throws_ok($$ update public.profiles set province = 'ZZ' $$, '23503', null, 'provincia che non esiste no');
select throws_ok($$ update public.profiles set country = 'Italia' $$, '23514', null, 'la nazione è un codice di due lettere');
update public.profiles set country = 'FR';
select is((select coalesce(province, '-') || '/' || coalesce(region, '-') from public.profiles), '-/-', 'fuori dall''Italia provincia e regione si svuotano');
select is((public.ranking('provincia', 'generale') ->> 'available')::boolean, false, 'provincia non disponibile fuori dall''Italia');
select is((public.ranking('regione', 'generale') ->> 'available')::boolean, false, 'regione non disponibile fuori dall''Italia');
select is(pg_temp.pos(public.ranking('nazione', 'generale')), '2/2', 'nazione: ora la Francia, con Elena');
update public.profiles set country = 'IT', province = 'MI', is_private = false;
select is((select is_private from public.level_scores), false, 'diventando pubblico cambia anche la copia nei punti');

-- Anna: pubblica, non segue nessuno. Vede Furio (ora pubblico) ma non Bruno e Katia.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select is(pg_temp.pos(public.ranking('mondo', 'generale')), '2/8', 'Anna seconda nel mondo');
select is(pg_temp.names(public.ranking('mondo', 'generale')), 'Elena 1, Anna 2, Carla 5, Dario 6',
  'Anna non vede i privati Katia e Bruno, che restano contati nelle posizioni');
select is(pg_temp.names(public.ranking('provincia', 'generale')), 'Anna 1, Furio 4', 'provincia: i due privati in mezzo non compaiono');
select is(pg_temp.pos(public.ranking('amici', 'generale')), '1/1', 'senza seguire nessuno, tra gli amici ci sono solo io');
select is((select count(*)::int from public.level_records), 0, 'Anna non legge record e peso di Bruno');

-- Bruno, privato: vede la propria riga e la propria posizione.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
select is(pg_temp.names(public.ranking('mondo', 'generale')), 'Elena 1, Anna 2, Bruno 4, Carla 5, Dario 6',
  'un privato vede la sua riga; chi lo segue non gli compare tra gli amici');
select is(pg_temp.pos(public.ranking('amici', 'generale')), '1/1', 'essere seguito non rende amico: conta chi seguo io');

-- Elena (Francia), Hugo (senza luogo), Gina (0 punti), Ivo (nessuna riga).
select pg_temp.as_user('00000000-0000-0000-0000-0000000000e1');
select is((select string_agg(k || ' ' || case when (v ->> 'available')::boolean then pg_temp.pos(v) else '—' end, ', ' order by k) from jsonb_each(public.ranking_overview('generale')) as t (k, v)),
  'amici 1/1, mondo 1/8, nazione 1/1, provincia —, regione —', 'chi non è in Italia non ha provincia e regione');
select pg_temp.as_user('00000000-0000-0000-0000-000000000092');
select is((public.ranking('nazione', 'generale') ->> 'available')::boolean, false, 'senza luogo niente classifica della nazione');
select is(pg_temp.pos(public.ranking('mondo', 'generale')), '8/8', 'ma nel mondo c''è');
select pg_temp.as_user('00000000-0000-0000-0000-000000000091');
select is(pg_temp.pos(public.ranking('mondo', 'generale')), '-/8', 'con 0 punti non ho una posizione');
select is(pg_temp.names(public.ranking('mondo', 'generale')), 'Elena 1, Anna 2, Carla 5', 'e vedo le prime 3 visibili');
select pg_temp.as_user('00000000-0000-0000-0000-000000000093');
select is(pg_temp.pos(public.ranking('provincia', 'generale')), '-/4', 'senza riga di punti: nessuna posizione, partecipanti contati');
select throws_ok($$ update public.profiles set is_private = false $$, '23514', null, 'senza nome non si diventa pubblici');

-- Chi non ha fatto l'accesso non legge niente.
select set_config('role', 'anon', true), set_config('request.jwt.claims', '', true);
select throws_ok($$ select public.ranking('mondo', 'generale') $$, '42501', null, 'senza accesso niente classifiche');
select is((select count(*)::int from public.level_scores), 0, 'né punti');

-- Eliminando l'account si esce dalle classifiche.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f1');
select public.delete_own_account();
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select is(pg_temp.pos(public.ranking('mondo', 'generale')), '2/7', 'account eliminato: un partecipante in meno');
reset role;
select is((select count(*)::int from public.follows where follower = '00000000-0000-0000-0000-0000000000f1')
        + (select count(*)::int from public.level_scores where user_id = '00000000-0000-0000-0000-0000000000f1'), 0,
  'e spariscono i suoi punti e chi seguiva');

select * from finish();
rollback;
