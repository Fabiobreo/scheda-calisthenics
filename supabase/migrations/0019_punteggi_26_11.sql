-- Punteggi del 26 novembre 2026 (ticket 40): skill tirata e spinta senza fascia Base e a 1300 punti, Frog stand come
-- primo livello della planche, fasce nuove del livello complessivo. I punti si calcolano nell'app
-- (src/lib/levels/v2): qui cambiano solo le due cose che il database ripete, cioè l'elenco delle voci inseribili e le
-- soglie della fascia complessiva. Da rilasciare insieme all'app nuova: al primo avvio ogni app riscrive i suoi
-- punti in `level_scores` con le regole nuove (RULES_VERSION 2).

-- ---------------------------------------------------------------------------------------------------------
-- 1. Voci inseribili: si aggiunge ('planche', 'frog-stand'). L'elenco è scritto per intero, nell'ordine di
--    `stageLimits()` in src/lib/levels/v2/engine.ts, perché il test src/lib/levels/db.test.ts confronta l'ultimo
--    elenco con le regole. Le voci che ci sono già restano come sono, coi loro record.

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
  ('planche', 'frog-stand', 1, 60, false, true, true),
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
  ('planche-press', 'full', 1, 50, false, true, true)
on conflict (sub_id, stage) do nothing;

-- ---------------------------------------------------------------------------------------------------------
-- 2. Fascia del livello complessivo: 0 = Base … 5 = Leggenda, con le soglie nuove di BANDS.complessivo
--    (0–300, 301–800, 801–2300, 2301–3800, 3801–5300, 5301–6800). Il test src/features/home/social.test.ts controlla
--    che coincidano con le regole.

create or replace function public.level_band(p_total integer) returns integer
language sql immutable set search_path = '' as $$
  select case
    when coalesce(p_total, 0) <= 300 then 0
    when p_total <= 800 then 1
    when p_total <= 2300 then 2
    when p_total <= 3800 then 3
    when p_total <= 5300 then 4
    else 5
  end;
$$;

-- I limiti di `level_scores` (totale fino a 7000, categoria fino a 1400) restano: sono tetti larghi, i massimi veri
-- ora sono 6800 e, per le skill, 1300.
