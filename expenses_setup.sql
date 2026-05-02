-- ============================================================
-- KIDOPOLIS — Módulo de Gastos Generales
-- Ejecuta este script en el SQL Editor de tu proyecto Supabase
-- ============================================================

-- 1. Tabla principal
create table if not exists public.gastos (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null,
  categoria     text not null check (categoria in ('Producción', 'Logística', 'Personal', 'Venue', 'Otro')),
  proveedor     text not null,
  monto         numeric(12,2) not null check (monto >= 0),
  fecha         date not null,
  notas         text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- 2. Trigger updated_at
create trigger gastos_updated_at
  before update on public.gastos
  for each row execute procedure public.handle_updated_at();

-- 3. RLS
alter table public.gastos enable row level security;

-- Todos los autenticados pueden leer
create policy "Authenticated users can read gastos"
  on public.gastos for select
  to authenticated
  using (true);

-- Solo admins pueden insertar
create policy "Admins can insert gastos"
  on public.gastos for insert
  to authenticated
  with check (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Solo admins pueden actualizar
create policy "Admins can update gastos"
  on public.gastos for update
  to authenticated
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Solo admins pueden eliminar
create policy "Admins can delete gastos"
  on public.gastos for delete
  to authenticated
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- 4. Datos de ejemplo
insert into public.gastos (nombre, categoria, proveedor, monto, fecha, notas) values
  ('Renta de sonido', 'Producción', 'AudioMex', 15000.00, '2026-06-15', 'Anticipo del 50%'),
  ('Transporte equipo', 'Logística', 'Fletes Rápidos', 3500.00, '2026-06-16', ''),
  ('Staff de apoyo', 'Personal', 'Agencia RH', 8000.00, '2026-06-20', 'Pago por 5 personas'),
  ('Anticipo salón', 'Venue', 'Salón Los Arcos', 25000.00, '2026-05-10', 'Reserva de fecha'),
  ('Publicidad Facebook', 'Otro', 'Meta Platforms', 2000.00, '2026-05-25', 'Campaña mayo');
