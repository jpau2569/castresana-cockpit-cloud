-- Castresana Cockpit · Fase 1 · Esquema Supabase
-- Ejecuta TODO este archivo en Supabase → SQL Editor → New query → Run.

create table if not exists cockpit_state (
  id          text primary key,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- Fila única para Pau (un solo usuario). El backend usa la service_role key,
-- que salta la seguridad por filas (RLS), así que no hacen falta políticas.
insert into cockpit_state (id, data)
values ('pau', '{}'::jsonb)
on conflict (id) do nothing;
