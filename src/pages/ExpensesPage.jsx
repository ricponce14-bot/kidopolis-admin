import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Plus, Pencil, Trash2, X, Search, DollarSign, Download, CreditCard } from 'lucide-react'
import toast from 'react-hot-toast'
import { createBasePDF, tableStyles, money, autoTable } from '../lib/pdfExport'

const CATEGORIAS = ['Producción', 'Logística', 'Personal', 'Venue', 'Otro']

function fmtDateLocal(d) { 
  if (!d) return ''
  const date = new Date(d)
  date.setMinutes(date.getMinutes() + date.getTimezoneOffset())
  return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center md:p-4 mobile-fullscreen-modal-container">
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white rounded-lg border border-gray-200 shadow-xl relative w-full max-w-lg p-6 animate-fade-in z-10 mobile-fullscreen-modal overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-lg text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

function GastoForm({ initial, onSave, onCancel, loading }) {
  const [nombre, setNombre] = useState(initial?.nombre ?? '')
  const [categoria, setCategoria] = useState(initial?.categoria ?? 'Producción')
  const [proveedor, setProveedor] = useState(initial?.proveedor ?? '')
  const [monto, setMonto] = useState(initial?.monto ?? '')
  const [fecha, setFecha] = useState(initial?.fecha ?? new Date().toISOString().split('T')[0])
  const [notas, setNotas] = useState(initial?.notas ?? '')

  function handleSubmit(e) {
    e.preventDefault()
    if (!nombre.trim()) return toast.error('El nombre es requerido')
    if (!proveedor.trim()) return toast.error('El proveedor es requerido')
    if (Number(monto) < 0) return toast.error('El monto no puede ser negativo')
    onSave({ nombre: nombre.trim(), categoria, proveedor: proveedor.trim(), monto: Number(monto), fecha, notas })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="col-span-2 sm:col-span-1"><label className="form-label">Concepto *</label><input className="input-field" placeholder="Ej. Renta de equipo" value={nombre} onChange={e => setNombre(e.target.value)} required /></div>
        <div className="col-span-2 sm:col-span-1"><label className="form-label">Proveedor *</label><input className="input-field" placeholder="Ej. AudioMex" value={proveedor} onChange={e => setProveedor(e.target.value)} required /></div>
        <div className="col-span-2 sm:col-span-1"><label className="form-label">Categoría *</label><select className="input-field" value={categoria} onChange={e => setCategoria(e.target.value)}>{CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
        <div className="col-span-2 sm:col-span-1"><label className="form-label">Monto Total ($ MXN) *</label><input className="input-field" type="number" min="0" step="0.01" value={monto} onChange={e => setMonto(e.target.value)} required /></div>
        <div className="col-span-2 sm:col-span-1"><label className="form-label">Fecha *</label><input className="input-field" type="date" value={fecha} onChange={e => setFecha(e.target.value)} required /></div>
        <div className="col-span-2"><label className="form-label">Notas (Opcional)</label><textarea className="input-field resize-none" rows={2} placeholder="Detalles adicionales..." value={notas} onChange={e => setNotas(e.target.value)} /></div>
      </div>
      <div className="flex gap-3 pt-4">
        <button type="button" className="btn-secondary flex-1" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn-primary flex-1" disabled={loading}>{loading ? 'Guardando...' : 'Guardar Gasto'}</button>
      </div>
    </form>
  )
}

function AbonoForm({ gasto, onSave, onCancel, loading }) {
  const pendiente = Number(gasto.monto) - Number(gasto.pagado || 0)
  const [cantidad, setCantidad] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const val = Number(cantidad)
    if (val <= 0) return toast.error('El abono debe ser mayor a $0')
    if (val > pendiente) return toast.error(`El abono no puede ser mayor al pendiente (${money(pendiente)})`)
    onSave(val)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
        <div className="flex justify-between text-sm"><span className="text-slate-500">Concepto:</span><span className="font-semibold text-slate-900">{gasto.nombre}</span></div>
        <div className="flex justify-between text-sm"><span className="text-slate-500">Monto Total:</span><span className="font-semibold text-slate-900">{money(gasto.monto)}</span></div>
        <div className="flex justify-between text-sm"><span className="text-slate-500">Ya pagado:</span><span className="font-semibold text-emerald-600">{money(gasto.pagado || 0)}</span></div>
        <div className="flex justify-between text-sm border-t border-slate-200 pt-2 mt-2"><span className="text-slate-500 font-bold">Pendiente:</span><span className="font-bold text-red-600">{money(pendiente)}</span></div>
      </div>
      <div>
        <label className="form-label">Cantidad a abonar ($ MXN) *</label>
        <input className="input-field text-lg font-bold" type="number" min="0.01" max={pendiente} step="0.01" value={cantidad} onChange={e => setCantidad(e.target.value)} required autoFocus placeholder={`Máx: ${money(pendiente)}`} />
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" className="btn-secondary flex-1" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn-primary flex-1" disabled={loading}>{loading ? 'Procesando...' : 'Registrar Abono'}</button>
      </div>
    </form>
  )
}

export default function ExpensesPage() {
  const { isAdmin } = useAuth()
  const [gastos, setGastos] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('Todas')
  const [modalMode, setModalMode] = useState(null) // 'create' | 'edit' | 'abono'
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('gastos').select('*').order('fecha', { ascending: false })
    if (error) toast.error('Error al cargar gastos')
    setGastos(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => gastos.filter(g => (catFilter === 'Todas' || g.categoria === catFilter) && (g.nombre?.toLowerCase().includes(search.toLowerCase()) || g.proveedor?.toLowerCase().includes(search.toLowerCase()))), [gastos, search, catFilter])

  // Stats
  const totals = useMemo(() => {
    const totalMonto = gastos.reduce((a, g) => a + Number(g.monto), 0)
    const totalPagado = gastos.reduce((a, g) => a + Number(g.pagado || 0), 0)
    return { totalMonto, totalPagado, totalPendiente: totalMonto - totalPagado }
  }, [gastos])

  async function handleSave(values) {
    setSaving(true)
    const { error } = modalMode === 'create' ? await supabase.from('gastos').insert([values]) : await supabase.from('gastos').update(values).eq('id', selected.id)
    if (error) {
      toast.error(error.message)
    } else { 
      toast.success(modalMode === 'create' ? 'Gasto registrado exitosamente' : 'Gasto actualizado')
      await load() 
    }
    setSaving(false); setModalMode(null); setSelected(null)
  }

  async function handleAbono(cantidad) {
    setSaving(true)
    const nuevoPagado = Number(selected.pagado || 0) + cantidad
    const { error } = await supabase.from('gastos').update({ pagado: nuevoPagado }).eq('id', selected.id)
    if (error) {
      toast.error('Error al registrar abono: ' + error.message)
    } else {
      toast.success(`Abono de ${money(cantidad)} registrado correctamente`)
      await load()
    }
    setSaving(false); setModalMode(null); setSelected(null)
  }

  async function handleDelete(id) {
    if (!window.confirm('¿Estás seguro de eliminar este gasto? No podrá recuperarse.')) return
    const { error } = await supabase.from('gastos').delete().eq('id', id)
    if (error) {
      toast.error('Error al eliminar')
    } else {
      toast.success('Gasto eliminado')
      setGastos(prev => prev.filter(g => g.id !== id))
    }
  }

  function exportPDF() {
    const doc = createBasePDF('Reporte de Gastos Generales')
    
    const body = filtered.map(g => [
      g.nombre,
      g.proveedor,
      g.categoria,
      fmtDateLocal(g.fecha),
      money(g.monto),
      money(g.pagado || 0),
      money(Number(g.monto) - Number(g.pagado || 0))
    ])

    const totalM = filtered.reduce((acc, g) => acc + Number(g.monto), 0)
    const totalP = filtered.reduce((acc, g) => acc + Number(g.pagado || 0), 0)
    body.push([
      { content: 'Totales', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } }, 
      { content: money(totalM), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: money(totalP), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: money(totalM - totalP), styles: { fontStyle: 'bold', halign: 'right' } }
    ])

    autoTable(doc, {
      ...tableStyles,
      startY: 45,
      head: [['Concepto', 'Proveedor', 'Categoría', 'Fecha', 'Monto', 'Pagado', 'Pendiente']],
      body: body,
      columnStyles: { 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' } }
    })

    doc.save('kidopolis-gastos.pdf')
  }

  function getStatusBadge(g) {
    const pagado = Number(g.pagado || 0)
    const monto = Number(g.monto)
    if (pagado >= monto) return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border bg-emerald-50 text-emerald-600 border-emerald-200">Pagado</span>
    if (pagado > 0) return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border bg-amber-50 text-amber-600 border-amber-200">Parcial</span>
    return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border bg-red-50 text-red-600 border-red-200">Pendiente</span>
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-1">
            <span>Dashboard</span><span>/</span><span className="text-slate-700">Finanzas</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Gastos Generales</h1>
          <p className="text-sm mt-1 text-slate-500">Administra gastos, abonos y pagos pendientes del evento.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={exportPDF}><Download size={16} /> Exportar</button>
          {isAdmin && <button className="btn-primary" onClick={() => { setSelected(null); setModalMode('create') }}><Plus size={16} /> Registrar Gasto</button>}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-slate-100 border border-slate-200 flex items-center justify-center"><DollarSign size={18} className="text-slate-600" /></div>
          <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Comprometido</p><p className="text-xl font-bold text-slate-900">{money(totals.totalMonto)}</p></div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-emerald-50 border border-emerald-200 flex items-center justify-center"><CreditCard size={18} className="text-emerald-600" /></div>
          <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Pagado</p><p className="text-xl font-bold text-emerald-600">{money(totals.totalPagado)}</p></div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-red-50 border border-red-200 flex items-center justify-center"><DollarSign size={18} className="text-red-600" /></div>
          <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Pendiente</p><p className="text-xl font-bold text-red-600">{money(totals.totalPendiente)}</p></div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input-field pl-9" placeholder="Buscar por concepto o proveedor..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['Todas', ...CATEGORIAS].map(c => (
            <button key={c} onClick={() => setCatFilter(c)} className={`px-3 py-1.5 rounded text-xs font-semibold border transition-colors ${catFilter === c ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-gray-200 hover:bg-slate-50'}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-16 flex flex-col items-center justify-center text-slate-400 border-dashed border-2 bg-slate-50/50">
          <DollarSign size={32} className="mb-4 opacity-50 text-slate-400" />
          <p className="font-semibold text-slate-700">No hay gastos registrados</p>
          <p className="text-sm text-slate-500 mt-1">{search || catFilter !== 'Todas' ? 'Intenta con otros filtros de búsqueda.' : 'Registra el primer gasto para empezar.'}</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm text-left responsive-table">
            <thead className="bg-slate-50 border-b border-gray-200 text-slate-500 text-xs uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-3">Concepto</th>
                <th className="px-5 py-3">Proveedor</th>
                <th className="px-5 py-3">Categoría</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3 text-right">Monto</th>
                <th className="px-5 py-3 text-right">Pagado</th>
                <th className="px-5 py-3 text-right">Pendiente</th>
                {isAdmin && <th className="px-5 py-3 w-28"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(g => {
                const pagado = Number(g.pagado || 0)
                const pendiente = Number(g.monto) - pagado
                const pctPagado = Number(g.monto) > 0 ? (pagado / Number(g.monto)) * 100 : 0
                return (
                  <tr key={g.id} className="hover:bg-slate-50 group transition-colors">
                    <td data-label="Concepto" className="px-5 py-3">
                      <p className="font-medium text-slate-900">{g.nombre}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{fmtDateLocal(g.fecha)}</p>
                    </td>
                    <td data-label="Proveedor" className="px-5 py-3 text-slate-600">{g.proveedor}</td>
                    <td data-label="Categoría" className="px-5 py-3">
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-slate-200">{g.categoria}</span>
                    </td>
                    <td data-label="Estado" className="px-5 py-3">
                      {getStatusBadge(g)}
                      {pctPagado > 0 && pctPagado < 100 && (
                        <div className="w-16 h-1 rounded-full bg-slate-100 mt-1.5 overflow-hidden">
                          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pctPagado}%` }} />
                        </div>
                      )}
                    </td>
                    <td data-label="Monto" className="px-5 py-3 text-right font-semibold text-slate-900 tabular-nums">{money(g.monto)}</td>
                    <td data-label="Pagado" className="px-5 py-3 text-right font-semibold text-emerald-600 tabular-nums">{money(pagado)}</td>
                    <td data-label="Pendiente" className="px-5 py-3 text-right font-bold tabular-nums" style={{ color: pendiente > 0 ? '#dc2626' : '#16a34a' }}>{money(pendiente)}</td>
                    {isAdmin && (
                      <td data-label="Acciones" className="px-5 py-3 text-right">
                        <div className="flex justify-end gap-1.5 md:opacity-0 group-hover:opacity-100 transition-opacity">
                          {pendiente > 0 && (
                            <button className="btn-edit !p-1.5 !bg-emerald-50 !text-emerald-600 !border-emerald-200 hover:!bg-emerald-100" onClick={() => { setSelected(g); setModalMode('abono') }} title="Abonar">
                              <CreditCard size={14} />
                            </button>
                          )}
                          <button className="btn-edit !p-1.5" onClick={() => { setSelected(g); setModalMode('edit') }} title="Editar"><Pencil size={14} /></button>
                          <button className="btn-danger !p-1.5 hover:bg-red-50 hover:text-red-600 hover:border-red-200" onClick={() => handleDelete(g.id)} title="Eliminar"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {(modalMode === 'create' || modalMode === 'edit') && (
        <Modal title={modalMode === 'create' ? 'Registrar Gasto' : 'Editar Gasto'} onClose={() => { setModalMode(null); setSelected(null) }}>
          <GastoForm initial={selected} loading={saving} onSave={handleSave} onCancel={() => { setModalMode(null); setSelected(null) }} />
        </Modal>
      )}
      {modalMode === 'abono' && selected && (
        <Modal title="Registrar Abono" onClose={() => { setModalMode(null); setSelected(null) }}>
          <AbonoForm gasto={selected} loading={saving} onSave={handleAbono} onCancel={() => { setModalMode(null); setSelected(null) }} />
        </Modal>
      )}
    </div>
  )
}
