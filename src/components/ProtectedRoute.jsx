import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * ProtectedRoute — Redirects to /login if not authenticated.
 * If `requiredRole` is provided, also checks the user's role.
 * Shows retry button if Supabase connection times out.
 */
export default function ProtectedRoute({ requiredRole }) {
  const { user, role, loading, timedOut, retry } = useAuth()

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <div className="spinner mb-4" style={{ width: '2.5rem', height: '2.5rem' }} />
        <p className="text-sm text-slate-400 animate-pulse">Conectando con KidoPolis...</p>
      </div>
    )
  }

  if (timedOut && !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <div className="glass-card p-8 max-w-sm text-center animate-fade-in">
          <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Conexión lenta</h2>
          <p className="text-sm text-slate-500 mb-6">
            El servidor tardó en responder. Esto puede pasar cuando el sistema lleva un rato sin uso. Intenta de nuevo.
          </p>
          <div className="flex flex-col gap-3">
            <button onClick={retry} className="btn-primary w-full justify-center">
              Reintentar conexión
            </button>
            <a href="/login" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
              Ir al Login
            </a>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (requiredRole && role !== requiredRole) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
