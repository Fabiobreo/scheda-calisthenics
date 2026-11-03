-- Trainer e atleti.
-- Trainer è una funzione dell'account (profiles.is_trainer), non un tipo di account: chiunque la attiva da Account.
-- Il trainer condivide un codice d'invito; l'atleta lo usa e conferma, e da lì il trainer legge i suoi dati
-- (esercizi, registrazioni, programma) finché uno dei due non chiude il collegamento. I dati restano dell'atleta.
-- Prima versione: un solo trainer attivo per atleta.

alter table public.profiles add column is_trainer boolean not null default false;

create table public.coach_links (
  id          uuid primary key default gen_random_uuid(),
  trainer_id  uuid not null references public.profiles on delete cascade,
  athlete_id  uuid not null references public.profiles on delete cascade,
  status      text not null default 'active' check (status in ('active', 'ended')),
  created_at  timestamptz not null default now(),
  ended_at    timestamptz,
  ended_by    uuid references public.profiles on delete set null,
  check (trainer_id <> athlete_id),
  check ((status = 'ended') = (ended_at is not null))
);
-- un solo trainer attivo per atleta; lo storico dei collegamenti chiusi resta
create unique index coach_links_one_active_trainer on public.coach_links (athlete_id) where status = 'active';
create index coach_links_trainer_idx on public.coach_links (trainer_id) where status = 'active';

-- Un codice per trainer: generarne uno nuovo invalida il precedente.
create table public.trainer_invites (
  trainer_id uuid primary key references public.profiles on delete cascade,
  code       text not null unique check (code ~ '^[A-Z2-9]{8}$'),
  created_at timestamptz not null default now()
);

-- Codici sbagliati provati da ogni utente: oltre una soglia all'ora gli inviti si bloccano, così i codici non si
-- indovinano a forza di tentativi. Nessuna policy: ci scrivono e leggono solo le funzioni qui sotto.
create table public.invite_failures (
  user_id uuid not null references auth.users on delete cascade,
  at      timestamptz not null default now()
);
create index invite_failures_user_idx on public.invite_failures (user_id, at desc);

alter table public.coach_links enable row level security;
alter table public.trainer_invites enable row level security;
alter table public.invite_failures enable row level security;

-- Lettura sola: collegamenti e codici cambiano soltanto tramite le funzioni qui sotto.
create policy "links: read own" on public.coach_links
  for select to authenticated
  using ((select auth.uid()) in (trainer_id, athlete_id));

create policy "invites: read own" on public.trainer_invites
  for select to authenticated
  using (trainer_id = (select auth.uid()));

-- true se l'utente corrente è trainer attivo dell'atleta. security definer: legge coach_links e profiles
-- senza passare dalle loro policy (niente ricorsione) ed è veloce da usare dentro le policy delle altre tabelle.
create function public.is_coach_of(athlete uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.coach_links l
    join public.profiles t on t.id = l.trainer_id
    where l.trainer_id = auth.uid() and l.athlete_id = athlete and l.status = 'active' and t.is_trainer
  );
$$;

-- Gli atleti che l'utente corrente segue ora come trainer. Nelle policy si usa come `user_id in (select my_athletes())`:
-- il sottoinsieme si calcola una volta per query, non riga per riga come farebbe is_coach_of(user_id).
create function public.my_athletes() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select l.athlete_id
  from public.coach_links l
  join public.profiles t on t.id = l.trainer_id
  where l.trainer_id = auth.uid() and l.status = 'active' and t.is_trainer;
$$;

-- true se l'utente corrente e `other` sono collegati (in un verso o nell'altro): servono i nomi a vicenda.
create function public.is_linked_with(other uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.coach_links l
    where l.status = 'active'
      and ((l.trainer_id = auth.uid() and l.athlete_id = other) or (l.athlete_id = auth.uid() and l.trainer_id = other))
  );
$$;

-- Il trainer legge (solo legge) i dati dei suoi atleti. Le scritture restano quelle delle policy "own ...".
create policy "trainer reads athlete exercises" on public.exercises
  for select to authenticated using (user_id in (select public.my_athletes()));
create policy "trainer reads athlete entries" on public.entries
  for select to authenticated using (user_id in (select public.my_athletes()));
create policy "trainer reads athlete plan" on public.plan_items
  for select to authenticated using (user_id in (select public.my_athletes()));
create policy "linked profiles: read" on public.profiles
  for select to authenticated using (public.is_linked_with(id));

-- Controlla il limite dei tentativi sbagliati (10 all'ora) dell'utente corrente.
create function public.check_invite_attempts() returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if (select count(*) from public.invite_failures where user_id = auth.uid() and at > now() - interval '1 hour') >= 10 then
    raise exception 'Troppi codici sbagliati: riprova tra un''ora' using errcode = 'P0001';
  end if;
end;
$$;

-- Codice nuovo per il trainer corrente: 8 caratteri senza quelli che si confondono (0/O, 1/I/L),
-- da byte casuali crittografici (random() è prevedibile).
create function public.rotate_invite_code() returns text
language plpgsql volatile security definer set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  new_code text;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_trainer) then
    raise exception 'Attiva la modalità trainer per invitare atleti' using errcode = 'P0001';
  end if;
  loop
    select string_agg(substr(alphabet, 1 + get_byte(r.b, i) % length(alphabet), 1), '' order by i)
      into new_code
      from (select extensions.gen_random_bytes(8) as b) r, generate_series(0, 7) as i;
    exit when not exists (select 1 from public.trainer_invites where code = new_code);
  end loop;
  insert into public.trainer_invites (trainer_id, code) values (auth.uid(), new_code)
    on conflict (trainer_id) do update set code = excluded.code, created_at = now();
  return new_code;
end;
$$;

-- Chi c'è dietro un codice, per far confermare l'atleta prima di collegarsi. Mostra solo il nome.
-- Un codice sbagliato non dà errore (niente righe) ma conta come tentativo fallito.
create function public.preview_invite(invite_code text) returns table (trainer_id uuid, trainer_name text)
language plpgsql volatile security definer set search_path = '' as $$
begin
  perform public.check_invite_attempts();
  return query
    select p.id, p.display_name
    from public.trainer_invites i
    join public.profiles p on p.id = i.trainer_id
    where i.code = upper(btrim(invite_code)) and p.is_trainer and p.id <> auth.uid();
  if not found then
    insert into public.invite_failures (user_id) values (auth.uid());
  end if;
end;
$$;

-- L'atleta corrente si collega al trainer del codice. Restituisce l'id del collegamento,
-- oppure null se il codice non vale (senza errore: il tentativo fallito deve restare registrato).
create function public.accept_invite(invite_code text) returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare
  t_id uuid;
  current_link public.coach_links;
  link_id uuid;
begin
  perform public.check_invite_attempts();
  select i.trainer_id into t_id
  from public.trainer_invites i
  join public.profiles p on p.id = i.trainer_id
  where i.code = upper(btrim(invite_code)) and p.is_trainer;
  if t_id is null then
    insert into public.invite_failures (user_id) values (auth.uid());
    return null;
  end if;
  if t_id = auth.uid() then
    raise exception 'Non puoi allenare te stesso' using errcode = 'P0001';
  end if;

  select * into current_link from public.coach_links where athlete_id = auth.uid() and status = 'active';
  if current_link.id is not null then
    if current_link.trainer_id = t_id then
      return current_link.id; -- già collegati: niente da fare
    end if;
    raise exception 'Hai già un trainer: scollegati prima di sceglierne un altro' using errcode = 'P0001';
  end if;

  insert into public.coach_links (trainer_id, athlete_id) values (t_id, auth.uid()) returning id into link_id;
  return link_id;
end;
$$;

-- Chiude un collegamento: lo possono fare sia il trainer sia l'atleta. Da quel momento il trainer non legge più nulla.
create function public.end_coach_link(link uuid) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  update public.coach_links
  set status = 'ended', ended_at = now(), ended_by = auth.uid()
  where id = link and status = 'active' and auth.uid() in (trainer_id, athlete_id);
  if not found then
    raise exception 'Collegamento non trovato' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function public.is_coach_of(uuid), public.my_athletes(), public.is_linked_with(uuid), public.rotate_invite_code(),
  public.preview_invite(text), public.accept_invite(text), public.end_coach_link(uuid) from public, anon;
grant execute on function public.is_coach_of(uuid), public.my_athletes(), public.is_linked_with(uuid), public.rotate_invite_code(),
  public.preview_invite(text), public.accept_invite(text), public.end_coach_link(uuid) to authenticated;
revoke execute on function public.check_invite_attempts() from public, anon, authenticated;
