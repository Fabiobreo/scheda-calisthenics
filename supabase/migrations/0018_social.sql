-- Home social (ticket 39): seguire come su Instagram, cerca persone, link d'invito, novità, allenamenti condivisi,
-- blocca e segnala.
--
-- - `follows` esiste dalla 0017 in sola lettura: qui arrivano le funzioni che la scrivono. Profilo pubblico =
--   "Segui" vale subito; profilo privato = richiesta che l'altro accetta o rifiuta. "Amici" = chi seguo io con
--   richiesta accettata (Fabio, 25 novembre 2026): essere seguiti non basta.
-- - Di un altro utente escono solo: nome e livello (la fascia, non i punti) per tutti; il luogo se è pubblico o se lo
--   seguo; le sue novità e i suoi allenamenti condivisi solo se lo seguo. Record e peso corporeo restano illeggibili:
--   di un record esce solo quello che l'autore condivide (voce, valore, data), mai il peso corporeo.
-- - Le novità le crea il database (trigger); le legge solo chi segue l'autore.
-- - Tutte le tabelle nuove si svuotano da sole quando un account viene eliminato (a cascata dal profilo).

-- ---------------------------------------------------------------------------------------------------------
-- 1. Condivisione dei record: interruttore del profilo (acceso: tra amici) e "non condividere" sul singolo record

alter table public.profiles add column share_records boolean not null default true;
comment on column public.profiles.share_records is
  'true = un record che migliora il punteggio diventa una novità per chi segue l''utente (ticket 39).';

alter table public.level_records add column shared boolean not null default true;
comment on column public.level_records.shared is 'false = questo record non va tra le novità degli amici.';

-- ---------------------------------------------------------------------------------------------------------
-- 2. Blocchi, segnalazioni, limite delle richieste

create table public.blocks (
  blocker    uuid not null references public.profiles on delete cascade,
  blocked    uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);
create index blocks_blocked_idx on public.blocks (blocked);

-- Segnalazioni: le scrive report_user(), le legge solo chi amministra il database (nessuna policy).
create table public.reports (
  reporter   uuid not null references public.profiles on delete cascade,
  reported   uuid not null references public.profiles on delete cascade,
  reason     text not null check (char_length(btrim(reason)) between 1 and 500),
  created_at timestamptz not null default now(),
  primary key (reporter, reported),
  check (reporter <> reported)
);

-- Una riga per ogni "Segui" andato a buon fine: serve al limite giornaliero contro lo spam di richieste.
create table public.follow_log (
  user_id uuid not null references auth.users on delete cascade,
  at      timestamptz not null default now()
);
create index follow_log_user_idx on public.follow_log (user_id, at desc);

alter table public.blocks enable row level security;
alter table public.reports enable row level security;
alter table public.follow_log enable row level security;

-- Chi ho bloccato lo vedo solo io; chi mi ha bloccato non lo vedo.
create policy "blocks: read own" on public.blocks
  for select to authenticated
  using (blocker = (select auth.uid()));

-- true se tra l'utente corrente e `other` c'è un blocco, in un verso o nell'altro.
create function public.is_blocked_with(other uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.blocks b
    where (b.blocker = auth.uid() and b.blocked = other) or (b.blocker = other and b.blocked = auth.uid())
  );
$$;

-- Le persone che seguo con richiesta accettata: gli "amici".
create function public.my_friends() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select f.followee from public.follows f where f.follower = auth.uid() and f.status = 'accepted';
$$;

-- ---------------------------------------------------------------------------------------------------------
-- 3. Seguire

-- Massimo di "Segui" in 24 ore.
create function public.follow_daily_limit() returns integer
language sql immutable set search_path = '' as $$ select 30 $$;

-- Segue `p_user`: 'accepted' se il suo profilo è pubblico, 'pending' (richiesta) se è privato. Se lo seguo già o
-- la richiesta è già partita, restituisce lo stato che c'è. Un blocco, in un verso o nell'altro, risponde come un
-- profilo che non esiste.
create function public.follow_user(p_user uuid) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare
  me constant uuid := auth.uid();
  st text;
  target_private boolean;
begin
  if me is null then
    raise exception 'Serve l''accesso' using errcode = '28000';
  end if;
  if p_user = me then
    raise exception 'Non puoi seguire te stesso' using errcode = 'P0001';
  end if;
  select f.status into st from public.follows f where f.follower = me and f.followee = p_user;
  if st is not null then
    return st;
  end if;
  select p.is_private into target_private from public.profiles p where p.id = p_user and p.display_name is not null;
  if target_private is null or public.is_blocked_with(p_user) then
    raise exception 'Profilo non trovato' using errcode = 'P0002';
  end if;
  -- chi riceve la richiesta deve poter leggere chi gliela manda
  if not exists (select 1 from public.profiles p where p.id = me and p.display_name is not null) then
    raise exception 'Per seguire qualcuno scegli prima il tuo nome in Account' using errcode = 'P0001';
  end if;
  if (select count(*) from public.follow_log l where l.user_id = me and l.at > now() - interval '1 day') >= public.follow_daily_limit() then
    raise exception 'Hai raggiunto il limite di richieste per oggi: riprova domani' using errcode = 'P0001';
  end if;
  insert into public.follow_log (user_id) values (me);
  st := case when target_private then 'pending' else 'accepted' end;
  insert into public.follows (follower, followee, status) values (me, p_user, st);
  return st;
end;
$$;

-- Smetto di seguire, o ritiro una richiesta in attesa.
create function public.unfollow_user(p_user uuid) returns void
language sql volatile security definer set search_path = '' as $$
  delete from public.follows where follower = auth.uid() and followee = p_user;
$$;

-- Accetto la richiesta di `p_follower`.
create function public.accept_follow(p_follower uuid) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  update public.follows set status = 'accepted'
  where follower = p_follower and followee = auth.uid() and status = 'pending';
  if not found then
    raise exception 'Richiesta non trovata' using errcode = 'P0002';
  end if;
end;
$$;

-- Rifiuto la richiesta di `p_follower`: sparisce, senza avvisarlo.
create function public.reject_follow(p_follower uuid) returns void
language sql volatile security definer set search_path = '' as $$
  delete from public.follows where follower = p_follower and followee = auth.uid() and status = 'pending';
$$;

-- Tolgo qualcuno da chi mi segue.
create function public.remove_follower(p_follower uuid) returns void
language sql volatile security definer set search_path = '' as $$
  delete from public.follows where follower = p_follower and followee = auth.uid();
$$;

-- Blocco: non ci seguiamo più, non mi trova nella ricerca, non può seguirmi, nelle classifiche non ci vediamo.
create function public.block_user(p_user uuid) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  me constant uuid := auth.uid();
begin
  if me is null then
    raise exception 'Serve l''accesso' using errcode = '28000';
  end if;
  if p_user = me or not exists (select 1 from public.profiles p where p.id = p_user) then
    raise exception 'Profilo non trovato' using errcode = 'P0002';
  end if;
  insert into public.blocks (blocker, blocked) values (me, p_user) on conflict do nothing;
  delete from public.follows where (follower = me and followee = p_user) or (follower = p_user and followee = me);
end;
$$;

create function public.unblock_user(p_user uuid) returns void
language sql volatile security definer set search_path = '' as $$
  delete from public.blocks where blocker = auth.uid() and blocked = p_user;
$$;

-- Segnalazione di una persona, con il motivo: una per coppia, riscrivibile.
create function public.report_user(p_user uuid, p_reason text) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  me constant uuid := auth.uid();
begin
  if me is null then
    raise exception 'Serve l''accesso' using errcode = '28000';
  end if;
  if p_user = me or not exists (select 1 from public.profiles p where p.id = p_user) then
    raise exception 'Profilo non trovato' using errcode = 'P0002';
  end if;
  insert into public.reports (reporter, reported, reason) values (me, p_user, btrim(p_reason))
    on conflict (reporter, reported) do update set reason = excluded.reason, created_at = now();
end;
$$;

-- Da privato a pubblico le richieste in attesa si accettano. Da pubblico a privato chi segue resta.
create function public.profile_went_public() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.follows set status = 'accepted' where followee = new.id and status = 'pending';
  return null;
end;
$$;

create trigger profiles_went_public after update on public.profiles
  for each row when (old.is_private and not new.is_private)
  execute function public.profile_went_public();

-- ---------------------------------------------------------------------------------------------------------
-- 4. Che cosa si vede di una persona

-- Fascia del livello complessivo: 0 = Base … 5 = Leggenda. Sono le soglie di BANDS.complessivo in
-- src/lib/levels/v2/rules.ts: un test (src/features/home/social.test.ts) controlla che coincidano. Serve a mostrare
-- il livello di una persona senza far uscire i suoi punti.
create function public.level_band(p_total integer) returns integer
language sql immutable set search_path = '' as $$
  select case
    when coalesce(p_total, 0) <= 300 then 0
    when p_total <= 800 then 1
    when p_total <= 2500 then 2
    when p_total <= 4000 then 3
    when p_total <= 5500 then 4
    else 5
  end;
$$;

-- La scheda di una persona come la può vedere l'utente corrente: nome e fascia del livello sempre; il luogo solo se
-- il profilo è pubblico o se lo seguo (richiesta accettata). `relation`: io verso di lei; `followsMe`: lei verso di me.
-- Funzione interna: la usano ricerca, elenchi e inviti.
create function public.person_card(p_user uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'userId', p.id,
    'name', p.display_name,
    'band', public.level_band(s.total),
    'isPrivate', p.is_private,
    'relation', coalesce(mine.status, 'none'),
    'followsMe', coalesce(theirs.status, 'none'),
    'country', case when v.visible then p.country end,
    'province', case when v.visible then p.province end,
    'region', case when v.visible then p.region end)
  from public.profiles p
  left join public.level_scores s on s.user_id = p.id
  left join public.follows mine on mine.follower = auth.uid() and mine.followee = p.id
  left join public.follows theirs on theirs.follower = p.id and theirs.followee = auth.uid()
  cross join lateral (select (not p.is_private or coalesce(mine.status, '') = 'accepted') as visible) v
  where p.id = p_user;
$$;

-- Ricerca per nome tra tutti i profili che hanno un nome, tranne me e chi è bloccato (in un verso o nell'altro).
-- Almeno 2 caratteri, al massimo 20 risultati: prima i nomi che iniziano così, poi quelli che lo contengono.
create function public.search_people(p_query text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  me constant uuid := auth.uid();
  q constant text := btrim(coalesce(p_query, ''));
  esc text;
begin
  if me is null then
    raise exception 'Serve l''accesso' using errcode = '28000';
  end if;
  if char_length(q) < 2 or char_length(q) > 60 then
    return '[]'::jsonb;
  end if;
  esc := replace(replace(replace(q, '\', '\\'), '%', '\%'), '_', '\_');
  return (
    select coalesce(jsonb_agg(public.person_card(x.id) order by x.pre desc, x.name, x.id), '[]'::jsonb)
    from (
      select p.id, lower(p.display_name) as name, (p.display_name ilike esc || '%') as pre
      from public.profiles p
      where p.display_name ilike '%' || esc || '%'
        and p.id <> me
        and not exists (
          select 1 from public.blocks b
          where (b.blocker = me and b.blocked = p.id) or (b.blocker = p.id and b.blocked = me))
      order by pre desc, name, p.id
      limit 20
    ) x
  );
end;
$$;

-- Le mie persone: richieste ricevute, chi seguo (anche in attesa), chi mi segue, chi ho bloccato.
create function public.my_people() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  me constant uuid := auth.uid();
begin
  if me is null then
    raise exception 'Serve l''accesso' using errcode = '28000';
  end if;
  return jsonb_build_object(
    'requests', (select coalesce(jsonb_agg(public.person_card(f.follower) order by f.created_at desc, f.follower), '[]'::jsonb)
                 from public.follows f where f.followee = me and f.status = 'pending'),
    'following', (select coalesce(jsonb_agg(public.person_card(f.followee) order by f.created_at desc, f.followee), '[]'::jsonb)
                  from public.follows f where f.follower = me),
    'followers', (select coalesce(jsonb_agg(public.person_card(f.follower) order by f.created_at desc, f.follower), '[]'::jsonb)
                  from public.follows f where f.followee = me and f.status = 'accepted'),
    'blocked', (select coalesce(jsonb_agg(jsonb_build_object('userId', p.id, 'name', p.display_name) order by b.created_at desc, p.id), '[]'::jsonb)
                from public.blocks b join public.profiles p on p.id = b.blocked where b.blocker = me));
end;
$$;

-- ---------------------------------------------------------------------------------------------------------
-- 5. Link d'invito per farsi seguire (come quello del trainer, 0007): un codice per utente, rigenerabile.
--    Aprire il link mostra chi è; seguire passa comunque da follow_user(), quindi un profilo privato riceve una
--    richiesta anche da chi arriva dal suo link.

create table public.follow_invites (
  user_id    uuid primary key references public.profiles on delete cascade,
  code       text not null unique check (code ~ '^[A-Z2-9]{8}$'),
  created_at timestamptz not null default now()
);
alter table public.follow_invites enable row level security;
create policy "follow invites: read own" on public.follow_invites
  for select to authenticated
  using (user_id = (select auth.uid()));

create function public.rotate_follow_code() returns text
language plpgsql volatile security definer set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  new_code text;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and display_name is not null) then
    raise exception 'Per invitare qualcuno scegli prima il tuo nome in Account' using errcode = 'P0001';
  end if;
  loop
    select string_agg(substr(alphabet, 1 + get_byte(r.b, i) % length(alphabet), 1), '' order by i)
      into new_code
      from (select extensions.gen_random_bytes(8) as b) r, generate_series(0, 7) as i;
    exit when not exists (select 1 from public.follow_invites where code = new_code);
  end loop;
  insert into public.follow_invites (user_id, code) values (auth.uid(), new_code)
    on conflict (user_id) do update set code = excluded.code, created_at = now();
  return new_code;
end;
$$;

-- Chi c'è dietro un codice: la sua scheda, o null. Un codice sbagliato conta tra i tentativi falliti (gli stessi
-- degli inviti dei trainer: 10 all'ora).
create function public.preview_follow_invite(invite_code text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  who uuid;
begin
  if auth.uid() is null then
    raise exception 'Serve l''accesso' using errcode = '28000';
  end if;
  perform public.check_invite_attempts();
  select i.user_id into who
  from public.follow_invites i
  join public.profiles p on p.id = i.user_id
  where i.code = upper(btrim(invite_code)) and p.display_name is not null
    and not public.is_blocked_with(i.user_id);
  if who is null then
    insert into public.invite_failures (user_id) values (auth.uid());
    return null;
  end if;
  return public.person_card(who);
end;
$$;

-- ---------------------------------------------------------------------------------------------------------
-- 6. Allenamenti condivisi: una copia in sola lettura (nome, giorno, esercizi con serie e valori). La leggono
--    l'autore e chi lo segue; non si modifica, si può solo togliere.

create table public.shared_workouts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references public.profiles on delete cascade,
  name       text not null check (char_length(btrim(name)) between 1 and 60),
  date       date not null,
  -- [{ name, catalogId, measure, type, rest, sets: [{ weight, reps, seconds }] }]
  items      jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 40
                                   and octet_length(items::text) <= 20000),
  created_at timestamptz not null default now()
);
create index shared_workouts_user_idx on public.shared_workouts (user_id, created_at desc);

alter table public.shared_workouts enable row level security;

create policy "shared workouts: read own and friends" on public.shared_workouts
  for select to authenticated
  using (user_id = (select auth.uid()) or user_id in (select public.my_friends()));
create policy "shared workouts: insert own" on public.shared_workouts
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "shared workouts: delete own" on public.shared_workouts
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- Al massimo 10 condivisioni in 24 ore.
create function public.check_shared_workout() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.shared_workouts w where w.user_id = new.user_id and w.created_at > now() - interval '1 day') >= 10 then
    raise exception 'Hai già condiviso 10 allenamenti oggi: riprova domani' using errcode = 'P0001';
  end if;
  new.name := btrim(new.name);
  new.created_at := now();
  return new;
end;
$$;

create trigger shared_workouts_check before insert on public.shared_workouts
  for each row execute function public.check_shared_workout();

-- ---------------------------------------------------------------------------------------------------------
-- 7. Novità

create table public.feed_events (
  id         uuid primary key default gen_random_uuid(),
  actor      uuid not null references public.profiles on delete cascade,
  kind       text not null check (kind in ('record', 'workout', 'overtake')),
  -- a chi è rivolta: null = a tutti quelli che seguono l'autore; un sorpasso è solo per chi è stato superato
  target     uuid references public.profiles on delete cascade,
  -- record e allenamento da cui nasce: tolti quelli, sparisce la novità
  record_id  uuid references public.level_records on delete cascade,
  workout_id uuid references public.shared_workouts on delete cascade,
  -- record:   { subId, stage, value, date, gained }  (mai il peso corporeo)
  -- workout:  { name, date, exercises }
  -- overtake: { metric }
  payload    jsonb not null default '{}'::jsonb,
  -- clock_timestamp: più novità nate nella stessa transazione restano in ordine
  created_at timestamptz not null default clock_timestamp(),
  check ((kind = 'record') = (record_id is not null)),
  check ((kind = 'workout') = (workout_id is not null)),
  check ((kind = 'overtake') = (target is not null))
);
create index feed_events_actor_idx on public.feed_events (actor, created_at desc);
create unique index feed_events_record_idx on public.feed_events (record_id) where record_id is not null;
create unique index feed_events_workout_idx on public.feed_events (workout_id) where workout_id is not null;
create unique index feed_events_overtake_idx on public.feed_events (actor, target, (payload ->> 'metric')) where kind = 'overtake';
create index feed_events_target_idx on public.feed_events (target) where target is not null;

-- Fino a quando l'utente ha letto le novità: una riga per utente.
create table public.feed_reads (
  user_id uuid primary key references public.profiles on delete cascade,
  read_at timestamptz not null
);

-- L'ultimo record toccato da ogni utente: quando i suoi punti salgono, è quello che ha migliorato il punteggio.
-- (I punti li calcola e li scrive l'app subito dopo il record: il database non conosce le formule.)
create table public.record_candidates (
  user_id   uuid primary key references public.profiles on delete cascade,
  record_id uuid not null references public.level_records on delete cascade
);

alter table public.feed_events enable row level security;
alter table public.feed_reads enable row level security;
alter table public.record_candidates enable row level security;

-- Le novità le legge l'autore e chi lo segue (richiesta accettata); un sorpasso solo chi è stato superato.
-- Nessuna policy di scrittura: nascono dai trigger.
create policy "feed: read friends" on public.feed_events
  for select to authenticated
  using ((actor = (select auth.uid()) and target is null)
         or (actor in (select public.my_friends()) and (target is null or target = (select auth.uid()))));

create policy "feed reads: read own" on public.feed_reads
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Un record nuovo o corretto diventa il candidato; se non è (più) condiviso la sua novità sparisce, se cambia il
-- valore la novità lo segue.
create function public.record_touched() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if not new.shared then
      delete from public.feed_events where record_id = new.id;
    else
      update public.feed_events
      set payload = payload || jsonb_build_object('subId', new.sub_id, 'stage', new.stage, 'value', new.value, 'date', new.date)
      where record_id = new.id;
    end if;
  end if;
  insert into public.record_candidates (user_id, record_id) values (new.user_id, new.id)
    on conflict (user_id) do update set record_id = excluded.record_id;
  return null;
end;
$$;

create trigger level_records_touched after insert or update on public.level_records
  for each row execute function public.record_touched();

-- Quando i punti di un utente cambiano:
-- - se il complessivo sale e l'ultimo record toccato è condivisibile, nasce la novità "record";
-- - chi lo segue e viene superato in una classifica riceve la novità "sorpasso" (una per persona: prima il
--   Generale, poi le categorie nell'ordine delle pastiglie).
-- Un ricalcolo con regole nuove (rules_version) sposta i punti di tutti senza che nessuno abbia fatto niente: non
-- crea novità.
create function public.score_events() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  o_total integer := 0;
  o_ft integer := 0;
  o_fs integer := 0;
  o_st integer := 0;
  o_ss integer := 0;
  o_hb integer := 0;
  rec record;
begin
  if tg_op = 'UPDATE' then
    if new.rules_version <> old.rules_version then
      return null;
    end if;
    o_total := old.total; o_ft := old.ft; o_fs := old.fs; o_st := old.st; o_ss := old.ss; o_hb := old.hb;
  end if;

  if new.total > o_total then
    select r.id, r.sub_id, r.stage, r.value, r.date, r.shared into rec
    from public.record_candidates c
    join public.level_records r on r.id = c.record_id
    where c.user_id = new.user_id;
    if found then
      delete from public.record_candidates where user_id = new.user_id;
      if rec.shared and (select p.share_records from public.profiles p where p.id = new.user_id) then
        insert into public.feed_events (actor, kind, record_id, payload)
        values (new.user_id, 'record', rec.id,
                jsonb_build_object('subId', rec.sub_id, 'stage', rec.stage, 'value', rec.value, 'date', rec.date, 'gained', new.total - o_total))
        on conflict (record_id) where record_id is not null
        do update set payload = excluded.payload;
      end if;
    end if;
  end if;

  if (new.total, new.ft, new.fs, new.st, new.ss, new.hb) is distinct from (o_total, o_ft, o_fs, o_st, o_ss, o_hb) then
    insert into public.feed_events (actor, kind, target, payload)
    select new.user_id, 'overtake', x.follower, jsonb_build_object('metric', x.metric)
    from (
      select f.follower,
             case
               when s.total > 0 and o_total <= s.total and s.total < new.total then 'generale'
               when s.hb > 0 and o_hb <= s.hb and s.hb < new.hb then 'handbalance'
               when s.ss > 0 and o_ss <= s.ss and s.ss < new.ss then 'skill-spinta'
               when s.fs > 0 and o_fs <= s.fs and s.fs < new.fs then 'fondamentali-spinta'
               when s.st > 0 and o_st <= s.st and s.st < new.st then 'skill-tirata'
               when s.ft > 0 and o_ft <= s.ft and s.ft < new.ft then 'fondamentali-tirata'
             end as metric
      from public.follows f
      join public.level_scores s on s.user_id = f.follower
      where f.followee = new.user_id and f.status = 'accepted' and s.total > 0
    ) x
    where x.metric is not null
    on conflict (actor, target, (payload ->> 'metric')) where kind = 'overtake'
    do update set created_at = clock_timestamp();
  end if;
  return null;
end;
$$;

create trigger level_scores_events after insert or update on public.level_scores
  for each row execute function public.score_events();

-- Un allenamento condiviso diventa una novità.
create function public.shared_workout_event() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.feed_events (actor, kind, workout_id, payload)
  values (new.user_id, 'workout', new.id,
          jsonb_build_object('name', new.name, 'date', new.date, 'exercises', jsonb_array_length(new.items)));
  return null;
end;
$$;

create trigger shared_workouts_event after insert on public.shared_workouts
  for each row execute function public.shared_workout_event();

-- Le novità delle persone che seguo, dalla più recente: { unread, events: [{ id, kind, actorId, actorName, payload,
-- workoutId, createdAt, unread }] }. `unread` conta tutte quelle arrivate dopo l'ultima lettura, non solo quelle
-- restituite. Smettendo di seguire qualcuno le sue novità non escono più da qui.
create function public.feed(p_limit integer default 30) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  me constant uuid := auth.uid();
  seen timestamptz;
begin
  if me is null then
    raise exception 'Serve l''accesso' using errcode = '28000';
  end if;
  select r.read_at into seen from public.feed_reads r where r.user_id = me;
  seen := coalesce(seen, '-infinity'::timestamptz);
  return jsonb_build_object(
    'unread', (
      select count(*) from public.feed_events e
      where e.actor in (select f.followee from public.follows f where f.follower = me and f.status = 'accepted')
        and (e.target is null or e.target = me) and e.created_at > seen),
    'events', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'id', e.id, 'kind', e.kind, 'actorId', e.actor, 'actorName', p.display_name, 'payload', e.payload,
               'workoutId', e.workout_id, 'createdAt', e.created_at, 'unread', e.created_at > seen)
             order by e.created_at desc, e.id), '[]'::jsonb)
      from (
        select e.* from public.feed_events e
        where e.actor in (select f.followee from public.follows f where f.follower = me and f.status = 'accepted')
          and (e.target is null or e.target = me)
        order by e.created_at desc, e.id
        limit least(greatest(coalesce(p_limit, 30), 1), 100)
      ) e
      join public.profiles p on p.id = e.actor));
end;
$$;

-- Ho letto le novità fino a ora.
create function public.feed_mark_read() returns void
language sql volatile security definer set search_path = '' as $$
  insert into public.feed_reads (user_id, read_at) values (auth.uid(), clock_timestamp())
    on conflict (user_id) do update set read_at = excluded.read_at;
$$;

-- ---------------------------------------------------------------------------------------------------------
-- 8. Classifiche: come nella 0017, ma tra due persone separate da un blocco le righe non si vedono (contano come
--    quelle di un profilo privato: nelle posizioni sì, col nome no). Cambiano solo le tre letture dei profili
--    pubblici (%4$s); chi seguo non può essere bloccato, perché il blocco toglie il seguire.

create or replace function public.ranking(p_scope text, p_metric text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  me constant uuid := auth.uid();
  friends constant text := '(select f.followee from public.follows f where f.follower = $1 and f.status = ''accepted'')';
  unblocked constant text := 'not exists (select 1 from public.blocks b where (b.blocker = $1 and b.blocked = s.user_id) or (b.blocker = s.user_id and b.blocked = $1))';
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
        where s.total > 0 and %2$s and not s.is_private and %4$s
        order by s.%1$I desc, s.user_id limit 3)
      union
      (select s.user_id, s.%1$I from public.level_scores s
        where s.total > 0 and %2$s and not s.is_private and %4$s
          and s.%1$I >= $2 and (s.%1$I > $2 or s.user_id < $1)
        order by s.%1$I, s.user_id desc limit 2)
      union
      (select s.user_id, s.%1$I from public.level_scores s
        where s.total > 0 and %2$s and not s.is_private and %4$s
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
  $q$, col, cond, friends, unblocked) into shown using me, mine;

  return jsonb_build_object('scope', p_scope, 'metric', p_metric, 'available', true,
                            'position', pos, 'participants', participants, 'score', mine, 'rows', shown);
end;
$$;

-- ---------------------------------------------------------------------------------------------------------
-- 9. Chi può chiamare che cosa

revoke execute on function
  public.is_blocked_with(uuid), public.my_friends(), public.follow_user(uuid), public.unfollow_user(uuid),
  public.accept_follow(uuid), public.reject_follow(uuid), public.remove_follower(uuid), public.block_user(uuid),
  public.unblock_user(uuid), public.report_user(uuid, text), public.search_people(text), public.my_people(),
  public.rotate_follow_code(), public.preview_follow_invite(text), public.feed(integer), public.feed_mark_read()
  from public, anon;
grant execute on function
  public.is_blocked_with(uuid), public.my_friends(), public.follow_user(uuid), public.unfollow_user(uuid),
  public.accept_follow(uuid), public.reject_follow(uuid), public.remove_follower(uuid), public.block_user(uuid),
  public.unblock_user(uuid), public.report_user(uuid, text), public.search_people(text), public.my_people(),
  public.rotate_follow_code(), public.preview_follow_invite(text), public.feed(integer), public.feed_mark_read()
  to authenticated;
-- funzioni interne e dei trigger: non si chiamano dal client
revoke execute on function
  public.person_card(uuid), public.follow_daily_limit(), public.profile_went_public(), public.check_shared_workout(),
  public.record_touched(), public.score_events(), public.shared_workout_event()
  from public, anon, authenticated;
