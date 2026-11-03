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

alter table public.coach_links enable row level security;
alter table public.trainer_invites enable row level security;

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
  for select to authenticated using (public.is_coach_of(user_id));
create policy "trainer reads athlete entries" on public.entries
  for select to authenticated using (public.is_coach_of(user_id));
create policy "trainer reads athlete plan" on public.plan_items
  for select to authenticated using (public.is_coach_of(user_id));
create policy "linked profiles: read" on public.profiles
  for select to authenticated using (public.is_linked_with(id));

-- Codice nuovo per il trainer corrente: 8 caratteri senza quelli che si confondono (0/O, 1/I/L).
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
    select string_agg(substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1), '')
      into new_code from generate_series(1, 8);
    exit when not exists (select 1 from public.trainer_invites where code = new_code);
  end loop;
  insert into public.trainer_invites (trainer_id, code) values (auth.uid(), new_code)
    on conflict (trainer_id) do update set code = excluded.code, created_at = now();
  return new_code;
end;
$$;

-- Chi c'è dietro un codice, per far confermare l'atleta prima di collegarsi. Mostra solo il nome.
create function public.preview_invite(invite_code text) returns table (trainer_id uuid, trainer_name text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.display_name
  from public.trainer_invites i
  join public.profiles p on p.id = i.trainer_id
  where i.code = upper(btrim(invite_code)) and p.is_trainer and p.id <> auth.uid();
$$;

-- L'atleta corrente si collega al trainer del codice. Restituisce l'id del collegamento.
create function public.accept_invite(invite_code text) returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare
  t_id uuid;
  current_link public.coach_links;
  link_id uuid;
begin
  select i.trainer_id into t_id
  from public.trainer_invites i
  join public.profiles p on p.id = i.trainer_id
  where i.code = upper(btrim(invite_code)) and p.is_trainer;
  if t_id is null then
    raise exception 'Codice non valido o scaduto' using errcode = 'P0002';
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

revoke execute on function public.is_coach_of(uuid), public.is_linked_with(uuid), public.rotate_invite_code(),
  public.preview_invite(text), public.accept_invite(text), public.end_coach_link(uuid) from public, anon;
grant execute on function public.is_coach_of(uuid), public.is_linked_with(uuid), public.rotate_invite_code(),
  public.preview_invite(text), public.accept_invite(text), public.end_coach_link(uuid) to authenticated;
