-- Classifica degli amici per intero (feedback del 27 novembre 2026: "tra amici non si vede bene").
--
-- Fin qui `ranking('amici', …)` dava, come gli altri ambiti, le prime 3 righe e i 2 vicini sopra e sotto: con più di
-- 6 o 7 persone seguite la classifica tra amici arrivava a pezzi. Tra amici le righe sono tutte visibili (chi seguo
-- e io), quindi ora escono tutte, fino a 100; oltre, le prime 100 più i miei vicini. Gli altri ambiti non cambiano.
-- La funzione è quella della 0018: cambia solo quante righe in testa si tengono (%5$s).

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
      where o.rn <= %5$s or abs(o.rn - (select m.rn from ord m where m.user_id = $1)) <= 2
    )
    select coalesce(jsonb_agg(jsonb_build_object(
             'position', 1 + (select count(*) from public.level_scores s where s.total > 0 and %2$s and s.%1$I > k.score),
             'userId', k.user_id,
             'name', p.display_name,
             'score', k.score,
             'me', k.user_id = $1) order by k.rn), '[]'::jsonb)
    from pick k join public.profiles p on p.id = k.user_id
  $q$, col, cond, friends, unblocked, case when p_scope = 'amici' then 100 else 3 end) into shown using me, mine;

  return jsonb_build_object('scope', p_scope, 'metric', p_metric, 'available', true,
                            'position', pos, 'participants', participants, 'score', mine, 'rows', shown);
end;
$$;
