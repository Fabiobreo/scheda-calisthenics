-- Profilo di una persona (27 novembre 2026): toccando un nome in classifica, tra le persone o nelle novità si apre
-- il suo profilo.
--
-- person_profile(utente) → jsonb, o null se il profilo non esiste, non ha un nome o c'è un blocco tra i due (come
-- per follow_user: chi è bloccato non distingue il blocco da un profilo che non c'è).
--   { card:    la scheda di person_card(): nome, fascia del livello, rapporto nei due versi, luogo se visibile
--     visible: true se la seguo con richiesta accettata (o se sono io): solo allora arrivano punti e record
--     scores:  { total, ft, fs, st, ss, hb } — i punti del complessivo e delle 5 categorie; null se non ne ha
--     records: [{ subId, stage, value, date, gained }] — i record che ha condiviso, dal più recente }
-- Che cosa esce in più rispetto a prima: i punti delle 5 categorie di chi seguo (in classifica li vedevo già, una
-- metrica per volta). I record sono quelli già diventati novità per chi la segue (`feed_events`): una voce compare
-- una volta sola, col valore più recente. Mai il peso corporeo, mai i record non condivisi, niente a chi non segue.
create function public.person_profile(p_user uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  me constant uuid := auth.uid();
  friend boolean;
begin
  if me is null then
    raise exception 'Serve l''accesso' using errcode = '28000';
  end if;
  if p_user is distinct from me and (
       not exists (select 1 from public.profiles p where p.id = p_user and p.display_name is not null)
       or public.is_blocked_with(p_user)) then
    return null;
  end if;
  friend := p_user = me or exists (
    select 1 from public.follows f where f.follower = me and f.followee = p_user and f.status = 'accepted');
  return jsonb_build_object(
    'card', public.person_card(p_user),
    'visible', friend,
    'scores', case when friend then (
      select jsonb_build_object('total', s.total, 'ft', s.ft, 'fs', s.fs, 'st', s.st, 'ss', s.ss, 'hb', s.hb)
      from public.level_scores s where s.user_id = p_user) end,
    'records', case when friend then (
      select coalesce(jsonb_agg(x.payload order by x.created_at desc, x.id), '[]'::jsonb)
      from (
        select distinct on (e.payload ->> 'subId', e.payload ->> 'stage') e.id, e.payload, e.created_at
        from public.feed_events e
        where e.actor = p_user and e.kind = 'record'
        order by e.payload ->> 'subId', e.payload ->> 'stage', e.created_at desc, e.id
      ) x) else '[]'::jsonb end);
end;
$$;

revoke execute on function public.person_profile(uuid) from public, anon;
grant execute on function public.person_profile(uuid) to authenticated;
