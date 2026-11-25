-- Catalogo: cinque voci in meno (ticket 35, decisione di Michael del 24 novembre 2026).
--
-- Escono `wide-planche`, `planche-push-up`, `planche-press`, `front-lever-pull-up`, `front-lever-touch`, senza varianti
-- al loro posto. Come nella 0010, a chi le usa non sparisce niente:
-- - gli esercizi degli utenti collegati a queste voci diventano personalizzati con lo stesso nome; registrazioni,
--   programma, record personali, archivio e misura (ripetizioni o secondi) restano quelli, perché seguono l'esercizio
--   e non la voce del catalogo;
-- - nelle schede modello dei trainer la riga passa da voce del catalogo a nome personalizzato, con lo stesso schema.
--
-- Non tocca i livelli: lì planche push up, planche press, front lever touch e front lever pull up sono catene di
-- record (`level_stages.sub_id`, ticket 30), non voci del catalogo.

-- 1. Schede modello: il nome della voce diventa il nome personalizzato. Il trigger della misura (0011) guarda i
--    secondi dello schema, che non cambiano: una riga a tempo (front lever touch, wide planche) resta a tempo.
update public.program_items p
set custom_name = c.name, catalog_id = null
from public.catalog_exercises c
where c.id = p.catalog_id
  and c.id = any ('{wide-planche,planche-push-up,planche-press,front-lever-pull-up,front-lever-touch}');

-- 2. Esercizi degli utenti: il nome resta quello già salvato (il nome del catalogo, o quello con il suffisso
--    " (catalogo)" di chi aveva già un personalizzato omonimo) e la misura pure.
update public.exercises
set catalog_id = null
where catalog_id = any ('{wide-planche,planche-push-up,planche-press,front-lever-pull-up,front-lever-touch}');

-- 3. Ora niente le punta più (`on delete restrict` su exercises e program_items): si possono togliere.
delete from public.catalog_exercises
where id = any ('{wide-planche,planche-push-up,planche-press,front-lever-pull-up,front-lever-touch}');
