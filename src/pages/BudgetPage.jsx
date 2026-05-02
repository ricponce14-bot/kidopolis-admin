import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Pencil, Save, X, Calculator, AlertTriangle, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'

function money(n) { return `$${Number(n ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }

function ProgressBar({ pct }) {
  let color = 'bg-emerald-500'
  if (pct > 80) color = 'bg-amber-500'
  if (pct > 100) color = 'bg-red-500'

  return (
    <div className="w-full mt-2">
      <div className="flex justify-between text-[10px] uppercase font-bold text-slate-500 mb-1">
        <span>Progreso</span>
        <span className={pct > 100 ? 'text-red-600' : pct > 80 ? 'text-amber-600' : ''}>{pct.toFixed(1)}%</span>
      </div>
      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full ${color} transition-all duration-700`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      {pct > 100 && <p className="text-[10px] text-red-600 mt-1 font-semibold flex items-center gap-1"><AlertTriangle size={10}/> Presupuesto rebasado</p>}
      {(pct > 80 && pct <= 100) && <p className="text-[10px] text-amber-600 mt-1 font-semibold flex items-center gap-1"><AlertTriangle size={10}/> Cerca del límite</p>}
    </div>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white rounded-lg border border-gray-200 shadow-xl relative w-full max-w-lg p-6 animate-fade-in z-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-lg text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

function BudgetForm({ initial, onSave, onCancel, loading }) {
  const [total, setTotal] = useState(initial?.total ?? 0)
  const [produccion, setProduccion] = useState(initial?.produccion ?? 0)
  const [logistica, setLogistica] = useState(initial?.logistica ?? 0)
  const [personal, setPersonal] = useState(initial?.personal ?? 0)
  const [venue, setVenue] = useState(initial?.venue ?? 0)
  const [pauta, setPauta] = useState(initial?.pauta ?? 0)
  const [otros, setOtros] = useState(initial?.otros ?? 0)

  const sumCategories = Number(produccion) + Number(logistica) + Number(personal) + Number(venue) + Number(pauta) + Number(otros)
  const difference = Number(total) - sumCategories

  function handleSubmit(e) {
    e.preventDefault()
    onSave({
      total: Number(total), produccion: Number(produccion), logistica: Number(logistica),
      personal: Number(personal), venue: Number(venue), pauta: Number(pauta), otros: Number(otros)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-4">
        <label className="form-label text-slate-700">Presupuesto General Total ($ MXN) *</label>
        <input className="input-field font-bold text-lg" type="number" min="0" step="0.01" value={total} onChange={e => setTotal(e.target.value)} required />
      </div>
      
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Asignación por Categorías</p>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="form-label">Producción</label><input className="input-field" type="number" min="0" step="0.01" value={produccion} onChange={e => setProduccion(e.target.value)} /></div>
        <div><label className="form-label">Logística</label><input className="input-field" type="number" min="0" step="0.01" value={logistica} onChange={e => setLogistica(e.target.value)} /></div>
        <div><label className="form-label">Personal</label><input className="input-field" type="number" min="0" step="0.01" value={personal} onChange={e => setPersonal(e.target.value)} /></div>
        <div><label className="form-label">Venue</label><input className="input-field" type="number" min="0" step="0.01" value={venue} onChange={e => setVenue(e.target.value)} /></div>
        <div><label className="form-label">Pauta Publicitaria</label><input className="input-field" type="number" min="0" step="0.01" value={pauta} onChange={e => setPauta(e.target.value)} /></div>
        <div><label className="form-label">Otros</label><input className="input-field" type="number" min="0" step="0.01" value={otros} onChange={e => setOtros(e.target.value)} /></div>
      </div>

      <div className={`mt-2 p-3 rounded text-xs font-semibold ${difference === 0 ? 'bg-emerald-50 text-emerald-700' : difference > 0 ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`}>
        Sumatoria de categorías: {money(sumCategories)} <br/>
        Diferencia vs Total: {money(difference)} {difference !== 0 && '(Se recomienda cuadrar a $0)'}
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" className="btn-secondary flex-1" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn-primary flex-1" disabled={loading}>{loading ? 'Guardando...' : 'Guardar Presupuesto'}</button>
      </div>
    </form>
  )
}

export default function BudgetPage() {
  const { isAdmin } = useAuth()
  const [budget, setBudget] = useState(null)
  const [gastos, setGastos] = useState([])
  const [pautas, setPautas] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const [resBudget, resGastos, resPautas] = await Promise.all([
      supabase.from('presupuesto_general').select('*').eq('id', 1).single(),
      supabase.from('gastos').select('categoria, monto'),
      supabase.from('pautas').select('monto')
    ])
    
    if (resBudget.error && resBudget.error.code !== 'PGRST116') toast.error('Error al cargar presupuesto')
    
    setBudget(resBudget.data || { total: 0, produccion: 0, logistica: 0, personal: 0, venue: 0, pauta: 0, otros: 0 })
    setGastos(resGastos.data || [])
    setPautas(resPautas.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const stats = useMemo(() => {
    if (!budget) return null
    const spent = {
      produccion: gastos.filter(g => g.categoria === 'Producción').reduce((a, b) => a + Number(b.monto), 0),
      logistica: gastos.filter(g => g.categoria === 'Logística').reduce((a, b) => a + Number(b.monto), 0),
      personal: gastos.filter(g => g.categoria === 'Personal').reduce((a, b) => a + Number(b.monto), 0),
      venue: gastos.filter(g => g.categoria === 'Venue').reduce((a, b) => a + Number(b.monto), 0),
      otros: gastos.filter(g => g.categoria === 'Otro').reduce((a, b) => a + Number(b.monto), 0),
      pauta: pautas.reduce((a, b) => a + Number(b.monto), 0)
    }

    const totalSpent = Object.values(spent).reduce((a, b) => a + b, 0)
    
    return {
      total: { assigned: Number(budget.total), spent: totalSpent },
      categories: [
        { name: 'Producción', assigned: Number(budget.produccion), spent: spent.produccion },
        { name: 'Logística', assigned: Number(budget.logistica), spent: spent.logistica },
        { name: 'Personal', assigned: Number(budget.personal), spent: spent.personal },
        { name: 'Venue', assigned: Number(budget.venue), spent: spent.venue },
        { name: 'Pauta Publicitaria', assigned: Number(budget.pauta), spent: spent.pauta },
        { name: 'Otros', assigned: Number(budget.otros), spent: spent.otros },
      ]
    }
  }, [budget, gastos, pautas])

  async function handleSave(values) {
    setSaving(true)
    values.id = 1 // Ensure singleton ID
    const { error } = await supabase.from('presupuesto_general').upsert(values, { onConflict: 'id' })
    if (error) {
      toast.error('Error al guardar: ' + error.message)
    } else {
      toast.success('Presupuesto actualizado')
      await load()
    }
    setSaving(false)
    setModalOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-1">
            <span>Dashboard</span><span>/</span><span className="text-slate-700">Planeación</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Presupuesto Inicial</h1>
          <p className="text-sm mt-1 text-slate-500">Compara el presupuesto planeado vs el gasto real.</p>
        </div>
        {isAdmin && <button className="btn-primary" onClick={() => setModalOpen(true)}><Pencil size={16} /> Configurar Presupuesto</button>}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="spinner" /></div>
      ) : !stats ? (
        <p>No hay datos</p>
      ) : (
        <>
          <div className="glass-card p-8">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2"><Calculator size={16}/> Resumen General</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Presupuesto Total</p>
                <p className="text-3xl font-bold text-slate-900">{money(stats.total.assigned)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Gasto Real Acumulado</p>
                <p className="text-3xl font-bold text-slate-900">{money(stats.total.spent)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Restante</p>
                <p className={`text-3xl font-bold ${stats.total.assigned - stats.total.spent >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {money(stats.total.assigned - stats.total.spent)}
                </p>
              </div>
            </div>
            <div className="mt-6">
              <ProgressBar pct={stats.total.assigned > 0 ? (stats.total.spent / stats.total.assigned) * 100 : 0} />
            </div>
          </div>

          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mt-8 mb-4">Desglose por Categoría</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.categories.map(c => {
              const diff = c.assigned - c.spent
              const pct = c.assigned > 0 ? (c.spent / c.assigned) * 100 : c.spent > 0 ? 100 : 0
              return (
                <div key={c.name} className="glass-card p-5 hover:border-slate-300 transition-colors">
                  <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
                    <h3 className="font-bold text-slate-900">{c.name}</h3>
                    {pct <= 80 ? <CheckCircle2 size={16} className="text-emerald-500" /> : <AlertTriangle size={16} className={pct > 100 ? 'text-red-500' : 'text-amber-500'}/>}
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-slate-500">Asignado:</span><span className="font-semibold text-slate-900">{money(c.assigned)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Gastado:</span><span className="font-semibold text-slate-900">{money(c.spent)}</span></div>
                    <div className="flex justify-between pt-2 mt-2 border-t border-gray-50"><span className="text-slate-500">Diferencia:</span><span className={`font-bold ${diff >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{money(diff)}</span></div>
                  </div>
                  <ProgressBar pct={pct} />
                </div>
              )
            })}
          </div>
        </>
      )}

      {modalOpen && <Modal title="Configurar Presupuesto" onClose={() => setModalOpen(false)}><BudgetForm initial={budget} loading={saving} onSave={handleSave} onCancel={() => setModalOpen(false)} /></Modal>}
    </div>
  )
}
