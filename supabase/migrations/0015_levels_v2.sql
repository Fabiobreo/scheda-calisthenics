-- Dati dei livelli v2 (ticket 32, specifica nel 30): il peso corporeo sta dentro il record, solo per le voci la cui
-- formula lo usa; `level_stages` elenca le voci del motore v2 (src/lib/levels/v2); i record esistenti si convertono;
-- lo storico del peso (`body_weights`) sparisce.
-- Da rilasciare insieme all'app nuova: una versione vecchia ancora in cache scrive voci che non esistono più o
-- record senza peso, e il controllo qui sotto le risponde di aggiornare l'app.

-- Durante la conversione il controllo dei record resta spento: si riaccende in fondo, con le regole nuove.
drop trigger level_records_check on public.level_records;

-- ---------------------------------------------------------------------------------------------------------
-- 1. Peso corporeo dentro il record

alter table public.level_records
  add column bodyweight_kg numeric(5,2) check (bodyweight_kg is null or bodyweight_kg between 30 and 250);

comment on column public.level_records.bodyweight_kg is
  'Peso corporeo (kg) al momento del record: obbligatorio se la voce lo usa (level_stages.uses_bodyweight), vuoto altrimenti.';

-- Il peso del giorno del record, con la regola che usava l'app (bodyweightOn): l'ultimo inserito fino a quel giorno;
-- se il record è più vecchio di ogni peso, il primo inserito dopo. Un peso fuori dai limiti nuovi (prima 20–300,
-- ora 30–250) non si copia e non si aggiusta: il record resta senza peso e l'atleta lo completa correggendolo.
update public.level_records r
set bodyweight_kg = w.kg
from (
  select r2.id,
         coalesce(
           (select b.kg from public.body_weights b where b.user_id = r2.user_id and b.date <= r2.date order by b.date desc limit 1),
           (select b.kg from public.body_weights b where b.user_id = r2.user_id order by b.date limit 1)
         ) as kg
  from public.level_records r2
) w
where w.id = r.id and w.kg between 30 and 250;

-- ---------------------------------------------------------------------------------------------------------
-- 2. Conversione dei record esistenti (tabella del ticket 32)

alter table public.level_records drop constraint level_records_sub_id_stage_fkey;

-- Front lever touch e pull ups in Tuck non esistono più (30, decisione 8).
delete from public.level_records
where sub_id in ('front-lever-touch', 'front-lever-pull-up') and stage = 'tuck';

-- La zavorra deve essere maggiore di zero (30, decisione 14). Un record a zavorra 0 era "a corpo libero" e già
-- prima non contava niente: non ha un equivalente e si elimina.
delete from public.level_records where stage = 'zavorra' and value <= 0;

-- Progressioni tolte: vanno al livello subito sotto, pieno (30, decisione 2). "Pieno" è il valore che completa il
-- livello a 60 kg, come scritto nel ticket per la planche (10 s): 5 ripetizioni nei planche push ups, 3 nei
-- planche press.
update public.level_records set stage = 'straddle', value = 10 where sub_id = 'planche' and stage = 'half-lay';
update public.level_records set stage = 'full', value = 10 where sub_id = 'planche' and stage = 'wide';
update public.level_records set stage = 'straddle', value = 5 where sub_id = 'planche-push-up' and stage = 'half-lay';
update public.level_records set stage = 'straddle', value = 3 where sub_id = 'planche-press' and stage = 'half-lay';

-- La verticale ora arriva a 60 secondi.
update public.level_records set value = 60 where sub_id = 'verticale' and stage = 'verticale' and value > 60;

-- Voci che cambiano solo nome. Tutte le altre (zavorra, tuck, advanced-tuck, one-leg, straddle, half-lay, full,
-- wide, victorian, maltese, verticale) hanno lo stesso identificativo nel motore v2.
update public.level_records r
set stage = m.new_stage
from (values
  ('military', 'bilanciere', 'massimale'),
  ('panca-piana', 'bilanciere', 'massimale'),
  ('oap', 'gomito', 'avambraccio'),
  ('oap', 'oap', 'ripetizioni'),
  ('verticale', 'straddle-mono-braccio', 'oahs-straddle'),
  ('verticale', 'full-mono-braccio', 'oahs'),
  ('hspu', 'libera', 'liberi')
) as m (sub_id, old_stage, new_stage)
where r.sub_id = m.sub_id and r.stage = m.old_stage;

-- ---------------------------------------------------------------------------------------------------------
-- 3. Voci inseribili del motore v2, coi limiti del valore. Sono le stesse di `stageLimits()` in
--    src/lib/levels/v2/engine.ts: un test (src/lib/levels/db.test.ts) controlla che coincidano.

alter table public.level_stages
  add column min_exclusive boolean not null default false,
  add column uses_bodyweight boolean not null default false;
alter table public.level_stages
  alter column min_exclusive drop default,
  alter column uses_bodyweight drop default;

comment on table public.level_stages is 'Voci inseribili per catena (motore dei punteggi v2) coi limiti del valore.';
comment on column public.level_stages.sub_id is 'Catena (es. trazioni, planche).';
comment on column public.level_stages.stage is 'Voce del menu a tendina (es. zavorra, straddle).';
comment on column public.level_stages.min_exclusive is 'true = il minimo è escluso (zavorra e massimale > 0).';
comment on column public.level_stages.whole is 'true = ripetizioni o secondi (interi), false = kg.';
comment on column public.level_stages.uses_bodyweight is 'true = la formula usa il peso corporeo: il record deve averlo.';

delete from public.level_stages;

-- (catena, voce, minimo, massimo, minimo escluso, intero, usa il peso corporeo)
insert into public.level_stages (sub_id, stage, min_value, max_value, min_exclusive, whole, uses_bodyweight) values
  ('trazioni', 'australian', 1, 50, false, true, false),
  ('trazioni', 'ripetizioni', 1, 50, false, true, true),
  ('trazioni', 'zavorra', 0, 400, true, false, true),
  ('muscle-up', 'ripetizioni', 1, 50, false, true, false),
  ('muscle-up', 'zavorra', 0, 400, true, false, true),
  ('oap', 'avambraccio', 1, 50, false, true, true),
  ('oap', 'bicipite', 1, 50, false, true, true),
  ('oap', 'spalla', 1, 50, false, true, true),
  ('oap', 'ripetizioni', 1, 50, false, true, true),
  ('oap', 'zavorra', 0, 400, true, false, true),
  ('dip', 'bench-dip', 1, 50, false, true, false),
  ('dip', 'ripetizioni', 1, 50, false, true, true),
  ('dip', 'zavorra', 0, 400, true, false, true),
  ('panca-piana', 'push-up', 1, 50, false, true, false),
  ('panca-piana', 'massimale', 0, 400, true, false, true),
  ('military', 'massimale', 0, 400, true, false, true),
  ('hspu', 'pike-terra', 1, 50, false, true, true),
  ('hspu', 'pike-rialzo', 1, 50, false, true, true),
  ('hspu', 'muro', 1, 50, false, true, true),
  ('hspu', 'liberi', 1, 50, false, true, true),
  ('hspu', 'zavorra', 0, 400, true, false, true),
  ('verticale', 'muro', 1, 60, false, true, false),
  ('verticale', 'verticale', 1, 60, false, true, false),
  ('verticale', 'oahs-5-dita', 1, 60, false, true, false),
  ('verticale', 'oahs-3-dita', 1, 60, false, true, false),
  ('verticale', 'oahs-1-dito', 1, 60, false, true, false),
  ('verticale', 'oahs-straddle', 1, 60, false, true, false),
  ('verticale', 'oahs', 1, 60, false, true, false),
  ('front-lever', 'tuck', 1, 60, false, true, true),
  ('front-lever', 'advanced-tuck', 1, 60, false, true, true),
  ('front-lever', 'one-leg', 1, 60, false, true, true),
  ('front-lever', 'straddle', 1, 60, false, true, true),
  ('front-lever', 'half-lay', 1, 60, false, true, true),
  ('front-lever', 'full', 1, 60, false, true, true),
  ('front-lever', 'wide', 1, 60, false, true, true),
  ('front-lever', 'victorian', 1, 60, false, true, true),
  ('front-lever-touch', 'advanced-tuck', 1, 60, false, true, true),
  ('front-lever-touch', 'one-leg', 1, 60, false, true, true),
  ('front-lever-touch', 'straddle', 1, 60, false, true, true),
  ('front-lever-touch', 'half-lay', 1, 60, false, true, true),
  ('front-lever-touch', 'full', 1, 60, false, true, true),
  ('front-lever-touch', 'wide', 1, 60, false, true, true),
  ('front-lever-pull-up', 'advanced-tuck', 1, 50, false, true, true),
  ('front-lever-pull-up', 'one-leg', 1, 50, false, true, true),
  ('front-lever-pull-up', 'straddle', 1, 50, false, true, true),
  ('front-lever-pull-up', 'half-lay', 1, 50, false, true, true),
  ('front-lever-pull-up', 'full', 1, 50, false, true, true),
  ('front-lever-pull-up', 'wide', 1, 50, false, true, true),
  ('planche', 'tuck', 1, 60, false, true, true),
  ('planche', 'advanced-tuck', 1, 60, false, true, true),
  ('planche', 'one-leg', 1, 60, false, true, true),
  ('planche', 'straddle', 1, 60, false, true, true),
  ('planche', 'full', 1, 60, false, true, true),
  ('planche', 'maltese', 1, 60, false, true, true),
  ('planche-push-up', 'tuck', 1, 50, false, true, true),
  ('planche-push-up', 'advanced-tuck', 1, 50, false, true, true),
  ('planche-push-up', 'one-leg', 1, 50, false, true, true),
  ('planche-push-up', 'straddle', 1, 50, false, true, true),
  ('planche-push-up', 'full', 1, 50, false, true, true),
  ('planche-press', 'tuck', 1, 50, false, true, true),
  ('planche-press', 'advanced-tuck', 1, 50, false, true, true),
  ('planche-press', 'one-leg', 1, 50, false, true, true),
  ('planche-press', 'straddle', 1, 50, false, true, true),
  ('planche-press', 'full', 1, 50, false, true, true);

-- Il peso si tiene solo dove la formula lo usa (30, decisione 9): non per australian, bench dip, push up, muscle up
-- a ripetizioni, verticali e OAHS.
update public.level_records r
set bodyweight_kg = null
from public.level_stages s
where s.sub_id = r.sub_id and s.stage = r.stage and not s.uses_bodyweight and r.bodyweight_kg is not null;

-- Se un record è rimasto su una voce che non esiste più, la migration si ferma qui: nessun record sparisce in silenzio.
alter table public.level_records
  add constraint level_records_sub_id_stage_fkey foreign key (sub_id, stage) references public.level_stages (sub_id, stage);

do $$
declare
  n int;
begin
  select count(*) into n
  from public.level_records r
  join public.level_stages s on s.sub_id = r.sub_id and s.stage = r.stage
  where s.uses_bodyweight and r.bodyweight_kg is null;
  if n > 0 then
    raise notice 'Livelli v2: % record senza peso corporeo (nessun peso valido nello storico): non contano finché non si correggono', n;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------------------------------------
-- 4. Controllo dei record: voce esistente, valore nei limiti, peso corporeo solo e sempre dove serve, data non nel
--    futuro (un giorno di margine per i fusi orari). I messaggi arrivano anche a un'app vecchia rimasta in cache.

create or replace function public.check_level_record() returns trigger
language plpgsql set search_path = '' as $$
declare
  s public.level_stages;
begin
  select * into s from public.level_stages where sub_id = new.sub_id and stage = new.stage;
  if not found then
    raise exception 'Questa voce non esiste più: aggiorna l''app e riprova' using errcode = '23503';
  end if;
  if new.value < s.min_value or (s.min_exclusive and new.value <= s.min_value) or new.value > s.max_value
     or (s.whole and new.value <> trunc(new.value)) then
    raise exception 'Valore fuori dai limiti della voce' using errcode = '23514';
  end if;
  if s.uses_bodyweight then
    if new.bodyweight_kg is null then
      raise exception 'Per questa voce serve il peso corporeo nel record: se non te lo chiede, aggiorna l''app' using errcode = '23514';
    end if;
  else
    -- la formula non lo usa: non si salva
    new.bodyweight_kg := null;
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

-- ---------------------------------------------------------------------------------------------------------
-- 5. Via lo storico del peso, con le sue policy (proprie e del trainer) e il suo controllo. Le policy dei record
--    non cambiano: l'atleta scrive i suoi, il trainer collegato li legge (peso compreso, è una colonna del record).

drop table public.body_weights;
drop function public.check_body_weight();
