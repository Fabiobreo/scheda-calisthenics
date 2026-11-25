-- Classifiche (ticket 38): punti di ogni utente sul server, luogo e visibilità del profilo, funzione delle classifiche.
--
-- - `provinces`: le 107 province con la regione; serve a controllare la provincia e a ricavare la regione.
-- - `profiles`: nazione (ISO 3166-1 alpha-2), provincia (solo per l'Italia), regione (ricavata), `is_private`.
--   Chi si iscrive nasce PRIVATO, e lo sono anche i profili che esistono già (Fabio, 25 novembre 2026).
-- - `follows`: chi segue chi. Qui c'è solo la tabella, perché l'ambito "amici" delle classifiche e la visibilità dei
--   profili privati ne hanno bisogno: seguire, accettare e rifiutare arrivano col ticket 39.
-- - `level_scores`: i 6 numeri del livello (complessivo + 5 categorie). Li scrive l'app dell'utente, che li calcola
--   dai record col motore v2: le formule restano in un posto solo (src/lib/levels/v2). Il server controlla solo i
--   limiti e che il complessivo sia la somma.
-- - `ranking(ambito, metrica)`: posizione, partecipanti e poche righe (prime 3 + vicini). È l'unico modo di leggere
--   i punti degli altri, e dà solo nome e punti. Record e peso corporeo degli altri restano illeggibili.

-- ---------------------------------------------------------------------------------------------------------
-- 1. Province italiane (stesso elenco di src/lib/places.ts: lo controlla places.test.ts)

create table public.provinces (
  code   text primary key check (code ~ '^[A-Z]{2}$'),
  name   text not null,
  region text not null
);

alter table public.provinces enable row level security;
create policy "provinces: read" on public.provinces for select to anon, authenticated using (true);

insert into public.provinces (code, name, region) values
  ('TO', 'Torino', 'Piemonte'),
  ('VC', 'Vercelli', 'Piemonte'),
  ('NO', 'Novara', 'Piemonte'),
  ('CN', 'Cuneo', 'Piemonte'),
  ('AT', 'Asti', 'Piemonte'),
  ('AL', 'Alessandria', 'Piemonte'),
  ('BI', 'Biella', 'Piemonte'),
  ('VB', 'Verbano-Cusio-Ossola', 'Piemonte'),
  ('AO', 'Aosta', 'Valle d''Aosta'),
  ('VA', 'Varese', 'Lombardia'),
  ('CO', 'Como', 'Lombardia'),
  ('SO', 'Sondrio', 'Lombardia'),
  ('MI', 'Milano', 'Lombardia'),
  ('BG', 'Bergamo', 'Lombardia'),
  ('BS', 'Brescia', 'Lombardia'),
  ('PV', 'Pavia', 'Lombardia'),
  ('CR', 'Cremona', 'Lombardia'),
  ('MN', 'Mantova', 'Lombardia'),
  ('LC', 'Lecco', 'Lombardia'),
  ('LO', 'Lodi', 'Lombardia'),
  ('MB', 'Monza e Brianza', 'Lombardia'),
  ('BZ', 'Bolzano', 'Trentino-Alto Adige'),
  ('TN', 'Trento', 'Trentino-Alto Adige'),
  ('VR', 'Verona', 'Veneto'),
  ('VI', 'Vicenza', 'Veneto'),
  ('BL', 'Belluno', 'Veneto'),
  ('TV', 'Treviso', 'Veneto'),
  ('VE', 'Venezia', 'Veneto'),
  ('PD', 'Padova', 'Veneto'),
  ('RO', 'Rovigo', 'Veneto'),
  ('UD', 'Udine', 'Friuli-Venezia Giulia'),
  ('GO', 'Gorizia', 'Friuli-Venezia Giulia'),
  ('TS', 'Trieste', 'Friuli-Venezia Giulia'),
  ('PN', 'Pordenone', 'Friuli-Venezia Giulia'),
  ('IM', 'Imperia', 'Liguria'),
  ('SV', 'Savona', 'Liguria'),
  ('GE', 'Genova', 'Liguria'),
  ('SP', 'La Spezia', 'Liguria'),
  ('PC', 'Piacenza', 'Emilia-Romagna'),
  ('PR', 'Parma', 'Emilia-Romagna'),
  ('RE', 'Reggio Emilia', 'Emilia-Romagna'),
  ('MO', 'Modena', 'Emilia-Romagna'),
  ('BO', 'Bologna', 'Emilia-Romagna'),
  ('FE', 'Ferrara', 'Emilia-Romagna'),
  ('RA', 'Ravenna', 'Emilia-Romagna'),
  ('FC', 'Forlì-Cesena', 'Emilia-Romagna'),
  ('RN', 'Rimini', 'Emilia-Romagna'),
  ('MS', 'Massa-Carrara', 'Toscana'),
  ('LU', 'Lucca', 'Toscana'),
  ('PT', 'Pistoia', 'Toscana'),
  ('FI', 'Firenze', 'Toscana'),
  ('LI', 'Livorno', 'Toscana'),
  ('PI', 'Pisa', 'Toscana'),
  ('AR', 'Arezzo', 'Toscana'),
  ('SI', 'Siena', 'Toscana'),
  ('GR', 'Grosseto', 'Toscana'),
  ('PO', 'Prato', 'Toscana'),
  ('PG', 'Perugia', 'Umbria'),
  ('TR', 'Terni', 'Umbria'),
  ('PU', 'Pesaro e Urbino', 'Marche'),
  ('AN', 'Ancona', 'Marche'),
  ('MC', 'Macerata', 'Marche'),
  ('AP', 'Ascoli Piceno', 'Marche'),
  ('FM', 'Fermo', 'Marche'),
  ('VT', 'Viterbo', 'Lazio'),
  ('RI', 'Rieti', 'Lazio'),
  ('RM', 'Roma', 'Lazio'),
  ('LT', 'Latina', 'Lazio'),
  ('FR', 'Frosinone', 'Lazio'),
  ('AQ', 'L''Aquila', 'Abruzzo'),
  ('TE', 'Teramo', 'Abruzzo'),
  ('PE', 'Pescara', 'Abruzzo'),
  ('CH', 'Chieti', 'Abruzzo'),
  ('CB', 'Campobasso', 'Molise'),
  ('IS', 'Isernia', 'Molise'),
  ('CE', 'Caserta', 'Campania'),
  ('BN', 'Benevento', 'Campania'),
  ('NA', 'Napoli', 'Campania'),
  ('AV', 'Avellino', 'Campania'),
  ('SA', 'Salerno', 'Campania'),
  ('FG', 'Foggia', 'Puglia'),
  ('BA', 'Bari', 'Puglia'),
  ('TA', 'Taranto', 'Puglia'),
  ('BR', 'Brindisi', 'Puglia'),
  ('LE', 'Lecce', 'Puglia'),
  ('BT', 'Barletta-Andria-Trani', 'Puglia'),
  ('PZ', 'Potenza', 'Basilicata'),
  ('MT', 'Matera', 'Basilicata'),
  ('CS', 'Cosenza', 'Calabria'),
  ('CZ', 'Catanzaro', 'Calabria'),
  ('RC', 'Reggio Calabria', 'Calabria'),
  ('KR', 'Crotone', 'Calabria'),
  ('VV', 'Vibo Valentia', 'Calabria'),
  ('TP', 'Trapani', 'Sicilia'),
  ('PA', 'Palermo', 'Sicilia'),
  ('ME', 'Messina', 'Sicilia'),
  ('AG', 'Agrigento', 'Sicilia'),
  ('CL', 'Caltanissetta', 'Sicilia'),
  ('EN', 'Enna', 'Sicilia'),
  ('CT', 'Catania', 'Sicilia'),
  ('RG', 'Ragusa', 'Sicilia'),
  ('SR', 'Siracusa', 'Sicilia'),
  ('SS', 'Sassari', 'Sardegna'),
  ('NU', 'Nuoro', 'Sardegna'),
  ('CA', 'Cagliari', 'Sardegna'),
  ('OR', 'Oristano', 'Sardegna'),
  ('SU', 'Sud Sardegna', 'Sardegna');

-- ---------------------------------------------------------------------------------------------------------
-- 2. Luogo e visibilità del profilo

alter table public.profiles
  add column country    text check (country ~ '^[A-Z]{2}$'),
  add column province   text references public.provinces,
  add column region     text,
  add column is_private boolean not null default true;

-- Nelle classifiche si mostra il nome: un profilo pubblico deve averne uno.
alter table public.profiles
  add constraint profiles_public_needs_name check (is_private or display_name is not null);

comment on column public.profiles.country is 'Nazione, ISO 3166-1 alpha-2 (es. IT). Vuota = non ancora indicata.';
comment on column public.profiles.province is 'Sigla della provincia: solo con country = IT.';
comment on column public.profiles.region is 'Regione, ricavata dalla provincia: non si scrive dal client.';
comment on column public.profiles.is_private is
  'true = fuori da chi lo segue il profilo non compare col nome nelle classifiche. Vale true per tutti finché l''utente non sceglie.';

-- La provincia esiste solo in Italia; la regione la decide la provincia, qualunque cosa mandi il client.
create function public.profile_place() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.country is distinct from 'IT' then
    new.province := null;
  end if;
  new.region := (select p.region from public.provinces p where p.code = new.province);
  return new;
end;
$$;

create trigger profiles_place before insert or update on public.profiles
  for each row execute function public.profile_place();

-- Alla registrazione l'app manda nazione e provincia nei metadati dell'utente (`signUp({ options: { data } })`):
-- il profilo nasce già col luogo. Valori mancanti o sbagliati non bloccano la registrazione: restano vuoti e
-- l'app li chiede di nuovo. `to_jsonb(new)`: funziona anche dove auth.users non ha la colonna dei metadati.
create or replace function public.create_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  meta jsonb := coalesce(to_jsonb(new) -> 'raw_user_meta_data', '{}'::jsonb);
  c text := upper(btrim(meta ->> 'country'));
  p text := upper(btrim(meta ->> 'province'));
begin
  if c is null or c !~ '^[A-Z]{2}$' then
    c := null;
  end if;
  if c is distinct from 'IT' or not exists (select 1 from public.provinces where code = p) then
    p := null;
  end if;
  insert into public.profiles (id, country, province) values (new.id, c, p);
  return new;
end;
$$;

-- ---------------------------------------------------------------------------------------------------------
-- 3. Chi segue chi (solo la tabella: le funzioni per seguire sono del ticket 39)

create table public.follows (
  follower   uuid not null references public.profiles on delete cascade,
  followee   uuid not null references public.profiles on delete cascade,
  -- 'pending' = richiesta a un profilo privato non ancora accettata
  status     text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (follower, followee),
  check (follower <> followee)
);
create index follows_followee_idx on public.follows (followee, status);

alter table public.follows enable row level security;

-- Una riga la vedono solo i due interessati. Nessuna policy di scrittura: per ora non si scrive dal client.
create policy "follows: read own" on public.follows
  for select to authenticated
  using ((select auth.uid()) in (follower, followee));

-- ---------------------------------------------------------------------------------------------------------
-- 4. Punti del livello

create table public.level_scores (
  user_id       uuid primary key default auth.uid() references public.profiles on delete cascade,
  -- complessivo (0–7000) e le 5 categorie (0–1400): fondamentali tirata e spinta, skill tirata e spinta, handbalance
  total         integer not null check (total between 0 and 7000),
  ft            integer not null check (ft between 0 and 1400),
  fs            integer not null check (fs between 0 and 1400),
  st            integer not null check (st between 0 and 1400),
  ss            integer not null check (ss between 0 and 1400),
  hb            integer not null check (hb between 0 and 1400),
  -- versione delle regole con cui l'app li ha calcolati (RULES_VERSION in src/lib/levels/v2/rules.ts)
  rules_version integer not null check (rules_version >= 1),
  updated_at    timestamptz not null default now(),
  -- copia di luogo e visibilità del profilo, tenuta allineata dai trigger qui sotto: serve agli indici delle
  -- classifiche, che non possono stare a cavallo di due tabelle. Il client non le decide.
  country       text,
  province      text,
  region        text,
  is_private    boolean not null default true,
  check (total = ft + fs + st + ss + hb)
);

alter table public.level_scores enable row level security;

-- Ognuno legge e scrive solo la sua riga. I punti degli altri si leggono solo con ranking().
create policy "own level score" on public.level_scores
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create function public.level_score_sync() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  select p.country, p.province, p.region, p.is_private
    into new.country, new.province, new.region, new.is_private
    from public.profiles p where p.id = new.user_id;
  if tg_op = 'UPDATE' then
    -- un'app rimasta in cache con regole più vecchie non sovrascrive i punti calcolati con quelle nuove
    if new.rules_version < old.rules_version then
      raise exception 'Punti calcolati con regole vecchie: aggiorna l''app e riprova' using errcode = '23514';
    end if;
    if (new.total, new.ft, new.fs, new.st, new.ss, new.hb, new.rules_version)
       is not distinct from (old.total, old.ft, old.fs, old.st, old.ss, old.hb, old.rules_version) then
      new.updated_at := old.updated_at;
      return new;
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger level_scores_sync before insert or update on public.level_scores
  for each row execute function public.level_score_sync();

-- Cambiando luogo o visibilità del profilo, la copia nei punti segue (la riscrive il trigger qui sopra).
create function public.profile_to_score() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.level_scores set user_id = user_id where user_id = new.id;
  return null;
end;
$$;

create trigger profiles_to_score after update on public.profiles
  for each row
  when ((old.country, old.province, old.region, old.is_private) is distinct from (new.country, new.province, new.region, new.is_private))
  execute function public.profile_to_score();

-- Partecipa alle classifiche chi ha almeno un punto. Complessivo per provincia, regione, nazione e mondo;
-- le categorie hanno un indice per il mondo e dentro un luogo usano quelli del luogo.
create index level_scores_province_idx on public.level_scores (province, total) where total > 0;
create index level_scores_region_idx on public.level_scores (region, total) where total > 0;
create index level_scores_country_idx on public.level_scores (country, total) where total > 0;
create index level_scores_total_idx on public.level_scores (total) where total > 0;
create index level_scores_ft_idx on public.level_scores (ft) where total > 0;
create index level_scores_fs_idx on public.level_scores (fs) where total > 0;
create index level_scores_st_idx on public.level_scores (st) where total > 0;
create index level_scores_ss_idx on public.level_scores (ss) where total > 0;
create index level_scores_hb_idx on public.level_scores (hb) where total > 0;

-- ---------------------------------------------------------------------------------------------------------
-- 5. Classifiche
--
-- ranking(ambito, metrica) → jsonb
--   ambito:  'amici' (chi seguo, più me) | 'provincia' | 'regione' | 'nazione' | 'mondo'
--   metrica: 'generale' (complessivo) | 'fondamentali-tirata' | 'fondamentali-spinta' | 'skill-tirata' |
--            'skill-spinta' | 'handbalance'
--   { scope, metric,
--     available:    false se l'ambito non vale per l'utente (provincia e regione fuori dall'Italia, luogo non indicato)
--     position:     posizione dell'utente (1 = primo; a pari punti stessa posizione); null se non ha ancora punti
--     participants: quanti hanno almeno un punto nell'ambito (contano anche i profili privati)
--     score:        i punti dell'utente in quella metrica
--     rows:         le prime 3 righe visibili e le 2 visibili sopra e sotto l'utente:
--                   [{ position, userId, name, score, me }] }
-- Visibili = profili pubblici, persone che seguo (richiesta accettata) e me. Un profilo privato che non seguo
-- conta nelle posizioni e nei partecipanti ma la sua riga non esce mai da qui.
create function public.ranking(p_scope text, p_metric text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  me constant uuid := auth.uid();
  friends constant text := '(select f.followee from public.follows f where f.follower = $1 and f.status = ''accepted'')';
  col text;
  cond text;
  place record;
  mine integer;
  participants integer;
  pos integer;
  shown jsonb;
begin
  if me is null then
    raise exception 'Serve l''accesso' using errcode = '28000';
  end if;
  col := case p_metric
    when 'generale' then 'total'
    when 'fondamentali-tirata' then 'ft'
    when 'fondamentali-spinta' then 'fs'
    when 'skill-tirata' then 'st'
    when 'skill-spinta' then 'ss'
    when 'handbalance' then 'hb'
  end;
  if col is null then
    raise exception 'Metrica sconosciuta: %', p_metric using errcode = '22023';
  end if;
  if p_scope not in ('amici', 'provincia', 'regione', 'nazione', 'mondo') then
    raise exception 'Ambito sconosciuto: %', p_scope using errcode = '22023';
  end if;

  select p.country, p.province, p.region into place from public.profiles p where p.id = me;
  cond := case p_scope
    when 'mondo' then 'true'
    when 'nazione' then 's.country = ' || quote_literal(place.country)
    when 'regione' then 's.region = ' || quote_literal(place.region)
    when 'provincia' then 's.province = ' || quote_literal(place.province)
    when 'amici' then 's.user_id in (select $1 union all ' || friends || ')'
  end;
  -- quote_literal(null) è null: l'utente non ha quel luogo
  if cond is null then
    return jsonb_build_object('scope', p_scope, 'metric', p_metric, 'available', false,
                              'position', null, 'participants', 0, 'score', null, 'rows', '[]'::jsonb);
  end if;

  execute format('select count(*) from public.level_scores s where s.total > 0 and %s', cond)
    into participants using me;
  execute format('select s.%I from public.level_scores s where s.user_id = $1 and s.total > 0 and %s', col, cond)
    into mine using me;
  if mine is not null then
    execute format('select 1 + count(*) from public.level_scores s where s.total > 0 and %s and s.%I > $2', cond, col)
      into pos using me, mine;
  end if;

  -- Candidati: i primi 3 pubblici, i 2 pubblici subito sopra e subito sotto di me, e tutti quelli che seguo (più
  -- me). Le prime 3 righe visibili e i vicini visibili stanno per forza lì dentro. A pari punti l'ordine è l'id.
  execute format($q$
    with cand as (
      (select s.user_id, s.%1$I as score from public.level_scores s
        where s.total > 0 and %2$s and not s.is_private
        order by s.%1$I desc, s.user_id limit 3)
      union
      (select s.user_id, s.%1$I from public.level_scores s
        where s.total > 0 and %2$s and not s.is_private
          and s.%1$I >= $2 and (s.%1$I > $2 or s.user_id < $1)
        order by s.%1$I, s.user_id desc limit 2)
      union
      (select s.user_id, s.%1$I from public.level_scores s
        where s.total > 0 and %2$s and not s.is_private
          and s.%1$I <= $2 and (s.%1$I < $2 or s.user_id > $1)
        order by s.%1$I desc, s.user_id limit 2)
      union
      (select s.user_id, s.%1$I from public.level_scores s
        where s.total > 0 and %2$s and s.user_id in (select $1 union all %3$s))
    ), ord as (
      select c.user_id, c.score, row_number() over (order by c.score desc, c.user_id) as rn from cand c
    ), pick as (
      select o.* from ord o
      where o.rn <= 3 or abs(o.rn - (select m.rn from ord m where m.user_id = $1)) <= 2
    )
    select coalesce(jsonb_agg(jsonb_build_object(
             'position', 1 + (select count(*) from public.level_scores s where s.total > 0 and %2$s and s.%1$I > k.score),
             'userId', k.user_id,
             'name', p.display_name,
             'score', k.score,
             'me', k.user_id = $1) order by k.rn), '[]'::jsonb)
    from pick k join public.profiles p on p.id = k.user_id
  $q$, col, cond, friends) into shown using me, mine;

  return jsonb_build_object('scope', p_scope, 'metric', p_metric, 'available', true,
                            'position', pos, 'participants', participants, 'score', mine, 'rows', shown);
end;
$$;

-- I 5 ambiti in una chiamata, senza le righe: serve ai riquadri (Amici, Provincia, Regione, Nazione, Mondo).
create function public.ranking_overview(p_metric text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_object_agg(s, public.ranking(s, p_metric) - 'rows')
  from unnest(array['amici', 'provincia', 'regione', 'nazione', 'mondo']) as s
$$;

revoke execute on function public.ranking(text, text), public.ranking_overview(text) from public, anon;
grant execute on function public.ranking(text, text), public.ranking_overview(text) to authenticated;
revoke execute on function public.profile_place(), public.level_score_sync(), public.profile_to_score() from public, anon, authenticated;
