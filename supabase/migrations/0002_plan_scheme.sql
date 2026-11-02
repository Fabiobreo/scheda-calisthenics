-- Schema per giorno: ogni esercizio del programma può avere serie, ripetizioni e peso propri.
-- Tutti null = usa lo schema predefinito dell'esercizio (target_*).

alter table public.plan_items
  add column sets   int          check (sets between 1 and 50),
  add column reps   int          check (reps between 1 and 1000),
  add column weight numeric(6,2) check (weight >= 0),
  add constraint plan_items_scheme_all_or_none check (
    (sets is null and reps is null and weight is null)
    or (sets is not null and reps is not null and weight is not null)
  );
