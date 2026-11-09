-- Invito con il nome del trainer prima dell'accesso (audit A10). Chi apre il link d'invito senza account vede
-- "Marco ti ha invitato" sulla schermata di accesso, invece di una pagina generica.
--
-- Restituisce SOLO il nome visualizzato del trainer di un codice valido (null altrimenti): niente id, email o altro.
-- Decisione dell'utente del 9 novembre 2026: chi ha un codice valido può vedere il nome del trainer.
-- Non scrive tentativi falliti (per chi non ha fatto l'accesso non c'è un utente a cui contarli): indovinare un codice
-- tra ~10^12 combinazioni non è realistico, e il nome è ciò che il trainer sceglie di mostrare agli atleti.
-- Collegarsi resta possibile solo dopo l'accesso, con preview_invite / accept_invite e il loro limite di tentativi.
create function public.invite_trainer_name(invite_code text) returns text
language sql stable security definer set search_path = '' as $$
  select p.display_name
  from public.trainer_invites i
  join public.profiles p on p.id = i.trainer_id
  where i.code = upper(btrim(invite_code)) and p.is_trainer
$$;

revoke execute on function public.invite_trainer_name(text) from public;
grant execute on function public.invite_trainer_name(text) to anon, authenticated;
