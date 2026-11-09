-- Sistema di livelli (ticket 09): peso corporeo con storico e record di livello.
-- Il livello non si salva: l'app lo calcola sempre dai record (src/lib/levels). Solo l'atleta scrive; il trainer
-- collegato legge. Sono tabelle nuove: le versioni vecchie dell'app non le usano e non si rompono.

-- Peso corporeo: una riga per giorno, l'ultima è il peso attuale. Ogni record in kg si calcola col peso del suo
-- giorno (l'ultimo fino a quel giorno, se no il primo dopo): lo fa l'app.
create table public.body_weights (
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  date       date not null,
  kg         numeric(5,2) not null check (kg between 20 and 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

-- Progressioni ammesse per ogni sotto-esercizio, coi limiti del valore (ripetizioni, secondi o kg). Sono gli stessi
-- di src/lib/levels/rules.ts: un test (src/lib/levels/db.test.ts) controlla che coincidano. Cambiano solo con le
-- migration.
create table public.level_stages (
  sub_id    text not null,
  stage     text not null,
  min_value numeric(6,2) not null,
  max_value numeric(6,2) not null,
  -- true = ripetizioni o secondi (interi), false = kg
  whole     boolean not null,
  primary key (sub_id, stage),
  check (min_value <= max_value)
);

insert into public.level_stages (sub_id, stage, min_value, max_value, whole) values
  ('trazioni', 'zavorra', 0, 400, false),
  ('muscle-up', 'zavorra', 0, 400, false),
  ('oap', 'gomito', 1, 5, true),
  ('oap', 'bicipite', 1, 5, true),
  ('oap', 'spalla', 1, 5, true),
  ('oap', 'oap', 1, 10, true),
  ('dip', 'zavorra', 0, 400, false),
  ('military', 'bilanciere', 1, 400, false),
  ('panca-piana', 'bilanciere', 1, 400, false),
  ('planche', 'tuck', 1, 10, true),
  ('planche', 'advanced-tuck', 1, 10, true),
  ('planche', 'one-leg', 1, 10, true),
  ('planche', 'straddle', 1, 10, true),
  ('planche', 'half-lay', 1, 10, true),
  ('planche', 'full', 1, 10, true),
  ('planche', 'wide', 1, 10, true),
  ('planche', 'maltese', 1, 10, true),
  ('planche-push-up', 'tuck', 1, 2, true),
  ('planche-push-up', 'advanced-tuck', 1, 2, true),
  ('planche-push-up', 'one-leg', 1, 2, true),
  ('planche-push-up', 'straddle', 1, 2, true),
  ('planche-push-up', 'half-lay', 1, 2, true),
  ('planche-push-up', 'full', 1, 10, true),
  ('planche-press', 'tuck', 1, 1, true),
  ('planche-press', 'advanced-tuck', 1, 1, true),
  ('planche-press', 'one-leg', 1, 1, true),
  ('planche-press', 'straddle', 1, 1, true),
  ('planche-press', 'half-lay', 1, 1, true),
  ('planche-press', 'full', 1, 5, true),
  ('front-lever', 'tuck', 1, 10, true),
  ('front-lever', 'advanced-tuck', 1, 10, true),
  ('front-lever', 'one-leg', 1, 10, true),
  ('front-lever', 'straddle', 1, 10, true),
  ('front-lever', 'half-lay', 1, 10, true),
  ('front-lever', 'full', 1, 10, true),
  ('front-lever', 'wide', 1, 10, true),
  ('front-lever', 'victorian', 1, 10, true),
  ('front-lever-pull-up', 'tuck', 1, 4, true),
  ('front-lever-pull-up', 'advanced-tuck', 1, 4, true),
  ('front-lever-pull-up', 'one-leg', 1, 4, true),
  ('front-lever-pull-up', 'straddle', 1, 4, true),
  ('front-lever-pull-up', 'half-lay', 1, 4, true),
  ('front-lever-pull-up', 'full', 1, 4, true),
  ('front-lever-pull-up', 'wide', 1, 10, true),
  ('front-lever-touch', 'tuck', 1, 4, true),
  ('front-lever-touch', 'advanced-tuck', 1, 4, true),
  ('front-lever-touch', 'one-leg', 1, 4, true),
  ('front-lever-touch', 'straddle', 1, 4, true),
  ('front-lever-touch', 'half-lay', 1, 4, true),
  ('front-lever-touch', 'full', 1, 4, true),
  ('front-lever-touch', 'wide', 1, 10, true),
  ('verticale', 'verticale', 1, 120, true),
  ('verticale', 'straddle-mono-braccio', 1, 10, true),
  ('verticale', 'full-mono-braccio', 1, 10, true),
  ('hspu', 'libera', 1, 10, true),
  ('hspu', 'zavorra', 0, 400, false);

-- Record di livello: progressione + valore in una data. Il "migliore di sempre" lo sceglie l'app.
create table public.level_records (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  sub_id     text not null,
  stage      text not null,
  value      numeric(6,2) not null,
  date       date not null,
  note       text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (sub_id, stage) references public.level_stages (sub_id, stage)
);
create index level_records_user_idx on public.level_records (user_id, sub_id, date);

-- Valore nei limiti della progressione e data non nel futuro (un giorno di margine per i fusi orari).
create function public.check_level_record() returns trigger
language plpgsql set search_path = '' as $$
declare
  s public.level_stages;
begin
  select * into s from public.level_stages where sub_id = new.sub_id and stage = new.stage;
  if found and (new.value < s.min_value or new.value > s.max_value or (s.whole and new.value <> trunc(new.value))) then
    raise exception 'Valore fuori dai limiti della progressione' using errcode = '23514';
  end if;
  if new.date > current_date + 1 then
    raise exception 'La data del record non può essere nel futuro' using errcode = '23514';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger level_records_check before insert or update on public.level_records
  for each row execute function public.check_level_record();

create function public.check_body_weight() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.date > current_date + 1 then
    raise exception 'La data del peso non può essere nel futuro' using errcode = '23514';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger body_weights_check before insert or update on public.body_weights
  for each row execute function public.check_body_weight();

alter table public.body_weights enable row level security;
alter table public.level_stages enable row level security;
alter table public.level_records enable row level security;

create policy "level stages: read" on public.level_stages
  for select to authenticated using (true);

create policy "own body weights" on public.body_weights
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "own level records" on public.level_records
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Il trainer collegato legge soltanto (come per le registrazioni).
create policy "trainer reads athlete body weights" on public.body_weights
  for select to authenticated using (user_id in (select public.my_athletes()));
create policy "trainer reads athlete level records" on public.level_records
  for select to authenticated using (user_id in (select public.my_athletes()));

revoke execute on function public.check_level_record(), public.check_body_weight() from public, anon, authenticated;
