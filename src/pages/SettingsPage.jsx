import { useAuth } from '../context/AuthContext'
import { Settings, ShieldCheck, Lock, Check } from 'lucide-react'

export default function SettingsPage() {
  const { user, role } = useAuth()

  return (
    <div className="space-y-6 max-w-2xl animate-fade-in">
      <div className="border-b border-gray-200 pb-5">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Settings size={22} className="text-slate-400" /> Configuración
        </h1>
        <p className="text-sm mt-1 text-slate-500">
          Información de tu cuenta y permisos del sistema.
        </p>
      </div>

      {/* Account card */}
      <div className="glass-card overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-xs uppercase tracking-wider text-slate-500">
            Cuenta
          </h2>
        </div>
        <div className="p-6 space-y-4">
          <Row label="Email" value={user?.email} />
          <Row label="ID de usuario" value={user?.id} mono />
          <Row
            label="Rol asignado"
            value={
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider border ${role === 'admin' ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                {role === 'admin' && <ShieldCheck size={12} />}
                {role}
              </span>
            }
          />
          <Row
            label="Último acceso"
            value={
              user?.last_sign_in_at
                ? new Date(user.last_sign_in_at).toLocaleString('es-MX')
                : '—'
            }
          />
        </div>
      </div>

      {/* Permissions card */}
      <div className="glass-card overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-xs uppercase tracking-wider text-slate-500">
            Permisos Activos
          </h2>
        </div>
        <div className="px-6 py-2">
          <PermRow label="Ver datos de todos los módulos" allowed />
          <PermRow label="Crear nuevos registros" allowed={role === 'admin'} />
          <PermRow label="Editar registros existentes" allowed={role === 'admin'} />
          <PermRow label="Eliminar registros" allowed={role === 'admin'} />
          <PermRow label="Acceder a configuración" allowed={role === 'admin'} />
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, mono }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
      <span className="text-sm w-40 flex-shrink-0 text-slate-500 font-medium">
        {label}
      </span>
      <span className={`text-sm text-slate-900 truncate ${mono ? 'font-mono text-xs bg-slate-50 px-2 py-1 rounded border border-gray-100' : 'font-medium'}`}>
        {value}
      </span>
    </div>
  )
}

function PermRow({ label, allowed }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {allowed ? (
        <span className="text-xs font-semibold px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-1">
          <Check size={12} /> Permitido
        </span>
      ) : (
        <span className="text-xs font-semibold px-2 py-1 rounded bg-red-50 text-red-700 border border-red-100 flex items-center gap-1">
          <Lock size={12} /> Denegado
        </span>
      )}
    </div>
  )
}
