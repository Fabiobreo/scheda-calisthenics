-- Dati di sviluppo per il Supabase LOCALE: li carica `supabase db reset` (e il primo `supabase start`).
-- Non arrivano mai in produzione: il deploy applica solo le migration.
--
-- Account di prova (password per entrambi: scheda-dev-2026):
--   atleta@scheda.test   un atleta con qualche esercizio e un programma
--   trainer@scheda.test  per le prove della parte trainer

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
)
select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
       extensions.crypt('scheda-dev-2026', extensions.gen_salt('bf')), now(),
       '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
from (values
  ('11111111-1111-1111-1111-111111111111'::uuid, 'atleta@scheda.test'),
  ('22222222-2222-2222-2222-222222222222'::uuid, 'trainer@scheda.test')
) as u (id, email);

insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), id, id::text, 'email', json_build_object('sub', id::text, 'email', email), now(), now(), now()
from auth.users where email in ('atleta@scheda.test', 'trainer@scheda.test');

update public.profiles set display_name = 'Atleta Prova' where id = '11111111-1111-1111-1111-111111111111';
update public.profiles set display_name = 'Trainer Prova' where id = '22222222-2222-2222-2222-222222222222';

-- Esercizi dell'atleta: quattro dal catalogo (L-sit a tempo) e uno personalizzato.
insert into public.exercises (id, user_id, catalog_id, name, type, in_records, sort_order) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'trazioni', null, 'forza', true, 1),
  ('aaaaaaaa-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'dip', null, 'forza', true, 2),
  ('aaaaaaaa-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'piegamenti', null, 'volume', false, 3),
  ('aaaaaaaa-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', null, 'Circuito finale', 'volume', false, 4),
  -- a tempo: la misura (secondi) viene dalla voce del catalogo
  ('aaaaaaaa-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'l-sit', null, 'tecnico', true, 5);

-- Due settimane di storico e il programma della settimana in corso.
insert into public.entries (user_id, exercise_id, date, sets, difficulty)
select '11111111-1111-1111-1111-111111111111', e.id, current_date - d,
       jsonb_build_array(jsonb_build_object('weight', w, 'reps', r), jsonb_build_object('weight', w, 'reps', r), jsonb_build_object('weight', w, 'reps', r - 1)),
       'medio'
from (values
  ('aaaaaaaa-0000-0000-0000-000000000001'::uuid, 5, 5),
  ('aaaaaaaa-0000-0000-0000-000000000002'::uuid, 10, 8)
) as e (id, w, r),
generate_series(2, 14, 4) as d;

-- L-sit: serie in secondi (reps ripete i secondi per le versioni vecchie dell'app)
insert into public.entries (user_id, exercise_id, date, sets, type)
select '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000005', current_date - d,
       jsonb_build_array(jsonb_build_object('weight', 0, 'reps', s, 'seconds', s), jsonb_build_object('weight', 0, 'reps', s - 2, 'seconds', s - 2)),
       'tecnico'
from (values (3, 12), (7, 10), (11, 8)) as x (d, s);

insert into public.plan_items (user_id, exercise_id, date, sort_order, sets, reps, weight, rest_seconds) values
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000001', date_trunc('week', current_date)::date, 1, 5, 5, 7.5, 150),
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000002', date_trunc('week', current_date)::date, 2, 4, 8, 10, 120),
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000003', date_trunc('week', current_date)::date + 3, 1, 3, 15, 0, 60);

insert into public.plan_items (user_id, exercise_id, date, sort_order, sets, reps, seconds, weight, rest_seconds, type) values
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000005', date_trunc('week', current_date)::date + 3, 2, 4, 15, 15, 0, 90, 'tecnico');
