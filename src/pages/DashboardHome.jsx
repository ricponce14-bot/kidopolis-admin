import { useEffect, useState, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'
import {
  TrendingUp, TrendingDown, DollarSign, Package,
  Activity, Ticket, Megaphone, Calculator,
  Briefcase, AlertCircle, Download
} from 'lucide-react'
import { createBasePDF, tableStyles, autoTable } from '../lib/pdfExport'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts'

function money(n) { return `$${Number(n ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }
function fmt(n) { return Number(n ?? 0).toLocaleString('es-MX') }

const ZONAS = ['Zona A', 'Zona B', 'Zona C']
const PLATAFORMAS = ['Meta', 'Google', 'TikTok', 'Instagram', 'Otra']
const CATEGORIAS_GASTOS = ['Producción', 'Logística', 'Personal', 'Venue', 'Otro']

// Custom Tooltip minimalista
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

function StatCard({ icon: Icon, label, value, subtitle, to }) {
  const content = (
    <div className={`glass-card p-5 flex items-start gap-4 animate-fade-in ${to ? 'hover:border-slate-400 transition-colors cursor-pointer group' : ''}`}>
      <div className="w-10 h-10 rounded bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={20} className="text-slate-700" />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-1 text-slate-500">{label}</p>
        <p className={`text-2xl font-bold tracking-tight text-slate-900 ${to ? 'group-hover:text-slate-700' : ''}`}>{value}</p>
        {subtitle && <p className="text-xs mt-1 text-slate-500">{subtitle}</p>}
      </div>
    </div>
  )
  return to ? <Link to={to} className="block">{content}</Link> : content
}

function ProfitCard({ profit }) {
  const isPositive = profit >= 0
  const colorClass = isPositive ? 'text-emerald-600' : 'text-red-600'
  const bgClass = isPositive ? 'bg-emerald-50' : 'bg-red-50'
  const borderClass = isPositive ? 'border-emerald-100' : 'border-red-100'
  const Icon = isPositive ? TrendingUp : TrendingDown

  return (
    <div className={`p-6 rounded-lg border ${borderClass} ${bgClass} flex items-center justify-between animate-fade-in h-full`}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-1 text-slate-600">Utilidad Estimada</p>
        <p className={`text-3xl sm:text-4xl font-bold tracking-tight ${colorClass}`}>{money(profit)}</p>
        <p className="text-xs mt-1 text-slate-600 font-medium">Ingresos totales por boletos menos total de egresos reales</p>
      </div>
      <div className={`w-14 h-14 rounded-full flex items-center justify-center bg-white border ${borderClass} shadow-sm hidden sm:flex`}>
        <Icon size={24} className={colorClass} />
      </div>
    </div>
  )
}

function BudgetCard({ budget, totalEgresos }) {
  const total = Number(budget?.total || 0)
  const pct = total > 0 ? (totalEgresos / total) * 100 : 0
  let colorClass = 'bg-slate-900'
  if (pct >= 80) colorClass = 'bg-amber-500'
  if (pct >= 100) colorClass = 'bg-red-500'

  return (
    <div className="glass-card p-6 animate-fade-in h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-2">
          <div className="flex items-center gap-2">
            <Calculator size={18} className="text-slate-500" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Presupuesto General</h3>
          </div>
          <Link to="/dashboard/budget" className="text-[10px] font-bold text-slate-400 uppercase hover:text-slate-800">Ver Módulo →</Link>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Presupuesto</p>
            <p className="text-xl font-bold text-slate-900 cursor-pointer hover:underline"><Link to="/dashboard/budget">{money(total)}</Link></p>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Gastado</p>
            <p className="text-xl font-bold text-slate-900">{money(totalEgresos)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Restante</p>
            <p className="text-xl font-bold text-slate-600">{money(total - totalEgresos)}</p>
          </div>
        </div>
      </div>

      <div className="mt-2">
        <div className="flex justify-between items-center mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">
          <span>Ejecución</span>
          <span className={pct >= 100 ? 'text-red-600' : pct >= 80 ? 'text-amber-600' : 'text-slate-900'}>{pct.toFixed(1)}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
          <div className={`h-full transition-all duration-700 ${colorClass}`} style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
      </div>
    </div>
  )
}

export default function DashboardHome() {
  const { isAdmin } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  
  const [budget, setBudget]   = useState(null)
  const [boletos, setBoletos] = useState([])
  const [movimientos, setMovimientos] = useState([])
  const [gastos, setGastos]   = useState([])
  const [pautas, setPautas]   = useState([])

  async function loadData() {
    setLoading(true)
    setError(null)
    
    try {
      const [resBudget, resBoletos, resMovs, resGastos, resPautas] = await Promise.all([
        supabase.from('presupuesto_general').select('*').eq('id', 1).single(),
        supabase.from('puntos_venta').select('*'),
        supabase.from('movimientos_folios').select('*'),
        supabase.from('gastos').select('*'),
        supabase.from('pautas').select('*')
      ])

      if (resBudget.error && resBudget.error.code !== 'PGRST116') throw resBudget.error
      if (resBoletos.error) throw resBoletos.error
      if (resMovs.error && resMovs.error.code !== '42P01') console.error('Movimientos no existen aún')
      if (resGastos.error) throw resGastos.error
      if (resPautas.error) throw resPautas.error

      setBudget(resBudget.data || { total: 0, produccion: 0, logistica: 0, personal: 0, venue: 0, pauta: 0, otros: 0 })
      setBoletos(resBoletos.data || [])
      setMovimientos(resMovs.data || [])
      setGastos(resGastos.data || [])
      setPautas(resPautas.data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  // ─── Cálculos ───
  const { ingresosBoletos, statsZonas } = useMemo(() => {
    let ingresos = 0
    const statsMap = {}
    ZONAS.forEach(z => { statsMap[z] = { zona: z, Vendidos: 0, Disponibles: 0 } })

    // Inicializar Disponibles (restar de un máximo teórico si se quisiera, pero como el Mapeo usa TOTAL_FOLIOS...)
    const TOTAL_FOLIOS = { 'Zona Kids': 2000, 'Zona Pop': 600, 'Zona Mágica': 400 }

    movimientos.forEach(m => {
      const punto = boletos.find(p => p.id === m.punto_venta_id)
      if (!punto || !statsMap[punto.zona]) return

      if (m.tipo === 'asignacion') {
        statsMap[punto.zona].Disponibles += m.cantidad
      } else if (m.tipo === 'venta') {
        statsMap[punto.zona].Vendidos += m.cantidad
        statsMap[punto.zona].Disponibles = Math.max(0, statsMap[punto.zona].Disponibles - m.cantidad)
        ingresos += (m.cantidad * punto.precio_unitario)
      } else if (m.tipo === 'devolucion') {
        statsMap[punto.zona].Disponibles += m.cantidad
      }
    })

    return { ingresosBoletos: ingresos, statsZonas: Object.values(statsMap) }
  }, [boletos, movimientos])

  const ticketTotals = useMemo(() => {
    const ven = statsZonas.reduce((a, b) => a + b.Vendidos, 0)
    const disp = statsZonas.reduce((a, b) => a + b.Disponibles, 0)
    if (ven === 0 && disp === 0) return [{ name: 'Sin registros', value: 1, fill: '#f1f5f9' }] // Evita crash en Recharts
    return [{ name: 'Vendidos', value: ven }, { name: 'Disponibles', value: disp }]
  }, [statsZonas])

  const totalGastos = useMemo(() => gastos.reduce((acc, g) => acc + Number(g.monto), 0), [gastos])
  const totalPautas = useMemo(() => pautas.reduce((acc, p) => acc + Number(p.monto), 0), [pautas])
  const totalEgresos = totalGastos + totalPautas

  const utilidad = ingresosBoletos - totalEgresos

  const statsPlataformas = useMemo(() => {
    return PLATAFORMAS.map(plat => {
      const monto = pautas.filter(p => p.plataforma === plat).reduce((acc, p) => acc + Number(p.monto), 0)
      return { plataforma: plat, Inversión: monto }
    }).filter(s => s.Inversión > 0).sort((a, b) => b.Inversión - a.Inversión)
  }, [pautas])

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

  function exportGeneralPDF() {
    const doc = createBasePDF('Reporte General del Evento')

    doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.text('Resumen Financiero', 14, 45)
    autoTable(doc, { ...tableStyles, startY: 50, head: [['Ingresos Boletos', 'Gastos Generales', 'Pauta Digital', 'Utilidad Estimada']], body: [[money(ingresosBoletos), money(totalGastos), money(totalPautas), money(utilidad)]] })

    let currentY = doc.lastAutoTable.finalY + 10
    doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.text('Ejecución de Presupuesto Inicial', 14, currentY)
    autoTable(doc, { ...tableStyles, startY: currentY + 5, head: [['Concepto', 'Monto']], body: [['Presupuesto Total', money(budget.total)], ['Total Gastado', money(totalEgresos)], ['Restante', money(budget.total - totalEgresos)], ['Ejecución', `${budget.total > 0 ? ((totalEgresos / budget.total)*100).toFixed(1) : 0}%`]] })

    currentY = doc.lastAutoTable.finalY + 10
    if (currentY > 230) { doc.addPage(); currentY = 45; }
    doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.text('Ventas por Zona', 14, currentY)
    autoTable(doc, { ...tableStyles, startY: currentY + 5, head: [['Zona', 'Vendidos', 'Disponibles', 'Ingresos Estimados']], body: statsZonas.map(z => [z.zona, fmt(z.Vendidos), fmt(z.Disponibles), money(boletos.filter(b=>b.zona===z.zona).reduce((acc, b) => acc + (z.Vendidos * b.precio_unitario), 0))]) })

    currentY = doc.lastAutoTable.finalY + 10
    if (currentY > 230) { doc.addPage(); currentY = 45; }
    doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.text('Gastos por Categoría', 14, currentY)
    const catGastos = CATEGORIAS_GASTOS.map(cat => [cat, money(gastos.filter(g => g.categoria === cat).reduce((acc, g) => acc + Number(g.monto), 0))]).filter(row => row[1] !== '$0.00')
    catGastos.push([{ content: 'Total Gastos', styles: { fontStyle: 'bold' } }, { content: money(totalGastos), styles: { fontStyle: 'bold' } }])
    autoTable(doc, { ...tableStyles, startY: currentY + 5, head: [['Categoría', 'Subtotal']], body: catGastos })

    currentY = doc.lastAutoTable.finalY + 10
    if (currentY > 230) { doc.addPage(); currentY = 45; }
    doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.text('Pauta por Plataforma', 14, currentY)
    const plats = statsPlataformas.map(p => [p.plataforma, money(p.Inversión)])
    plats.push([{ content: 'Total Pauta', styles: { fontStyle: 'bold' } }, { content: money(totalPautas), styles: { fontStyle: 'bold' } }])
    autoTable(doc, { ...tableStyles, startY: currentY + 5, head: [['Plataforma', 'Inversión']], body: plats })

    doc.save('kidopolis-reporte-general.pdf')
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="spinner" /></div>
  if (error) return <div className="glass-card p-6 flex items-start gap-4 animate-fade-in border-red-200 bg-red-50"><AlertCircle size={24} className="text-red-500 mt-1" /><div><h2 className="text-sm font-bold text-red-700 mb-1">Error</h2><p className="text-sm text-red-600">{error}</p></div></div>

  return (
    <div className="space-y-8 pb-10">
      
      <div className="animate-fade-in flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Resumen General</h1>
          <p className="mt-1 text-sm text-slate-500 flex items-center gap-1.5"><Activity size={14} /> {isAdmin ? 'Vista de Administrador' : 'Vista de Solo Lectura'}</p>
        </div>
        <button className="btn-primary" onClick={exportGeneralPDF}><Download size={16} /> Exportar Reporte</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProfitCard profit={utilidad} />
        <BudgetCard budget={budget} totalEgresos={totalEgresos} />
      </div>

      {/* GRAFICA BARRAS: Presupuestado vs Gastado */}
      <div className="glass-card p-6 animate-fade-in">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-6">Presupuesto vs Gasto Real por Categoría</h2>
        <div className="h-64 w-full">
          <ResponsiveContainer>
            <BarChart data={budgetVsReal} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="categoria" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(val) => `$${val/1000}k`} />
              <Tooltip content={<CustomTooltip isMoney />} cursor={{ fill: '#f8fafc' }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
              <Bar dataKey="Presupuestado" fill="#cbd5e1" radius={[2, 2, 0, 0]} barSize={30} />
              <Bar dataKey="Gastado" fill="#0f172a" radius={[2, 2, 0, 0]} barSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* BOLETOS */}
        <div className="space-y-6">
          <StatCard icon={DollarSign} label="Ingresos Estimados" value={money(ingresosBoletos)} subtitle="Por boletos vendidos" to="/dashboard/tickets" />

          {/* Gráfica Donut & Barras horizontales combinadas */}
          <div className="glass-card p-6 animate-fade-in">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">Estado del Boletaje</h3>
            <div className="h-40 w-full mb-6">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={ticketTotals} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={2} dataKey="value" stroke="none">
                    <Cell fill="#0f172a" />
                    <Cell fill="#e2e8f0" />
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4 border-t border-slate-100 pt-4">Ventas por Zona</h3>
            <div className="h-48 w-full">
              <ResponsiveContainer>
                <BarChart data={statsZonas} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="zona" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                  <Bar dataKey="Vendidos" stackId="a" fill="#0f172a" barSize={15} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Disponibles" stackId="a" fill="#e2e8f0" barSize={15} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* FINANZAS */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard icon={Package} label="Gastos Grales." value={money(totalGastos)} to="/dashboard/expenses" />
            <StatCard icon={Megaphone} label="Pauta Digital" value={money(totalPautas)} to="/dashboard/ads" />
          </div>

          <div className="glass-card p-6 animate-fade-in">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-6">Inversión en Pauta por Plataforma</h3>
            {statsPlataformas.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-10">No hay inversión registrada.</p>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer>
                  <LineChart data={statsPlataformas} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="plataforma" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(val) => `$${val/1000}k`} />
                    <Tooltip content={<CustomTooltip isMoney />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '3 3' }} />
                    <Line type="monotone" dataKey="Inversión" stroke="#0f172a" strokeWidth={3} dot={{ r: 4, fill: '#0f172a', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Invertido</span>
              <span className="font-bold text-slate-900">{money(totalPautas)}</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  )
}
