import { money, fmt, ZONAS, totalBoletos, precioZona } from '../lib/ticketHelpers'

export default function PanelConteo({ ventas, ventasTikzet, puntoFilter }) {
  const stats = {}
  ZONAS.forEach(z => {
    const total = totalBoletos(z)
    const ventasZona = ventas.filter(v => v.zona === z && (!puntoFilter || v.punto_venta === puntoFilter))
    const vendidos = ventasZona.filter(v => v.estado === 'vendido').length
    const cancelados = ventasZona.filter(v => v.estado === 'cancelado').length
    const tikzetZona = ventasTikzet.filter(t => t.zona === z).reduce((a, t) => a + t.cantidad, 0)
    const disponibles = total - vendidos - tikzetZona
    stats[z] = { total, vendidos, cancelados, disponibles: Math.max(0, disponibles), tikzet: tikzetZona }
  })

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      {ZONAS.map(z => {
        const s = stats[z]
        const precio = precioZona(z)
        const dineroVentas = s.vendidos * precio
        const pct = s.total > 0 ? ((s.vendidos + s.tikzet) / s.total * 100) : 0
        return (
          <div key={z} className="glass-card p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-3">{z}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">🟢 Disponibles</span>
                <span className="font-bold text-emerald-600">{fmt(s.disponibles)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">🔴 Vendidos</span>
                <span className="font-bold text-red-600">{fmt(s.vendidos)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">⚫ Cancelados</span>
                <span className="font-bold text-slate-600">{fmt(s.cancelados)}</span>
              </div>
              {s.tikzet > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">🌐 Tikzet</span>
                  <span className="font-bold text-blue-600">{fmt(s.tikzet)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-gray-100 flex justify-between">
                <span className="text-slate-500">💰 Recaudado</span>
                <span className="font-bold text-emerald-600">{money(dineroVentas)}</span>
              </div>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                <span>Ocupación</span>
                <span className="font-bold">{pct.toFixed(0)}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div className={`h-full transition-all duration-700 ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
