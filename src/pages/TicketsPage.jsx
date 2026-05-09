import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { ZONAS, ZONA_CONFIG, validateFolio, precioZona, totalBoletos, money, fmt, folioEjemplo } from '../lib/ticketHelpers'
import PanelConteo from '../components/PanelConteo'
import { Plus, X, Search, Ticket, Download, Ban, ShoppingCart, Globe, Map, Settings2, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

const DEFAULT_PUNTOS = ['Taquilla 1', 'Taquilla 2', 'Taquilla 3', 'Taquilla 4', 'Taquilla 5']
function loadPuntos() { try { const s = localStorage.getItem('kidopolis_puntos'); return s ? JSON.parse(s) : DEFAULT_PUNTOS } catch { return DEFAULT_PUNTOS } }
function savePuntos(p) { localStorage.setItem('kidopolis_puntos', JSON.stringify(p)) }

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

/* ─── Formulario de Venta ─── */
function VentaForm({ ventas, puntos, onSave, onCancel, loading }) {
  const [punto, setPunto] = useState(puntos[0] || '')
  const [zona, setZona] = useState(ZONAS[0])
  const [folio, setFolio] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const result = validateFolio(folio, zona)
    if (!result.valid) return toast.error(result.error)
    // Verificar duplicado
    const dup = ventas.find(v => v.folio === result.normalized && v.zona === zona)
    if (dup) {
      if (dup.estado === 'cancelado') return toast.error('Este folio fue cancelado y no puede reutilizarse')
      return toast.error('Este folio ya fue registrado como vendido')
    }
    onSave({ folio: result.normalized, zona, punto_venta: punto, estado: 'vendido' })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="form-label">Punto de Venta *</label>
        <select className="input-field" value={punto} onChange={e => setPunto(e.target.value)}>
          {puntos.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <div>
        <label className="form-label">Zona *</label>
        <select className="input-field" value={zona} onChange={e => { setZona(e.target.value); setFolio('') }}>
          {ZONAS.map(z => <option key={z} value={z}>{z}</option>)}
        </select>
        <p className="text-xs text-slate-400 mt-1">
          Rango: {ZONA_CONFIG[zona]?.prefix}{ZONA_CONFIG[zona]?.min}–{ZONA_CONFIG[zona]?.prefix}{ZONA_CONFIG[zona]?.max} · Ejemplo: {folioEjemplo(zona)}
        </p>
      </div>
      <div>
        <label className="form-label">Folio del boleto *</label>
        <input className="input-field" value={folio} onChange={e => setFolio(e.target.value)} placeholder={folioEjemplo(zona)} required />
      </div>
      <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 text-sm">
        <div className="flex justify-between"><span className="text-slate-500">Precio unitario</span><span className="font-bold">{money(precioZona(zona))}</span></div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" className="btn-secondary flex-1" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn-primary flex-1" disabled={loading}>{loading ? 'Guardando...' : 'Registrar Venta'}</button>
      </div>
    </form>
  )
}

/* ─── Formulario Tikzet ─── */
function TikzetForm({ onSave, onCancel, loading }) {
  const [zona, setZona] = useState(ZONAS[0])
  const [cantidad, setCantidad] = useState('')
  const [comision, setComision] = useState('10')

  const precio = precioZona(zona)
  const cant = Number(cantidad) || 0
  const bruto = cant * precio
  const comisionMonto = bruto * (Number(comision) / 100)
  const neto = bruto - comisionMonto

  function handleSubmit(e) {
    e.preventDefault()
    if (cant <= 0) return toast.error('La cantidad debe ser mayor a 0')
    onSave({
      zona, cantidad: cant, precio_unitario: precio,
      comision_pct: Number(comision),
      monto_comision: Math.round(comisionMonto * 100) / 100,
      monto_neto: Math.round(neto * 100) / 100
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="form-label">Zona *</label>
        <select className="input-field" value={zona} onChange={e => setZona(e.target.value)}>
          {ZONAS.map(z => <option key={z} value={z}>{z}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="form-label">Cantidad *</label>
          <input className="input-field" type="number" min="1" value={cantidad} onChange={e => setCantidad(e.target.value)} required />
        </div>
        <div>
          <label className="form-label">Comisión Tikzet (%)</label>
          <input className="input-field" type="number" min="0" max="100" step="0.1" value={comision} onChange={e => setComision(e.target.value)} />
        </div>
      </div>
      <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 text-sm space-y-1">
        <div className="flex justify-between"><span className="text-slate-500">Precio unitario</span><span className="font-medium">{money(precio)}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Monto bruto</span><span className="font-medium">{money(bruto)}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Comisión ({comision}%)</span><span className="font-medium text-red-600">−{money(comisionMonto)}</span></div>
        <div className="flex justify-between pt-1 border-t border-slate-200"><span className="text-slate-700 font-semibold">Neto recibido</span><span className="font-bold text-emerald-600">{money(neto)}</span></div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" className="btn-secondary flex-1" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn-primary flex-1" disabled={loading}>{loading ? 'Guardando...' : 'Registrar Tikzet'}</button>
      </div>
    </form>
  )
}

/* ─── Formulario de Cancelación ─── */
function CancelForm({ venta, onSave, onCancel, loading }) {
  const [motivo, setMotivo] = useState('')
  function handleSubmit(e) {
    e.preventDefault()
    if (!motivo.trim()) return toast.error('El motivo de cancelación es obligatorio')
    onSave(venta.id, motivo.trim())
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
        <p className="text-red-700 font-semibold mb-1">⚠️ Esta acción es irreversible</p>
        <p className="text-red-600 text-xs">El folio <strong>{venta.folio}</strong> ({venta.zona}) quedará permanentemente cancelado.</p>
      </div>
      <div>
        <label className="form-label">Folio</label>
        <input className="input-field bg-slate-50" value={`${venta.folio} — ${venta.zona}`} disabled />
      </div>
      <div>
        <label className="form-label">Motivo de cancelación *</label>
        <textarea className="input-field" rows={3} value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Describe el motivo de la cancelación..." required />
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" className="btn-secondary flex-1" onClick={onCancel}>Volver</button>
        <button type="submit" className="btn-primary flex-1 !bg-red-600 hover:!bg-red-700" disabled={loading}>{loading ? 'Cancelando...' : 'Confirmar Cancelación'}</button>
      </div>
    </form>
  )
}

/* ═══════════════════════════════════════════════════════════
   PÁGINA PRINCIPAL DE BOLETAJE
   ═══════════════════════════════════════════════════════════ */
export default function TicketsPage() {
  const { isAdmin, user } = useAuth()
  const [ventas, setVentas] = useState([])
  const [ventasTikzet, setVentasTikzet] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [zonaFilter, setZonaFilter] = useState('Todas')
  const [puntoFilter, setPuntoFilter] = useState('Todos')
  const [modalMode, setModalMode] = useState(null)
  const [selectedVenta, setSelectedVenta] = useState(null)
  const [activeTab, setActiveTab] = useState('ventas')
  const [puntosVenta, setPuntosVenta] = useState(loadPuntos())
  const [newPunto, setNewPunto] = useState('')
  const [mapeoPage, setMapeoPage] = useState(0)
  const MAPEO_PER_PAGE = 50

  function addPunto() {
    const name = newPunto.trim()
    if (!name) return toast.error('Escribe un nombre')
    if (puntosVenta.includes(name)) return toast.error('Ya existe')
    const updated = [...puntosVenta, name]
    setPuntosVenta(updated); savePuntos(updated); setNewPunto('')
    toast.success(`Punto "${name}" agregado`)
  }
  function removePunto(name) {
    const updated = puntosVenta.filter(p => p !== name)
    setPuntosVenta(updated); savePuntos(updated)
    toast.success(`Punto "${name}" eliminado`)
  }

  async function load() {
    setLoading(true)
    const [vRes, tRes] = await Promise.all([
      supabase.from('ventas_boletos').select('*').order('fecha_venta', { ascending: false }),
      supabase.from('ventas_tikzet').select('*').order('created_at', { ascending: false })
    ])
    if (vRes.error) toast.error('Error cargando ventas: ' + vRes.error.message)
    if (tRes.error && tRes.error.code !== '42P01') toast.error('Error cargando Tikzet: ' + tRes.error.message)
    setVentas(vRes.data || [])
    setVentasTikzet(tRes.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filteredVentas = useMemo(() => ventas.filter(v =>
    (zonaFilter === 'Todas' || v.zona === zonaFilter) &&
    (puntoFilter === 'Todos' || v.punto_venta === puntoFilter) &&
    (search === '' || v.folio.toLowerCase().includes(search.toLowerCase()) || v.punto_venta.toLowerCase().includes(search.toLowerCase()))
  ), [ventas, search, zonaFilter, puntoFilter])

  const filteredTikzet = useMemo(() => ventasTikzet.filter(t =>
    (zonaFilter === 'Todas' || t.zona === zonaFilter)
  ), [ventasTikzet, zonaFilter])

  async function handleVenta(values) {
    setSaving(true)
    const { error } = await supabase.from('ventas_boletos').insert([values])
    if (error) {
      if (error.code === '23505') toast.error('Este folio ya está registrado')
      else toast.error(error.message)
    } else {
      toast.success(`Venta registrada: ${values.folio}`)
      await load()
    }
    setSaving(false); setModalMode(null)
  }

  async function handleTikzet(values) {
    setSaving(true)
    const { error } = await supabase.from('ventas_tikzet').insert([values])
    if (error) toast.error(error.message)
    else { toast.success('Venta Tikzet registrada'); await load() }
    setSaving(false); setModalMode(null)
  }

  async function handleCancel(id, motivo) {
    setSaving(true)
    const { error } = await supabase.from('ventas_boletos').update({
      estado: 'cancelado', motivo_cancelacion: motivo,
      cancelado_por: user?.email || 'admin',
      fecha_cancelacion: new Date().toISOString()
    }).eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success('Boleto cancelado'); await load() }
    setSaving(false); setModalMode(null); setSelectedVenta(null)
  }

  const totalVendidos = ventas.filter(v => v.estado === 'vendido').length
  const totalCancelados = ventas.filter(v => v.estado === 'cancelado').length
  const totalDinero = ventas.filter(v => v.estado === 'vendido').reduce((a, v) => a + precioZona(v.zona), 0)

  // Mapeo de folios
  const mapeoData = useMemo(() => {
    const rows = []
    ZONAS.forEach(z => {
      const config = ZONA_CONFIG[z]
      for (let i = config.min; i <= config.max; i++) {
        const folio = config.prefix + String(i).padStart(config.prefix ? 3 : 4, '0')
        const venta = ventas.find(v => v.folio === folio && v.zona === z)
        rows.push({ folio, zona: z, punto: venta?.punto_venta || '—', estado: venta ? venta.estado : 'disponible', fecha: venta?.fecha_venta })
      }
    })
    if (zonaFilter !== 'Todas') return rows.filter(r => r.zona === zonaFilter)
    return rows
  }, [ventas, zonaFilter])
  const mapeoSlice = mapeoData.slice(mapeoPage * MAPEO_PER_PAGE, (mapeoPage + 1) * MAPEO_PER_PAGE)
  const mapeoPages = Math.ceil(mapeoData.length / MAPEO_PER_PAGE)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-1">
            <span>Dashboard</span><span>/</span><span className="text-slate-700">Boletaje</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Control de Boletos</h1>
          <p className="text-sm mt-1 text-slate-500">Registro de ventas por folio, cancelaciones y Tikzet.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isAdmin && <button className="btn-secondary" onClick={() => setModalMode('puntos')}><Settings2 size={16} /> Puntos</button>}
          <button className="btn-secondary" onClick={() => setModalMode('tikzet')}><Globe size={16} /> Tikzet</button>
          <button className="btn-primary" onClick={() => setModalMode('venta')}><Plus size={16} /> Registrar Venta</button>
        </div>
      </div>

      {/* Panel de conteo */}
      <PanelConteo ventas={ventas} ventasTikzet={ventasTikzet} puntoFilter={puntoFilter === 'Todos' ? null : puntoFilter} />

      {/* Stats rápidos */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Vendidos</p>
          <p className="text-xl font-bold text-slate-900">{fmt(totalVendidos)}</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Cancelados</p>
          <p className="text-xl font-bold text-red-600">{fmt(totalCancelados)}</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Recaudado</p>
          <p className="text-xl font-bold text-emerald-600">{money(totalDinero)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-6 overflow-x-auto">
        {[{id:'ventas',icon:ShoppingCart,label:`Ventas (${ventas.length})`},{id:'tikzet',icon:Globe,label:`Tikzet (${ventasTikzet.length})`},{id:'mapeo',icon:Map,label:'Mapeo'}].map(t => (
          <button key={t.id} onClick={() => { setActiveTab(t.id); setMapeoPage(0) }} className={`pb-3 text-sm font-medium transition-colors relative whitespace-nowrap ${activeTab === t.id ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
            <span className="flex items-center gap-2"><t.icon size={16} /> {t.label}</span>
            {activeTab === t.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900 rounded-t-full" />}
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input-field pl-9" placeholder="Buscar por folio o punto..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input-field w-auto" value={zonaFilter} onChange={e => setZonaFilter(e.target.value)}>
          <option value="Todas">Todas las zonas</option>
          {ZONAS.map(z => <option key={z} value={z}>{z}</option>)}
        </select>
        {activeTab === 'ventas' && (
          <select className="input-field w-auto" value={puntoFilter} onChange={e => setPuntoFilter(e.target.value)}>
            <option value="Todos">Todos los puntos</option>
            {puntosVenta.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        )}
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="flex justify-center py-20"><div className="spinner" /></div>
      ) : activeTab === 'ventas' ? (
        filteredVentas.length === 0 ? (
          <div className="glass-card p-16 flex flex-col items-center justify-center text-slate-400 border-dashed border-2 bg-slate-50/50">
            <Ticket size={32} className="mb-4 opacity-50" />
            <p className="font-semibold text-slate-700">No hay ventas registradas</p>
            <p className="text-sm text-slate-500 mt-1">Registra una venta para comenzar.</p>
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <table className="w-full text-sm text-left responsive-table">
              <thead className="bg-slate-50 border-b border-gray-200 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-5 py-3">Folio</th>
                  <th className="px-5 py-3">Zona</th>
                  <th className="px-5 py-3">Punto de Venta</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3 text-right">Precio</th>
                  <th className="px-5 py-3 text-right">Fecha</th>
                  {isAdmin && <th className="px-5 py-3 w-20"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredVentas.map(v => (
                  <tr key={v.id} className="hover:bg-slate-50 group transition-colors">
                    <td data-label="Folio" className="px-5 py-3 font-bold text-slate-900 tabular-nums">{v.folio}</td>
                    <td data-label="Zona" className="px-5 py-3">
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-slate-200">{v.zona}</span>
                    </td>
                    <td data-label="Punto" className="px-5 py-3 text-slate-700">{v.punto_venta}</td>
                    <td data-label="Estado" className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${v.estado === 'vendido' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                        {v.estado}
                      </span>
                      {v.motivo_cancelacion && <p className="text-[10px] text-red-500 mt-1">Motivo: {v.motivo_cancelacion}</p>}
                    </td>
                    <td data-label="Precio" className="px-5 py-3 text-right font-medium text-slate-700">{money(precioZona(v.zona))}</td>
                    <td data-label="Fecha" className="px-5 py-3 text-right text-slate-500 text-xs tabular-nums">
                      {new Date(v.fecha_venta).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    {isAdmin && (
                      <td data-label="Acciones" className="px-5 py-3 text-right">
                        {v.estado === 'vendido' && (
                          <button className="btn-danger !p-1.5" title="Cancelar boleto" onClick={() => { setSelectedVenta(v); setModalMode('cancelar') }}>
                            <Ban size={14} />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : activeTab === 'tikzet' ? (
        /* Tab Tikzet */
        filteredTikzet.length === 0 ? (
          <div className="glass-card p-16 flex flex-col items-center justify-center text-slate-400 border-dashed border-2 bg-slate-50/50">
            <Globe size={32} className="mb-4 opacity-50" />
            <p className="font-semibold text-slate-700">No hay ventas Tikzet registradas</p>
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <table className="w-full text-sm text-left responsive-table">
              <thead className="bg-slate-50 border-b border-gray-200 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-5 py-3">Zona</th>
                  <th className="px-5 py-3 text-right">Cantidad</th>
                  <th className="px-5 py-3 text-right">Precio Unit.</th>
                  <th className="px-5 py-3 text-right">Bruto</th>
                  <th className="px-5 py-3 text-right">Comisión</th>
                  <th className="px-5 py-3 text-right">Neto</th>
                  <th className="px-5 py-3 text-right">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTikzet.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td data-label="Zona" className="px-5 py-3">
                      <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-blue-200">{t.zona}</span>
                    </td>
                    <td data-label="Cantidad" className="px-5 py-3 text-right font-bold">{fmt(t.cantidad)}</td>
                    <td data-label="Precio" className="px-5 py-3 text-right">{money(t.precio_unitario)}</td>
                    <td data-label="Bruto" className="px-5 py-3 text-right font-medium">{money(t.cantidad * t.precio_unitario)}</td>
                    <td data-label="Comisión" className="px-5 py-3 text-right text-red-600">−{money(t.monto_comision)} ({t.comision_pct}%)</td>
                    <td data-label="Neto" className="px-5 py-3 text-right font-bold text-emerald-600">{money(t.monto_neto)}</td>
                    <td data-label="Fecha" className="px-5 py-3 text-right text-xs text-slate-500 tabular-nums">
                      {new Date(t.created_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : activeTab === 'mapeo' ? (
        /* Tab Mapeo */
        <div className="space-y-3">
          <div className="glass-card overflow-hidden">
            <table className="w-full text-sm text-left responsive-table">
              <thead className="bg-slate-50 border-b border-gray-200 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-5 py-3">Folio</th>
                  <th className="px-5 py-3">Zona</th>
                  <th className="px-5 py-3">Punto</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3 text-right">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {mapeoSlice.map(r => (
                  <tr key={r.folio+r.zona} className="hover:bg-slate-50">
                    <td data-label="Folio" className="px-5 py-3 font-bold tabular-nums">{r.folio}</td>
                    <td data-label="Zona" className="px-5 py-3"><span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-slate-200">{r.zona}</span></td>
                    <td data-label="Punto" className="px-5 py-3 text-slate-700">{r.punto}</td>
                    <td data-label="Estado" className="px-5 py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${r.estado === 'vendido' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : r.estado === 'cancelado' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>{r.estado}</span></td>
                    <td data-label="Fecha" className="px-5 py-3 text-right text-xs text-slate-500 tabular-nums">{r.fecha ? new Date(r.fecha).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {mapeoPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button className="btn-secondary !py-1 !px-3 text-xs" disabled={mapeoPage === 0} onClick={() => setMapeoPage(p => p - 1)}>← Anterior</button>
              <span className="text-xs text-slate-500">{mapeoPage + 1} / {mapeoPages}</span>
              <button className="btn-secondary !py-1 !px-3 text-xs" disabled={mapeoPage >= mapeoPages - 1} onClick={() => setMapeoPage(p => p + 1)}>Siguiente →</button>
            </div>
          )}
        </div>
      ) : null}

      {/* Modales */}
      {modalMode === 'puntos' && (
        <Modal title="Gestionar Puntos de Venta" onClose={() => setModalMode(null)}>
          <div className="space-y-4">
            <div className="flex gap-2"><input className="input-field flex-1" placeholder="Nuevo punto de venta..." value={newPunto} onChange={e => setNewPunto(e.target.value)} onKeyDown={e => e.key === 'Enter' && addPunto()} /><button className="btn-primary" onClick={addPunto}><Plus size={16} /></button></div>
            <div className="space-y-2">{puntosVenta.map(p => (<div key={p} className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-2 border border-slate-200"><span className="text-sm font-medium text-slate-900">{p}</span><button className="text-red-400 hover:text-red-600" onClick={() => removePunto(p)}><Trash2 size={14} /></button></div>))}</div>
            {puntosVenta.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No hay puntos de venta</p>}
          </div>
        </Modal>
      )}
      {modalMode === 'venta' && (
        <Modal title="Registrar Venta de Boleto" onClose={() => setModalMode(null)}>
          <VentaForm ventas={ventas} puntos={puntosVenta} loading={saving} onSave={handleVenta} onCancel={() => setModalMode(null)} />
        </Modal>
      )}
      {modalMode === 'tikzet' && (
        <Modal title="Registrar Venta Tikzet" onClose={() => setModalMode(null)}>
          <TikzetForm loading={saving} onSave={handleTikzet} onCancel={() => setModalMode(null)} />
        </Modal>
      )}
      {modalMode === 'cancelar' && selectedVenta && (
        <Modal title="Cancelar Boleto" onClose={() => { setModalMode(null); setSelectedVenta(null) }}>
          <CancelForm venta={selectedVenta} loading={saving} onSave={handleCancel} onCancel={() => { setModalMode(null); setSelectedVenta(null) }} />
        </Modal>
      )}
    </div>
  )
}
