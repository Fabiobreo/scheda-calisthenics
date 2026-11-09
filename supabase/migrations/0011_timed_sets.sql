-- Esercizi a tempo (ticket 03): planche, front lever, verticale, plank, L-sit… si misurano in secondi.
--
-- - Ogni esercizio ha una misura (`measure`): 'reps' o 'time'. Per quelli del catalogo è quella della voce (la copia
--   il trigger, come il nome); per i personalizzati la sceglie l'utente e non cambia più quando ci sono registrazioni.
-- - Schema del giorno (plan_items, program_items): nuova colonna `seconds`. A tempo: "4 × 8 s" = sets 4, seconds 8.
-- - Serie (entries.sets): a tempo {"weight": 0, "reps": 8, "seconds": 8}; a ripetizioni restano {"weight", "reps"}.
--
-- Compatibilità con le versioni vecchie dell'app, che conoscono solo le ripetizioni: per le righe a tempo `reps`
-- contiene gli stessi secondi. Così la versione vecchia mostra "4 × 8" (com'era prima) e, se modifica o copia una
-- riga, scrive le ripetizioni: i trigger qui sotto le riportano nei secondi. L'app nuova legge solo `seconds`.
-- Quando le versioni vecchie non ci saranno più si potrà mettere reps = 0 nelle righe a tempo.
--
-- Dati che esistono già: le registrazioni e gli schemi degli esercizi del catalogo a tempo (es. "Plank 3 × 60 rip.")
-- diventano secondi con lo stesso numero. I personalizzati restano tutti a ripetizioni.

-- 1. Misura degli esercizi dell'utente.
alter table public.exercises
  add column measure text not null default 'reps' check (measure in ('reps', 'time'));

update public.exercises e
set measure = c.measure
from public.catalog_exercises c
where c.id = e.catalog_id and e.measure <> c.measure;

-- 2. Secondi negli schemi. A ripetizioni: seconds null; a tempo: reps = seconds (vedi sopra).
alter table public.plan_items add column seconds int;
alter table public.program_items add column seconds int;

update public.plan_items p
set seconds = p.reps
from public.exercises e
where e.id = p.exercise_id and e.measure = 'time';

update public.program_items p
set seconds = p.reps
from public.catalog_exercises c
where c.id = p.catalog_id and c.measure = 'time';

alter table public.plan_items
  drop constraint plan_items_reps_check,
  add constraint plan_items_reps_check check (
    (seconds is null and reps between 1 and 1000)
    or (seconds between 1 and 3600 and reps = seconds)
  );
alter table public.program_items
  drop constraint program_items_reps_check,
  add constraint program_items_reps_check check (
    (seconds is null and reps between 1 and 1000)
    or (seconds between 1 and 3600 and reps = seconds)
  );

-- 3. Secondi nelle serie registrate. Conversione senza controlli: i dati vecchi restano come sono, solo con i secondi.
update public.entries x
set sets = (
  select jsonb_agg(case when jsonb_typeof(s) = 'object' and s ? 'reps' then s || jsonb_build_object('seconds', s -> 'reps') else s end
                   order by i)
  from jsonb_array_elements(x.sets) with ordinality as t(s, i)
)
from public.exercises e
where e.id = x.exercise_id and e.measure = 'time';

-- 4. Le serie si adeguano alla misura dell'esercizio.
--    A tempo: i secondi sono `seconds` se c'è, altrimenti `reps` (serie scritta da una versione vecchia); reps = seconds.
--    A ripetizioni: `seconds` non c'è.
create function public.normalize_sets(p_sets jsonb, p_measure text) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare
  s jsonb;
  v numeric;
  res jsonb := '[]'::jsonb;
begin
  if jsonb_typeof(p_sets) is distinct from 'array' then
    return p_sets; -- ci pensa il vincolo della colonna
  end if;
  for s in select t.s from jsonb_array_elements(p_sets) with ordinality as t(s, i) order by t.i loop
    if jsonb_typeof(s) <> 'object' then
      raise exception 'Serie non valida' using errcode = '22023';
    end if;
    if p_measure = 'time' then
      v := case when jsonb_typeof(s -> 'seconds') = 'number' then (s ->> 'seconds')::numeric
                when jsonb_typeof(s -> 'reps') = 'number' then (s ->> 'reps')::numeric end;
      if v is null or v < 1 or v <> trunc(v) then
        raise exception 'I secondi di ogni serie devono essere un numero intero da 1 in su' using errcode = '22023';
      end if;
      s := s || jsonb_build_object('reps', v::int, 'seconds', v::int);
    else
      s := s - 'seconds';
    end if;
    res := res || jsonb_build_array(s);
  end loop;
  return res;
end;
$$;

create function public.entry_normalize_sets() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.sets := public.normalize_sets(new.sets, coalesce((select e.measure from public.exercises e where e.id = new.exercise_id), 'reps'));
  return new;
end;
$$;

create trigger entries_normalize_sets before insert or update of sets, exercise_id on public.entries
  for each row execute function public.entry_normalize_sets();

-- 5. Lo stesso per gli schemi. Una versione vecchia che modifica una riga a tempo cambia solo `reps`.
create function public.scheme_seconds(p_measure text, op text, new_reps int, new_seconds int, old_reps int, old_seconds int)
returns int language sql immutable set search_path = '' as $$
  select case
    when p_measure <> 'time' then null
    when op = 'UPDATE' and new_seconds is not distinct from old_seconds and new_reps is distinct from old_reps then new_reps
    else coalesce(new_seconds, new_reps)
  end;
$$;

create function public.plan_item_measure() returns trigger
language plpgsql set search_path = '' as $$
declare
  m text := coalesce((select e.measure from public.exercises e where e.id = new.exercise_id), 'reps');
begin
  if tg_op = 'UPDATE' then
    new.seconds := public.scheme_seconds(m, tg_op, new.reps, new.seconds, old.reps, old.seconds);
  else
    new.seconds := public.scheme_seconds(m, tg_op, new.reps, new.seconds, null, null);
  end if;
  if new.seconds is not null then
    new.reps := new.seconds;
  end if;
  return new;
end;
$$;

create trigger plan_items_measure before insert or update of reps, seconds, exercise_id on public.plan_items
  for each row execute function public.plan_item_measure();

-- Nelle schede modello: per una voce del catalogo decide la voce; per un nome personalizzato lo schema
-- (a tempo se ha i secondi, o se li aveva e una versione vecchia ha cambiato solo le ripetizioni).
create function public.program_item_measure() returns trigger
language plpgsql set search_path = '' as $$
declare
  m text;
begin
  if new.catalog_id is not null then
    m := coalesce((select c.measure from public.catalog_exercises c where c.id = new.catalog_id), 'reps');
  elsif new.seconds is not null then
    m := 'time';
  else
    m := 'reps';
  end if;
  if tg_op = 'UPDATE' then
    new.seconds := public.scheme_seconds(m, tg_op, new.reps, new.seconds, old.reps, old.seconds);
  else
    new.seconds := public.scheme_seconds(m, tg_op, new.reps, new.seconds, null, null);
  end if;
  if new.seconds is not null then
    new.reps := new.seconds;
  end if;
  return new;
end;
$$;

create trigger program_items_measure before insert or update of reps, seconds, catalog_id, custom_name on public.program_items
  for each row execute function public.program_item_measure();

-- 6. Misura dell'esercizio: quella della voce del catalogo; un personalizzato già registrato non la cambia più.
--    Gli schemi già in programma seguono la nuova misura (stesso numero).
create function public.exercise_measure() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.catalog_id is not null then
    new.measure := coalesce((select c.measure from public.catalog_exercises c where c.id = new.catalog_id), new.measure);
  elsif tg_op = 'UPDATE' and new.measure <> old.measure
        and exists (select 1 from public.entries x where x.exercise_id = new.id) then
    raise exception 'Questo esercizio ha già delle registrazioni: la misura non si può più cambiare' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger exercises_measure before insert or update of catalog_id, measure on public.exercises
  for each row execute function public.exercise_measure();

-- security definer: segue anche le righe messe in programma dal trainer, che l'atleta non può modificare.
-- Tocca solo il programma dell'esercizio cambiato, che è dell'utente (la policy di exercises lo garantisce).
create function public.exercise_measure_follow() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.plan_items
  set seconds = case when new.measure = 'time' then reps end
  where exercise_id = new.id;
  return null;
end;
$$;

create trigger exercises_measure_follow after update of measure on public.exercises
  for each row when (new.measure is distinct from old.measure)
  execute function public.exercise_measure_follow();

revoke execute on function public.normalize_sets(jsonb, text), public.scheme_seconds(text, text, int, int, int, int)
  from public, anon;
grant execute on function public.normalize_sets(jsonb, text), public.scheme_seconds(text, text, int, int, int, int)
  to authenticated;
revoke execute on function public.entry_normalize_sets(), public.plan_item_measure(), public.program_item_measure(),
  public.exercise_measure(), public.exercise_measure_follow()
  from public, anon, authenticated;

-- 7. Un esercizio creato per l'atleta da un trainer (scheda o giorno singolo) prende la misura dello schema.
drop function public.ensure_athlete_exercise(uuid, text, text);

create function public.ensure_athlete_exercise(athlete uuid, p_catalog text, p_custom text, p_measure text default 'reps')
returns uuid
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
      insert into public.exercises (user_id, name, type, sort_order, measure)
      values (athlete, btrim(p_custom), 'volume', coalesce((select max(sort_order) from public.exercises where user_id = athlete), 0) + 1,
              case when p_measure = 'time' then 'time' else 'reps' end)
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

revoke execute on function public.ensure_athlete_exercise(uuid, text, text, text) from public, anon, authenticated;

-- 8. Assegnare una scheda copia anche i secondi.
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
    ex_id := public.ensure_athlete_exercise(p_athlete, it.catalog_id, it.custom_name,
                                            case when it.seconds is not null then 'time' else 'reps' end);
    day := start_monday + (it.week - 1) * 7 + it.weekday;
    insert into public.plan_items (user_id, exercise_id, date, sort_order, sets, reps, seconds, weight, rest_seconds, type, note, assigned_by, assignment_id)
    values (p_athlete, ex_id, day,
            coalesce((select max(sort_order) from public.plan_items where user_id = p_athlete and date = day), 0) + 1,
            it.sets, it.reps, it.seconds, it.weight, it.rest_seconds, it.type, it.note, auth.uid(), a_id)
    on conflict (user_id, date, exercise_id) do update
      set sets = excluded.sets, reps = excluded.reps, seconds = excluded.seconds, weight = excluded.weight,
          rest_seconds = excluded.rest_seconds, type = excluded.type, note = excluded.note,
          assigned_by = excluded.assigned_by, assignment_id = excluded.assignment_id;
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- 9. Il trainer che aggiunge un giorno può dare i secondi. Chi chiama senza p_seconds (versione precedente) passa
--    le ripetizioni: per un esercizio a tempo diventano secondi.
drop function public.coach_add_plan_item(uuid, date, text, text, int, int, numeric, int, text, text);

create function public.coach_add_plan_item(
  p_athlete uuid, p_date date, p_catalog text, p_custom text,
  p_sets int, p_reps int, p_weight numeric, p_rest int, p_note text, p_type text default null, p_seconds int default null
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
  ex_id := public.ensure_athlete_exercise(p_athlete, p_catalog, p_custom, case when p_seconds is not null then 'time' else 'reps' end);
  -- type null: lo completa il trigger; i secondi li sistema plan_items_measure
  insert into public.plan_items (user_id, exercise_id, date, sort_order, sets, reps, seconds, weight, rest_seconds, type, note, assigned_by)
  values (p_athlete, ex_id, p_date,
          coalesce((select max(sort_order) from public.plan_items where user_id = p_athlete and date = p_date), 0) + 1,
          p_sets, coalesce(p_seconds, p_reps), p_seconds, p_weight, p_rest, p_type, nullif(btrim(p_note), ''), auth.uid())
  on conflict (user_id, date, exercise_id) do nothing
  returning id into item_id;
  if item_id is null then
    raise exception 'Questo esercizio è già in programma quel giorno' using errcode = 'P0001';
  end if;
  return item_id;
end;
$$;

revoke execute on function public.coach_add_plan_item(uuid, date, text, text, int, int, numeric, int, text, text, int) from public, anon;
grant execute on function public.coach_add_plan_item(uuid, date, text, text, int, int, numeric, int, text, text, int) to authenticated;
