-- ============================================================
-- KIDOPOLIS — Boletaje v2: Nuevo esquema de ventas
-- Ejecuta este script en el SQL Editor de tu proyecto Supabase
-- ============================================================

-- 1. Tabla de ventas individuales de boletos (folio por folio)
create table if not exists public.ventas_boletos (
  id            uuid primary key default gen_random_uuid(),
  folio         text not null,
  zona          text not null check (zona in ('Zona Kids', 'Zona Pop', 'Zona Mágica')),
  punto_venta   text not null,
  estado        text not null default 'vendido' check (estado in ('vendido', 'cancelado')),
  motivo_cancelacion text,
  cancelado_por text,
  fecha_venta   timestamptz default now(),
  fecha_cancelacion timestamptz,
  created_at    timestamptz default now()
);

-- Índice único para evitar folios duplicados por zona (solo vendidos — los cancelados no bloquean)
create unique index if not exists idx_ventas_boletos_folio_zona 
  on public.ventas_boletos(folio, zona);

-- RLS
alter table public.ventas_boletos enable row level security;

create policy "Authenticated users can read ventas_boletos"
  on public.ventas_boletos for select
  to authenticated
  using (true);

create policy "Authenticated users can insert ventas_boletos"
  on public.ventas_boletos for insert
  to authenticated
  with check (true);

create policy "Admins can update ventas_boletos"
  on public.ventas_boletos for update
  to authenticated
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- 2. Tabla de ventas Tikzet (lotes)
create table if not exists public.ventas_tikzet (
  id              uuid primary key default gen_random_uuid(),
  zona            text not null check (zona in ('Zona Kids', 'Zona Pop', 'Zona Mágica')),
  cantidad        integer not null check (cantidad > 0),
  precio_unitario numeric(10,2) not null check (precio_unitario >= 0),
  comision_pct    numeric(5,2) not null default 0 check (comision_pct >= 0 and comision_pct <= 100),
  monto_bruto     numeric(10,2) generated always as (cantidad * precio_unitario) stored,
  monto_comision  numeric(10,2),
  monto_neto      numeric(10,2),
  created_at      timestamptz default now()
);

-- RLS
alter table public.ventas_tikzet enable row level security;

create policy "Authenticated users can read ventas_tikzet"
  on public.ventas_tikzet for select
  to authenticated
  using (true);

create policy "Admins can insert ventas_tikzet"
  on public.ventas_tikzet for insert
  to authenticated
  with check (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can update ventas_tikzet"
  on public.ventas_tikzet for update
  to authenticated
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can delete ventas_tikzet"
  on public.ventas_tikzet for delete
  to authenticated
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- 3. Tabla de configuración del sistema (PIN, etc.)
create table if not exists public.system_config (
  key   text primary key,
  value text not null
);

-- PIN por defecto
insert into public.system_config (key, value)
  values ('finanzas_pin', '0000')
  on conflict (key) do nothing;

-- RLS
alter table public.system_config enable row level security;

create policy "Authenticated users can read system_config"
  on public.system_config for select
  to authenticated
  using (true);

create policy "Admins can update system_config"
  on public.system_config for update
  to authenticated
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );
