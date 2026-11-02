-- Esercizi senza schema: serie, ripetizioni, peso e recupero stanno solo nel programma, giorno per giorno.
-- L'esercizio resta nome, tipo e record, così i grafici lo seguono qualunque schema si usi.

-- 1. Il recupero passa al programma; le righe senza schema prendono quello predefinito dell'esercizio.
alter table public.plan_items
  add column rest_seconds int check (rest_seconds between 0 and 3600);

update public.plan_items p
set sets         = coalesce(p.sets, e.target_sets),
    reps         = coalesce(p.reps, e.target_reps),
    weight       = coalesce(p.weight, e.target_weight),
    rest_seconds = e.rest_seconds
from public.exercises e
where e.id = p.exercise_id;

alter table public.plan_items
  drop constraint plan_items_scheme_all_or_none,
  alter column sets set not null,
  alter column reps set not null,
  alter column weight set not null,
  alter column rest_seconds set not null;

-- 2. Via lo schema predefinito dall'esercizio.
alter table public.exercises
  drop column target_sets,
  drop column target_reps,
  drop column target_weight,
  drop column rest_seconds;

-- 3. Un nome per esercizio, maiuscole e spazi esterni a parte. Gli eventuali doppioni esistenti
--    prendono un suffisso " (2)", " (3)"... invece di far fallire la migration.
with dup as (
  select id, row_number() over (partition by user_id, lower(btrim(name)) order by created_at, id) as n
  from public.exercises
)
update public.exercises e
set name = left(btrim(e.name), 74) || ' (' || dup.n || ')'
from dup
where dup.id = e.id and dup.n > 1;

create unique index exercises_user_name_key on public.exercises (user_id, lower(btrim(name)));
