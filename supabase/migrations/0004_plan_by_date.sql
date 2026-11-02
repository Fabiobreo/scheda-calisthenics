-- Programma per data invece della settimana tipo: ogni giorno del calendario ha i suoi esercizi,
-- così si può programmare il futuro settimana per settimana (e copiare una settimana nelle successive).

alter table public.plan_items add column date date;

-- La settimana tipo diventa la settimana in corso al momento della migration (weekday 0 = lunedì).
update public.plan_items
set date = date_trunc('week', current_date)::date + weekday;

alter table public.plan_items
  alter column date set not null,
  -- toglie anche il vincolo unique (user_id, weekday, exercise_id)
  drop column weekday,
  add constraint plan_items_user_date_exercise_key unique (user_id, date, exercise_id);
