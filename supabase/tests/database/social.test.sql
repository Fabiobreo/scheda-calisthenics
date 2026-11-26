-- Home social (migration 0018, ticket 39): seguire con profili pubblici e privati, che cosa si legge di un altro,
-- novità (record, allenamento condiviso, sorpasso), blocco, segnalazione, link d'invito, limiti, account eliminato.
begin;
create extension if not exists pgtap with schema extensions;
select plan(131);

-- Anna (pubblica), Bruno (privato), Carla (privata: è lei che guarda), Dario (pubblico), Elena (senza nome),
-- Furio (pubblico), più 31 profili pubblici "Folla" per il limite delle richieste.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'anna@test.local'),
  ('00000000-0000-0000-0000-0000000000b1', 'bruno@test.local'),
  ('00000000-0000-0000-0000-0000000000c1', 'carla@test.local'),
  ('00000000-0000-0000-0000-0000000000d1', 'dario@test.local'),
  ('00000000-0000-0000-0000-0000000000e1', 'elena@test.local'),
  ('00000000-0000-0000-0000-0000000000f1', 'furio@test.local');
insert into auth.users (id, email)
select ('00000000-0000-0000-0000-0000000001' || lpad(g::text, 2, '0'))::uuid, 'folla' || g || '@test.local' from generate_series(1, 31) g;

update public.profiles p set display_name = v.name, country = 'IT', province = v.province, is_private = v.priv
from (values
  ('00000000-0000-0000-0000-0000000000a1'::uuid, 'Anna', 'MI', false),
  ('00000000-0000-0000-0000-0000000000b1', 'Bruno', 'MI', true),
  ('00000000-0000-0000-0000-0000000000c1', 'Carla', 'BG', true),
  ('00000000-0000-0000-0000-0000000000d1', 'Dario', 'RM', false),
  ('00000000-0000-0000-0000-0000000000e1', null, 'MI', true),
  ('00000000-0000-0000-0000-0000000000f1', 'Furio', 'MI', false)
) as v (id, name, province, priv)
where p.id = v.id;
update public.profiles set display_name = 'Folla ' || right(id::text, 2), is_private = false where id::text like '00000000-0000-0000-0000-0000000001%';

insert into public.level_scores (user_id, ft, fs, st, ss, hb, total, rules_version) values
  ('00000000-0000-0000-0000-0000000000a1', 1000, 0, 0, 0, 0, 1000, 1),
  ('00000000-0000-0000-0000-0000000000b1', 1000, 1000, 0, 0, 0, 2000, 1),
  ('00000000-0000-0000-0000-0000000000c1', 1000, 400, 100, 0, 0, 1500, 1),
  ('00000000-0000-0000-0000-0000000000d1', 500, 0, 0, 0, 0, 500, 1),
  ('00000000-0000-0000-0000-0000000000f1', 1000, 1000, 1000, 0, 0, 3000, 1);

create function pg_temp.as_user(uid uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;
-- "Bruno workout, Anna record": autore e tipo delle novità, nell'ordine in cui arrivano
create function pg_temp.kinds(j jsonb) returns text language sql as $$
  select coalesce(string_agg((x ->> 'actorName') || ' ' || (x ->> 'kind'), ', ' order by n), '')
  from jsonb_array_elements(j -> 'events') with ordinality as t (x, n)
$$;
create function pg_temp.names(r jsonb) returns text language sql as $$
  select coalesce(string_agg((x ->> 'name') || ' ' || (x ->> 'position'), ', ' order by n), '')
  from jsonb_array_elements(r -> 'rows') with ordinality as t (x, n)
$$;

select is((select array_agg(public.level_band(t) order by t) from unnest(array[0, 300, 301, 800, 801, 2300, 2301, 3800, 3801, 5300, 5301, 6800]) t),
  array[0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5], 'fasce del livello complessivo come nel motore');
select is(public.level_band(null), 0, 'senza punti: Base');
select is((select count(*)::int from public.profiles where share_records and id::text like '00000000-0000-0000-0000-0000000%'), 37, 'la condivisione dei record nasce accesa');

-- ---------------------------------------------------------------------------------------------------------
-- Anna e Bruno fanno un record che migliora il punteggio e condividono un allenamento.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
insert into public.level_records (sub_id, stage, value, date) values ('verticale', 'verticale', 30, current_date);
update public.level_scores set hb = 100, total = 1100;
insert into public.shared_workouts (name, date, items) values ('  Push day ', current_date,
  '[{"name": "Dip", "catalogId": "dip", "measure": "reps", "type": "forza", "rest": 90, "sets": [{"weight": 10, "reps": 8, "seconds": 0}]}]');
select is((select name from public.shared_workouts), 'Push day', 'il nome dell''allenamento condiviso si ripulisce dagli spazi');

select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
insert into public.level_records (sub_id, stage, value, bodyweight_kg, date) values ('trazioni', 'zavorra', 30, 75, current_date);
update public.level_scores set st = 100, total = 2100;
insert into public.shared_workouts (name, date, items) values ('Pull day', current_date, '[{"name": "Trazioni", "sets": [{"weight": 0, "reps": 6, "seconds": 0}]}]');

reset role;
select is((select string_agg(p.display_name || ' ' || e.kind, ', ' order by e.created_at) from public.feed_events e join public.profiles p on p.id = e.actor),
  'Anna record, Anna workout, Bruno record, Bruno workout', 'le novità le crea il database: record che migliora il punteggio e allenamento condiviso');
select is((select array_agg(k order by k) from jsonb_object_keys((select payload from public.feed_events where kind = 'record' and actor = '00000000-0000-0000-0000-0000000000b1')) k),
  array['date', 'gained', 'stage', 'subId', 'value'], 'di un record escono voce, valore, data e punti guadagnati: mai il peso corporeo');
select is((select (payload ->> 'gained')::int from public.feed_events where kind = 'record' and actor = '00000000-0000-0000-0000-0000000000b1'), 100, 'punti guadagnati col record');
select is((select count(*)::int from public.record_candidates), 0, 'il record candidato si consuma');

-- ---------------------------------------------------------------------------------------------------------
-- Carla segue Anna (pubblica: subito) e chiede a Bruno (privato: richiesta).
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select is(public.follow_user('00000000-0000-0000-0000-0000000000a1'), 'accepted', 'profilo pubblico: "Segui" vale subito');
select is(public.follow_user('00000000-0000-0000-0000-0000000000b1'), 'pending', 'profilo privato: parte una richiesta');
select is(public.follow_user('00000000-0000-0000-0000-0000000000b1'), 'pending', 'chiedere due volte non cambia niente');
select throws_ok($$ select public.follow_user('00000000-0000-0000-0000-0000000000c1') $$, 'P0001', 'Non puoi seguire te stesso', 'non seguo me stessa');
select throws_ok($$ select public.follow_user('00000000-0000-0000-0000-00000000dead') $$, 'P0002', 'Profilo non trovato', 'profilo che non esiste');
select throws_ok($$ select public.follow_user('00000000-0000-0000-0000-0000000000e1') $$, 'P0002', 'Profilo non trovato', 'un profilo senza nome non si segue');
select throws_ok($$ insert into public.follows (follower, followee, status) values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1', 'accepted') $$,
  '42501', null, 'non si segue scrivendo nella tabella');
update public.follows set status = 'accepted';
select is((select status from public.follows where followee = '00000000-0000-0000-0000-0000000000b1'), 'pending', 'la richiesta non si accetta da soli');
delete from public.follows;
select is((select count(*)::int from public.follows), 2, 'né si cancella dalla tabella');

-- Che cosa legge Carla di Bruno, privato, finché la richiesta è in attesa: nome e livello, nient'altro.
select is(jsonb_array_length(public.search_people('bru')), 1, 'la ricerca trova anche un profilo privato');
select is(public.search_people('BRU') -> 0, jsonb_build_object('userId', '00000000-0000-0000-0000-0000000000b1', 'name', 'Bruno', 'band', 2,
  'isPrivate', true, 'relation', 'pending', 'followsMe', 'none', 'country', null, 'province', null, 'region', null),
  'profilo privato non seguito: solo nome e livello (la fascia), niente luogo');
select is((select array_agg(k order by k) from jsonb_object_keys(public.search_people('bru') -> 0) k),
  array['band', 'country', 'followsMe', 'isPrivate', 'name', 'province', 'region', 'relation', 'userId'], 'la scheda di una persona non porta punti, record o peso');
select is(public.search_people('ann') -> 0 ->> 'province', 'MI', 'profilo pubblico: si vede anche il luogo');
select is(public.search_people('ann') -> 0 ->> 'relation', 'accepted', 'e che lo seguo già');
select is(public.search_people('a'), '[]'::jsonb, 'servono almeno 2 caratteri');
select is(public.search_people('car'), '[]'::jsonb, 'non trovo me stessa');
select is(public.search_people('%'), '[]'::jsonb, 'il segno % si cerca alla lettera, e un carattere solo non basta');
select is(public.search_people('__'), '[]'::jsonb, 'il trattino basso si cerca alla lettera');
select is(jsonb_array_length(public.search_people('folla')), 20, 'al massimo 20 risultati');
select is(pg_temp.kinds(public.feed()), 'Anna workout, Anna record', 'novità: solo quelle di Anna; di Bruno niente finché non accetta');
select is((public.feed() ->> 'unread')::int, 2, 'due novità non lette');
select is((select count(*)::int from public.feed_events), 2, 'dalla tabella delle novità: solo quelle di chi seguo');
select is((select string_agg(name, ', ') from public.shared_workouts), 'Push day', 'allenamenti condivisi: solo quelli di chi seguo');
select is((select count(*)::int from public.level_records), 0, 'nessun record di altri, nemmeno di chi seguo');
select is((select count(*)::int from public.level_scores), 1, 'solo i miei punti');
select is((select count(*)::int from public.profiles), 1, 'solo il mio profilo');
select ok(pg_temp.names(public.ranking('mondo', 'generale')) not like '%Bruno%', 'in classifica Bruno resta senza nome');
select is(pg_temp.names(public.ranking('amici', 'generale')), 'Carla 1, Anna 2', 'amici: chi seguo con richiesta accettata, più me');
select is((public.my_people() -> 'following' -> 0 ->> 'relation') || '/' || (public.my_people() -> 'following' -> 1 ->> 'relation'), 'accepted/pending',
  'le mie persone: chi seguo, con le richieste in attesa');

-- Bruno vede la richiesta e la accetta.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
select is(public.my_people() -> 'requests' -> 0 ->> 'name', 'Carla', 'Bruno vede la richiesta di Carla');
select is(public.my_people() -> 'requests' -> 0 ->> 'followsMe', 'pending', 'in attesa');
select is(public.my_people() -> 'requests' -> 0 -> 'country', 'null'::jsonb, 'di Carla, privata, vede nome e livello ma non il luogo');
select is(jsonb_array_length(public.my_people() -> 'followers'), 0, 'finché non accetta non è tra chi lo segue');
select lives_ok($$ select public.accept_follow('00000000-0000-0000-0000-0000000000c1') $$, 'Bruno accetta');
select throws_ok($$ select public.accept_follow('00000000-0000-0000-0000-0000000000c1') $$, 'P0002', 'Richiesta non trovata', 'non c''è più niente da accettare');
select throws_ok($$ select public.accept_follow('00000000-0000-0000-0000-0000000000d1') $$, 'P0002', 'Richiesta non trovata', 'né una richiesta mai arrivata');
select is(public.my_people() -> 'followers' -> 0 ->> 'name', 'Carla', 'ora Carla lo segue');
select is(pg_temp.kinds(public.feed()), '', 'essere seguiti non porta novità: Bruno non segue nessuno');
select is((select count(*)::int from public.feed_events), 2, 'dalla tabella Bruno legge solo le sue');

select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select is(pg_temp.kinds(public.feed()), 'Bruno workout, Bruno record, Anna workout, Anna record', 'dopo l''accettazione Carla vede le novità di Bruno');
select is((public.feed() ->> 'unread')::int, 4, 'quattro non lette');
select is((select count(*)::int from public.feed_events), 4, 'e le legge anche dalla tabella');
select is((select count(*)::int from public.shared_workouts), 2, 'e il suo allenamento condiviso');
select is((select items -> 0 ->> 'name' from public.shared_workouts where name = 'Pull day'), 'Trazioni', 'con gli esercizi dentro');
select is(public.search_people('bru') -> 0 ->> 'region', 'Lombardia', 'ora vede anche il luogo');
select is((select count(*)::int from public.level_records), 0, 'ma record e peso corporeo di Bruno restano illeggibili');
select is(pg_temp.names(public.ranking('amici', 'generale')), 'Bruno 1, Carla 2, Anna 3', 'e Bruno entra tra gli amici in classifica');
select is(pg_temp.kinds(public.feed(1)), 'Bruno workout', 'il limite delle novità');
select lives_ok($$ select public.feed_mark_read() $$, 'segno le novità come lette');
select is((public.feed() ->> 'unread')::int, 0, 'nessuna non letta');
select is((select count(*)::int from jsonb_array_elements(public.feed() -> 'events') x where (x ->> 'unread')::boolean), 0, 'nemmeno riga per riga');

-- ---------------------------------------------------------------------------------------------------------
-- Sorpassi: Anna supera Carla nel Generale, Bruno in Skill tirata.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
update public.level_scores set hb = 600, total = 1600;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
update public.level_scores set st = 150, total = 2150;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select is(pg_temp.kinds(public.feed(2)), 'Bruno overtake, Anna overtake', 'chi seguo mi supera: arriva la novità del sorpasso');
select is((public.feed(2) -> 'events' -> 1 -> 'payload' ->> 'metric') || ' / ' || (public.feed(2) -> 'events' -> 0 -> 'payload' ->> 'metric'),
  'generale / skill-tirata', 'con la classifica in cui è successo');
select is((public.feed() ->> 'unread')::int, 2, 'due non lette');
-- Carla risale, Anna la supera di nuovo: resta una novità sola, tornata in cima.
update public.level_scores set fs = 600, total = 1700;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
update public.level_scores set hb = 800, total = 1800;
select is((select count(*)::int from public.feed_events where kind = 'overtake'), 0, 'il sorpasso è di chi è stato superato: Anna non lo legge');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select is(pg_temp.kinds(public.feed(2)), 'Anna overtake, Bruno overtake', 'un secondo sorpasso nella stessa classifica aggiorna la novità');
select is((select count(*)::int from public.feed_events where kind = 'overtake'), 2, 'senza raddoppiarla');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select is(pg_temp.kinds(public.feed()), '', 'chi non segue nessuno non riceve niente');
select is((select count(*)::int from public.feed_events) + (select count(*)::int from public.shared_workouts), 0, 'nemmeno dalle tabelle');

-- ---------------------------------------------------------------------------------------------------------
-- Condivisione dei record: "non condividere" sul record, interruttore del profilo, correzioni, eliminazione.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
insert into public.level_records (sub_id, stage, value, date, shared) values ('verticale', 'verticale', 31, current_date, false);
update public.level_scores set hb = 900, total = 1900;
select is((select count(*)::int from public.feed_events where kind = 'record'), 1, 'record con "non condividere": nessuna novità');
update public.profiles set share_records = false;
insert into public.level_records (sub_id, stage, value, date) values ('verticale', 'verticale', 32, current_date);
update public.level_scores set hb = 1000, total = 2000;
select is((select count(*)::int from public.feed_events where kind = 'record'), 1, 'condivisione dei record spenta: nessuna novità');
update public.profiles set share_records = true;
insert into public.level_records (sub_id, stage, value, date) values ('verticale', 'verticale', 33, current_date);
update public.level_scores set hb = 1000, total = 2000;
select is((select count(*)::int from public.feed_events where kind = 'record'), 1, 'record che non migliora il punteggio: nessuna novità');
update public.level_scores set hb = 1100, total = 2100;
select is((select count(*)::int from public.feed_events where kind = 'record'), 2, 'quando il punteggio sale, il record diventa una novità');
select is((select (payload ->> 'value')::numeric::int from public.feed_events where kind = 'record' order by created_at desc limit 1), 33, 'col suo valore');
update public.level_records set value = 34 where value = 33;
select is((select (payload ->> 'value')::numeric::int from public.feed_events where kind = 'record' order by created_at desc limit 1), 34, 'correggendo il record la novità lo segue');
update public.level_records set shared = false where value = 34;
select is((select count(*)::int from public.feed_events where kind = 'record'), 1, 'togliendo la condivisione al record la novità sparisce');
insert into public.level_records (sub_id, stage, value, date) values ('verticale', 'verticale', 35, current_date);
update public.level_scores set hb = 1200, total = 2200, rules_version = 2;
select is((select count(*)::int from public.feed_events where kind = 'record'), 1, 'un ricalcolo con regole nuove non crea novità');
delete from public.level_records where value = 30;
select is((select count(*)::int from public.feed_events where kind = 'record'), 0, 'eliminando il record sparisce la sua novità');
select throws_ok($$ insert into public.feed_events (actor, kind, target, payload) values ('00000000-0000-0000-0000-0000000000a1', 'overtake', '00000000-0000-0000-0000-0000000000c1', '{"metric": "generale"}') $$,
  '42501', null, 'le novità non si scrivono dal client');

-- ---------------------------------------------------------------------------------------------------------
-- Smettere di seguire toglie le novità di quella persona.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select lives_ok($$ select public.unfollow_user('00000000-0000-0000-0000-0000000000a1') $$, 'Carla smette di seguire Anna');
select is(pg_temp.kinds(public.feed()), 'Bruno overtake, Bruno workout, Bruno record', 'le novità di Anna non ci sono più');
select is((select string_agg(name, ', ') from public.shared_workouts), 'Pull day', 'né il suo allenamento');
select is(pg_temp.names(public.ranking('amici', 'generale')), 'Bruno 1, Carla 2', 'né lei tra gli amici');

-- Da privato a pubblico le richieste in attesa si accettano; tornando privato chi segue resta.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select is(public.follow_user('00000000-0000-0000-0000-0000000000c1'), 'pending', 'Dario chiede a Carla, privata');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
update public.profiles set is_private = false;
select is((select status from public.follows where follower = '00000000-0000-0000-0000-0000000000d1'), 'accepted', 'Carla diventa pubblica: la richiesta in attesa si accetta');
update public.profiles set is_private = true;
select is((select status from public.follows where follower = '00000000-0000-0000-0000-0000000000d1'), 'accepted', 'torna privata: chi la segue resta');
select lives_ok($$ select public.remove_follower('00000000-0000-0000-0000-0000000000d1') $$, 'Carla toglie Dario da chi la segue');
select is((select count(*)::int from public.follows where followee = '00000000-0000-0000-0000-0000000000c1'), 0, 'Dario non la segue più');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select is(public.follow_user('00000000-0000-0000-0000-0000000000c1'), 'pending', 'Dario ci riprova');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select lives_ok($$ select public.reject_follow('00000000-0000-0000-0000-0000000000d1') $$, 'Carla rifiuta');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select is((select count(*)::int from public.follows), 0, 'la richiesta rifiutata sparisce');

-- ---------------------------------------------------------------------------------------------------------
-- Blocco.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select is(public.follow_user('00000000-0000-0000-0000-0000000000f1'), 'accepted', 'Carla segue Furio');
select ok(pg_temp.names(public.ranking('mondo', 'generale')) like 'Furio 1,%', 'e lo vede primo nel mondo');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f1');
select is(public.follow_user('00000000-0000-0000-0000-0000000000c1'), 'pending', 'Furio chiede a Carla');
select lives_ok($$ select public.block_user('00000000-0000-0000-0000-0000000000c1') $$, 'Furio blocca Carla');
select is((select count(*)::int from public.follows), 0, 'il blocco toglie il seguire nei due versi');
select is(public.search_people('car'), '[]'::jsonb, 'chi blocca non trova più la persona bloccata');
select is(public.my_people() -> 'blocked' -> 0 ->> 'name', 'Carla', 'e la vede tra i bloccati');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select throws_ok($$ select public.follow_user('00000000-0000-0000-0000-0000000000f1') $$, 'P0002', 'Profilo non trovato', 'chi è bloccato non può seguire: il profilo sembra non esistere');
select is(public.search_people('fur'), '[]'::jsonb, 'né lo trova nella ricerca');
select is((select count(*)::int from public.blocks), 0, 'né sa di essere bloccato');
select ok(pg_temp.names(public.ranking('mondo', 'generale')) not like '%Furio%', 'in classifica la sua riga non si vede più');
select is((public.ranking('mondo', 'generale') ->> 'participants')::int, 5, 'ma resta contato');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f1');
select lives_ok($$ select public.unblock_user('00000000-0000-0000-0000-0000000000c1') $$, 'Furio toglie il blocco');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select is(public.follow_user('00000000-0000-0000-0000-0000000000f1'), 'accepted', 'e Carla può seguirlo di nuovo');

-- Limite di richieste al giorno. Dario ne ha già fatte 2.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select is((select count(*) filter (where public.follow_user(('00000000-0000-0000-0000-0000000001' || lpad(g::text, 2, '0'))::uuid) = 'accepted')::int from generate_series(1, 28) g), 28,
  'fino a 30 "Segui" in un giorno');
select throws_ok($$ select public.follow_user('00000000-0000-0000-0000-000000000129') $$, 'P0001', 'Hai raggiunto il limite di richieste per oggi: riprova domani', 'il trentunesimo no');
select is(public.follow_user('00000000-0000-0000-0000-000000000101'), 'accepted', 'chi seguo già non conta nel limite');

-- Segnalazione.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select lives_ok($$ select public.report_user('00000000-0000-0000-0000-0000000000d1', 'spam') $$, 'Carla segnala Dario');
select lives_ok($$ select public.report_user('00000000-0000-0000-0000-0000000000d1', '  nome offensivo ') $$, 'e corregge il motivo');
select throws_ok($$ select public.report_user('00000000-0000-0000-0000-0000000000d1', '   ') $$, '23514', null, 'serve un motivo');
select throws_ok($$ select public.report_user('00000000-0000-0000-0000-0000000000c1', 'io') $$, 'P0002', 'Profilo non trovato', 'non segnalo me stessa');
select is((select count(*)::int from public.reports), 0, 'le segnalazioni non si leggono dal client');
reset role;
select is((select string_agg(reason, '|') from public.reports), 'nome offensivo', 'una segnalazione per coppia, col motivo ripulito');

-- Link d'invito.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select ok(public.rotate_follow_code() ~ '^[A-Z2-9]{8}$', 'codice d''invito di 8 caratteri');
select set_config('test.code', (select code from public.follow_invites), true);
select pg_temp.as_user('00000000-0000-0000-0000-0000000000e1');
select throws_ok($$ select public.rotate_follow_code() $$, 'P0001', 'Per invitare qualcuno scegli prima il tuo nome in Account', 'senza nome niente invito');
select throws_ok($$ select public.follow_user('00000000-0000-0000-0000-0000000000a1') $$, 'P0001', 'Per seguire qualcuno scegli prima il tuo nome in Account', 'né si segue');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select is(public.preview_follow_invite(lower(current_setting('test.code'))) ->> 'name', 'Anna', 'dal codice si vede chi è');
select is(public.preview_follow_invite('ZZZZZZZZ'), null::jsonb, 'codice sbagliato: nessuno');
select is((select count(*)::int from public.follow_invites), 0, 'i codici degli altri non si leggono');
reset role;
select is((select count(*)::int from public.invite_failures where user_id = '00000000-0000-0000-0000-0000000000c1'), 1, 'e il tentativo sbagliato resta contato');

-- Allenamenti condivisi: limiti e sola lettura.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
update public.shared_workouts set name = 'Modificato';
select is((select string_agg(name, ', ') from public.shared_workouts), 'Pull day', 'un allenamento condiviso non si modifica');
select throws_ok($$ insert into public.shared_workouts (user_id, name, date, items) values ('00000000-0000-0000-0000-0000000000a1', 'Finto', current_date, '[{"name": "x"}]') $$,
  '42501', null, 'non si condivide a nome di un altro');
select throws_ok($$ insert into public.shared_workouts (name, date, items) values ('Vuoto', current_date, '[]') $$, '23514', null, 'serve almeno un esercizio');
select throws_ok($$ insert into public.shared_workouts (name, date, items) select 'Troppi', current_date, jsonb_agg(jsonb_build_object('name', 'x')) from generate_series(1, 41) $$,
  '23514', null, 'al massimo 40 esercizi');
insert into public.shared_workouts (name, date, items) select 'Giorno ' || g, current_date, '[{"name": "x"}]' from generate_series(1, 10) g;
select throws_ok($$ insert into public.shared_workouts (name, date, items) values ('Undicesimo', current_date, '[{"name": "x"}]') $$,
  'P0001', 'Hai già condiviso 10 allenamenti oggi: riprova domani', 'al massimo 10 condivisioni al giorno');
delete from public.shared_workouts where name = 'Giorno 1';
select is((select count(*)::int from public.feed_events where kind = 'workout' and actor = '00000000-0000-0000-0000-0000000000c1'), 9, 'togliendo un allenamento condiviso sparisce la sua novità');

-- Chi non ha fatto l'accesso non legge e non chiama niente.
select set_config('role', 'anon', true), set_config('request.jwt.claims', '', true);
select throws_ok($$ select public.search_people('anna') $$, '42501', null, 'senza accesso niente ricerca');
select throws_ok($$ select public.feed() $$, '42501', null, 'né novità');
select throws_ok($$ select public.follow_user('00000000-0000-0000-0000-0000000000a1') $$, '42501', null, 'né seguire');
select is((select count(*)::int from public.feed_events) + (select count(*)::int from public.shared_workouts) + (select count(*)::int from public.follows), 0, 'né tabelle');

-- Eliminando l'account sparisce tutto.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
select public.delete_own_account();
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select ok(pg_temp.kinds(public.feed()) not like '%Bruno%', 'account eliminato: le sue novità non ci sono più');
reset role;
select is((select count(*)::int from public.follows where '00000000-0000-0000-0000-0000000000b1' in (follower, followee))
        + (select count(*)::int from public.feed_events where '00000000-0000-0000-0000-0000000000b1' in (actor, target))
        + (select count(*)::int from public.shared_workouts where user_id = '00000000-0000-0000-0000-0000000000b1')
        + (select count(*)::int from public.record_candidates where user_id = '00000000-0000-0000-0000-0000000000b1')
        + (select count(*)::int from public.feed_reads where user_id = '00000000-0000-0000-0000-0000000000b1'), 0,
  'né chi seguiva, chi lo seguiva, novità, allenamenti condivisi');

select * from finish();
rollback;
