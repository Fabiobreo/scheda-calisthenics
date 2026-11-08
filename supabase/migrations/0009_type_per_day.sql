-- Il tipo (forza, volume, tecnico) passa dall'esercizio alla scheda: le Trazioni possono essere di forza il lunedì
-- e di volume il giovedì, restando un unico esercizio nei grafici.
-- Lo hanno le righe del calendario (plan_items), quelle delle schede modello (program_items) e le registrazioni
-- (entries, per il grafico "ripetizioni per tipo": la scheda può cambiare dopo).
--
-- Compatibilità: chi ha ancora aperta la versione precedente dell'app scrive righe senza tipo. I trigger qui sotto
-- lo completano: dal giorno in programma, poi dal tipo che l'utente aveva dato all'esercizio, poi dal predefinito
-- del catalogo. exercises.type resta finché le versioni vecchie non spariscono; gli esercizi creati dall'app nuova
-- non ce l'hanno (null).

-- 1. Colonne, riempite con quello che si vedeva prima della migration.
alter table public.plan_items
  add column type text check (type in ('forza', 'volume', 'tecnico'));
update public.plan_items p set type = e.type from public.exercises e where e.id = p.exercise_id;
alter table public.plan_items alter column type set not null;

alter table public.program_items
  add column type text check (type in ('forza', 'volume', 'tecnico'));
update public.program_items p
set type = coalesce((select c.default_type from public.catalog_exercises c where c.id = p.catalog_id), 'volume');
alter table public.program_items alter column type set not null;

alter table public.entries
  add column type text check (type in ('forza', 'volume', 'tecnico'));
update public.entries x set type = e.type from public.exercises e where e.id = x.exercise_id;
alter table public.entries alter column type set not null;

-- L'app nuova crea esercizi senza tipo.
alter table public.exercises alter column type drop not null;

-- 2. Tipo di ripiego per un esercizio: quello vecchio dell'esercizio, altrimenti il predefinito del catalogo.
create function public.exercise_fallback_type(ex uuid) returns text
language sql stable set search_path = '' as $$
  select coalesce(e.type, c.default_type, 'volume')
  from public.exercises e
  left join public.catalog_exercises c on c.id = e.catalog_id
  where e.id = ex;
$$;

create function public.plan_item_default_type() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.type is null then
    new.type := coalesce(public.exercise_fallback_type(new.exercise_id), 'volume');
  end if;
  return new;
end;
$$;

create trigger plan_items_default_type before insert or update on public.plan_items
  for each row execute function public.plan_item_default_type();

create function public.program_item_default_type() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.type is null then
    new.type := coalesce((select c.default_type from public.catalog_exercises c where c.id = new.catalog_id), 'volume');
  end if;
  return new;
end;
$$;

create trigger program_items_default_type before insert or update on public.program_items
  for each row execute function public.program_item_default_type();

-- Una registrazione senza tipo prende quello del giorno in programma, se c'è.
create function public.entry_default_type() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.type is null then
    new.type := coalesce(
      (select p.type from public.plan_items p
       where p.user_id = new.user_id and p.exercise_id = new.exercise_id and p.date = new.date),
      public.exercise_fallback_type(new.exercise_id),
      'volume');
  end if;
  return new;
end;
$$;

create trigger entries_default_type before insert or update on public.entries
  for each row execute function public.entry_default_type();

revoke execute on function public.exercise_fallback_type(uuid) from public, anon;
grant execute on function public.exercise_fallback_type(uuid) to authenticated;
revoke execute on function public.plan_item_default_type(), public.program_item_default_type(), public.entry_default_type()
  from public, anon, authenticated;

-- 3. Assegnare una scheda copia anche il tipo.
create or replace function public.assign_program(p_program uuid, p_athlete uuid, start_monday date) returns int
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
    insert into public.plan_items (user_id, exercise_id, date, sort_order, sets, reps, weight, rest_seconds, type, note, assigned_by, assignment_id)
    values (p_athlete, ex_id, day,
            coalesce((select max(sort_order) from public.plan_items where user_id = p_athlete and date = day), 0) + 1,
            it.sets, it.reps, it.weight, it.rest_seconds, it.type, it.note, auth.uid(), a_id)
    on conflict (user_id, date, exercise_id) do update
      set sets = excluded.sets, reps = excluded.reps, weight = excluded.weight, rest_seconds = excluded.rest_seconds,
          type = excluded.type, note = excluded.note, assigned_by = excluded.assigned_by, assignment_id = excluded.assignment_id;
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- 4. Il trainer che aggiunge un esercizio a un giorno ne sceglie il tipo. La firma cambia: la vecchia sparisce, e chi
--    la chiama senza p_type (versione precedente dell'app) arriva qui col tipo predefinito.
drop function public.coach_add_plan_item(uuid, date, text, text, int, int, numeric, int, text);

create function public.coach_add_plan_item(
  p_athlete uuid, p_date date, p_catalog text, p_custom text,
  p_sets int, p_reps int, p_weight numeric, p_rest int, p_note text, p_type text default null
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
  -- type null: lo completa il trigger
  insert into public.plan_items (user_id, exercise_id, date, sort_order, sets, reps, weight, rest_seconds, type, note, assigned_by)
  values (p_athlete, ex_id, p_date,
          coalesce((select max(sort_order) from public.plan_items where user_id = p_athlete and date = p_date), 0) + 1,
          p_sets, p_reps, p_weight, p_rest, p_type, nullif(btrim(p_note), ''), auth.uid())
  on conflict (user_id, date, exercise_id) do nothing
  returning id into item_id;
  if item_id is null then
    raise exception 'Questo esercizio è già in programma quel giorno' using errcode = 'P0001';
  end if;
  return item_id;
end;
$$;

revoke execute on function public.coach_add_plan_item(uuid, date, text, text, int, int, numeric, int, text, text) from public, anon;
grant execute on function public.coach_add_plan_item(uuid, date, text, text, int, int, numeric, int, text, text) to authenticated;
