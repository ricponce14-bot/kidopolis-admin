import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * ProtectedRoute — Redirects to /login if not authenticated.
 * If `requiredRole` is provided, also checks the user's role.
 */
export default function ProtectedRoute({ requiredRole }) {
  const { user, role, loading } = useAuth()

  if (loading) {
    console.log('ProtectedRoute: STILL LOADING');
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <div className="spinner mb-4" style={{ width: '2.5rem', height: '2.5rem' }} />
        <p className="text-sm text-slate-400 animate-pulse">Conectando con KidoPolis...</p>
        <div className="mt-8 text-[10px] text-slate-300 max-w-xs text-center">
          Si esto tarda demasiado, revisa la consola del navegador (F12) o verifica tus credenciales de Supabase en Vercel.
        </div>
      </div>
    )
  }
  console.log('ProtectedRoute: LOADING FINISHED, User:', !!user);

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (requiredRole && role !== requiredRole) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
