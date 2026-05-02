import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Mail, Lock, AlertCircle, ChevronRight } from 'lucide-react'
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
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-50">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />

      <div className="w-full max-w-[420px] relative z-10 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <img 
            src="/logo.png" 
            alt="KidoPolis" 
            className="h-20 w-auto mb-5 object-contain drop-shadow-sm transition-transform hover:scale-105"
            onError={(e) => {
              e.target.style.display = 'none';
              document.getElementById('fallback-logo').style.display = 'flex';
            }}
          />
          <div id="fallback-logo" className="w-16 h-16 rounded-2xl flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 mb-5 shadow-lg hidden">
             <span className="text-white font-black text-3xl">K</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Bienvenido de vuelta</h1>
          <p className="text-sm mt-2 text-slate-500 font-medium">Ingresa a tu panel de control KidoPolis</p>
        </div>

        {/* Form Card */}
        <div className="bg-white/70 backdrop-blur-xl border border-white/50 shadow-2xl shadow-slate-200/50 rounded-3xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-semibold text-slate-700 ml-1">Correo electrónico</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                  <Mail size={18} />
                </div>
                <input
                  id="email"
                  type="email"
                  className="w-full pl-10 pr-4 py-3 bg-white/50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none shadow-sm"
                  placeholder="admin@ejemplo.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-semibold text-slate-700 ml-1">Contraseña</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  id="password"
                  type="password"
                  className="w-full pl-10 pr-4 py-3 bg-white/50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none shadow-sm"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-50/80 backdrop-blur-sm text-red-600 text-sm border border-red-100 animate-fade-in">
                <AlertCircle size={16} className="shrink-0" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full relative group overflow-hidden rounded-xl p-[1px] mt-4"
              disabled={submitting}
            >
              <span className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-xl opacity-90 group-hover:opacity-100 transition-opacity duration-300"></span>
              <div className="relative flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-900/10 backdrop-blur-sm rounded-xl text-white font-semibold transition-all duration-300 group-hover:bg-transparent">
                {submitting ? (
                  <div className="spinner !border-t-white !border-r-transparent !border-b-transparent !border-l-transparent w-5 h-5 border-[2.5px]" />
                ) : (
                  <>
                    Iniciar Sesión
                    <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </div>
            </button>

          </form>
        </div>
      </div>
    </div>
  )
}
