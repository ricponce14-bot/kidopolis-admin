import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Lock, Unlock, DollarSign, ShoppingCart, Globe, Ban, TrendingUp } from 'lucide-react'
import { ZONAS, precioZona, money, fmt } from '../lib/ticketHelpers'
import toast from 'react-hot-toast'

export default function FinanzasPage() {
  const { isAdmin } = useAuth()
  const [pinInput, setPinInput] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [correctPin, setCorrectPin] = useState('0000')
  const [loading, setLoading] = useState(true)
  const [ventas, setVentas] = useState([])
  const [ventasTikzet, setVentasTikzet] = useState([])
  const [puntos, setPuntos] = useState([])

  // Cargar PIN desde system_config
  useEffect(() => {
    supabase.from('system_config').select('*').eq('key', 'finanzas_pin').single()
      .then(({ data }) => { if (data) setCorrectPin(data.value) })
  }, [])

  async function loadData() {
    setLoading(true)
    const [vRes, tRes] = await Promise.all([
      supabase.from('ventas_boletos').select('*').order('fecha_venta', { ascending: false }),
      supabase.from('ventas_tikzet').select('*').order('created_at', { ascending: false })
    ])
    setVentas(vRes.data || [])
    setVentasTikzet(tRes.data || [])
    // Extraer puntos únicos
    const pts = [...new Set((vRes.data || []).map(v => v.punto_venta))].filter(Boolean)
    setPuntos(pts)
    setLoading(false)
  }

  function handlePin(e) {
    e.preventDefault()
    if (pinInput === correctPin) {
      setUnlocked(true)
      loadData()
      toast.success('Acceso concedido')
    } else {
      toast.error('PIN incorrecto — acceso denegado')
      setPinInput('')
    }
  }

  // Stats por punto de venta
  const statsPorPunto = useMemo(() => {
    const map = {}
    puntos.forEach(p => { map[p] = { vendidos: 0, cancelados: 0, dinero: 0 } })
    ventas.forEach(v => {
      if (!map[v.punto_venta]) map[v.punto_venta] = { vendidos: 0, cancelados: 0, dinero: 0 }
      if (v.estado === 'vendido') {
        map[v.punto_venta].vendidos++
        map[v.punto_venta].dinero += precioZona(v.zona)
      } else {
        map[v.punto_venta].cancelados++
      }
    })
    return map
  }, [ventas, puntos])

  // Stats Tikzet
  const tikzetStats = useMemo(() => {
    let bruto = 0, comision = 0, neto = 0, cantidad = 0
    ventasTikzet.forEach(t => {
      cantidad += t.cantidad
      const b = t.cantidad * Number(t.precio_unitario)
      bruto += b
      comision += Number(t.monto_comision || 0)
      neto += Number(t.monto_neto || 0)
    })
    return { bruto, comision, neto, cantidad }
  }, [ventasTikzet])

  // Cancelaciones
  const cancelaciones = useMemo(() => ventas.filter(v => v.estado === 'cancelado'), [ventas])

  // Total general
  const totalVentasFisicas = useMemo(() => ventas.filter(v => v.estado === 'vendido').reduce((a, v) => a + precioZona(v.zona), 0), [ventas])
  const totalGeneral = totalVentasFisicas + tikzetStats.neto

  // ─── PIN SCREEN ───
  if (!unlocked) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] animate-fade-in">
        <div className="glass-card p-8 w-full max-w-sm text-center">
          <div className="w-14 h-14 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto mb-5">
            <Lock size={24} className="text-slate-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-1">Finanzas</h2>
          <p className="text-sm text-slate-500 mb-6">Ingresa el PIN para acceder al apartado financiero.</p>
          <form onSubmit={handlePin} className="space-y-4">
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              className="input-field text-center text-2xl tracking-[0.5em] font-bold"
              value={pinInput}
              onChange={e => setPinInput(e.target.value.replace(/\D/g, ''))}
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

  // ─── FINANZAS DASHBOARD ───
  if (loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="border-b border-gray-200 pb-5">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-1">
          <span>Dashboard</span><span>/</span><span className="text-slate-700">Finanzas</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <DollarSign size={22} className="text-emerald-600" /> Apartado de Finanzas
        </h1>
        <p className="text-sm mt-1 text-slate-500">Desglose financiero por punto de venta y Tikzet.</p>
      </div>

      {/* Resumen cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Ventas Físicas</p>
          <p className="text-2xl font-bold text-emerald-600">{money(totalVentasFisicas)}</p>
          <p className="text-xs text-slate-500 mt-1">{fmt(ventas.filter(v => v.estado === 'vendido').length)} boletos</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Tikzet Bruto</p>
          <p className="text-2xl font-bold text-blue-600">{money(tikzetStats.bruto)}</p>
          <p className="text-xs text-slate-500 mt-1">{fmt(tikzetStats.cantidad)} boletos</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Comisión Tikzet</p>
          <p className="text-2xl font-bold text-red-600">−{money(tikzetStats.comision)}</p>
          <p className="text-xs text-slate-500 mt-1">Descontado por plataforma</p>
        </div>
        <div className="glass-card p-5 border-emerald-100 bg-emerald-50/30">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1"><TrendingUp size={12} /> Total Neto</p>
          <p className="text-2xl font-bold text-emerald-700">{money(totalGeneral)}</p>
          <p className="text-xs text-slate-500 mt-1">Físicas + Tikzet neto</p>
        </div>
      </div>

      {/* Ventas por punto de venta */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">📍 Ventas por Punto de Venta</h2>
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm text-left responsive-table">
            <thead className="bg-slate-50 border-b border-gray-200 text-slate-500 text-xs uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-3">Punto de Venta</th>
                <th className="px-5 py-3 text-right">Vendidos</th>
                <th className="px-5 py-3 text-right">Cancelados</th>
                <th className="px-5 py-3 text-right">Recaudado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {puntos.map(p => {
                const s = statsPorPunto[p] || { vendidos: 0, cancelados: 0, dinero: 0 }
                return (
                  <tr key={p} className="hover:bg-slate-50">
                    <td data-label="Punto" className="px-5 py-3 font-medium text-slate-900">{p}</td>
                    <td data-label="Vendidos" className="px-5 py-3 text-right font-bold text-emerald-600">{fmt(s.vendidos)}</td>
                    <td data-label="Cancelados" className="px-5 py-3 text-right text-red-600">{fmt(s.cancelados)}</td>
                    <td data-label="Recaudado" className="px-5 py-3 text-right font-bold text-slate-900">{money(s.dinero)}</td>
                  </tr>
                )
              })}
              {puntos.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-400">Sin ventas físicas registradas</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tikzet detalle */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">🌐 Detalle Tikzet</h2>
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm text-left responsive-table">
            <thead className="bg-slate-50 border-b border-gray-200 text-slate-500 text-xs uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-3">Zona</th>
                <th className="px-5 py-3 text-right">Cantidad</th>
                <th className="px-5 py-3 text-right">Bruto</th>
                <th className="px-5 py-3 text-right">Comisión</th>
                <th className="px-5 py-3 text-right">Neto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ventasTikzet.map(t => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td data-label="Zona" className="px-5 py-3">
                    <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-blue-200">{t.zona}</span>
                  </td>
                  <td data-label="Cantidad" className="px-5 py-3 text-right font-bold">{fmt(t.cantidad)}</td>
                  <td data-label="Bruto" className="px-5 py-3 text-right">{money(t.cantidad * t.precio_unitario)}</td>
                  <td data-label="Comisión" className="px-5 py-3 text-right text-red-600">−{money(t.monto_comision)} ({t.comision_pct}%)</td>
                  <td data-label="Neto" className="px-5 py-3 text-right font-bold text-emerald-600">{money(t.monto_neto)}</td>
                </tr>
              ))}
              {ventasTikzet.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400">Sin ventas Tikzet</td></tr>
              )}
            </tbody>
            {ventasTikzet.length > 0 && (
              <tfoot className="bg-slate-50 border-t border-gray-200 font-semibold text-sm">
                <tr>
                  <td className="px-5 py-3">Total</td>
                  <td className="px-5 py-3 text-right">{fmt(tikzetStats.cantidad)}</td>
                  <td className="px-5 py-3 text-right">{money(tikzetStats.bruto)}</td>
                  <td className="px-5 py-3 text-right text-red-600">−{money(tikzetStats.comision)}</td>
                  <td className="px-5 py-3 text-right text-emerald-600">{money(tikzetStats.neto)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Cancelaciones */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">❌ Cancelaciones</h2>
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm text-left responsive-table">
            <thead className="bg-slate-50 border-b border-gray-200 text-slate-500 text-xs uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-3">Folio</th>
                <th className="px-5 py-3">Zona</th>
                <th className="px-5 py-3">Motivo</th>
                <th className="px-5 py-3">Cancelado por</th>
                <th className="px-5 py-3 text-right">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cancelaciones.map(c => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td data-label="Folio" className="px-5 py-3 font-bold text-slate-900">{c.folio}</td>
                  <td data-label="Zona" className="px-5 py-3 text-xs text-slate-600">{c.zona}</td>
                  <td data-label="Motivo" className="px-5 py-3 text-slate-700">{c.motivo_cancelacion || '—'}</td>
                  <td data-label="Admin" className="px-5 py-3 text-xs text-slate-500">{c.cancelado_por || '—'}</td>
                  <td data-label="Fecha" className="px-5 py-3 text-right text-xs text-slate-500 tabular-nums">
                    {c.fecha_cancelacion ? new Date(c.fecha_cancelacion).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                  </td>
                </tr>
              ))}
              {cancelaciones.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400">Sin cancelaciones registradas</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
