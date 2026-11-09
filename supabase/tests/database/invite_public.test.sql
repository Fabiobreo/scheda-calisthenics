-- Nome del trainer dal codice d'invito, prima dell'accesso (audit A10): solo il nome, solo per un codice valido.
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'elena@test.local'),
  ('00000000-0000-0000-0000-0000000000e2', 'fabio@test.local');
update public.profiles set display_name = 'Elena', is_trainer = true where id = '00000000-0000-0000-0000-0000000000e1';
update public.profiles set display_name = 'Fabio' where id = '00000000-0000-0000-0000-0000000000e2';
insert into public.trainer_invites (trainer_id, code) values
  ('00000000-0000-0000-0000-0000000000e1', 'ABCD2345'),
  ('00000000-0000-0000-0000-0000000000e2', 'WXYZ6789');

select set_config('role', 'anon', true);
select is(public.invite_trainer_name('ABCD2345'), 'Elena', 'senza accesso: il nome del trainer del codice');
select is(public.invite_trainer_name('  abcd2345 '), 'Elena', 'maiuscole e spazi non contano');
select is(public.invite_trainer_name('ZZZZ2222'), null, 'codice inesistente: nessun nome');
select is(public.invite_trainer_name('WXYZ6789'), null, 'codice di chi non è (più) trainer: nessun nome');
select is_empty($$ select * from public.trainer_invites $$, 'senza accesso i codici restano illeggibili');
select throws_ok($$ select public.accept_invite('ABCD2345') $$, '42501', null, 'senza accesso non ci si collega');

select * from finish();
rollback;
