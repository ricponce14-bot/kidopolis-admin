import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export { autoTable }

export function money(n) {
  return `$${Number(n ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function fmt(n) {
  return Number(n ?? 0).toLocaleString('es-MX')
}

// Configuración base para todos los PDFs
export function createBasePDF(title) {
  const doc = new jsPDF()
  
  // Encabezado
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('KidoPolis', 14, 20)
  
  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  doc.text(title, 14, 30)
  
  // Fecha en la esquina superior derecha
  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  const fechaStr = new Date().toLocaleString('es-MX')
  doc.text(`Generado: ${fechaStr}`, doc.internal.pageSize.width - 14, 20, { align: 'right' })
  
  // Línea divisoria
  doc.setDrawColor(220, 220, 220)
  doc.line(14, 35, doc.internal.pageSize.width - 14, 35)
  
  // Pie de página general para todas las páginas
  const pageCount = doc.internal.getNumberOfPages()
  doc.setFontSize(8)
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.text(
      `Documento generado automáticamente por KidoPolis - Página ${i} de ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    )
  }

  return doc
}

// Estilos por defecto para autoTable
export const tableStyles = {
  theme: 'grid',
  headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
  styles: { font: 'helvetica', fontSize: 9, cellPadding: 3 },
  alternateRowStyles: { fillColor: [249, 250, 251] },
}
