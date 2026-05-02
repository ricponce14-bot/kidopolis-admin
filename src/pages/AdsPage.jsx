import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Plus, Pencil, Trash2, X, Search, Megaphone, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { createBasePDF, tableStyles, money } from '../lib/pdfExport'

const PLATAFORMAS = ['Meta', 'Google', 'TikTok', 'Instagram', 'Otra']
const OBJETIVOS = ['Awareness', 'Conversión', 'Tráfico', 'Interacción', 'Leads', 'Otro']

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

function PautaForm({ initial, onSave, onCancel, loading }) {
  const [plataforma, setPlataforma] = useState(initial?.plataforma ?? 'Meta')
  const [nombre, setNombre] = useState(initial?.nombre ?? '')
  const [objetivo, setObjetivo] = useState(initial?.objetivo ?? 'Conversión')
  const [monto, setMonto] = useState(initial?.monto ?? '')
  const [fechaIni, setFechaIni] = useState(initial?.fecha_inicio ?? new Date().toISOString().split('T')[0])
  const [fechaFin, setFechaFin] = useState(initial?.fecha_fin ?? new Date().toISOString().split('T')[0])

  function handleSubmit(e) {
    e.preventDefault()
    if (!nombre.trim()) return toast.error('El nombre de la campaña es requerido')
    if (Number(monto) < 0) return toast.error('La inversión no puede ser negativa')
    if (new Date(fechaFin) < new Date(fechaIni)) return toast.error('La fecha final no puede ser anterior a la inicial')
      
    onSave({ plataforma, nombre: nombre.trim(), objetivo, monto: Number(monto), fecha_inicio: fechaIni, fecha_fin: fechaFin })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="col-span-2 sm:col-span-1"><label className="form-label">Plataforma *</label><select className="input-field" value={plataforma} onChange={e => setPlataforma(e.target.value)}>{PLATAFORMAS.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
        <div className="col-span-2 sm:col-span-1"><label className="form-label">Nombre *</label><input className="input-field" placeholder="Ej. Preventa Fase 1" value={nombre} onChange={e => setNombre(e.target.value)} required /></div>
        <div className="col-span-2 sm:col-span-1"><label className="form-label">Objetivo *</label><select className="input-field" value={objetivo} onChange={e => setObjetivo(e.target.value)}>{OBJETIVOS.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
        <div className="col-span-2 sm:col-span-1"><label className="form-label">Inversión ($ MXN) *</label><input className="input-field" type="number" min="0" step="0.01" value={monto} onChange={e => setMonto(e.target.value)} required /></div>
        <div className="col-span-2 sm:col-span-1"><label className="form-label">Fecha de inicio *</label><input className="input-field" type="date" value={fechaIni} onChange={e => setFechaIni(e.target.value)} required /></div>
        <div className="col-span-2 sm:col-span-1"><label className="form-label">Fecha de fin *</label><input className="input-field" type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} required /></div>
      </div>
      <div className="flex gap-3 pt-4">
        <button type="button" className="btn-secondary flex-1" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn-primary flex-1" disabled={loading}>{loading ? 'Guardando...' : 'Guardar Campaña'}</button>
      </div>
    </form>
  )
}

export default function AdsPage() {
  const { isAdmin } = useAuth()
  const [pautas, setPautas] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [platFilter, setPlatFilter] = useState('Todas')
  const [modalMode, setModalMode] = useState(null)
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('pautas').select('*').order('fecha_inicio', { ascending: false })
    if (error) toast.error('Error al cargar campañas')
    setPautas(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => pautas.filter(p => (platFilter === 'Todas' || p.plataforma === platFilter) && (p.nombre?.toLowerCase().includes(search.toLowerCase()))), [pautas, search, platFilter])

  async function handleSave(values) {
    setSaving(true)
    const { error } = modalMode === 'create' ? await supabase.from('pautas').insert([values]) : await supabase.from('pautas').update(values).eq('id', selected.id)
    if (error) {
      toast.error(error.message)
    } else { 
      toast.success(modalMode === 'create' ? 'Campaña registrada' : 'Campaña actualizada')
      await load() 
    }
    setSaving(false); setModalMode(null); setSelected(null)
  }

  async function handleDelete(id) {
    if (!window.confirm('¿Estás seguro de eliminar esta campaña?')) return
    const { error } = await supabase.from('pautas').delete().eq('id', id)
    if (error) {
      toast.error('Error al eliminar')
    } else {
      toast.success('Campaña eliminada')
      setPautas(prev => prev.filter(p => p.id !== id))
    }
  }

  function exportPDF() {
    const doc = createBasePDF('Reporte de Campañas (Pauta Publicitaria)')
    
    const body = filtered.map(p => [
      p.nombre,
      p.plataforma,
      p.objetivo,
      `${fmtDateLocal(p.fecha_inicio)} - ${fmtDateLocal(p.fecha_fin)}`,
      money(p.monto)
    ])

    const total = filtered.reduce((acc, p) => acc + Number(p.monto), 0)
    body.push([{ content: 'Total', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } }, { content: money(total), styles: { fontStyle: 'bold', halign: 'right' } }])

    doc.autoTable({
      ...tableStyles,
      startY: 45,
      head: [['Campaña', 'Plataforma', 'Objetivo', 'Fechas', 'Inversión']],
      body: body,
      columnStyles: {
        4: { halign: 'right' },
      }
    })

    doc.save('kidopolis-pautas.pdf')
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-1">
            <span>Dashboard</span><span>/</span><span className="text-slate-700">Publicidad</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Pauta Publicitaria</h1>
          <p className="text-sm mt-1 text-slate-500">Administra la inversión en anuncios y campañas digitales.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={exportPDF}><Download size={16} /> Exportar</button>
          {isAdmin && <button className="btn-primary" onClick={() => { setSelected(null); setModalMode('create') }}><Plus size={16} /> Nueva Campaña</button>}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input-field pl-9" placeholder="Buscar por nombre..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {['Todas', ...PLATAFORMAS].map(p => (
            <button key={p} onClick={() => setPlatFilter(p)} className={`px-3 py-1.5 rounded text-xs font-semibold border transition-colors ${platFilter === p ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-gray-200 hover:bg-slate-50'}`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-16 flex flex-col items-center justify-center text-slate-400 border-dashed border-2 bg-slate-50/50">
          <Megaphone size={32} className="mb-4 opacity-50 text-slate-400" />
          <p className="font-semibold text-slate-700">No hay campañas registradas</p>
          <p className="text-sm text-slate-500 mt-1">{search || platFilter !== 'Todas' ? 'Intenta con otros filtros de búsqueda.' : 'Crea tu primera campaña para empezar a registrar.'}</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm text-left responsive-table">
            <thead className="bg-slate-50 border-b border-gray-200 text-slate-500 text-xs uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-3">Campaña</th>
                <th className="px-5 py-3">Plataforma</th>
                <th className="px-5 py-3">Objetivo</th>
                <th className="px-5 py-3">Fechas</th>
                <th className="px-5 py-3 text-right">Inversión (MXN)</th>
                {isAdmin && <th className="px-5 py-3 w-20"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 group transition-colors">
                  <td data-label="Campaña" className="px-5 py-3 font-medium text-slate-900">{p.nombre}</td>
                  <td data-label="Plataforma" className="px-5 py-3">
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-slate-200">{p.plataforma}</span>
                  </td>
                  <td data-label="Objetivo" className="px-5 py-3 text-slate-600">{p.objetivo}</td>
                  <td data-label="Fechas" className="px-5 py-3 text-slate-500 text-xs tabular-nums">{fmtDateLocal(p.fecha_inicio)} - {fmtDateLocal(p.fecha_fin)}</td>
                  <td data-label="Inversión (MXN)" className="px-5 py-3 text-right font-bold text-slate-900 tabular-nums">{money(p.monto)}</td>
                  {isAdmin && (
                    <td data-label="Acciones" className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-1.5 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="btn-edit !p-1.5" onClick={() => { setSelected(p); setModalMode('edit') }} title="Editar"><Pencil size={14} /></button>
                        <button className="btn-danger !p-1.5 hover:bg-red-50 hover:text-red-600 hover:border-red-200" onClick={() => handleDelete(p.id)} title="Eliminar"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalMode && <Modal title={modalMode === 'create' ? 'Registrar Campaña' : 'Editar Campaña'} onClose={() => { setModalMode(null); setSelected(null) }}><PautaForm initial={selected} loading={saving} onSave={handleSave} onCancel={() => { setModalMode(null); setSelected(null) }} /></Modal>}
    </div>
  )
}
