import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Plus, Pencil, Trash2, X, Search, Ticket, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { createBasePDF, tableStyles, money, fmt, autoTable } from '../lib/pdfExport'

const ZONAS = ['Zona Kids', 'Zona Pop', 'Zona Mágica']
const PRECIO_DEFAULT = { 'Zona Kids': 200, 'Zona Pop': 350, 'Zona Mágica': 450 }

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

function PuntoForm({ initial, onSave, onCancel, loading }) {
  const [nombre, setNombre] = useState(initial?.nombre ?? '')
  const [zona, setZona] = useState(initial?.zona ?? 'Zona Kids')
  const [folioIni, setFolioIni] = useState(initial?.folio_inicial ?? '')
  const [folioFin, setFolioFin] = useState(initial?.folio_final ?? '')
  const [vendidos, setVendidos] = useState(initial?.boletos_vendidos ?? 0)
  const [precio, setPrecio] = useState(initial?.precio_unitario ?? PRECIO_DEFAULT['Zona Kids'])

  function handleZona(z) {
    setZona(z)
    if (!initial) setPrecio(PRECIO_DEFAULT[z])
  }

  const asignados = folioIni && folioFin ? Math.max(0, Number(folioFin) - Number(folioIni) + 1) : 0
  const restantes = Math.max(0, asignados - Number(vendidos))
  const ingresos = Number(vendidos) * Number(precio)

  function handleSubmit(e) {
    e.preventDefault()
    if (!nombre.trim()) return toast.error('El nombre es requerido')
    if (Number(folioFin) < Number(folioIni)) return toast.error('El folio final debe ser mayor al inicial')
    if (Number(vendidos) > asignados) return toast.error('Boletos vendidos no pueden superar los asignados')
    
    onSave({ nombre: nombre.trim(), zona, folio_inicial: Number(folioIni), folio_final: Number(folioFin), boletos_vendidos: Number(vendidos), precio_unitario: Number(precio) })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2"><label className="form-label">Punto de venta *</label><input className="input-field" value={nombre} onChange={e => setNombre(e.target.value)} required placeholder="Ej. Taquilla Sur" /></div>
        <div><label className="form-label">Zona *</label><select className="input-field" value={zona} onChange={e => handleZona(e.target.value)}>{ZONAS.map(z => <option key={z} value={z}>{z}</option>)}</select></div>
        <div><label className="form-label">Precio ($ MXN) *</label><input className="input-field" type="number" min="0" step="0.01" value={precio} onChange={e => setPrecio(e.target.value)} required /></div>
        <div><label className="form-label">Folio inicial *</label><input className="input-field" type="number" min="1" value={folioIni} onChange={e => setFolioIni(e.target.value)} required /></div>
        <div><label className="form-label">Folio final *</label><input className="input-field" type="number" min="1" value={folioFin} onChange={e => setFolioFin(e.target.value)} required /></div>
        <div className="sm:col-span-2"><label className="form-label">Boletos vendidos</label><input className="input-field" type="number" min="0" max={asignados || undefined} value={vendidos} onChange={e => setVendidos(e.target.value)} /></div>
      </div>
      {asignados > 0 && (
        <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 border border-slate-200 rounded text-center mt-2">
          <div><p className="font-bold text-slate-800">{fmt(asignados)}</p><p className="text-[10px] uppercase font-bold text-slate-500">Asignados</p></div>
          <div><p className="font-bold text-slate-800">{fmt(restantes)}</p><p className="text-[10px] uppercase font-bold text-slate-500">Restantes</p></div>
          <div><p className="font-bold text-emerald-600">{money(ingresos)}</p><p className="text-[10px] uppercase font-bold text-slate-500">Ingresos</p></div>
        </div>
      )}
      <div className="flex gap-3 pt-4">
        <button type="button" className="btn-secondary flex-1" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn-primary flex-1" disabled={loading}>{loading ? 'Guardando...' : 'Guardar Punto'}</button>
      </div>
    </form>
  )
}

export default function TicketsPage() {
  const { isAdmin } = useAuth()
  const [puntos, setPuntos] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [zonaFilter, setZonaFilter] = useState('Todas')
  const [modalMode, setModalMode] = useState(null)
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('puntos_venta').select('*').order('zona').order('nombre')
    if (error) toast.error('Error al cargar puntos de venta')
    setPuntos(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => puntos.filter(p => (zonaFilter === 'Todas' || p.zona === zonaFilter) && (p.nombre?.toLowerCase().includes(search.toLowerCase()))), [puntos, search, zonaFilter])

  async function handleSave(values) {
    setSaving(true)
    const { error } = modalMode === 'create' 
      ? await supabase.from('puntos_venta').insert([values]) 
      : await supabase.from('puntos_venta').update(values).eq('id', selected.id)
    
    if (error) {
      toast.error(error.message)
    } else { 
      toast.success(modalMode === 'create' ? 'Punto de venta registrado' : 'Punto de venta actualizado')
      await load() 
    }
    setSaving(false); setModalMode(null); setSelected(null)
  }

  async function handleDelete(id) {
    if (!window.confirm('¿Estás seguro de eliminar este punto de venta? Los datos no podrán recuperarse.')) return
    const { error } = await supabase.from('puntos_venta').delete().eq('id', id)
    if (error) {
      toast.error('Error al eliminar')
    } else {
      toast.success('Punto de venta eliminado')
      setPuntos(prev => prev.filter(p => p.id !== id))
    }
  }

  function exportPDF() {
    const doc = createBasePDF('Reporte de Puntos de Venta (Boletaje)')
    
    const body = filtered.map(p => {
      const asignados = p.folio_final - p.folio_inicial + 1
      const ingresos = p.boletos_vendidos * p.precio_unitario
      return [
        p.nombre,
        p.zona,
        `${fmt(p.folio_inicial)} - ${fmt(p.folio_final)}`,
        fmt(asignados),
        fmt(p.boletos_vendidos),
        money(ingresos)
      ]
    })

    autoTable(doc, {
      ...tableStyles,
      startY: 45,
      head: [['Punto de Venta', 'Zona', 'Folios', 'Asignados', 'Vendidos', 'Ingresos']],
      body: body,
      columnStyles: {
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
      }
    })

    doc.save('kidopolis-boletaje.pdf')
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-1">
            <span>Dashboard</span><span>/</span><span className="text-slate-700">Boletaje</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Control de Boletos</h1>
          <p className="text-sm mt-1 text-slate-500">Administra folios, precios e ingresos por punto de venta.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={exportPDF}><Download size={16} /> Exportar</button>
          {isAdmin && <button className="btn-primary" onClick={() => { setSelected(null); setModalMode('create') }}><Plus size={16} /> Nuevo Punto</button>}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input-field pl-9" placeholder="Buscar por nombre..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {['Todas', ...ZONAS].map(z => (
            <button key={z} onClick={() => setZonaFilter(z)} className={`px-3 py-1.5 rounded text-xs font-semibold border transition-colors ${zonaFilter === z ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-gray-200 hover:bg-slate-50'}`}>
              {z}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-16 flex flex-col items-center justify-center text-slate-400 border-dashed border-2 bg-slate-50/50">
          <Ticket size={32} className="mb-4 opacity-50 text-slate-400" />
          <p className="font-semibold text-slate-700">No hay puntos de venta registrados</p>
          <p className="text-sm text-slate-500 mt-1">{search || zonaFilter !== 'Todas' ? 'Intenta con otros filtros de búsqueda.' : 'Crea uno nuevo para comenzar a registrar boletos.'}</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm text-left responsive-table">
            <thead className="bg-slate-50 border-b border-gray-200 text-slate-500 text-xs uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-3">Punto de Venta</th>
                <th className="px-5 py-3">Zona</th>
                <th className="px-5 py-3">Folios</th>
                <th className="px-5 py-3 text-right">Asignados</th>
                <th className="px-5 py-3 text-right">Vendidos</th>
                <th className="px-5 py-3 text-right">Ingresos (MXN)</th>
                {isAdmin && <th className="px-5 py-3 w-20"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(p => {
                const asig = p.folio_final - p.folio_inicial + 1
                const ingresos = p.boletos_vendidos * p.precio_unitario
                return (
                  <tr key={p.id} className="hover:bg-slate-50 group transition-colors">
                    <td data-label="Punto de Venta" className="px-5 py-3 font-medium text-slate-900">{p.nombre}</td>
                    <td data-label="Zona" className="px-5 py-3">
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-slate-200">{p.zona}</span>
                    </td>
                    <td data-label="Folios" className="px-5 py-3 text-slate-500 tabular-nums text-xs">{fmt(p.folio_inicial)} <span className="text-slate-300 mx-1">→</span> {fmt(p.folio_final)}</td>
                    <td data-label="Asignados" className="px-5 py-3 text-right font-medium text-slate-600">{fmt(asig)}</td>
                    <td data-label="Vendidos" className="px-5 py-3 text-right font-semibold text-slate-900">{fmt(p.boletos_vendidos)}</td>
                    <td data-label="Ingresos (MXN)" className="px-5 py-3 text-right font-bold text-emerald-600">{money(ingresos)}</td>
                    {isAdmin && (
                      <td data-label="Acciones" className="px-5 py-3 text-right">
                        <div className="flex justify-end gap-1.5 md:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="btn-edit !p-1.5" onClick={() => { setSelected(p); setModalMode('edit') }} title="Editar"><Pencil size={14} /></button>
                          <button className="btn-danger !p-1.5 hover:bg-red-50 hover:text-red-600 hover:border-red-200" onClick={() => handleDelete(p.id)} title="Eliminar"><Trash2 size={14} /></button>
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

      {modalMode && <Modal title={modalMode === 'create' ? 'Nuevo Punto de Venta' : 'Editar Punto'} onClose={() => { setModalMode(null); setSelected(null) }}><PuntoForm initial={selected} loading={saving} onSave={handleSave} onCancel={() => { setModalMode(null); setSelected(null) }} /></Modal>}
    </div>
  )
}
