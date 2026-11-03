-- Profilo dell'account: per ora il nome visualizzato. Diventerà la base di trainer e atleti
-- (ruolo trainer, collegamenti), quindi ogni utente ne ha sempre uno.

create table public.profiles (
  id           uuid primary key references auth.users on delete cascade,
  display_name text check (display_name is null or char_length(btrim(display_name)) between 1 and 60),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Niente insert né delete dal client: il profilo nasce con l'utente (trigger) e muore con lui (cascade).
create policy "own profile: read" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy "own profile: update" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Un profilo per ogni nuovo utente.
create function public.create_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.create_profile();

-- E per gli utenti che esistono già.
insert into public.profiles (id) select id from auth.users on conflict do nothing;

-- Eliminazione dell'account da parte dell'utente stesso: cancella l'utente e, a cascata, tutti i suoi dati.
create function public.delete_own_account() returns void
language sql security definer set search_path = '' as $$
  delete from auth.users where id = auth.uid();
$$;

revoke execute on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
revoke execute on function public.create_profile() from public, anon, authenticated;
