import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

type ReportInput = {
  points?: Array<{
    id: string; name: string; lat: number; lng: number;
    risk: string; probability: number; roadType: string;
    region: string; city: string; timeband?: string;
  }>,
  routes?: Array<{
    id: string; label: string; risk: string; score: number;
  }>,
  kpi?: {
    accidents?: { value?: number | string; deltaPct?: number | string },
    victims?: { value?: number | string; deltaPct?: number | string },
    improvements?: { value?: number | string; deltaPct?: number | string },
  } | null,
  temporal?: {
    criticalHours?: string[],
    causes?: { label: string; pct: number }[],
  } | null,
  proposals?: Array<{
    id: string; title: string; priority: string;
    expectedImpactPct: number; eta: string; cost: string;
    description: string; techDetails: string;
  }>
}

const NO = 'dato no obtenido'

// Helpers seguros
const val = <T,>(x: T | null | undefined, fallback: string = NO) =>
  (x === null || x === undefined || (typeof x === 'number' && Number.isNaN(x))) ? fallback : String(x)

export function generateReport(raw: ReportInput) {
  const doc = new jsPDF()
  const date = new Date().toLocaleString()

  // Normalizaciones seguras
  const points = Array.isArray(raw.points) ? raw.points : []
  const routes = Array.isArray(raw.routes) ? raw.routes : []
  const proposals = Array.isArray(raw.proposals) ? raw.proposals : []

  const kpi = raw.kpi ?? {}
  const kAccVal = val(kpi.accidents?.value)
  const kAccDelta = val(kpi.accidents?.deltaPct)
  const kVictVal = val(kpi.victims?.value)
  const kVictDelta = val(kpi.victims?.deltaPct)
  const kImpVal = val(kpi.improvements?.value)
  const kImpDelta = val(kpi.improvements?.deltaPct)

  const temporal = raw.temporal ?? {}
  const hours = Array.isArray(temporal.criticalHours) ? temporal.criticalHours : []
  const causes = Array.isArray(temporal.causes) ? temporal.causes : []
  const pairLen = Math.max(hours.length, causes.length)

  // ----------------- Header -----------------
  doc.setFontSize(18)
  doc.text('Reporte de Riesgo y Accidentabilidad', 14, 20)
  doc.setFontSize(10)
  doc.text(`Generado: ${date}`, 14, 27)

  // ----------------- KPIs -----------------
  doc.setFontSize(14)
  doc.text('Indicadores Clave (últimos 6 meses)', 14, 38)
  autoTable(doc, {
    startY: 42,
    head: [['Indicador', 'Valor', 'Variación']],
    body: [
      ['Accidentes', kAccVal, kAccDelta === NO ? NO : `${kAccDelta}%`],
      ['Víctimas',   kVictVal, kVictDelta === NO ? NO : `${kVictDelta}%`],
      ['Mejoras',    kImpVal,  kImpDelta === NO ? NO : `${kImpDelta}%`],
    ]
  })

  // ----------------- Rutas críticas -----------------
  let y = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 10 : 60
  doc.setFontSize(14)
  doc.text('Rutas críticas', 14, y)
  autoTable(doc, {
    startY: y + 4,
    head: [['Ruta', 'Riesgo', 'Puntaje']],
    body: routes.length
      ? routes.map(r => [val(r.label), val(r.risk), val(r.score)])
      : [[NO, NO, NO]]
  })

  // ----------------- Puntos críticos -----------------
  y = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 10 : y + 30
  doc.setFontSize(14)
  doc.text('Puntos críticos', 14, y)
  autoTable(doc, {
    startY: y + 4,
    head: [['Ubicación', 'Riesgo', 'Probabilidad', 'Tipo vía']],
    body: points.length
      ? points.map(p => [
          `${val(p.name)} (${val(p.city)})`,
          val(p.risk),
          p?.probability === undefined || p?.probability === null ? NO : `${(Number(p.probability) * 100).toFixed(1)}%`,
          val(p.roadType)
        ])
      : [[NO, NO, NO, NO]]
  })

  // ----------------- Horarios y causas -----------------
  y = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 10 : y + 30
  doc.setFontSize(14)
  doc.text('Horarios y causas principales', 14, y)

  const temporalBody =
    pairLen > 0
      ? Array.from({ length: pairLen }).map((_, i) => [
          val(hours[i]),
          val(causes[i]?.label),
          causes[i]?.pct === undefined || causes[i]?.pct === null ? NO : `${causes[i].pct}%`
        ])
      : [[NO, NO, NO]]

  autoTable(doc, {
    startY: y + 4,
    head: [['Horario', 'Causa', 'Porcentaje']],
    body: temporalBody
  })

  // ----------------- Propuestas del Agente -----------------
  y = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 10 : y + 30
  doc.setFontSize(14)
  doc.text('Propuestas del Agente', 14, y)
  autoTable(doc, {
    startY: y + 4,
    head: [['Título', 'Prioridad', 'Impacto', 'Plazo', 'Costo']],
    body: proposals.length
      ? proposals.map(p => [
          val(p.title),
          val(p.priority),
          p?.expectedImpactPct === undefined || p?.expectedImpactPct === null ? NO : `${p.expectedImpactPct}%`,
          val(p.eta),
          val(p.cost)
        ])
      : [[NO, NO, NO, NO, NO]]
  })

  // Guardar
  doc.save(`reporte_rutas_${new Date().toISOString().split('T')[0]}.pdf`)
}
