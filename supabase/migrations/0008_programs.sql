-- Schede del trainer e loro assegnazione agli atleti.
--
-- Una scheda modello ha N settimane; ogni esercizio sta in una settimana e in un giorno (relativi, senza date) ed è
-- una voce del catalogo oppure un nome personalizzato, con schema e nota del trainer.
-- Assegnarla a un atleta da un lunedì scrive i giorni veri nel suo calendario (plan_items), creando tra i suoi
-- esercizi quelli che mancano. Da lì le righe sono "del trainer" (assigned_by): l'atleta le registra ma non le
-- modifica, il trainer le ritocca. Cambiare la scheda modello non tocca quelle già assegnate.
-- Se il collegamento finisce (o il trainer sparisce), le righe tornano dell'atleta.

create table public.programs (
  id          uuid primary key default gen_random_uuid(),
  trainer_id  uuid not null default auth.uid() references public.profiles on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 80),
  weeks       int  not null default 4 check (weeks between 1 and 52),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index programs_trainer_idx on public.programs (trainer_id, updated_at desc);

create trigger programs_touch before update on public.programs
  for each row execute function public.touch_updated_at();

create table public.program_items (
  id           uuid primary key default gen_random_uuid(),
  program_id   uuid not null references public.programs on delete cascade,
  week         int  not null check (week between 1 and 52),
  weekday      smallint not null check (weekday between 0 and 6), -- 0 = lunedì
  catalog_id   text references public.catalog_exercises on update cascade on delete restrict,
  custom_name  text check (custom_name is null or char_length(btrim(custom_name)) between 1 and 80),
  sort_order   int  not null default 0,
  sets         int  not null check (sets between 1 and 50),
  reps         int  not null check (reps between 1 and 1000),
  weight       numeric(6,2) not null check (weight >= 0),
  rest_seconds int  not null check (rest_seconds between 0 and 3600),
  note         text check (note is null or char_length(note) <= 500),
  created_at   timestamptz not null default now(),
  check ((catalog_id is null) <> (custom_name is null))
);
create index program_items_program_idx on public.program_items (program_id, week, weekday, sort_order);

-- Storico delle assegnazioni: quale scheda, a chi, da quando.
create table public.program_assignments (
  id            uuid primary key default gen_random_uuid(),
  program_id    uuid references public.programs on delete set null,
  -- il nome resta anche se la scheda modello viene cancellata o rinominata
  program_name  text not null,
  trainer_id    uuid not null references public.profiles on delete cascade,
  athlete_id    uuid not null references public.profiles on delete cascade,
  start_date    date not null check (extract(isodow from start_date) = 1),
  weeks         int  not null,
  created_at    timestamptz not null default now()
);
create index program_assignments_athlete_idx on public.program_assignments (athlete_id, start_date desc);

alter table public.plan_items
  add column assigned_by   uuid references public.profiles on delete set null,
  add column assignment_id uuid references public.program_assignments on delete set null,
  add column note          text check (note is null or char_length(note) <= 500);

alter table public.entries
  add column note text check (note is null or char_length(note) <= 500);

alter table public.programs enable row level security;
alter table public.program_items enable row level security;
alter table public.program_assignments enable row level security;

create policy "programs: owner" on public.programs
  for all to authenticated
  using (trainer_id = (select auth.uid()))
  with check (trainer_id = (select auth.uid()));

create policy "program items: owner" on public.program_items
  for all to authenticated
  using (exists (select 1 from public.programs p where p.id = program_id and p.trainer_id = (select auth.uid())))
  with check (exists (select 1 from public.programs p where p.id = program_id and p.trainer_id = (select auth.uid())));

create policy "assignments: read own" on public.program_assignments
  for select to authenticated
  using ((select auth.uid()) in (trainer_id, athlete_id));

-- I trainer che seguono ora l'utente corrente (uno, per ora): le loro righe non sono sue da modificare.
-- Come my_athletes(), nelle policy si calcola una volta per query.
create function public.my_trainers() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select l.trainer_id
  from public.coach_links l
  join public.profiles t on t.id = l.trainer_id
  where l.athlete_id = auth.uid() and l.status = 'active' and t.is_trainer;
$$;

-- Programma: l'atleta modifica le righe sue; quelle del trainer che lo segue sono del trainer.
drop policy "own plan items" on public.plan_items;

create policy "plan: owner reads" on public.plan_items
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "plan: owner inserts" on public.plan_items
  for insert to authenticated
  with check (user_id = (select auth.uid()) and assigned_by is null);

create policy "plan: owner updates" on public.plan_items
  for update to authenticated
  using (user_id = (select auth.uid()) and (assigned_by is null or assigned_by not in (select public.my_trainers())))
  with check (user_id = (select auth.uid()) and (assigned_by is null or assigned_by not in (select public.my_trainers())));

create policy "plan: owner deletes" on public.plan_items
  for delete to authenticated
  using (user_id = (select auth.uid()) and (assigned_by is null or assigned_by not in (select public.my_trainers())));

create policy "plan: coach updates" on public.plan_items
  for update to authenticated
  using (assigned_by = (select auth.uid()) and user_id in (select public.my_athletes()))
  with check (assigned_by = (select auth.uid()) and user_id in (select public.my_athletes()));

create policy "plan: coach deletes" on public.plan_items
  for delete to authenticated
  using (assigned_by = (select auth.uid()) and user_id in (select public.my_athletes()));

-- Esercizio dell'atleta per una voce del catalogo o un nome personalizzato: lo trova (ripristinandolo se archiviato)
-- o lo crea. Uso interno delle funzioni del trainer: non è chiamabile dal client.
create function public.ensure_athlete_exercise(athlete uuid, p_catalog text, p_custom text) returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare
  ex_id uuid;
begin
  if p_catalog is not null then
    select id into ex_id from public.exercises where user_id = athlete and catalog_id = p_catalog;
    if ex_id is null then
      insert into public.exercises (user_id, catalog_id, type, sort_order)
      select athlete, c.id, c.default_type,
             coalesce((select max(sort_order) from public.exercises where user_id = athlete), 0) + 1
      from public.catalog_exercises c where c.id = p_catalog
      returning id into ex_id;
    end if;
  else
    select id into ex_id from public.exercises
    where user_id = athlete and catalog_id is null and lower(btrim(name)) = lower(btrim(p_custom));
    if ex_id is null then
      insert into public.exercises (user_id, name, type, sort_order)
      values (athlete, btrim(p_custom), 'volume', coalesce((select max(sort_order) from public.exercises where user_id = athlete), 0) + 1)
      returning id into ex_id;
    end if;
  end if;
  if ex_id is null then
    raise exception 'Esercizio non trovato nel catalogo' using errcode = 'P0002';
  end if;
  update public.exercises set archived_at = null where id = ex_id and archived_at is not null;
  return ex_id;
end;
$$;

-- Assegna una scheda del trainer corrente a un suo atleta, a partire dal lunedì `start_monday`.
-- Se l'atleta ha già lo stesso esercizio in uno di quei giorni, vale lo schema della scheda (e la riga passa al trainer).
-- Restituisce quante righe ha scritto nel calendario.
create function public.assign_program(p_program uuid, p_athlete uuid, start_monday date) returns int
language plpgsql volatile security definer set search_path = '' as $$
declare
  prog public.programs;
  a_id uuid;
  it record;
  ex_id uuid;
  day date;
  n int := 0;
begin
  select * into prog from public.programs where id = p_program and trainer_id = auth.uid();
  if prog.id is null then
    raise exception 'Scheda non trovata' using errcode = 'P0002';
  end if;
  if not public.is_coach_of(p_athlete) then
    raise exception 'Non segui questo atleta' using errcode = 'P0001';
  end if;
  if extract(isodow from start_monday) <> 1 then
    raise exception 'La scheda parte di lunedì' using errcode = 'P0001';
  end if;

  insert into public.program_assignments (program_id, program_name, trainer_id, athlete_id, start_date, weeks)
  values (prog.id, prog.name, auth.uid(), p_athlete, start_monday, prog.weeks)
  returning id into a_id;

  for it in
    select * from public.program_items where program_id = prog.id and week <= prog.weeks order by week, weekday, sort_order
  loop
    ex_id := public.ensure_athlete_exercise(p_athlete, it.catalog_id, it.custom_name);
    day := start_monday + (it.week - 1) * 7 + it.weekday;
    insert into public.plan_items (user_id, exercise_id, date, sort_order, sets, reps, weight, rest_seconds, note, assigned_by, assignment_id)
    values (p_athlete, ex_id, day,
            coalesce((select max(sort_order) from public.plan_items where user_id = p_athlete and date = day), 0) + 1,
            it.sets, it.reps, it.weight, it.rest_seconds, it.note, auth.uid(), a_id)
    on conflict (user_id, date, exercise_id) do update
      set sets = excluded.sets, reps = excluded.reps, weight = excluded.weight, rest_seconds = excluded.rest_seconds,
          note = excluded.note, assigned_by = excluded.assigned_by, assignment_id = excluded.assignment_id;
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- Il trainer aggiunge un esercizio a un giorno del calendario di un suo atleta (fuori da una scheda).
create function public.coach_add_plan_item(
  p_athlete uuid, p_date date, p_catalog text, p_custom text,
  p_sets int, p_reps int, p_weight numeric, p_rest int, p_note text
) returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare
  ex_id uuid;
  item_id uuid;
begin
  if not public.is_coach_of(p_athlete) then
    raise exception 'Non segui questo atleta' using errcode = 'P0001';
  end if;
  if (p_catalog is null) = (p_custom is null) then
    raise exception 'Scegli un esercizio' using errcode = 'P0001';
  end if;
  ex_id := public.ensure_athlete_exercise(p_athlete, p_catalog, p_custom);
  insert into public.plan_items (user_id, exercise_id, date, sort_order, sets, reps, weight, rest_seconds, note, assigned_by)
  values (p_athlete, ex_id, p_date,
          coalesce((select max(sort_order) from public.plan_items where user_id = p_athlete and date = p_date), 0) + 1,
          p_sets, p_reps, p_weight, p_rest, nullif(btrim(p_note), ''), auth.uid())
  on conflict (user_id, date, exercise_id) do nothing
  returning id into item_id;
  if item_id is null then
    raise exception 'Questo esercizio è già in programma quel giorno' using errcode = 'P0001';
  end if;
  return item_id;
end;
$$;

revoke execute on function public.ensure_athlete_exercise(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.my_trainers(), public.assign_program(uuid, uuid, date),
  public.coach_add_plan_item(uuid, date, text, text, int, int, numeric, int, text) from public, anon;
grant execute on function public.my_trainers(), public.assign_program(uuid, uuid, date),
  public.coach_add_plan_item(uuid, date, text, text, int, int, numeric, int, text) to authenticated;
