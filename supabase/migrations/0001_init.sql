-- Scheda Calisthenics: schema iniziale.
-- Ogni riga appartiene a un utente; RLS fa sì che ognuno veda e modifichi solo i propri dati.

create table public.exercises (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users on delete cascade,
  name          text not null check (char_length(btrim(name)) between 1 and 80),
  type          text not null check (type in ('forza', 'volume', 'tecnico')),
  target_sets   int  not null default 3  check (target_sets between 1 and 50),
  target_reps   int  not null default 8  check (target_reps between 1 and 1000),
  target_weight numeric(6,2) not null default 0 check (target_weight >= 0),
  rest_seconds  int  not null default 90 check (rest_seconds between 0 and 3600),
  in_records    boolean not null default false,
  sort_order    int  not null default 0,
  archived_at   timestamptz,
  created_at    timestamptz not null default now(),
  -- serve alla FK composta di entries/plan_items: impedisce di collegare esercizi di altri utenti
  unique (id, user_id)
);
create index exercises_user_idx on public.exercises (user_id, sort_order);

-- Una registrazione = un esercizio svolto in una data, con le sue serie.
-- kind 'attempt' = tentativo di record (una sola serie), 'training' = allenamento normale.
create table public.entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  exercise_id uuid not null,
  date        date not null,
  kind        text not null default 'training' check (kind in ('training', 'attempt')),
  -- [{ "weight": 50, "reps": 6 }, ...]
  sets        jsonb not null check (
                jsonb_typeof(sets) = 'array'
                and jsonb_array_length(sets) between 1 and 100
              ),
  difficulty  text check (difficulty in ('facile', 'medio', 'difficile')),
  created_at  timestamptz not null default now(),
  foreign key (exercise_id, user_id) references public.exercises (id, user_id) on delete cascade
);
create index entries_user_date_idx on public.entries (user_id, date desc, created_at desc);
create index entries_exercise_idx on public.entries (exercise_id);

-- Programma settimanale: weekday 0 = lunedì ... 6 = domenica.
create table public.plan_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  weekday     smallint not null check (weekday between 0 and 6),
  exercise_id uuid not null,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  unique (user_id, weekday, exercise_id),
  foreign key (exercise_id, user_id) references public.exercises (id, user_id) on delete cascade
);
create index plan_items_exercise_idx on public.plan_items (exercise_id);

alter table public.exercises  enable row level security;
alter table public.entries    enable row level security;
alter table public.plan_items enable row level security;

create policy "own exercises" on public.exercises
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own entries" on public.entries
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own plan items" on public.plan_items
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
