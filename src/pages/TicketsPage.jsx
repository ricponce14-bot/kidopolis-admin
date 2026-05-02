import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Plus, Pencil, Trash2, X, Search, Ticket, Download, ArrowRightLeft, Map } from 'lucide-react'
import toast from 'react-hot-toast'
import { createBasePDF, tableStyles, money, fmt, autoTable } from '../lib/pdfExport'

const ZONAS = ['Zona Kids', 'Zona Pop', 'Zona Mágica']
const PRECIO_DEFAULT = { 'Zona Kids': 200, 'Zona Pop': 350, 'Zona Mágica': 450 }
const TOTAL_FOLIOS = { 'Zona Kids': 2000, 'Zona Pop': 600, 'Zona Mágica': 400 }

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
  const [precio, setPrecio] = useState(initial?.precio_unitario ?? PRECIO_DEFAULT['Zona Kids'])
  
  // Mantenemos campos legacy por compatibilidad con la tabla vieja, pero opcionales/ocultos si queremos.
  // Para no romper la base de datos que exige folio_inicial y folio_final, les pondremos 1 y 1 temporalmente o los dejamos
  const [folioIni, setFolioIni] = useState(initial?.folio_inicial ?? 1)
  const [folioFin, setFolioFin] = useState(initial?.folio_final ?? 1)

  function handleZona(z) {
    setZona(z)
    if (!initial) setPrecio(PRECIO_DEFAULT[z])
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!nombre.trim()) return toast.error('El nombre es requerido')
    
    onSave({ 
      nombre: nombre.trim(), 
      zona, 
      folio_inicial: Number(folioIni), 
      folio_final: Number(folioFin), 
      boletos_vendidos: initial?.boletos_vendidos ?? 0, 
      precio_unitario: Number(precio) 
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="form-label">Nombre del Punto de venta *</label>
          <input className="input-field" value={nombre} onChange={e => setNombre(e.target.value)} required placeholder="Ej. Taquilla Sur" />
        </div>
        <div>
          <label className="form-label">Zona *</label>
          <select className="input-field" value={zona} onChange={e => handleZona(e.target.value)}>
            {ZONAS.map(z => <option key={z} value={z}>{z}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Precio ($ MXN) *</label>
          <input className="input-field" type="number" min="0" step="0.01" value={precio} onChange={e => setPrecio(e.target.value)} required />
        </div>
      </div>
      <div className="flex gap-3 pt-4">
        <button type="button" className="btn-secondary flex-1" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn-primary flex-1" disabled={loading}>{loading ? 'Guardando...' : 'Guardar Punto'}</button>
      </div>
    </form>
  )
}

function MovimientoForm({ puntos, onSave, onCancel, loading }) {
  const [puntoId, setPuntoId] = useState(puntos[0]?.id ?? '')
  const [tipo, setTipo] = useState('asignacion')
  const [folioIni, setFolioIni] = useState('')
  const [folioFin, setFolioFin] = useState('')
  const [cantidad, setCantidad] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (!puntoId) return toast.error('Selecciona un punto de venta')
    if (Number(folioFin) < Number(folioIni)) return toast.error('El folio final debe ser mayor o igual al inicial')
    
    onSave({
      punto_venta_id: puntoId,
      tipo,
      folio_inicio: Number(folioIni),
      folio_fin: Number(folioFin),
      cantidad: Number(cantidad) || (Number(folioFin) - Number(folioIni) + 1),
      fecha: new Date().toISOString().split('T')[0]
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="form-label">Punto de Venta *</label>
        <select className="input-field" value={puntoId} onChange={e => setPuntoId(e.target.value)} required>
          {puntos.map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.zona})</option>)}
        </select>
      </div>
      <div>
        <label className="form-label">Tipo de Movimiento *</label>
        <select className="input-field" value={tipo} onChange={e => setTipo(e.target.value)}>
          <option value="asignacion">Entrada (Asignación de folios)</option>
          <option value="venta">Salida (Venta de boletos)</option>
          <option value="devolucion">Devolución (Retorno de folios)</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="form-label">Folio inicial *</label>
          <input className="input-field" type="number" min="1" value={folioIni} onChange={e => setFolioIni(e.target.value)} required />
        </div>
        <div>
          <label className="form-label">Folio final *</label>
          <input className="input-field" type="number" min="1" value={folioFin} onChange={e => setFolioFin(e.target.value)} required />
        </div>
      </div>
      <div>
        <label className="form-label">Cantidad (calculada automáticamente si se deja en blanco)</label>
        <input className="input-field" type="number" min="1" value={cantidad} onChange={e => setCantidad(e.target.value)} placeholder={folioIni && folioFin ? String(Math.max(0, Number(folioFin) - Number(folioIni) + 1)) : ''} />
      </div>
      <div className="flex gap-3 pt-4">
        <button type="button" className="btn-secondary flex-1" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn-primary flex-1" disabled={loading}>{loading ? 'Guardando...' : 'Registrar'}</button>
      </div>
    </form>
  )
}

export default function TicketsPage() {
  const { isAdmin } = useAuth()
  const [puntos, setPuntos] = useState([])
  const [movimientos, setMovimientos] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [zonaFilter, setZonaFilter] = useState('Todas')
  const [modalMode, setModalMode] = useState(null)
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('puntos') // 'puntos' | 'mapeo'
  const [mapEstadoFilter, setMapEstadoFilter] = useState('Todos')
  
  // Paginación para el mapeo
  const [mapPage, setMapPage] = useState(1)
  const itemsPerPage = 50

  async function load() {
    setLoading(true)
    const [ptsRes, movRes] = await Promise.all([
      supabase.from('puntos_venta').select('*').order('zona').order('nombre'),
      // Manejamos el error silenciosamente si la tabla movimientos_folios no existe aún
      supabase.from('movimientos_folios').select('*').order('created_at', { ascending: true })
    ])
    
    if (ptsRes.error) toast.error('Error al cargar puntos de venta')
    setPuntos(ptsRes.data || [])
    setMovimientos(movRes.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // Construir el mapeo de folios dinámicamente
  const foliosMapeados = useMemo(() => {
    const list = []
    
    for (const zona of ZONAS) {
      const maxFolios = TOTAL_FOLIOS[zona]
      // Inicializar todos los folios de la zona
      for (let i = 1; i <= maxFolios; i++) {
        list.push({
          folio: i,
          zona: zona,
          punto_venta: '-',
          estado: 'Disponible',
          fecha_mov: '-'
        })
      }
    }

    // Aplicar movimientos en orden cronológico (asignación -> venta / devolucion)
    for (const mov of movimientos) {
      const punto = puntos.find(p => p.id === mov.punto_venta_id)
      if (!punto) continue

      const startIdx = list.findIndex(f => f.zona === punto.zona && f.folio === mov.folio_inicio)
      if (startIdx === -1) continue

      for (let i = 0; i < (mov.folio_fin - mov.folio_inicio + 1); i++) {
        const item = list[startIdx + i]
        if (!item) continue
        
        item.fecha_mov = mov.fecha
        item.punto_venta = punto.nombre

        if (mov.tipo === 'asignacion') {
          item.estado = 'Asignado'
        } else if (mov.tipo === 'venta') {
          item.estado = 'Vendido'
        } else if (mov.tipo === 'devolucion') {
          item.estado = 'Devuelto'
          item.punto_venta = '-' // Ya no está en el punto
        }
      }
    }

    return list
  }, [movimientos, puntos])

  const filteredPuntos = useMemo(() => puntos.filter(p => (zonaFilter === 'Todas' || p.zona === zonaFilter) && (p.nombre?.toLowerCase().includes(search.toLowerCase()))), [puntos, search, zonaFilter])
  
  const filteredMap = useMemo(() => {
    return foliosMapeados.filter(f => 
      (zonaFilter === 'Todas' || f.zona === zonaFilter) &&
      (mapEstadoFilter === 'Todos' || f.estado === mapEstadoFilter) &&
      (search === '' || f.folio.toString().includes(search) || f.punto_venta.toLowerCase().includes(search.toLowerCase()))
    )
  }, [foliosMapeados, zonaFilter, mapEstadoFilter, search])

  // Stats calculados dinámicamente para los puntos de venta
  const puntoStats = useMemo(() => {
    const stats = {}
    puntos.forEach(p => {
      stats[p.id] = { asignados: 0, vendidos: 0, devueltos: 0, ingresos: 0 }
    })
    
    movimientos.forEach(m => {
      if (stats[m.punto_venta_id]) {
        if (m.tipo === 'asignacion') stats[m.punto_venta_id].asignados += m.cantidad
        if (m.tipo === 'venta') {
          stats[m.punto_venta_id].vendidos += m.cantidad
          const punto = puntos.find(p => p.id === m.punto_venta_id)
          if (punto) stats[m.punto_venta_id].ingresos += (m.cantidad * punto.precio_unitario)
        }
        if (m.tipo === 'devolucion') stats[m.punto_venta_id].devueltos += m.cantidad
      }
    })
    return stats
  }, [movimientos, puntos])

  async function handleSavePunto(values) {
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

  async function handleSaveMovimiento(values) {
    setSaving(true)
    const { error } = await supabase.from('movimientos_folios').insert([values])
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Movimiento registrado correctamente')
      await load()
    }
    setSaving(false); setModalMode(null)
  }

  async function handleDelete(id) {
    if (!window.confirm('¿Estás seguro de eliminar este punto de venta? Sus movimientos también se borrarán.')) return
    const { error } = await supabase.from('puntos_venta').delete().eq('id', id)
    if (error) {
      toast.error('Error al eliminar')
    } else {
      toast.success('Punto de venta eliminado')
      await load()
    }
  }

  function exportPDF() {
    const doc = createBasePDF('Reporte de Puntos de Venta (Boletaje)')
    
    const body = filteredPuntos.map(p => {
      const st = puntoStats[p.id] || { asignados: 0, vendidos: 0, ingresos: 0 }
      return [
        p.nombre,
        p.zona,
        fmt(st.asignados),
        fmt(st.vendidos),
        money(st.ingresos)
      ]
    })

    autoTable(doc, {
      ...tableStyles,
      startY: 45,
      head: [['Punto de Venta', 'Zona', 'Asignados', 'Vendidos', 'Ingresos']],
      body: body,
      columnStyles: {
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
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
          {activeTab === 'puntos' && <button className="btn-secondary" onClick={exportPDF}><Download size={16} /> Exportar</button>}
          {isAdmin && activeTab === 'puntos' && <button className="btn-secondary" onClick={() => setModalMode('movimiento')}><ArrowRightLeft size={16} /> Movimiento</button>}
          {isAdmin && activeTab === 'puntos' && <button className="btn-primary" onClick={() => { setSelected(null); setModalMode('create') }}><Plus size={16} /> Nuevo Punto</button>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-6">
        <button 
          onClick={() => { setActiveTab('puntos'); setMapPage(1); }} 
          className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === 'puntos' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <span className="flex items-center gap-2"><Ticket size={16} /> Puntos de Venta</span>
          {activeTab === 'puntos' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900 rounded-t-full" />}
        </button>
        <button 
          onClick={() => { setActiveTab('mapeo'); setMapPage(1); }} 
          className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === 'mapeo' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <span className="flex items-center gap-2"><Map size={16} /> Mapeo de Folios</span>
          {activeTab === 'mapeo' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900 rounded-t-full" />}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input-field pl-9" placeholder={activeTab === 'puntos' ? "Buscar por nombre..." : "Buscar por folio o punto..."} value={search} onChange={e => {setSearch(e.target.value); setMapPage(1);}} />
        </div>
        <div className="flex gap-2 flex-wrap">
          <select className="input-field w-auto" value={zonaFilter} onChange={e => {setZonaFilter(e.target.value); setMapPage(1);}}>
            <option value="Todas">Todas las zonas</option>
            {ZONAS.map(z => <option key={z} value={z}>{z}</option>)}
          </select>
          {activeTab === 'mapeo' && (
            <select className="input-field w-auto" value={mapEstadoFilter} onChange={e => {setMapEstadoFilter(e.target.value); setMapPage(1);}}>
              <option value="Todos">Todos los estados</option>
              <option value="Disponible">Disponible</option>
              <option value="Asignado">Asignado</option>
              <option value="Vendido">Vendido</option>
              <option value="Devuelto">Devuelto</option>
            </select>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="spinner" /></div>
      ) : activeTab === 'puntos' ? (
        filteredPuntos.length === 0 ? (
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
                  <th className="px-5 py-3 text-right">Asignados</th>
                  <th className="px-5 py-3 text-right">Devueltos</th>
                  <th className="px-5 py-3 text-right">Vendidos</th>
                  <th className="px-5 py-3 text-right">Ingresos (MXN)</th>
                  {isAdmin && <th className="px-5 py-3 w-20"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPuntos.map(p => {
                  const st = puntoStats[p.id] || { asignados: 0, vendidos: 0, devueltos: 0, ingresos: 0 }
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 group transition-colors">
                      <td data-label="Punto de Venta" className="px-5 py-3 font-medium text-slate-900">{p.nombre}</td>
                      <td data-label="Zona" className="px-5 py-3">
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-slate-200">{p.zona}</span>
                      </td>
                      <td data-label="Asignados" className="px-5 py-3 text-right font-medium text-slate-600">{fmt(st.asignados)}</td>
                      <td data-label="Devueltos" className="px-5 py-3 text-right font-medium text-amber-600">{fmt(st.devueltos)}</td>
                      <td data-label="Vendidos" className="px-5 py-3 text-right font-semibold text-slate-900">{fmt(st.vendidos)}</td>
                      <td data-label="Ingresos (MXN)" className="px-5 py-3 text-right font-bold text-emerald-600">{money(st.ingresos)}</td>
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
        )
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm text-left responsive-table">
            <thead className="bg-slate-50 border-b border-gray-200 text-slate-500 text-xs uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-3">Folio</th>
                <th className="px-5 py-3">Zona</th>
                <th className="px-5 py-3">Punto Asignado</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3 text-right">Último Mov.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredMap.slice((mapPage - 1) * itemsPerPage, mapPage * itemsPerPage).map((f, i) => (
                <tr key={`${f.zona}-${f.folio}-${i}`} className="hover:bg-slate-50">
                  <td data-label="Folio" className="px-5 py-3 font-bold text-slate-900 tabular-nums">{fmt(f.folio)}</td>
                  <td data-label="Zona" className="px-5 py-3 text-slate-600 text-xs">{f.zona}</td>
                  <td data-label="Punto Asignado" className="px-5 py-3 font-medium text-slate-700">{f.punto_venta}</td>
                  <td data-label="Estado" className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border 
                      ${f.estado === 'Disponible' ? 'bg-slate-100 text-slate-500 border-slate-200' : 
                        f.estado === 'Asignado' ? 'bg-blue-50 text-blue-600 border-blue-200' : 
                        f.estado === 'Vendido' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 
                        'bg-amber-50 text-amber-600 border-amber-200'}`}>
                      {f.estado}
                    </span>
                  </td>
                  <td data-label="Último Mov." className="px-5 py-3 text-right text-slate-500 tabular-nums text-xs">{f.fecha_mov}</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredMap.length > itemsPerPage && (
            <div className="p-4 border-t border-gray-200 flex items-center justify-between bg-slate-50/50">
              <span className="text-sm text-slate-500">Mostrando {(mapPage - 1) * itemsPerPage + 1} - {Math.min(mapPage * itemsPerPage, filteredMap.length)} de {filteredMap.length}</span>
              <div className="flex gap-2">
                <button className="btn-secondary !py-1 !px-2" disabled={mapPage === 1} onClick={() => setMapPage(p => p - 1)}>Anterior</button>
                <button className="btn-secondary !py-1 !px-2" disabled={mapPage * itemsPerPage >= filteredMap.length} onClick={() => setMapPage(p => p + 1)}>Siguiente</button>
              </div>
            </div>
          )}
        </div>
      )}

      {modalMode === 'create' || modalMode === 'edit' ? (
        <Modal title={modalMode === 'create' ? 'Nuevo Punto de Venta' : 'Editar Punto'} onClose={() => { setModalMode(null); setSelected(null) }}>
          <PuntoForm initial={selected} loading={saving} onSave={handleSavePunto} onCancel={() => { setModalMode(null); setSelected(null) }} />
        </Modal>
      ) : modalMode === 'movimiento' ? (
        <Modal title="Registrar Movimiento" onClose={() => setModalMode(null)}>
          <MovimientoForm puntos={puntos} loading={saving} onSave={handleSaveMovimiento} onCancel={() => setModalMode(null)} />
        </Modal>
      ) : null}
    </div>
  )
}
