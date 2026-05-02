# KidoPolis — React + Vite + Tailwind + Supabase

Panel de administración con autenticación y control de acceso por roles (**admin** y **visor**).

---

## 🚀 Inicio rápido

```bash
npm install
npm run dev
```

---

## ⚙️ Configuración de Supabase

### 1. Crea tu proyecto en [supabase.com](https://supabase.com)

### 2. Configura el archivo `.env`

```env
VITE_SUPABASE_URL=https://TU_PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_ANON_KEY
```

### 3. Ejecuta el SQL

Ve a **SQL Editor** en tu proyecto Supabase y ejecuta el contenido de `supabase_setup.sql`.

Esto crea:
- Tabla `user_profiles` con el campo `role` (`admin` | `visor`)
- Tabla `items` para los datos de ejemplo
- **Row Level Security (RLS)** — admins pueden CRUD, visores solo SELECT

### 4. Crea usuarios y asígnales roles

1. Ve a **Authentication → Users → Invite user** y crea tus usuarios.
2. Copia el UUID de cada usuario.
3. En SQL Editor ejecuta:

```sql
insert into public.user_profiles (id, role)
values ('<UUID>', 'admin');  -- o 'visor'
```

---

## 📁 Estructura del proyecto

```
src/
├── context/
│   └── AuthContext.jsx      ← Sesión + rol del usuario
├── components/
│   ├── ProtectedRoute.jsx   ← Guard de rutas
│   ├── Sidebar.jsx          ← Navegación lateral
│   └── Layout.jsx           ← Wrapper del dashboard
├── pages/
│   ├── LoginPage.jsx        ← Login
│   ├── DashboardHome.jsx    ← Inicio del panel
│   ├── DataPage.jsx         ← CRUD (admin) / lectura (visor)
│   └── SettingsPage.jsx     ← Solo admin
├── lib/
│   └── supabase.js          ← Cliente Supabase
├── App.jsx                  ← Rutas principales
└── index.css                ← Design system + Tailwind v4
```

---

## 🔐 Sistema de rutas

| Ruta | Acceso |
|---|---|
| `/login` | Público |
| `/dashboard` | Admin + Visor |
| `/dashboard/data` | Admin + Visor |
| `/dashboard/settings` | Solo Admin |

- Si no estás autenticado → redirige a `/login`
- Si eres visor e intentas `/dashboard/settings` → redirige a `/dashboard`

---

## 🎨 Stack

- **React 18** + **Vite 6**
- **Tailwind CSS v4** (plugin oficial para Vite)
- **Supabase JS v2** (Auth + PostgREST)
- **React Router v6** (rutas anidadas)
- **react-hot-toast** (notificaciones)
- **lucide-react** (íconos)
