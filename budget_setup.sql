-- ============================================================
-- KIDOPOLIS — Módulo de Presupuesto Inicial
-- Ejecuta este script en el SQL Editor de tu proyecto Supabase
-- ============================================================

-- 1. Tabla principal (Singleton)
create table if not exists public.presupuesto_general (
  id int primary key check (id = 1),
  total numeric(12,2) not null default 0,
  produccion numeric(12,2) not null default 0,
  logistica numeric(12,2) not null default 0,
  personal numeric(12,2) not null default 0,
  venue numeric(12,2) not null default 0,
  pauta numeric(12,2) not null default 0,
  otros numeric(12,2) not null default 0,
  updated_at timestamptz default now()
);

-- 2. Trigger updated_at
create trigger presupuesto_updated_at
  before update on public.presupuesto_general
  for each row execute procedure public.handle_updated_at();

-- 3. RLS
alter table public.presupuesto_general enable row level security;

-- Todos los autenticados pueden leer
create policy "Authenticated users can read presupuesto"
  on public.presupuesto_general for select
  to authenticated
  using (true);

-- Solo admins pueden insertar/actualizar/eliminar
create policy "Admins can manage presupuesto"
  on public.presupuesto_general for all
  to authenticated
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- 4. Datos de ejemplo inicial
insert into public.presupuesto_general (id, total, produccion, logistica, personal, venue, pauta, otros)
values (1, 100000.00, 25000.00, 10000.00, 15000.00, 30000.00, 15000.00, 5000.00)
on conflict (id) do nothing;
