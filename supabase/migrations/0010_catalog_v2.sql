-- Nuovo catalogo esercizi (ticket 02).
--
-- - Alcune voci si rinominano: l'id resta, quindi esercizi, registrazioni e schede le seguono da soli.
-- - Planche e front lever diventano progressioni distinte (Tuck … Full) e la categoria Skill raccoglie anche gli
--   esercizi del sistema di livelli.
-- - Le voci tolte non spariscono a chi le usa: diventano esercizi personalizzati con lo stesso nome (e nomi
--   personalizzati nelle schede modello dei trainer), con tutto il loro storico.
-- - Nuova colonna `measure`: ripetizioni o secondi. La userà l'app per gli esercizi a tempo (ticket 03).

alter table public.catalog_exercises
  add column measure text not null default 'reps' check (measure in ('reps', 'time'));

-- 1. Voci tolte: chi le usa le tiene come esercizi personalizzati.
update public.program_items p
set custom_name = c.name, catalog_id = null
from public.catalog_exercises c
where c.id = p.catalog_id
  and c.id = any ('{trazioni-arciere,trazioni-scapolari,piegamenti-diamante,piegamenti-declinati,piegamenti-arciere,dip-sbarra,v-sit,front-lever,planche}');

-- il nome resta quello già salvato (il nome del catalogo, o quello con il suffisso " (catalogo)")
update public.exercises
set catalog_id = null
where catalog_id = any ('{trazioni-arciere,trazioni-scapolari,piegamenti-diamante,piegamenti-declinati,piegamenti-arciere,dip-sbarra,v-sit,front-lever,planche}');

delete from public.catalog_exercises
where id = any ('{trazioni-arciere,trazioni-scapolari,piegamenti-diamante,piegamenti-declinati,piegamenti-arciere,dip-sbarra,v-sit,front-lever,planche}');

-- 2. Il catalogo nuovo: voci aggiornate (stesso id) e voci nuove.
--    I sinonimi non ripetono il nome della voce né quelli di altre voci.
insert into public.catalog_exercises (id, name, category, default_type, aliases, sort_order, measure) values
  -- tirata
  ('trazioni',              'Trazioni prone',                  'tirata', 'forza',   '{trazioni,pull up,pull-up,pullup,trazioni alla sbarra}', 10, 'reps'),
  ('trazioni-supine',       'Trazioni supine',                 'tirata', 'forza',   '{chin up,chin-up,chinup}', 20, 'reps'),
  ('trazioni-neutre',       'Trazioni presa neutra',           'tirata', 'forza',   '{neutral grip pull up,trazioni neutre}', 30, 'reps'),
  ('muscle-up',             'Muscle up',                       'tirata', 'tecnico', '{muscle-up,muscleup}', 40, 'reps'),
  ('muscle-up-anelli',      'Muscle up agli anelli',           'tirata', 'tecnico', '{muscle-up agli anelli,ring muscle up,ring muscle-up}', 50, 'reps'),
  ('oap',                   'OAP',                             'tirata', 'forza',   '{one arm pull up,one arm pull-up,trazione a un braccio,trazioni a un braccio}', 60, 'reps'),
  ('oap-assistito',         'OAP assistito',                   'tirata', 'forza',   '{assisted one arm pull up,one arm pull up assistito,trazione a un braccio assistita}', 70, 'reps'),
  ('row-anelli',            'Row agli anelli',                 'tirata', 'volume',  '{ring row,rematore agli anelli}', 80, 'reps'),
  ('rematore-inverso',      'Australian pull up',              'tirata', 'volume',  '{australian pull-up,inverted row,rematore inverso,trazioni australiane}', 90, 'reps'),
  ('rematore',              'Rematore',                        'tirata', 'forza',   '{bent over row,barbell row,rematore con bilanciere,rematore con manubrio}', 100, 'reps'),
  ('lat-machine',           'Lat machine',                     'tirata', 'forza',   '{lat pulldown,lat pull down}', 110, 'reps'),
  -- spinta
  ('piegamenti',            'Push up',                         'spinta', 'volume',  '{push-up,pushup,piegamenti,flessioni}', 200, 'reps'),
  ('pike-push-up',          'Pike push up',                    'spinta', 'forza',   '{pike push-up,piegamenti pike}', 210, 'reps'),
  ('piegamenti-verticale',  'Piegamenti in verticale',         'spinta', 'forza',   '{hand stand push up,handstand push up,handstand push-up,hspu}', 220, 'reps'),
  ('dip',                   'Dip',                             'spinta', 'forza',   '{dips,dip alle parallele,parallel bar dip}', 230, 'reps'),
  ('dip-anelli',            'Dip agli anelli',                 'spinta', 'forza',   '{ring dip,ring dips}', 240, 'reps'),
  ('military',              'Military',                        'spinta', 'forza',   '{military press,lento avanti,overhead press,ohp}', 250, 'reps'),
  ('panca-piana',           'Panca piana',                     'spinta', 'forza',   '{bench press,panca}', 260, 'reps'),
  ('pseudo-planche',        'Pseudo planche push up',          'spinta', 'forza',   '{pseudo planche push-up,ppp}', 270, 'reps'),
  -- gambe
  ('squat',                 'Squat',                           'gambe',  'volume',  '{air squat,squat a corpo libero}', 300, 'reps'),
  ('squat-saltati',         'Squat saltati',                   'gambe',  'volume',  '{jump squat}', 310, 'reps'),
  ('affondi',               'Affondi',                         'gambe',  'volume',  '{affondo,lunges,lunge}', 320, 'reps'),
  ('squat-bulgaro',         'Squat bulgaro',                   'gambe',  'forza',   '{bulgarian split squat}', 330, 'reps'),
  ('pistol-squat',          'Pistol squat',                    'gambe',  'forza',   '{pistol}', 340, 'reps'),
  ('shrimp-squat',          'Shrimp squat',                    'gambe',  'forza',   '{}', 350, 'reps'),
  ('nordic-curl',           'Nordic curl',                     'gambe',  'forza',   '{nordic}', 360, 'reps'),
  ('calf-raise',            'Calf raise',                      'gambe',  'volume',  '{polpacci,sollevamento polpacci}', 370, 'reps'),
  -- core
  ('plank',                 'Plank',                           'core',   'volume',  '{}', 400, 'time'),
  ('hollow-hold',           'Hollow body hold',                'core',   'tecnico', '{hollow,hollow hold}', 410, 'time'),
  ('l-sit',                 'L-sit',                           'core',   'tecnico', '{l sit}', 420, 'time'),
  ('sollevamento-gambe',    'Sollevamento gambe alla sbarra',  'core',   'volume',  '{hanging leg raise,leg raise}', 430, 'reps'),
  ('toes-to-bar',           'Toes to bar',                     'core',   'volume',  '{t2b}', 440, 'reps'),
  ('dragon-flag',           'Dragon flag',                     'core',   'forza',   '{}', 450, 'reps'),
  ('ab-wheel',              'Ab wheel',                        'core',   'volume',  '{rollout,ab rollout}', 460, 'reps'),
  -- skill: planche
  ('tuck-planche',          'Tuck planche',                    'skill',  'tecnico', '{}', 500, 'time'),
  ('advanced-tuck-planche', 'Advanced tuck planche',           'skill',  'tecnico', '{tuck adv planche,adv tuck planche}', 510, 'time'),
  ('one-leg-planche',       'One leg planche',                 'skill',  'tecnico', '{}', 520, 'time'),
  ('straddle-planche',      'Straddle planche',                'skill',  'tecnico', '{}', 530, 'time'),
  ('half-lay-planche',      'Half lay planche',                'skill',  'tecnico', '{}', 540, 'time'),
  ('full-planche',          'Full planche',                    'skill',  'tecnico', '{}', 550, 'time'),
  ('wide-planche',          'Wide planche',                    'skill',  'tecnico', '{}', 560, 'time'),
  ('maltese',               'Maltese',                         'skill',  'tecnico', '{}', 570, 'time'),
  ('planche-push-up',       'Planche push up',                 'skill',  'forza',   '{planche push-up}', 580, 'reps'),
  ('planche-press',         'Planche press',                   'skill',  'forza',   '{}', 590, 'reps'),
  -- skill: front lever
  ('tuck-front-lever',          'Tuck front lever',            'skill',  'tecnico', '{}', 600, 'time'),
  ('advanced-tuck-front-lever', 'Advanced tuck front lever',   'skill',  'tecnico', '{tuck adv front lever,adv tuck front lever}', 610, 'time'),
  ('one-leg-front-lever',       'One leg front lever',         'skill',  'tecnico', '{}', 620, 'time'),
  ('straddle-front-lever',      'Straddle front lever',        'skill',  'tecnico', '{}', 630, 'time'),
  ('half-lay-front-lever',      'Half lay front lever',        'skill',  'tecnico', '{}', 640, 'time'),
  ('full-front-lever',          'Full front lever',            'skill',  'tecnico', '{}', 650, 'time'),
  ('wide-front-lever',          'Wide front lever',            'skill',  'tecnico', '{}', 660, 'time'),
  ('victorian',                 'Victorian',                   'skill',  'tecnico', '{}', 670, 'time'),
  ('front-lever-pull-up',       'Front lever pull up',         'skill',  'forza',   '{front lever pull-up}', 680, 'reps'),
  ('front-lever-touch',         'Front lever touch',           'skill',  'forza',   '{}', 690, 'time'),
  -- skill: verticale e altre
  ('verticale',                       'Verticale',                       'skill', 'tecnico', '{handstand}', 700, 'time'),
  ('verticale-straddle-mono-braccio', 'Verticale straddle mono braccio', 'skill', 'tecnico', '{straddle one arm handstand}', 710, 'time'),
  ('verticale-full-mono-braccio',     'Verticale full mono braccio',     'skill', 'tecnico', '{one arm handstand,oahs,verticale mono braccio}', 720, 'time'),
  ('bandiera',                        'Bandiera',                        'skill', 'tecnico', '{human flag}', 730, 'time'),
  ('back-lever',                      'Back lever',                      'skill', 'tecnico', '{}', 740, 'time')
on conflict (id) do update
  set name = excluded.name, category = excluded.category, default_type = excluded.default_type,
      aliases = excluded.aliases, sort_order = excluded.sort_order, measure = excluded.measure;

-- 3. exercises.name è una copia del nome del catalogo (per le versioni vecchie dell'app): la riallinea il trigger.
update public.exercises set catalog_id = catalog_id where catalog_id is not null;

-- 4. Esercizi personalizzati che ora sono nel catalogo (es. "Panca piana", "Lat machine") si collegano alla voce,
--    come in 0006. Se un utente ne ha più d'uno per la stessa voce si collega quello con il nome esatto, poi il più
--    vecchio; gli altri restano suoi.
with m as (
  select e.id, c.id as catalog_id,
         row_number() over (
           partition by e.user_id, c.id
           order by (lower(btrim(e.name)) = lower(c.name)) desc, e.created_at, e.id
         ) as n
  from public.exercises e
  join public.catalog_exercises c
    on lower(btrim(e.name)) = lower(c.name) or lower(btrim(e.name)) = any (c.aliases)
  where e.catalog_id is null
    and not exists (select 1 from public.exercises x where x.user_id = e.user_id and x.catalog_id = c.id)
)
update public.exercises e
set catalog_id = m.catalog_id
from m
where m.id = e.id and m.n = 1;

-- E lo stesso per i nomi personalizzati delle schede modello.
update public.program_items p
set catalog_id = c.id, custom_name = null
from public.catalog_exercises c
where p.custom_name is not null
  and (lower(btrim(p.custom_name)) = lower(c.name) or lower(btrim(p.custom_name)) = any (c.aliases));
