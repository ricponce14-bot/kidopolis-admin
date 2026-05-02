import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard,
  Database,
  Settings,
  LogOut,
  ShieldCheck,
  Eye,
  Menu,
  X,
  Ticket,
  DollarSign,
  Megaphone,
  Calculator,
  StickyNote,
} from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'

const adminLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/dashboard/budget', label: 'Presupuesto Inicial', icon: Calculator },
  { to: '/dashboard/tickets', label: 'Control de Boletos', icon: Ticket },
  { to: '/dashboard/expenses', label: 'Gastos Generales', icon: DollarSign },
  { to: '/dashboard/ads', label: 'Pauta Publicitaria', icon: Megaphone },
  { to: '/dashboard/notes', label: 'Notas Rápidas', icon: StickyNote },
  { to: '/dashboard/settings', label: 'Configuración', icon: Settings },
]

const visorLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/dashboard/budget', label: 'Presupuesto Inicial', icon: Calculator },
  { to: '/dashboard/tickets', label: 'Control de Boletos', icon: Ticket },
  { to: '/dashboard/expenses', label: 'Gastos Generales', icon: DollarSign },
  { to: '/dashboard/ads', label: 'Pauta Publicitaria', icon: Megaphone },
]

export default function Sidebar() {
  const { user, role, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const links = isAdmin ? adminLinks : visorLinks

  async function handleLogout() {
    await signOut()
    toast.success('Sesión cerrada correctamente')
    navigate('/login')
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white">
      {/* Logo */}
      <div className="p-6 border-b border-gray-100/80">
        <div className="flex items-center gap-3">
          <img 
            src="/logo.png" 
            alt="KidoPolis" 
            className="h-7 w-auto object-contain"
            onError={(e) => {
              e.target.style.display = 'none';
              document.getElementById('sidebar-fallback-logo').style.display = 'flex';
            }}
          />
          <div id="sidebar-fallback-logo" className="w-7 h-7 rounded-lg flex items-center justify-center bg-slate-900 shadow-sm hidden">
             <span className="text-white font-bold text-sm">K</span>
          </div>
          <div>
            <p className="font-bold text-[15px] text-slate-900 tracking-tight">KidoPolis</p>
          </div>
        </div>
      </div>

      {/* User info */}
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 text-slate-600 font-bold text-xs border border-gray-200">
            {user?.email?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate text-slate-900">
              {user?.email}
            </p>
            <p className="text-xs text-slate-500 capitalize">
              Rol: {role}
            </p>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/dashboard'}
            className={({ isActive }) =>
              `sidebar-item ${isActive ? 'active' : ''}`
            }
            onClick={() => setMobileOpen(false)}
          >
            <Icon size={16} strokeWidth={2.5} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="sidebar-item w-full text-left"
        >
          <LogOut size={16} strokeWidth={2.5} />
          Cerrar Sesión
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 border-r border-gray-200 bg-white">
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between px-5 py-3.5 sticky top-0 z-40 border-b border-gray-200/80 bg-white/80 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <img 
            src="/logo.png" 
            alt="KidoPolis" 
            className="h-6 w-auto object-contain"
            onError={(e) => {
              e.target.style.display = 'none';
              document.getElementById('mobile-fallback-logo').style.display = 'flex';
            }}
          />
          <div id="mobile-fallback-logo" className="w-6 h-6 rounded flex items-center justify-center bg-slate-900 hidden">
             <span className="text-white font-bold text-xs">K</span>
          </div>
          <span className="font-bold text-[15px] tracking-tight text-slate-900">
            KidoPolis
          </span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-slate-500 hover:text-slate-900"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-30 flex">
          <div className="w-64 sm:w-72 h-full flex flex-col bg-white border-r border-gray-200 animate-fade-in">
            <SidebarContent />
          </div>
          <div className="flex-1 bg-slate-900/20 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
        </div>
      )}
    </>
  )
}
