-- ============================================================
-- KIDOPOLIS — Módulo de Pauta Publicitaria
-- Ejecuta este script en el SQL Editor de tu proyecto Supabase
-- ============================================================

-- 1. Tabla principal
create table if not exists public.pautas (
  id            uuid primary key default gen_random_uuid(),
  plataforma    text not null check (plataforma in ('Meta', 'Google', 'TikTok', 'Instagram', 'Otra')),
  nombre        text not null,
  objetivo      text not null,
  monto         numeric(12,2) not null check (monto >= 0),
  fecha_inicio  date not null,
  fecha_fin     date not null,
  notas         text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- 2. Trigger updated_at
create trigger pautas_updated_at
  before update on public.pautas
  for each row execute procedure public.handle_updated_at();

-- 3. RLS
alter table public.pautas enable row level security;

-- Todos los autenticados pueden leer
create policy "Authenticated users can read pautas"
  on public.pautas for select
  to authenticated
  using (true);

-- Solo admins pueden insertar
create policy "Admins can insert pautas"
  on public.pautas for insert
  to authenticated
  with check (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Solo admins pueden actualizar
create policy "Admins can update pautas"
  on public.pautas for update
  to authenticated
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Solo admins pueden eliminar
create policy "Admins can delete pautas"
  on public.pautas for delete
  to authenticated
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- 4. Datos de ejemplo
insert into public.pautas (plataforma, nombre, objetivo, monto, fecha_inicio, fecha_fin, notas) values
  ('Meta', 'Preventa Fase 1', 'Conversión', 5000.00, '2026-04-01', '2026-04-15', 'Campaña dirigida a padres de familia'),
  ('Google', 'Búsqueda Eventos Kidopolis', 'Tráfico', 3000.00, '2026-04-10', '2026-05-10', 'Palabras clave de entretenimiento infantil'),
  ('TikTok', 'Reto Kidopolis', 'Awareness', 4500.00, '2026-04-20', '2026-05-05', 'Colaboración con influencers locales'),
  ('Instagram', 'Sorteo Boletos VIP', 'Interacción', 1500.00, '2026-05-01', '2026-05-08', 'Requisitos: seguir y etiquetar a 2 amigos');
