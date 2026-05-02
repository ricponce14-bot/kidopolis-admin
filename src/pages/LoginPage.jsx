import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Mail, Lock, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const { user, signIn, loading } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  if (!loading && user) return <Navigate to="/dashboard" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await signIn(email, password)
      toast.success('Sesión iniciada')
      navigate('/dashboard')
    } catch (err) {
      setError(err.message ?? 'Error al iniciar sesión')
      toast.error('Credenciales incorrectas')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-[400px]">
        {/* Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <img 
            src="/logo.png" 
            alt="KidoPolis" 
            className="h-16 w-auto mb-4 object-contain"
            onError={(e) => {
              e.target.style.display = 'none';
              document.getElementById('fallback-logo').style.display = 'flex';
            }}
          />
          <div id="fallback-logo" className="w-12 h-12 rounded-lg flex items-center justify-center bg-slate-900 mb-4 shadow-sm hidden">
             <span className="text-white font-bold text-xl">K</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight">KidoPolis</h1>
          <p className="text-sm mt-1 text-slate-500">Panel de Control</p>
        </div>

        {/* Form */}
        <div className="glass-card p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="form-label">Correo electrónico</label>
              <input
                id="email"
                type="email"
                className="input-field"
                placeholder="usuario@ejemplo.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="form-label">Contraseña</label>
              <input
                id="password"
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-red-50 text-red-600 text-sm border border-red-100">
                <AlertCircle size={15} />
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full py-2.5 mt-2"
              disabled={submitting}
            >
              {submitting ? <div className="spinner !border-t-white !border-r-transparent !border-b-transparent !border-l-transparent w-4 h-4 border-[2px]" /> : 'Iniciar Sesión'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
