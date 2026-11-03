-- Catalogo esercizi comune a tutti gli utenti.
-- Ogni utente continua ad avere i suoi esercizi (con record, archivio, ordine), ma ognuno è collegato a una voce
-- del catalogo oppure è personalizzato. Così le "Trazioni" sono le stesse per atleti e trainer: una scheda del
-- trainer si abbina all'atleta per id del catalogo, non per nome.

create table public.catalog_exercises (
  -- slug stabile e leggibile: identico in ogni database (locale, produzione), usato dal codice e dai seed
  id           text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name         text not null unique check (char_length(btrim(name)) between 1 and 80),
  category     text not null check (category in ('tirata', 'spinta', 'gambe', 'core', 'skill')),
  default_type text not null check (default_type in ('forza', 'volume', 'tecnico')),
  -- altri nomi con cui si cerca o si è già creato l'esercizio, in minuscolo
  aliases      text[] not null default '{}',
  sort_order   int not null default 0
);

alter table public.catalog_exercises enable row level security;

-- Lettura per tutti gli utenti; nessuna scrittura dal client: il catalogo cambia solo con le migration.
create policy "catalog: read" on public.catalog_exercises
  for select to authenticated
  using (true);

insert into public.catalog_exercises (id, name, category, default_type, aliases, sort_order) values
  -- tirata
  ('trazioni',             'Trazioni',                       'tirata', 'forza',   '{pull up,pull-up,pullup,trazioni prone,trazioni alla sbarra}', 10),
  ('trazioni-supine',      'Trazioni supine',                'tirata', 'forza',   '{chin up,chin-up,chinup}', 20),
  ('trazioni-neutre',      'Trazioni presa neutra',          'tirata', 'forza',   '{neutral grip pull up,trazioni neutre}', 30),
  ('trazioni-arciere',     'Trazioni arciere',               'tirata', 'forza',   '{archer pull up,archer pull-up}', 40),
  ('trazioni-scapolari',   'Trazioni scapolari',             'tirata', 'tecnico', '{scapular pull up,scapular pull-up,scapular pull}', 50),
  ('rematore-inverso',     'Rematore inverso',               'tirata', 'volume',  '{australian pull up,australian pull-up,inverted row,trazioni australiane}', 60),
  ('muscle-up',            'Muscle-up',                      'tirata', 'tecnico', '{muscle up,muscleup}', 70),
  ('muscle-up-anelli',     'Muscle-up agli anelli',          'tirata', 'tecnico', '{ring muscle up,ring muscle-up}', 80),
  ('front-lever',          'Front lever',                    'tirata', 'tecnico', '{}', 90),
  ('back-lever',           'Back lever',                     'tirata', 'tecnico', '{}', 100),
  -- spinta
  ('piegamenti',           'Piegamenti',                     'spinta', 'volume',  '{push up,push-up,pushup,flessioni}', 110),
  ('piegamenti-diamante',  'Piegamenti diamante',            'spinta', 'volume',  '{diamond push up,diamond push-up}', 120),
  ('piegamenti-declinati', 'Piegamenti declinati',           'spinta', 'volume',  '{decline push up,decline push-up}', 130),
  ('piegamenti-arciere',   'Piegamenti arciere',             'spinta', 'forza',   '{archer push up,archer push-up}', 140),
  ('pseudo-planche',       'Pseudo planche push-up',         'spinta', 'forza',   '{pseudo planche push up,ppp}', 150),
  ('pike-push-up',         'Pike push-up',                   'spinta', 'forza',   '{pike push up,piegamenti pike}', 160),
  ('piegamenti-verticale', 'Piegamenti in verticale',        'spinta', 'forza',   '{handstand push up,handstand push-up,hspu}', 170),
  ('dip',                  'Dip alle parallele',             'spinta', 'forza',   '{dip,dips,parallel bar dip}', 180),
  ('dip-anelli',           'Dip agli anelli',                'spinta', 'forza',   '{ring dip,ring dips}', 190),
  ('dip-sbarra',           'Dip alla sbarra',                'spinta', 'forza',   '{straight bar dip}', 200),
  ('planche',              'Planche',                        'spinta', 'tecnico', '{}', 210),
  -- gambe
  ('squat',                'Squat',                          'gambe',  'volume',  '{air squat,squat a corpo libero}', 220),
  ('squat-saltati',        'Squat saltati',                  'gambe',  'volume',  '{jump squat}', 230),
  ('affondi',              'Affondi',                        'gambe',  'volume',  '{affondo,lunges,lunge}', 240),
  ('squat-bulgaro',        'Squat bulgaro',                  'gambe',  'forza',   '{bulgarian split squat}', 250),
  ('pistol-squat',         'Pistol squat',                   'gambe',  'forza',   '{pistol}', 260),
  ('shrimp-squat',         'Shrimp squat',                   'gambe',  'forza',   '{}', 270),
  ('nordic-curl',          'Nordic curl',                    'gambe',  'forza',   '{nordic}', 280),
  ('calf-raise',           'Calf raise',                     'gambe',  'volume',  '{polpacci,sollevamento polpacci}', 290),
  -- core
  ('plank',                'Plank',                          'core',   'volume',  '{}', 300),
  ('hollow-hold',          'Hollow body hold',               'core',   'tecnico', '{hollow,hollow hold}', 310),
  ('l-sit',                'L-sit',                          'core',   'tecnico', '{l sit}', 320),
  ('sollevamento-gambe',   'Sollevamento gambe alla sbarra', 'core',   'volume',  '{hanging leg raise,leg raise}', 330),
  ('toes-to-bar',          'Toes to bar',                    'core',   'volume',  '{t2b}', 340),
  ('dragon-flag',          'Dragon flag',                    'core',   'forza',   '{}', 350),
  ('ab-wheel',             'Ab wheel',                       'core',   'volume',  '{rollout,ab rollout}', 360),
  -- skill
  ('verticale',            'Verticale',                      'skill',  'tecnico', '{handstand}', 370),
  ('v-sit',                'V-sit',                          'skill',  'tecnico', '{v sit}', 380),
  ('bandiera',             'Bandiera',                       'skill',  'tecnico', '{human flag}', 390);

-- Esercizi dell'utente: collegati al catalogo oppure personalizzati.
-- `name` resta sempre compilato: per quelli del catalogo è una copia del nome della voce, scritta dal trigger qui sotto.
-- Serve a chi ha ancora aperta la versione precedente dell'app, che non conosce il catalogo e legge solo `name`;
-- e il vincolo di nome unico per utente (0003) impedisce un personalizzato "Trazioni" accanto a quelle del catalogo.
-- L'app nuova mostra il nome del catalogo.
alter table public.exercises
  add column catalog_id text references public.catalog_exercises on update cascade on delete restrict,
  -- una voce del catalogo una volta sola per utente: i grafici restano su un'unica linea
  add constraint exercises_user_catalog_key unique (user_id, catalog_id);

create function public.exercise_catalog_name() returns trigger
language plpgsql set search_path = '' as $$
declare
  cat_name text;
begin
  if new.catalog_id is null then
    return new;
  end if;
  select name into cat_name from public.catalog_exercises where id = new.catalog_id;
  if cat_name is null then
    return new; -- voce inesistente: ci pensa la foreign key
  end if;
  new.name := cat_name;
  -- c'è già un suo esercizio con quel nome (personalizzato): un nome di riserva evita il conflitto sul vincolo unico
  if exists (
    select 1 from public.exercises x
    where x.user_id = new.user_id and x.id <> new.id and lower(btrim(x.name)) = lower(cat_name)
  ) then
    new.name := left(cat_name, 69) || ' (catalogo)';
  end if;
  return new;
end;
$$;

create trigger exercises_catalog_name before insert or update of catalog_id, name on public.exercises
  for each row execute function public.exercise_catalog_name();

-- Gli esercizi che esistono già si collegano al catalogo se il nome (o un sinonimo) corrisponde.
-- Se due esercizi dello stesso utente corrispondono alla stessa voce, si collega il più vecchio; l'altro resta personalizzato.
with m as (
  select e.id, c.id as catalog_id,
         row_number() over (partition by e.user_id, c.id order by e.created_at, e.id) as n
  from public.exercises e
  join public.catalog_exercises c
    on lower(btrim(e.name)) = lower(c.name) or lower(btrim(e.name)) = any (c.aliases)
)
update public.exercises e
set catalog_id = m.catalog_id
from m
where m.id = e.id and m.n = 1;
