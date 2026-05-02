-- ============================================================
-- KIDOPOLIS — Módulo de Boletos por Punto de Venta
-- Ejecuta este script en el SQL Editor de tu proyecto Supabase
-- ============================================================

-- 1. Tabla principal
create table if not exists public.puntos_venta (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null,
  zona          text not null check (zona in ('Zona Kids', 'Zona Pop', 'Zona Mágica')),
  folio_inicial integer not null default 1 check (folio_inicial > 0),
  folio_final   integer not null default 1 check (folio_final >= folio_inicial),
  boletos_vendidos integer not null default 0 check (boletos_vendidos >= 0),
  precio_unitario  numeric(10,2) not null default 0 check (precio_unitario >= 0),
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- 2. Trigger updated_at
create trigger puntos_venta_updated_at
  before update on public.puntos_venta
  for each row execute procedure public.handle_updated_at();

-- 3. RLS
alter table public.puntos_venta enable row level security;

-- Todos los autenticados pueden leer
create policy "Authenticated users can read puntos_venta"
  on public.puntos_venta for select
  to authenticated
  using (true);

-- Solo admins pueden insertar
create policy "Admins can insert puntos_venta"
  on public.puntos_venta for insert
  to authenticated
  with check (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Solo admins pueden actualizar
create policy "Admins can update puntos_venta"
  on public.puntos_venta for update
  to authenticated
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Solo admins pueden eliminar
create policy "Admins can delete puntos_venta"
  on public.puntos_venta for delete
  to authenticated
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );
