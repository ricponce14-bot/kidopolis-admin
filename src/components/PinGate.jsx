import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Lock, Unlock } from 'lucide-react'
import toast from 'react-hot-toast'

/**
 * PinGate — wraps children behind a PIN screen.
 * Reads the PIN from system_config table (key: finanzas_pin).
 * Once unlocked, stays unlocked for the session via sessionStorage.
 */
export default function PinGate({ label = 'Módulo protegido', children }) {
  const storageKey = `kidopolis_pin_${label}`
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(storageKey) === '1')
  const [pin, setPin] = useState('')
  const [correctPin, setCorrectPin] = useState('0000')

  useEffect(() => {
    supabase.from('system_config').select('*').eq('key', 'finanzas_pin').single()
      .then(({ data }) => { if (data) setCorrectPin(data.value) })
  }, [])

  if (unlocked) return children

  function handleSubmit(e) {
    e.preventDefault()
    if (pin === correctPin) {
      setUnlocked(true)
      sessionStorage.setItem(storageKey, '1')
      toast.success('Acceso concedido')
    } else {
      toast.error('PIN incorrecto')
      setPin('')
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] animate-fade-in">
      <div className="glass-card p-8 w-full max-w-sm text-center">
        <div className="w-14 h-14 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto mb-5">
          <Lock size={24} className="text-slate-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-1">{label}</h2>
        <p className="text-sm text-slate-500 mb-6">Ingresa el PIN para continuar.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            className="input-field text-center text-2xl tracking-[0.5em] font-bold"
            value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
            placeholder="••••"
            autoFocus
          />
          <button type="submit" className="btn-primary w-full">
            <Unlock size={16} /> Desbloquear
          </button>
        </form>
      </div>
    </div>
  )
}
