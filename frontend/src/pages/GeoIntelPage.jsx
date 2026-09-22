import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { AlertTriangle, ChevronRight, Clock3, Layers, LocateFixed, MapPinned, Route, ShieldCheck } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { GEOPOL_CHECKPOINTS, GEOPOL_METRICS, GEOPOL_TRAILS, checkpointsToFeatureCollection, trailToFeatureCollection } from '../data/geopolDemoData'
import { useSessionStore } from '../store/sessionStore'
import './GeoIntelPage.css'

const indiaBounds = [[66.2, 6.4], [99.6, 37.8]]

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

export default function GeoIntelPage() {
  const [searchParams] = useSearchParams()
  const identityId = searchParams.get('identity')
  const linkedSession = useSessionStore(state => state.sessions.find(item => item.id === identityId))
  const mapRef = useRef(null)
  const containerRef = useRef(null)
  const [metric, setMetric] = useState('risk')
  const [showHeatmap, setShowHeatmap] = useState(true)
  const [selectedCheckpointId, setSelectedCheckpointId] = useState('raxual-icp')
  const [selectedTrailId, setSelectedTrailId] = useState(GEOPOL_TRAILS[0].id)
  const selectedCheckpoint = GEOPOL_CHECKPOINTS.find(item => item.id === selectedCheckpointId) || GEOPOL_CHECKPOINTS[0]
  const selectedTrail = GEOPOL_TRAILS.find(item => item.id === selectedTrailId) || GEOPOL_TRAILS[0]
  const activeMetric = GEOPOL_METRICS.find(item => item.id === metric) || GEOPOL_METRICS[1]
  const totals = useMemo(() => GEOPOL_CHECKPOINTS.reduce((acc, item) => ({
    activity: acc.activity + item.activity,
    risk: acc.risk + item.risk,
    face: acc.face + item.face,
    csii: acc.csii + item.csii
  }), { activity: 0, risk: 0, face: 0, csii: 0 }), [])

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
      map.addSource('trail', { type: 'geojson', data: trailToFeatureCollection(selectedTrail) })

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
        id: 'trail-line',
        type: 'line',
        source: 'trail',
        filter: ['==', ['geometry-type'], 'LineString'],
        paint: { 'line-color': '#111827', 'line-width': 3, 'line-opacity': 0.7, 'line-dasharray': [1.2, 0.8] }
      })
      map.addLayer({
        id: 'trail-points',
        type: 'circle',
        source: 'trail',
        filter: ['==', ['geometry-type'], 'Point'],
        paint: { 'circle-color': '#ffffff', 'circle-radius': 12, 'circle-stroke-color': '#111827', 'circle-stroke-width': 2 }
      })
      map.addLayer({
        id: 'trail-labels',
        type: 'symbol',
        source: 'trail',
        filter: ['==', ['geometry-type'], 'Point'],
        layout: { 'text-field': ['to-string', ['get', 'sequence']], 'text-size': 12, 'text-font': ['Open Sans Bold'] },
        paint: { 'text-color': '#111827' }
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
    if (map.getLayer('checkpoint-heat')) map.setLayoutProperty('checkpoint-heat', 'visibility', showHeatmap ? 'visible' : 'none')
  }, [metric, showHeatmap])

  useEffect(() => {
    const map = mapRef.current
    if (!map?.isStyleLoaded()) return
    map.getSource('trail')?.setData(trailToFeatureCollection(selectedTrail))
    const coordinates = selectedTrail.events.map(event => event.coordinates)
    if (coordinates.length) map.fitBounds(coordinates.reduce((bounds, coord) => bounds.extend(coord), new maplibregl.LngLatBounds(coordinates[0], coordinates[0])), { padding: 92, maxZoom: 6.3, duration: 900 })
  }, [selectedTrail])

  const focusCheckpoint = checkpoint => {
    setSelectedCheckpointId(checkpoint.id)
    mapRef.current?.flyTo({ center: checkpoint.coordinates, zoom: 6.9, duration: 800 })
  }

  return <div className="geopol-page">
    <nav className="geopol-breadcrumb" aria-label="Breadcrumb"><Link to="/dashboard">Overview</Link><ChevronRight size={12} /><span>Geopol</span></nav>
    <header className="geopol-header">
      <div><span className="geopol-kicker"><MapPinned size={15} /> Geospatial intelligence</span><h1>Geopol checkpoint map</h1><p>India checkpoint activity, risk heatmaps, and synthetic subject travel trails for operational review.</p></div>
      <div className="geopol-score"><span>{activeMetric.label}</span><strong>{totals[metric]}</strong><small>{activeMetric.description}</small></div>
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
      <div className="geopol-segments" role="group" aria-label="Heatmap metric">
        {GEOPOL_METRICS.map(item => <button type="button" key={item.id} aria-pressed={metric === item.id} onClick={() => setMetric(item.id)}>{item.label}</button>)}
      </div>
      <button className="geopol-toggle" type="button" aria-pressed={showHeatmap} onClick={() => setShowHeatmap(value => !value)}><Layers size={15} /> Heatmap {showHeatmap ? 'on' : 'off'}</button>
      <label>Travel trail<select value={selectedTrailId} onChange={event => setSelectedTrailId(event.target.value)}>{GEOPOL_TRAILS.map(trail => <option key={trail.id} value={trail.id}>{trail.subject}</option>)}</select></label>
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

        <section className="geopol-list">
          <span className="geopol-card-label">Checkpoint pressure</span>
          {GEOPOL_CHECKPOINTS.slice().sort((a, b) => b[metric] - a[metric]).slice(0, 6).map(checkpoint => <button type="button" key={checkpoint.id} onClick={() => focusCheckpoint(checkpoint)} className={selectedCheckpoint.id === checkpoint.id ? 'active' : ''}>
            <span><strong>{checkpoint.name}</strong><small>{checkpoint.state}</small></span><b>{checkpoint[metric]}</b>
          </button>)}
        </section>

        <section className="geopol-trail">
          <span className="geopol-card-label">Person travel trail</span>
          <h2>{selectedTrail.subject}</h2>
          <p>{selectedTrail.document}</p>
          <div className={`geopol-trail-risk ${selectedTrail.risk.toLowerCase()}`}>{selectedTrail.risk === 'Review' ? <AlertTriangle size={14} /> : <ShieldCheck size={14} />}{selectedTrail.risk}</div>
          <ol>{selectedTrail.events.map(event => <li key={event.id}><span>{event.type}</span><strong>{event.name}</strong><small>{event.time} · match {(event.score * 100).toFixed(0)}%</small></li>)}</ol>
          <footer><Route size={14} /> {selectedTrail.summary}</footer>
        </section>
      </aside>
    </main>
  </div>
}
