import React, { useEffect, useMemo, useState } from 'react'
import { Activity, ArrowDown, ArrowUp, BarChart3, CheckCircle2, ChevronRight, Download, Info, Plus, RefreshCw, ScanLine, ShieldX, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CheckpointChart, TrendChart, UsageHeatmap } from '../components/analytics/AnalyticsCharts'
import { AddCheckpointForm } from '../components/settings/CheckpointPicker'
import { INDIA_STATES, canManageCheckpoints, getSessionCheckpoint, resolveCheckpoint } from '../data/checkpoints'
import { accessibleSessions, analyticsToCsv, buildAnalytics, indiaDate } from '../services/analyticsService'
import { useCheckpointStore } from '../store/checkpointStore'
import { useRBACStore } from '../store/rbacStore'
import { useSessionStore } from '../store/sessionStore'
import './AnalyticsPage.css'

const format = (value, digits = 1) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: digits }).format(value)
const modelPreview = [
  { name: 'Document classifier', prediction: 'Passport', accuracy: 97.8 },
  { name: 'OCR extraction', prediction: 'Text extracted', accuracy: 95.2 },
  { name: 'MRZ validation', prediction: 'Valid MRZ', accuracy: 99.1 },
  { name: 'Face comparison', prediction: 'Match', accuracy: 96.4 },
  { name: 'Document forensics', prediction: 'Authentic', accuracy: 93.6 }
]

function MetricPanel({ title, icon: Icon, metric, color, description, series, field, previousField, percent, empty, period, unit }) {
  const change = metric.change
  const positive = percent ? change < 0 : change > 0
  const Direction = change < 0 ? ArrowDown : ArrowUp
  return <article className={`oa-panel oa-metric ${color}`}>
    <header className="oa-panel-heading"><h2><Icon size={16} /> {title}</h2><span className="oa-info" tabIndex={0} title={description} aria-label={description}><Info size={14} /></span></header>
    <div className="oa-metric-value"><strong>{format(metric.value)}{percent ? '%' : ''}</strong>
      <span className={`oa-change ${change == null || change === 0 ? 'neutral' : positive ? 'positive' : 'negative'}`} title={percent ? 'Percentage-point change from the preceding period' : 'Percentage change from the preceding period'}>
        {change != null && change !== 0 && <Direction size={16} />}{change == null ? 'No prior sessions' : `${format(Math.abs(change))}${percent ? ' pp' : '%'}`}
      </span>
    </div>
    <p className="oa-metric-unit">{unit}</p>
    <TrendChart series={series} field={field} previousField={previousField} label={`${title} over time`} percent={percent} empty={empty} />
    <footer className="oa-trend-legend"><span title={period.label}><i />Current period</span><span title={period.previousLabel}><i />Previous period</span></footer>
  </article>
}

function ModelPanel() {
  return <article className="oa-panel oa-model-panel">
    <header className="oa-panel-heading"><h2><ScanLine size={16} /> Model predictions</h2><span className="oa-preview-badge">Mockup</span></header>
    <div className="oa-model-table-wrap"><table className="oa-model-table">
      <thead><tr><th scope="col">Model</th><th scope="col">Prediction</th><th scope="col">Accuracy</th></tr></thead>
      <tbody>{modelPreview.map(model => <tr key={model.name}><th scope="row">{model.name}</th><td>{model.prediction}</td><td><strong>{model.accuracy}%</strong><span className="oa-accuracy-track"><i style={{ width: `${model.accuracy}%` }} /></span></td></tr>)}</tbody>
    </table></div>
    <footer className="oa-model-note"><Info size={13} /> Sample values. Not measured model performance.</footer>
  </article>
}

export default function AnalyticsPage() {
  const sessions = useSessionStore(state => state.sessions)
  const checkpoints = useCheckpointStore(state => state.checkpoints)
  const user = useRBACStore(state => state.users.find(item => item.id === state.currentUserId))
  const role = useRBACStore(state => state.roles.find(item => item.id === user?.roleId))
  const [now, setNow] = useState(() => new Date())
  const snapshotTime = useMemo(() => new Date(), [sessions, now])
  const [filters, setFilters] = useState({ range: 'week', stateCode: '', checkpointId: '', from: '', to: '' })
  const [addingCheckpoint, setAddingCheckpoint] = useState(false)
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000)
    return () => window.clearInterval(timer)
  }, [])
  const update = patch => setFilters(current => ({ ...current, ...patch }))
  const data = useMemo(() => buildAnalytics({ sessions, checkpoints, user, role, now: snapshotTime, ...filters }), [sessions, checkpoints, user, role, snapshotTime, filters])
  const allowedCheckpoints = useMemo(() => {
    const visibleSessions = accessibleSessions(sessions, user, role, checkpoints)
    const locations = new Map()
    const broadAccess = ['all', 'organization'].includes(role?.dataScope) || role?.id === 'super_admin'
    const assigned = resolveCheckpoint(user?.checkpointId, checkpoints)
    const base = broadAccess ? checkpoints : assigned ? [assigned] : []
    base.forEach(item => locations.set(item.id, item))
    visibleSessions.forEach(session => { const item = getSessionCheckpoint(session, checkpoints); if (!locations.has(item.id)) locations.set(item.id, item) })
    return [...locations.values()].filter(item => !filters.stateCode || item.stateCode === filters.stateCode).sort((a, b) => a.name.localeCompare(b.name))
  }, [sessions, user, role, checkpoints, filters.stateCode])
  const stateName = INDIA_STATES.find(state => state.code === filters.stateCode)?.name || 'All states'
  const checkpointName = allowedCheckpoints.find(item => item.id === filters.checkpointId)?.name || 'All checkpoints'
  const exportReport = () => {
    const csv = analyticsToCsv(data, { stateName, checkpointName })
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `talon-analytics-${data.period.start}-${data.period.end}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const clearFilters = () => setFilters({ range: 'week', stateCode: '', checkpointId: '', from: '', to: '' })
  const selectRange = range => update(range === 'custom' ? { range, from: filters.from || data.period?.start || indiaDate(now), to: filters.to || indiaDate(now) } : { range })
  const empty = !data.error && !data.totals.total && !data.previousTotals.total
  const activeFilters = filters.stateCode || filters.checkpointId || filters.range !== 'week'

  return <div className="operational-analytics">
    <nav className="oa-breadcrumb" aria-label="Breadcrumb"><Link to="/dashboard">Overview</Link><ChevronRight size={12} /><span>Analytics</span></nav>
    <header className="oa-page-header">
      <div><h1>Operational analytics</h1><p>Verification activity and checkpoint performance</p></div>
      <div className="oa-header-actions">
        {canManageCheckpoints(user, role) && <button className="oa-button" type="button" onClick={() => setAddingCheckpoint(value => !value)} aria-expanded={addingCheckpoint}><Plus size={15} /> Add checkpoint</button>}
        <button className="oa-icon-button" type="button" onClick={() => setNow(new Date())} title="Refresh analytics" aria-label="Refresh analytics"><RefreshCw size={16} /></button>
        <button className="oa-button oa-primary" type="button" onClick={exportReport} disabled={Boolean(data.error)}><Download size={15} /> Export</button>
      </div>
    </header>
    {addingCheckpoint && <section className="oa-create-checkpoint" aria-label="Add checkpoint">
      <h2>New checkpoint</h2><AddCheckpointForm initialStateCode={filters.stateCode} onCancel={() => setAddingCheckpoint(false)} onCreated={checkpoint => { setAddingCheckpoint(false); update({ stateCode: checkpoint.stateCode, checkpointId: checkpoint.id }) }} />
    </section>}
    <section className="oa-toolbar" aria-label="Analytics filters">
      <div className="oa-location-filters">
        <label>State<select value={filters.stateCode} onChange={event => update({ stateCode: event.target.value, checkpointId: '' })}>
          <option value="">All states</option>{INDIA_STATES.map(state => <option key={state.code} value={state.code}>{state.name} - {state.capital}</option>)}
        </select></label>
        <label>Checkpoint<select value={filters.checkpointId} onChange={event => update({ checkpointId: event.target.value })}>
          <option value="">All checkpoints</option>{allowedCheckpoints.map(checkpoint => <option value={checkpoint.id} key={checkpoint.id}>{checkpoint.name}</option>)}
        </select></label>
      </div>
      <div className="oa-range-filter"><span>Time period</span><div className="oa-range-segments" role="group" aria-label="Time period">
        {['day', 'week', 'month', 'year', 'custom'].map(range => <button type="button" key={range} aria-pressed={filters.range === range} onClick={() => selectRange(range)}>{range[0].toUpperCase() + range.slice(1)}</button>)}
      </div></div>
      {filters.range === 'custom' && <div className="oa-custom-dates">
        <label>From<input aria-label="From date" type="date" value={filters.from} max={filters.to || indiaDate(now)} onChange={event => update({ from: event.target.value })} /></label>
        <label>To<input aria-label="To date" type="date" value={filters.to} min={filters.from} max={indiaDate(now)} onChange={event => update({ to: event.target.value })} /></label>
      </div>}
    </section>
    {data.error ? <div className="oa-error" role="alert"><Info size={17} />{data.error}</div> : <>
      <div className="oa-period-summary"><span>{data.period.label} <b>IST</b></span><span>Compared with {data.period.previousLabel}</span>{activeFilters && <button type="button" onClick={clearFilters}><X size={13} /> Reset filters</button>}</div>
      {!data.totals.total && <div className="oa-empty-notice" role="status"><Activity size={17} /><span>No recorded sessions match this period and location.</span></div>}
      <div className="oa-metric-grid">
        <MetricPanel title="Total sessions" icon={BarChart3} metric={data.metrics.total} color="blue" description="All unique recorded verification sessions created during the selected period." unit={`${format(data.totals.pending, 0)} awaiting a decision`} series={data.series} field="total" previousField="previousTotal" empty={empty} period={data.period} />
        <MetricPanel title="Avg. positive cases" icon={CheckCircle2} metric={data.metrics.positive} color="green" description="Verified sessions divided by all calendar days in the selected period, including zero-session days." unit={`${format(data.totals.verified, 0)} verified / ${data.period.dayCount} days; ${data.period.bucketUnit === 'hour' ? 'hourly' : 'daily average'} trend`} series={data.series} field="positive" previousField="previousPositive" empty={empty} period={data.period} />
        <MetricPanel title="Avg. rejection percentage" icon={ShieldX} metric={data.metrics.rejection} color="rose" description="Rejected sessions divided by all sessions in the selected period. Pending and cancelled sessions are not counted as rejections." unit={`${format(data.totals.rejected, 0)} rejected of ${format(data.totals.total, 0)} sessions`} series={data.series} field="rejection" previousField="previousRejection" percent empty={empty} period={data.period} />
      </div>
      <div className="oa-detail-grid"><ModelPanel /><CheckpointChart rows={data.checkpointSeries} onSelect={checkpointId => update({ checkpointId })} /><UsageHeatmap days={data.heatmap} onSelectDay={date => update({ range: 'custom', from: date, to: date })} /></div>
      {data.unmappedCount > 0 && <p className="oa-data-note"><Info size={14} />{data.unmappedCount} sessions have no mapped state and appear only under All states.</p>}
    </>}
    <footer className="oa-page-footer"><span><i />Recorded sessions in this browser</span><span>Checked {snapshotTime.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })} IST</span></footer>
  </div>
}
