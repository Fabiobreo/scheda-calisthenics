-- Da eseguire UNA VOLTA nel SQL Editor del progetto già esistente, prima del primo deploy con le migration automatiche.
-- 0001_init.sql era stata lanciata a mano: la segno come già applicata così il deploy non prova a rifarla.
create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (
  version    text primary key,
  statements text[],
  name       text
);
insert into supabase_migrations.schema_migrations (version, name)
values ('0001', 'init')
on conflict (version) do nothing;
