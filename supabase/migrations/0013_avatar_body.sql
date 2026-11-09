-- Avatar (ticket 11): la figura scelta dall'utente, uomo o donna. null = non ancora scelta (l'app mostra l'iniziale).
-- Colonna nuova e facoltativa: le versioni vecchie dell'app non la leggono e non si rompono. La scrive solo
-- l'utente sul proprio profilo (policy "own profile: update"); il trainer collegato la legge ("linked profiles: read").
alter table public.profiles add column avatar_body text check (avatar_body in ('m', 'f'));
