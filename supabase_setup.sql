-- ============================================================
-- KIDOPOLIS — Configuración de Supabase
-- Ejecuta este script en el SQL Editor de tu proyecto Supabase
-- ============================================================

-- 1. Tabla de perfiles de usuario (roles)
create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'visor')) default 'visor',
  created_at timestamptz default now()
);

-- 2. Tabla de datos de ejemplo
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  status text not null check (status in ('activo', 'inactivo', 'pendiente')) default 'activo',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. Trigger para actualizar updated_at automáticamente
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger items_updated_at
  before update on public.items
  for each row execute procedure public.handle_updated_at();

-- 4. Row Level Security (RLS)
alter table public.user_profiles enable row level security;
alter table public.items enable row level security;

-- Política: el usuario solo puede leer su propio perfil
create policy "Users can read own profile"
  on public.user_profiles for select
  using (auth.uid() = id);

-- Política: visores y admins pueden leer items
create policy "Authenticated users can read items"
  on public.items for select
  to authenticated
  using (true);

-- Política: solo admins pueden insertar items
create policy "Admins can insert items"
  on public.items for insert
  to authenticated
  with check (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Política: solo admins pueden actualizar items
create policy "Admins can update items"
  on public.items for update
  to authenticated
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Política: solo admins pueden eliminar items
create policy "Admins can delete items"
  on public.items for delete
  to authenticated
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- 5. Datos de ejemplo
insert into public.items (name, description, status) values
  ('Registro Alpha', 'Primer elemento de prueba del sistema', 'activo'),
  ('Registro Beta', 'Segundo elemento de prueba', 'pendiente'),
  ('Registro Gamma', 'Tercer elemento de prueba', 'inactivo');

-- ============================================================
-- DESPUÉS de crear un usuario en Supabase Authentication,
-- asígnale un rol manualmente:
-- ============================================================
-- insert into public.user_profiles (id, role)
-- values ('<UUID del usuario>', 'admin');   -- o 'visor'
