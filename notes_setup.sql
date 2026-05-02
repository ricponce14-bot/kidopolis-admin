-- ============================================================
-- KIDOPOLIS — Módulo de Notas Rápidas
-- Ejecuta este script en el SQL Editor de tu proyecto Supabase
-- ============================================================

create table if not exists public.notas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  contenido text,
  categoria text not null default 'General',
  created_at timestamptz default now()
);

alter table public.notas enable row level security;

-- Solo admins pueden acceder a las notas (leer, crear, editar, eliminar)
create policy "Admins can manage notas"
  on public.notas for all
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
