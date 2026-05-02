import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Plus, Pencil, Trash2, X, Search, DollarSign, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { createBasePDF, tableStyles, money } from '../lib/pdfExport'

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
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 sm:col-span-1"><label className="form-label">Concepto *</label><input className="input-field" placeholder="Ej. Renta de equipo" value={nombre} onChange={e => setNombre(e.target.value)} required /></div>
        <div className="col-span-2 sm:col-span-1"><label className="form-label">Proveedor *</label><input className="input-field" placeholder="Ej. AudioMex" value={proveedor} onChange={e => setProveedor(e.target.value)} required /></div>
        <div className="col-span-2 sm:col-span-1"><label className="form-label">Categoría *</label><select className="input-field" value={categoria} onChange={e => setCategoria(e.target.value)}>{CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
        <div className="col-span-2 sm:col-span-1"><label className="form-label">Monto ($ MXN) *</label><input className="input-field" type="number" min="0" step="0.01" value={monto} onChange={e => setMonto(e.target.value)} required /></div>
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

export default function ExpensesPage() {
  const { isAdmin } = useAuth()
  const [gastos, setGastos] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('Todas')
  const [modalMode, setModalMode] = useState(null)
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
      money(g.monto)
    ])

    const total = filtered.reduce((acc, g) => acc + Number(g.monto), 0)
    body.push([{ content: 'Total', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } }, { content: money(total), styles: { fontStyle: 'bold', halign: 'right' } }])

    doc.autoTable({
      ...tableStyles,
      startY: 45,
      head: [['Concepto', 'Proveedor', 'Categoría', 'Fecha', 'Monto']],
      body: body,
      columnStyles: {
        4: { halign: 'right' },
      }
    })

    doc.save('kidopolis-gastos.pdf')
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-1">
            <span>Dashboard</span><span>/</span><span className="text-slate-700">Finanzas</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Gastos Generales</h1>
          <p className="text-sm mt-1 text-slate-500">Administra el presupuesto, proveedores y egresos del evento.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={exportPDF}><Download size={16} /> Exportar</button>
          {isAdmin && <button className="btn-primary" onClick={() => { setSelected(null); setModalMode('create') }}><Plus size={16} /> Registrar Gasto</button>}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input-field pl-9" placeholder="Buscar por concepto o proveedor..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
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
                <th className="px-5 py-3">Fecha</th>
                <th className="px-5 py-3 text-right">Monto (MXN)</th>
                {isAdmin && <th className="px-5 py-3 w-20"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(g => (
                <tr key={g.id} className="hover:bg-slate-50 group transition-colors">
                  <td data-label="Concepto" className="px-5 py-3 font-medium text-slate-900">{g.nombre}</td>
                  <td data-label="Proveedor" className="px-5 py-3 text-slate-600">{g.proveedor}</td>
                  <td data-label="Categoría" className="px-5 py-3">
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-slate-200">{g.categoria}</span>
                  </td>
                  <td data-label="Fecha" className="px-5 py-3 text-slate-500 text-xs tabular-nums">{fmtDateLocal(g.fecha)}</td>
                  <td data-label="Monto (MXN)" className="px-5 py-3 text-right font-bold text-slate-900 tabular-nums">{money(g.monto)}</td>
                  {isAdmin && (
                    <td data-label="Acciones" className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-1.5 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="btn-edit !p-1.5" onClick={() => { setSelected(g); setModalMode('edit') }} title="Editar"><Pencil size={14} /></button>
                        <button className="btn-danger !p-1.5 hover:bg-red-50 hover:text-red-600 hover:border-red-200" onClick={() => handleDelete(g.id)} title="Eliminar"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalMode && <Modal title={modalMode === 'create' ? 'Registrar Gasto' : 'Editar Gasto'} onClose={() => { setModalMode(null); setSelected(null) }}><GastoForm initial={selected} loading={saving} onSave={handleSave} onCancel={() => { setModalMode(null); setSelected(null) }} /></Modal>}
    </div>
  )
}
