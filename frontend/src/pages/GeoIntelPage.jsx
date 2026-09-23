import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { AlertTriangle, ChevronRight, Clock3, Layers, LocateFixed, MapPinned, Search } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { GEOPOL_CHECKPOINTS, GEOPOL_METRICS, GEOPOL_TRAILS, checkpointsToFeatureCollection, trailToFeatureCollection } from '../data/geopolDemoData'
import { useSessionStore } from '../store/sessionStore'
import './GeoIntelPage.css'

const indiaBounds = [[66.2, 6.4], [99.6, 37.8]]
const heatmapDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
const heatmapMonths = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC', 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL']
const heatmapCells = Array.from({ length: heatmapDays.length * heatmapMonths.length }, (_, index) => ({
  value: (index * 17 + 23) % 100,
  label: index === 68 ? '128' : index === 125 ? '64' : ''
}))

function makeMapStyle() {
  return {
    version: 8,
    sources: {
      osm: {
        type: 'raster',
        tiles: [
          'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
        ],
        tileSize: 256,
        attribution: '&copy; OpenStreetMap contributors'
      }
    },
    layers: [{ id: 'osm', type: 'raster', source: 'osm' }]
  }
}

function riskClass(value) {
  if (value >= 25) return 'critical'
  if (value >= 14) return 'elevated'
  return 'normal'
}

function trailCoordinates(trail) {
  return trail?.routeCoordinates || trail?.events?.map(event => event.coordinates) || []
}

function trailMatches(trail, query) {
  const term = query.trim().toLowerCase()
  if (!term) return true
  return [
    trail.id,
    trail.subject,
    trail.document,
    trail.risk,
    trail.summary,
    ...(trail.events || []).flatMap(event => [event.name, event.type, event.time])
  ].some(value => String(value || '').toLowerCase().includes(term))
}

export default function GeoIntelPage() {
  const [searchParams] = useSearchParams()
  const identityId = searchParams.get('identity')
  const linkedSession = useSessionStore(state => state.sessions.find(item => item.id === identityId))
  const mapRef = useRef(null)
  const containerRef = useRef(null)
  const [metric, setMetric] = useState('risk')
  const [mode, setMode] = useState('checkpoint')
  const [verificationId, setVerificationId] = useState('')
  const [showHeatmap, setShowHeatmap] = useState(true)
  const [selectedCheckpointId, setSelectedCheckpointId] = useState('raxaul-icp')
  const [selectedTrailId, setSelectedTrailId] = useState('talon-20260923-raxaul-jammu')
  const selectedCheckpoint = GEOPOL_CHECKPOINTS.find(item => item.id === selectedCheckpointId) || GEOPOL_CHECKPOINTS[0]
  const filteredTrails = useMemo(() => GEOPOL_TRAILS.filter(trail => trailMatches(trail, verificationId)), [verificationId])
  const activeTrail = filteredTrails.find(trail => trail.id === selectedTrailId) || filteredTrails[0] || GEOPOL_TRAILS[0]
  const activeMetric = GEOPOL_METRICS.find(item => item.id === metric) || GEOPOL_METRICS[1]
  const totals = useMemo(() => GEOPOL_CHECKPOINTS.reduce((acc, item) => ({
    activity: acc.activity + item.activity,
    risk: acc.risk + item.risk,
    face: acc.face + item.face,
    csii: acc.csii + item.csii
  }), { activity: 0, risk: 0, face: 0, csii: 0 }), [])

  const fitTrail = trail => {
    const coordinates = trailCoordinates(trail)
    const map = mapRef.current
    if (!map || coordinates.length < 2) return
    const bounds = coordinates.reduce((nextBounds, coordinate) => nextBounds.extend(coordinate), new maplibregl.LngLatBounds(coordinates[0], coordinates[0]))
    map.fitBounds(bounds, { padding: 72, duration: 850, maxZoom: 6.8 })
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: makeMapStyle(),
      center: [78.9629, 22.5937],
      zoom: 4.05,
      minZoom: 3.4,
      maxZoom: 11,
      maxBounds: indiaBounds,
      attributionControl: false
    })
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), 'bottom-right')
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left')
    mapRef.current = map

    map.on('load', () => {
      map.addSource('checkpoints', { type: 'geojson', data: checkpointsToFeatureCollection(metric) })
      map.addSource('demo-movement', { type: 'geojson', data: trailToFeatureCollection(activeTrail) })

      map.addLayer({
        id: 'checkpoint-heat',
        type: 'heatmap',
        source: 'checkpoints',
        paint: {
          'heatmap-weight': ['interpolate', ['linear'], ['get', 'weight'], 0, 0, 140, 1],
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 3, 0.75, 8, 2.2],
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 3, 22, 8, 44],
          'heatmap-opacity': 0.72,
          'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'], 0, 'rgba(59,130,246,0)', 0.22, '#60a5fa', 0.45, '#22c55e', 0.68, '#facc15', 0.9, '#ef4444']
        }
      })
      map.addLayer({
        id: 'demo-movement-line',
        type: 'line',
        source: 'demo-movement',
        filter: ['==', ['geometry-type'], 'LineString'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#4f46e5', 'line-width': 5, 'line-opacity': 0.94 }
      })
      map.addLayer({
        id: 'demo-movement-points',
        type: 'circle',
        source: 'demo-movement',
        filter: ['==', ['geometry-type'], 'Point'],
        paint: { 'circle-color': ['case', ['==', ['get', 'sequence'], 1], '#16a34a', '#dc2626'], 'circle-radius': 8, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 3 }
      })
      map.addLayer({
        id: 'demo-movement-labels',
        type: 'symbol',
        source: 'demo-movement',
        filter: ['==', ['geometry-type'], 'Point'],
        layout: { 'text-field': ['concat', ['get', 'label'], ' · ', ['get', 'name']], 'text-size': 11, 'text-offset': [0, 1.5], 'text-anchor': 'top' },
        paint: { 'text-color': '#111827', 'text-halo-color': '#ffffff', 'text-halo-width': 1.4 }
      })
      map.addLayer({
        id: 'checkpoint-circles',
        type: 'circle',
        source: 'checkpoints',
        paint: {
          'circle-color': ['case', ['>=', ['get', 'risk'], 25], '#dc2626', ['>=', ['get', 'risk'], 14], '#d97706', '#2563eb'],
          'circle-radius': ['interpolate', ['linear'], ['get', 'activity'], 40, 8, 150, 18],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
          'circle-opacity': 0.9
        }
      })
      map.addLayer({
        id: 'checkpoint-labels',
        type: 'symbol',
        source: 'checkpoints',
        minzoom: 4.8,
        layout: { 'text-field': ['get', 'name'], 'text-size': 11, 'text-offset': [0, 1.35], 'text-anchor': 'top' },
        paint: { 'text-color': '#1f2937', 'text-halo-color': '#ffffff', 'text-halo-width': 1.2 }
      })
      ;['demo-movement-line', 'demo-movement-points', 'demo-movement-labels'].forEach(layerId => {
        if (map.getLayer(layerId)) map.moveLayer(layerId)
      })
      ;['demo-movement-line', 'demo-movement-points', 'demo-movement-labels'].forEach(layerId => {
        map.setLayoutProperty(layerId, 'visibility', mode === 'movement' ? 'visible' : 'none')
      })

      map.on('click', 'checkpoint-circles', event => {
        const feature = event.features?.[0]
        if (feature?.properties?.id) setSelectedCheckpointId(feature.properties.id)
      })
      map.on('mouseenter', 'checkpoint-circles', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'checkpoint-circles', () => { map.getCanvas().style.cursor = '' })
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map?.isStyleLoaded()) return
    map.getSource('checkpoints')?.setData(checkpointsToFeatureCollection(metric))
    map.getSource('demo-movement')?.setData(trailToFeatureCollection(activeTrail))
    if (map.getLayer('checkpoint-heat')) map.setLayoutProperty('checkpoint-heat', 'visibility', showHeatmap ? 'visible' : 'none')
    ;['demo-movement-line', 'demo-movement-points', 'demo-movement-labels'].forEach(layerId => {
      if (map.getLayer(layerId)) map.setLayoutProperty(layerId, 'visibility', mode === 'movement' ? 'visible' : 'none')
    })
    if (mode === 'movement') fitTrail(activeTrail)
  }, [metric, showHeatmap, mode, activeTrail])

  const focusCheckpoint = checkpoint => {
    setSelectedCheckpointId(checkpoint.id)
    mapRef.current?.flyTo({ center: checkpoint.coordinates, zoom: 6.9, duration: 800 })
  }

  return <div className="geopol-page">
    <nav className="geopol-breadcrumb" aria-label="Breadcrumb"><Link to="/dashboard">Overview</Link><ChevronRight size={12} /><span>Geopol</span></nav>
    <header className="geopol-header">
      <div><span className="geopol-kicker"><MapPinned size={15} /> Geospatial intelligence</span><h1>Geopol checkpoint map</h1><p>India checkpoint activity and heatmap analysis for operational review.</p></div>
      <div className="geopol-score"><span>{activeMetric.label}</span><strong>{metric === 'risk' ? 112 : totals[metric]}</strong><small>{activeMetric.description}</small></div>
    </header>
    {identityId && <section className="geopol-session-context">
      <AlertTriangle size={16} />
      <div>
        <strong>{linkedSession ? `Review context: ${linkedSession.id}` : `Review context: ${identityId}`}</strong>
        <p>{linkedSession ? `${linkedSession.subjectNameMasked} · ${linkedSession.documentNumberMasked} · ${linkedSession.checkpointName}` : 'This opened from a verification session, but the local session record was not found.'} Synthetic trails are not live movement history.</p>
      </div>
      {linkedSession && <Link to={`/verifications/${encodeURIComponent(linkedSession.id)}`}>Back to verification</Link>}
    </section>}

    <section className="geopol-toolbar" aria-label="Map controls">
      <div className="geopol-segments" role="group" aria-label="Geospatial analysis mode">
        <button type="button" aria-pressed={mode === 'checkpoint'} onClick={() => setMode('checkpoint')}>View checkpoint</button>
        <button type="button" aria-pressed={mode === 'heatmap'} onClick={() => setMode('heatmap')}>Heatmap analysis</button>
        <button type="button" aria-pressed={mode === 'movement'} onClick={() => setMode('movement')}>Investigate movement</button>
      </div>
      {(mode === 'checkpoint' || mode === 'heatmap') && <label className="geopol-control-label">Checkpoint<select value={selectedCheckpointId} onChange={event => focusCheckpoint(GEOPOL_CHECKPOINTS.find(item => item.id === event.target.value))}>{GEOPOL_CHECKPOINTS.map(checkpoint => <option key={checkpoint.id} value={checkpoint.id}>{checkpoint.name}</option>)}</select></label>}
      {mode === 'heatmap' && <button className="geopol-toggle" type="button" aria-pressed={showHeatmap} onClick={() => setShowHeatmap(value => !value)}><Layers size={15} /> Heatmap {showHeatmap ? 'on' : 'off'}</button>}
      {mode === 'heatmap' && <label className="geopol-control-label">Analysis<select value={metric} onChange={event => setMetric(event.target.value)}>{GEOPOL_METRICS.filter(item => item.id !== 'activity').map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>}
      {mode === 'movement' && <label className="geopol-search-control"><Search size={15} /><input value={verificationId} onChange={event => setVerificationId(event.target.value)} placeholder="Search verification or route" aria-label="Search verification or route" /></label>}
    </section>

    <main className="geopol-workspace">
      <section className="geopol-map-panel">
        <div ref={containerRef} className="geopol-map" />
        <div className="geopol-map-caption"><LocateFixed size={14} /> Demo checkpoint coordinates. No live government feed is connected.</div>
      </section>

      <aside className="geopol-side-panel">
        <section className={`geopol-checkpoint-card ${riskClass(selectedCheckpoint.risk)}`}>
          <span className="geopol-card-label">Selected checkpoint</span>
          <h2>{selectedCheckpoint.name}</h2>
          <p>{selectedCheckpoint.type} · {selectedCheckpoint.state}</p>
          <dl>
            <div><dt>Sessions</dt><dd>{selectedCheckpoint.activity}</dd></div>
            <div><dt>High risk</dt><dd>{selectedCheckpoint.risk}</dd></div>
            <div><dt>Face alerts</dt><dd>{selectedCheckpoint.face}</dd></div>
            <div><dt>CSII alerts</dt><dd>{selectedCheckpoint.csii}</dd></div>
          </dl>
          <footer><Clock3 size={14} /> Last activity {selectedCheckpoint.lastSeen}</footer>
        </section>

        {mode === 'checkpoint' && <section className="geopol-list">
          <span className="geopol-card-label">Checkpoint pressure</span>
          {GEOPOL_CHECKPOINTS.slice().sort((a, b) => b[metric] - a[metric]).slice(0, 6).map(checkpoint => <button type="button" key={checkpoint.id} onClick={() => focusCheckpoint(checkpoint)} className={selectedCheckpoint.id === checkpoint.id ? 'active' : ''}>
            <span><strong>{checkpoint.name}</strong><small>{checkpoint.state}</small></span><b>{checkpoint[metric]}</b>
          </button>)}
        </section>}

        {mode === 'heatmap' && <section className="geopol-heatmap-card">
          <span className="geopol-card-label">Heatmap analysis</span>
          <div className="geopol-heatmap-scroll">
            <div className="geopol-heatmap-grid" aria-label="Verification activity heatmap">
              <div className="geopol-heatmap-main">
                <div className="geopol-heatmap-cells">{heatmapCells.map((cell, index) => <span className={`heatmap-cell heatmap-level-${Math.min(4, Math.floor(cell.value / 20))}`} key={index}>{cell.label}</span>)}</div>
                <div className="geopol-heatmap-months">{heatmapMonths.map((month, index) => <b key={`${month}-${index}`}>{month}</b>)}</div>
              </div>
              <div className="geopol-heatmap-days">{heatmapDays.map(day => <b key={day}>{day}</b>)}</div>
            </div>
          </div>
        </section>}

        {mode === 'movement' && <section className="geopol-trail">
          <span className="geopol-card-label">Movement investigation</span>
          <h2>{activeTrail.subject}</h2>
          <p>{activeTrail.document}</p>
          <span className={`geopol-trail-risk ${String(activeTrail.risk).toLowerCase()}`}>{activeTrail.risk}</span>
          <ol>
            {activeTrail.events.map(event => <li key={event.id}>
              <span>{event.type}</span>
              <strong>{event.name}</strong>
              <small>{event.time} · score {Math.round(event.score * 100)}%</small>
            </li>)}
          </ol>
          <footer><LocateFixed size={14} /> {activeTrail.summary}</footer>
          <div className="geopol-trail-records">
            {filteredTrails.map(trail => <button type="button" key={trail.id} className={trail.id === activeTrail.id ? 'active' : ''} onClick={() => { setSelectedTrailId(trail.id); fitTrail(trail) }}>
              <span><strong>{trail.id}</strong><small>{trail.events.map(event => event.name).join(' -> ')}</small></span>
            </button>)}
            {!filteredTrails.length && <p>No movement records match this search.</p>}
          </div>
        </section>}

      </aside>
    </main>
  </div>
}
