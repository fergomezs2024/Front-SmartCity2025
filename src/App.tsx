import React, { useState } from 'react'
import Navbar from './components/Navbar'
import AgentQuery from './components/AgentQuery'
import MapView from './components/MapView'
import CriticalRoutesTable from './components/CriticalRoutesTable'
import TemporalAnalysis from './components/TemporalAnalysis'
import AgentProposals from './components/AgentProposals'
import { CriticalPoint, CriticalRoute, KPI, Proposal } from './types'
import { generateReport } from './utils/report'
export default function App() {
  const [query, setQuery] = useState('')
  const [points, setPoints] = useState<CriticalPoint[]>([])
  const [routes, setRoutes] = useState<CriticalRoute[]>([])
  const [kpi, setKpi] = useState<KPI | null>(null)
  const [temporal, setTemporal] = useState<any>(null)
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [selected, setSelected] = useState<CriticalPoint | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onAsk = async (q: string) => {
    setQuery(q)
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q })
      })
      if (!res.ok) throw new Error(`Error HTTP ${res.status}`)

      const data = await res.json()
      setPoints(data.points || [])
      setRoutes(data.routes || [])
      setKpi(data.kpi || null)
      setTemporal(data.temporal || null)
      setProposals(data.proposals || [])
    } catch (e: any) {
      console.error('Error al consultar la API:', e)
      setError('No se pudo conectar con el backend o el formato de respuesta no es válido.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <Navbar />
{!loading &&  (
  <div style={{ margin: '16px 0' }}>
    <button onClick={() => generateReport({ points, routes, kpi, temporal, proposals })}>
      Descargar reporte PDF
    </button>
  </div>
)}
      <div className="content">
        <AgentQuery
          kpi={
            kpi || {
              accidents: { value: 0, deltaPct: 0 },
              victims: { value: 0, deltaPct: 0 },
              improvements: { value: 0, deltaPct: 0 }
            }
          }
          onSubmit={onAsk}
        />

        {loading && <div className="card"><strong>Cargando datos...</strong></div>}
        {error && <div className="card" style={{ color: 'red' }}>{error}</div>}

        <div className="grid-main">
          <MapView points={points} onSelect={setSelected} />

          {selected && (
            <div className="card">
              <h3>Detalle del punto seleccionado</h3>
              <p><strong>{selected.name}</strong></p>
              <ul>
                <li>Riesgo: {selected.risk}</li>
                <li>Probabilidad: {(selected.probability * 100).toFixed(0)}%</li>
                <li>Tipo de vía: {selected.roadType}</li>
                <li>Región/Ciudad: {selected.region} / {selected.city}</li>
                <li>Horario crítico: {selected.timeband ?? 's/d'}</li>
              </ul>
            </div>
          )}

          <CriticalRoutesTable routes={routes} />
          {temporal && <TemporalAnalysis data={temporal} />}
          <AgentProposals proposals={proposals} />
        </div>
      </div>
    </div>
  )
}
