// ============================================================
// KIDOPOLIS — Helpers de Boletaje v2
// Validación de folios por zona, rangos y formatos
// ============================================================

export const ZONAS = ['Zona Mágica', 'Zona Pop', 'Zona Kids']

export const ZONA_CONFIG = {
  'Zona Mágica': { prefix: 'M', min: 1, max: 300, padLen: 3, precio: 450 },
  'Zona Pop':    { prefix: 'P', min: 301, max: 1000, padLen: 0, precio: 350 },
  'Zona Kids':   { prefix: '',  min: 1, max: 3000, padLen: 4, precio: 200 },
}

// Total de boletos por zona
export function totalBoletos(zona) {
  const c = ZONA_CONFIG[zona]
  if (!c) return 0
  return c.max - c.min + 1
}

// Valida formato y rango de un folio para una zona dada
// Retorna { valid: boolean, error?: string, normalized?: string }
export function validateFolio(folio, zona) {
  const cfg = ZONA_CONFIG[zona]
  if (!cfg) return { valid: false, error: 'Zona no reconocida' }

  const raw = folio.trim().toUpperCase()
  if (!raw) return { valid: false, error: 'El folio no puede estar vacío' }

  if (zona === 'Zona Mágica') {
    // Formato: M001 – M300
    const match = raw.match(/^M(\d+)$/)
    if (!match) return { valid: false, error: 'El folio de Zona Mágica debe tener formato M001–M300' }
    const num = parseInt(match[1], 10)
    if (num < cfg.min || num > cfg.max) return { valid: false, error: `Folio fuera de rango (M${String(cfg.min).padStart(3,'0')}–M${cfg.max})` }
    return { valid: true, normalized: `M${String(num).padStart(3, '0')}` }
  }

  if (zona === 'Zona Pop') {
    // Formato: P301 – P1000
    const match = raw.match(/^P(\d+)$/)
    if (!match) return { valid: false, error: 'El folio de Zona Pop debe tener formato P301–P1000' }
    const num = parseInt(match[1], 10)
    if (num < cfg.min || num > cfg.max) return { valid: false, error: `Folio fuera de rango (P${cfg.min}–P${cfg.max})` }
    return { valid: true, normalized: `P${num}` }
  }

  if (zona === 'Zona Kids') {
    // Formato: 0001 – 3000 (sin prefijo, numérico)
    const match = raw.match(/^(\d+)$/)
    if (!match) return { valid: false, error: 'El folio de Zona Kids debe ser numérico (0001–3000)' }
    const num = parseInt(match[1], 10)
    if (num < cfg.min || num > cfg.max) return { valid: false, error: `Folio fuera de rango (0001–3000)` }
    return { valid: true, normalized: String(num).padStart(4, '0') }
  }

  return { valid: false, error: 'Zona desconocida' }
}

// Precio por zona
export function precioZona(zona) {
  return ZONA_CONFIG[zona]?.precio ?? 0
}

// Genera ejemplo de folio para una zona
export function folioEjemplo(zona) {
  if (zona === 'Zona Mágica') return 'M001'
  if (zona === 'Zona Pop') return 'P301'
  if (zona === 'Zona Kids') return '0001'
  return ''
}

// Formateadores
export function money(n) {
  return `$${Number(n ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function fmt(n) {
  return Number(n ?? 0).toLocaleString('es-MX')
}
