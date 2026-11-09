-- Avatar (ticket 11): scelta uomo/donna sul profilo, solo valori ammessi, solo sul proprio profilo.
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000c1', 'carla@test.local'),
  ('00000000-0000-0000-0000-0000000000c2', 'dario@test.local');

create function pg_temp.as_user(uid uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select is((select avatar_body from public.profiles), null, 'all''inizio nessun avatar scelto');
update public.profiles set avatar_body = 'f' where id = '00000000-0000-0000-0000-0000000000c1';
select is((select avatar_body from public.profiles), 'f', 'l''utente sceglie il proprio avatar');
select throws_ok(
  $$ update public.profiles set avatar_body = 'x' where id = '00000000-0000-0000-0000-0000000000c1' $$,
  '23514', null, 'solo uomo (m) o donna (f)');
-- non tocca quello di un altro
update public.profiles set avatar_body = 'm' where id = '00000000-0000-0000-0000-0000000000c2';
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c2');
select is((select avatar_body from public.profiles), null, 'Carla non sceglie l''avatar di Dario');
update public.profiles set avatar_body = null where id = '00000000-0000-0000-0000-0000000000c2';
select is((select avatar_body from public.profiles), null, 'si può tornare a nessuna scelta');

select * from finish();
rollback;
