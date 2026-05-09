import { useEffect, useState, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'
import {
  TrendingUp, TrendingDown, DollarSign,
  Activity, Ticket, Megaphone, Calculator,
  AlertCircle, Download, CreditCard, Banknote
} from 'lucide-react'
import { createBasePDF, tableStyles, autoTable } from '../lib/pdfExport'
import { ZONAS, precioZona, totalBoletos } from '../lib/ticketHelpers'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'

function money(n) { return `$${Number(n ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }
function fmt(n) { return Number(n ?? 0).toLocaleString('es-MX') }
const CATEGORIAS_GASTOS = ['Producción', 'Logística', 'Personal', 'Venue', 'Otro']
const PIE_COLORS = ['#0f172a', '#475569', '#94a3b8', '#cbd5e1', '#e2e8f0']

const CustomTooltip = ({ active, payload, label, isMoney }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 shadow-lg p-3 rounded-md animate-fade-in text-xs">
        <p className="font-bold text-slate-900 mb-2">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }} className="font-medium flex justify-between gap-4">
            <span>{entry.name}:</span>
            <span>{isMoney ? money(entry.value) : fmt(entry.value)}</span>
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function DashboardHome() {
  const { isAdmin } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  
  const [budget, setBudget]   = useState(null)
  const [ventasBoletos, setVentasBoletos] = useState([])
  const [ventasTikzet, setVentasTikzet] = useState([])
  const [gastos, setGastos]   = useState([])
  const [pautas, setPautas]   = useState([])

  async function loadData() {
    setLoading(true)
    setError(null)
    
    try {
      const [resBudget, resVentas, resTikzet, resGastos, resPautas] = await Promise.all([
        supabase.from('presupuesto_general').select('*').eq('id', 1).single(),
        supabase.from('ventas_boletos').select('*'),
        supabase.from('ventas_tikzet').select('*'),
        supabase.from('gastos').select('*'),
        supabase.from('pautas').select('*')
      ])

      if (resBudget.error && resBudget.error.code !== 'PGRST116') console.warn('Budget error:', resBudget.error.message)
      if (resVentas.error) console.warn('Ventas error:', resVentas.error.message)
      if (resTikzet.error) console.warn('Tikzet error:', resTikzet.error.message)
      if (resGastos.error) console.warn('Gastos error:', resGastos.error.message)
      if (resPautas.error) console.warn('Pautas error:', resPautas.error.message)

      setBudget(resBudget.data || { total: 0, produccion: 0, logistica: 0, personal: 0, venue: 0, pauta: 0, otros: 0 })
      setVentasBoletos(resVentas.data || [])
      setVentasTikzet(resTikzet.data || [])
      setGastos(resGastos.data || [])
      setPautas(resPautas.data || [])
    } catch (err) {
      console.error('Dashboard loadData failed:', err)
      setError(err.message || 'Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  // ─── INGRESOS POR BOLETOS (v2: ventas_boletos + ventas_tikzet) ───
  const { ingresosBoletos, boletosVendidos, statsZonas } = useMemo(() => {
    let ingresos = 0
    let vendidosTotal = 0
    const statsMap = {}
    ZONAS.forEach(z => {
      const total = totalBoletos(z)
      const vendidos = ventasBoletos.filter(v => v.zona === z && v.estado === 'vendido').length
      const tikzet = ventasTikzet.filter(t => t.zona === z).reduce((a, t) => a + t.cantidad, 0)
      const cancelados = ventasBoletos.filter(v => v.zona === z && v.estado === 'cancelado').length
      const precio = precioZona(z)
      const ing = vendidos * precio
      ingresos += ing
      vendidosTotal += vendidos
      statsMap[z] = { zona: z, Vendidos: vendidos + tikzet, Disponibles: Math.max(0, total - vendidos - tikzet), Ingresos: ing }
    })
    // Add Tikzet neto to ingresos
    const tikzetNeto = ventasTikzet.reduce((a, t) => a + Number(t.monto_neto || 0), 0)
    ingresos += tikzetNeto
    vendidosTotal += ventasTikzet.reduce((a, t) => a + t.cantidad, 0)

    return { ingresosBoletos: ingresos, boletosVendidos: vendidosTotal, statsZonas: Object.values(statsMap) }
  }, [ventasBoletos, ventasTikzet])

  // ─── GASTOS & ABONOS ───
  const { totalGastos, totalGastosPagados, totalGastosPendientes } = useMemo(() => {
    const total = gastos.reduce((acc, g) => acc + Number(g.monto), 0)
    const pagado = gastos.reduce((acc, g) => acc + Number(g.pagado || 0), 0)
    return { totalGastos: total, totalGastosPagados: pagado, totalGastosPendientes: total - pagado }
  }, [gastos])

  const totalPautas = useMemo(() => pautas.reduce((acc, p) => acc + Number(p.monto), 0), [pautas])
  const totalEgresos = totalGastos + totalPautas
  const totalEgresosReales = totalGastosPagados + totalPautas // lo realmente desembolsado
  const utilidad = ingresosBoletos - totalEgresosReales

  // ─── PIE CHART DATA ───
  const pieData = useMemo(() => {
    const data = []
    if (totalGastosPagados > 0) data.push({ name: 'Gastos Pagados', value: totalGastosPagados })
    if (totalGastosPendientes > 0) data.push({ name: 'Gastos Pendientes', value: totalGastosPendientes })
    if (totalPautas > 0) data.push({ name: 'Pauta Digital', value: totalPautas })
    if (data.length === 0) data.push({ name: 'Sin egresos', value: 1 })
    return data
  }, [totalGastosPagados, totalGastosPendientes, totalPautas])

  // ─── PRESUPUESTO VS REAL ───
  const budgetVsReal = useMemo(() => {
    if (!budget) return []
    return CATEGORIAS_GASTOS.map(cat => {
      let asig = 0
      if (cat === 'Producción') asig = Number(budget.produccion)
      if (cat === 'Logística') asig = Number(budget.logistica)
      if (cat === 'Personal') asig = Number(budget.personal)
      if (cat === 'Venue') asig = Number(budget.venue)
      if (cat === 'Otro') asig = Number(budget.otros)
      const gast = gastos.filter(g => g.categoria === cat).reduce((a, b) => a + Number(b.monto), 0)
      return { categoria: cat, Presupuestado: asig, Gastado: gast }
    })
  }, [budget, gastos])

  // ─── PDF EXPORT ───
  function exportGeneralPDF() {
    const doc = createBasePDF('Reporte General del Evento')

    doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.text('Resumen Financiero', 14, 45)
    autoTable(doc, { ...tableStyles, startY: 50, head: [['Concepto', 'Monto']], body: [
      ['Ingresos por Boletos', money(ingresosBoletos)],
      ['Boletos Vendidos', fmt(boletosVendidos) + ' unidades'],
      ['Gastos Comprometidos', money(totalGastos)],
      ['Gastos Pagados', money(totalGastosPagados)],
      ['Gastos Pendientes', money(totalGastosPendientes)],
      ['Pauta Digital', money(totalPautas)],
      [{ content: 'Utilidad Neta', styles: { fontStyle: 'bold' } }, { content: money(utilidad), styles: { fontStyle: 'bold' } }],
    ] })

    let currentY = doc.lastAutoTable.finalY + 10
    doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.text('Ventas por Zona', 14, currentY)
    autoTable(doc, { ...tableStyles, startY: currentY + 5, head: [['Zona', 'Boletos Vendidos', 'Ingresos']], body: statsZonas.map(z => [z.zona, fmt(z.Vendidos), money(z.Ingresos)]) })

    currentY = doc.lastAutoTable.finalY + 10
    if (currentY > 230) { doc.addPage(); currentY = 45; }
    doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.text('Presupuesto vs Gasto Real', 14, currentY)
    autoTable(doc, { ...tableStyles, startY: currentY + 5, head: [['Categoría', 'Presupuestado', 'Gastado', 'Diferencia']], body: budgetVsReal.map(r => [r.categoria, money(r.Presupuestado), money(r.Gastado), money(r.Presupuestado - r.Gastado)]) })

    doc.save('kidopolis-reporte-general.pdf')
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="spinner" /></div>
  if (error) return <div className="glass-card p-6 flex items-start gap-4 animate-fade-in border-red-200 bg-red-50"><AlertCircle size={24} className="text-red-500 mt-1" /><div><h2 className="text-sm font-bold text-red-700 mb-1">Error</h2><p className="text-sm text-red-600">{error}</p></div></div>

  const budgetTotal = Number(budget?.total || 0)
  const budgetPct = budgetTotal > 0 ? (totalEgresos / budgetTotal) * 100 : 0

  return (
    <div className="space-y-6 pb-10">
      
      <div className="animate-fade-in flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Resumen General</h1>
          <p className="mt-1 text-sm text-slate-500 flex items-center gap-1.5"><Activity size={14} /> {isAdmin ? 'Vista de Administrador' : 'Vista de Solo Lectura'}</p>
        </div>
        <button className="btn-primary" onClick={exportGeneralPDF}><Download size={16} /> Exportar Reporte</button>
      </div>

      {/* ═══════ SECCIÓN 1: DINERO ═══════ */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">💰 Flujo de Dinero</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Ingresos */}
          <Link to="/dashboard/tickets" className="glass-card p-5 hover:border-slate-400 transition-colors group">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                <Banknote size={18} className="text-emerald-600" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Ingresos por Boletos</p>
            </div>
            <p className="text-2xl font-bold text-emerald-600 group-hover:text-emerald-700">{money(ingresosBoletos)}</p>
            <p className="text-xs text-slate-500 mt-1">{fmt(boletosVendidos)} boletos vendidos</p>
          </Link>

          {/* Gastos pagados */}
          <Link to="/dashboard/expenses" className="glass-card p-5 hover:border-slate-400 transition-colors group">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded bg-red-50 border border-red-200 flex items-center justify-center">
                <CreditCard size={18} className="text-red-600" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Gastos Pagados</p>
            </div>
            <p className="text-2xl font-bold text-red-600 group-hover:text-red-700">{money(totalGastosPagados)}</p>
            <p className="text-xs text-slate-500 mt-1">{money(totalGastosPendientes)} pendientes</p>
          </Link>

          {/* Pauta */}
          <Link to="/dashboard/ads" className="glass-card p-5 hover:border-slate-400 transition-colors group">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded bg-blue-50 border border-blue-200 flex items-center justify-center">
                <Megaphone size={18} className="text-blue-600" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Pauta Digital</p>
            </div>
            <p className="text-2xl font-bold text-slate-900 group-hover:text-slate-700">{money(totalPautas)}</p>
            <p className="text-xs text-slate-500 mt-1">{pautas.length} campañas activas</p>
          </Link>

          {/* Utilidad */}
          <div className={`glass-card p-5 ${utilidad >= 0 ? 'border-emerald-100 bg-emerald-50/30' : 'border-red-100 bg-red-50/30'}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded flex items-center justify-center ${utilidad >= 0 ? 'bg-emerald-100 border border-emerald-200' : 'bg-red-100 border border-red-200'}`}>
                {utilidad >= 0 ? <TrendingUp size={18} className="text-emerald-600" /> : <TrendingDown size={18} className="text-red-600" />}
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Utilidad Neta</p>
            </div>
            <p className={`text-2xl font-bold ${utilidad >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{money(utilidad)}</p>
            <p className="text-xs text-slate-500 mt-1">Ingresos − Egresos reales</p>
          </div>
        </div>
      </div>

      {/* ═══════ SECCIÓN 2: PRESUPUESTO ═══════ */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">📊 Presupuesto</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Barra de presupuesto */}
          <Link to="/dashboard/budget" className="glass-card p-6 hover:border-slate-400 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calculator size={16} className="text-slate-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Ejecución Presupuestal</h3>
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Ver módulo →</span>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div>
                <p className="text-[10px] text-slate-500 font-medium uppercase mb-1">Presupuesto</p>
                <p className="text-lg font-bold text-slate-900">{money(budgetTotal)}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-medium uppercase mb-1">Comprometido</p>
                <p className="text-lg font-bold text-slate-900">{money(totalEgresos)}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-medium uppercase mb-1">Disponible</p>
                <p className={`text-lg font-bold ${budgetTotal - totalEgresos >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{money(budgetTotal - totalEgresos)}</p>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <span>Ejecución</span>
                <span className={budgetPct >= 100 ? 'text-red-600' : budgetPct >= 80 ? 'text-amber-600' : 'text-slate-900'}>{budgetPct.toFixed(1)}%</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div className={`h-full transition-all duration-700 ${budgetPct >= 100 ? 'bg-red-500' : budgetPct >= 80 ? 'bg-amber-500' : 'bg-slate-900'}`} style={{ width: `${Math.min(budgetPct, 100)}%` }} />
              </div>
            </div>
          </Link>

          {/* Presupuesto vs Real Chart */}
          <div className="glass-card p-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Presupuesto vs Gasto Real</h3>
            <div className="h-48 w-full">
              <ResponsiveContainer>
                <BarChart data={budgetVsReal} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="categoria" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b' }} dy={5} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b' }} tickFormatter={(val) => `$${val/1000}k`} />
                  <Tooltip content={<CustomTooltip isMoney />} cursor={{ fill: '#f8fafc' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }} />
                  <Bar dataKey="Presupuestado" fill="#cbd5e1" radius={[2, 2, 0, 0]} barSize={24} />
                  <Bar dataKey="Gastado" fill="#0f172a" radius={[2, 2, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════ SECCIÓN 3: BOLETAJE & EGRESOS ═══════ */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">🎟️ Boletaje y Egresos</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Ventas por zona */}
          <div className="glass-card p-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Ventas por Zona</h3>
            {statsZonas.every(z => z.Vendidos === 0 && z.Disponibles === 0) ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                <Ticket size={28} className="mb-3 opacity-40" />
                <p className="text-sm font-medium">Sin movimientos registrados</p>
                <p className="text-xs mt-1">Registra ventas en el módulo de Boletaje</p>
              </div>
            ) : (
              <div className="space-y-3">
                {statsZonas.map(z => {
                  const total = z.Vendidos + z.Disponibles
                  const pct = total > 0 ? (z.Vendidos / total) * 100 : 0
                  return (
                    <div key={z.zona} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-bold text-slate-900">{z.zona}</span>
                        <span className="text-xs font-semibold text-emerald-600">{money(z.Ingresos)}</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                        <span>{fmt(z.Vendidos)} vendidos · {fmt(z.Disponibles)} disponibles</span>
                        <span className="font-bold">{pct.toFixed(0)}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div className="h-full bg-slate-900 transition-all duration-700" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Distribución de egresos */}
          <div className="glass-card p-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Distribución de Egresos</h3>
            {pieData.length === 1 && pieData[0].name === 'Sin egresos' ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                <DollarSign size={28} className="mb-3 opacity-40" />
                <p className="text-sm font-medium">Sin egresos registrados</p>
              </div>
            ) : (
              <div className="h-48 w-full">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value" stroke="none">
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip isMoney />} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Total egresos comprometidos</span><span className="font-bold text-slate-900">{money(totalEgresos)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Ya desembolsado</span><span className="font-bold text-red-600">{money(totalEgresosReales)}</span></div>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
