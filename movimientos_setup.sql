-- ============================================================
-- KIDOPOLIS — Módulo de Movimientos de Folios
-- ============================================================

create table if not exists public.movimientos_folios (
  id uuid primary key default gen_random_uuid(),
  punto_venta_id uuid not null references public.puntos_venta(id) on delete cascade,
  tipo text not null check (tipo in ('asignacion', 'venta', 'devolucion')),
  folio_inicio integer not null check (folio_inicio > 0),
  folio_fin integer not null check (folio_fin >= folio_inicio),
  cantidad integer not null check (cantidad > 0),
  fecha date not null default current_date,
  notas text,
  created_at timestamptz default now()
);

-- RLS
alter table public.movimientos_folios enable row level security;

-- Todos los autenticados pueden leer
create policy "Authenticated users can read movimientos"
  on public.movimientos_folios for select
  to authenticated
  using (true);

-- Solo admins pueden insertar/actualizar/eliminar
create policy "Admins can manage movimientos"
  on public.movimientos_folios for all
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
