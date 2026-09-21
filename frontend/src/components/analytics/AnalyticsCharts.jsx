import React, { useState } from 'react'
import { CalendarDays, MapPin } from 'lucide-react'
import { INDIA_STATES } from '../../data/checkpoints'

const number = value => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 }).format(value)
const axisNumber = value => new Intl.NumberFormat('en', { maximumFractionDigits: 1, notation: 'compact' }).format(value)

export function TrendChart({ series, field, previousField, label, percent = false, empty = false }) {
  const [activeIndex, setActiveIndex] = useState(null)
  const width = 380
  const left = 12
  const right = 335
  const top = 14
  const bottom = 136
  const maxValue = Math.max(1, ...series.flatMap(item => [item[field], item[previousField]]))
  const max = percent ? Math.max(10, Math.ceil(maxValue / 10) * 10) : Math.max(2, Math.ceil(maxValue / 2) * 2)
  const x = index => left + (index / Math.max(1, series.length - 1)) * (right - left)
  const y = value => bottom - (value / max) * (bottom - top)
  const path = key => series.map((item, index) => `${index ? 'L' : 'M'}${x(index)},${y(item[key])}`).join(' ')
  const tickIndices = [...new Set([0, Math.floor((series.length - 1) / 3), Math.floor((series.length - 1) * 2 / 3), series.length - 1])]
  const active = series[activeIndex]
  const suffix = percent ? '%' : ''
  return <div className="oa-trend" onMouseLeave={() => setActiveIndex(null)}>
    <svg viewBox={`0 0 ${width} 163`} role="img" aria-label={label}>
      <title>{label}</title>
      {[0, 0.5, 1].map(fraction => <g key={fraction}>
        <line x1={left} x2={right} y1={y(max * fraction)} y2={y(max * fraction)} className="oa-grid-line" />
        <text x={right + 8} y={y(max * fraction) + 3} className="oa-axis">{axisNumber(max * fraction)}{suffix}</text>
      </g>)}
      <path d={path(previousField)} className="oa-previous-line" />
      <path d={path(field)} className="oa-current-line" />
      {tickIndices.map(index => <text key={index} x={x(index)} y="158" textAnchor={index === 0 ? 'start' : index === series.length - 1 ? 'end' : 'middle'} className="oa-axis">{series[index]?.label}</text>)}
      {active && <g>
        <line x1={x(activeIndex)} x2={x(activeIndex)} y1={top} y2={bottom} className="oa-crosshair" />
        <circle cx={x(activeIndex)} cy={y(active[field])} r="4" className="oa-chart-dot" />
      </g>}
      {series.map((item, index) => <rect key={item.date + item.label} x={x(index) - (right - left) / Math.max(1, series.length - 1) / 2} y={top} width={(right - left) / Math.max(1, series.length - 1)} height={bottom - top} fill="transparent" tabIndex={0} role="img"
        aria-label={`${item.label}: ${number(item[field])}${suffix}; previous ${number(item[previousField])}${suffix}`}
        onMouseEnter={() => setActiveIndex(index)} onFocus={() => setActiveIndex(index)} onBlur={() => setActiveIndex(null)}>
        <title>{item.label}: {number(item[field])}{suffix}; previous {number(item[previousField])}{suffix}</title>
      </rect>)}
      {empty && <text x="174" y="74" textAnchor="middle" className="oa-chart-empty">No sessions in either period</text>}
    </svg>
    <div className="oa-chart-readout" aria-live="polite">{active ? `${active.label}: ${number(active[field])}${suffix} / previous ${number(active[previousField])}${suffix}` : ' '}</div>
  </div>
}

export function CheckpointChart({ rows, onSelect }) {
  const maximum = Math.max(1, ...rows.map(item => item.total))
  return <article className="oa-panel oa-checkpoint-panel">
    <header className="oa-panel-heading"><h2><MapPin size={16} /> Sessions per checkpoint</h2><span>{rows.length} active</span></header>
    <div className="oa-checkpoint-list">
      {rows.map(row => <button className="oa-checkpoint-row" key={row.id} type="button" onClick={() => onSelect(row.id)} title={`${row.name}: ${row.total} sessions, ${row.verified} verified, ${row.rejected} rejected`}>
        <span className="oa-checkpoint-label"><span>{row.name}<small>{INDIA_STATES.find(state => state.code === row.stateCode)?.name || 'State not recorded'}</small></span><strong>{number(row.total)}</strong></span>
        <span className="oa-bar-track"><span className="oa-bar-total" style={{ width: `${row.total / maximum * 100}%` }}>
          <i className="oa-bar-verified" style={{ width: `${row.verified / row.total * 100}%` }} />
          <i className="oa-bar-rejected" style={{ width: `${row.rejected / row.total * 100}%` }} />
        </span></span>
      </button>)}
      {!rows.length && <div className="oa-panel-empty"><MapPin size={26} /><p>No checkpoint activity in this period.</p></div>}
    </div>
    <footer className="oa-bar-legend"><span><i className="oa-bar-verified" />Verified</span><span><i className="oa-bar-rejected" />Rejected</span><span><i className="oa-bar-other" />Other</span></footer>
  </article>
}

export function UsageHeatmap({ days, onSelectDay }) {
  const [hover, setHover] = useState(null)
  const weeks = Math.max(1, ...days.map(day => day.week + 1))
  const maximum = Math.max(1, ...days.map(day => day.count))
  const months = days.filter((day, index) => index === 0 || day.date.slice(0, 7) !== days[index - 1].date.slice(0, 7))
  return <article className="oa-panel oa-heatmap-panel">
    <header className="oa-panel-heading"><h2><CalendarDays size={16} /> Daily usage</h2><span>{days.filter(day => day.count).length} active days</span></header>
    <div className="oa-heatmap-layout">
      <div className="oa-day-labels">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <span key={day}>{day}</span>)}</div>
      <div className="oa-heatmap-scroll">
        <div className="oa-heatmap-months" style={{ '--weeks': weeks }}>
          {months.map(day => <span key={day.date} style={{ gridColumn: day.week + 1 }}>{new Date(`${day.date}T12:00:00Z`).toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' })}</span>)}
        </div>
        <div className="oa-heatmap" style={{ '--weeks': weeks }} onMouseLeave={() => setHover(null)}>
          {days.map(day => <button type="button" key={day.date} className={`oa-heat-cell intensity-${day.count ? Math.ceil(day.count / maximum * 4) : 0}`}
            style={{ gridColumn: day.week + 1, gridRow: day.weekday + 1 }} title={`${day.date}: ${day.count} sessions`}
            aria-label={`${day.date}: ${day.count} sessions. View this day`} onClick={() => onSelectDay(day.date)} onMouseEnter={() => setHover(day)} onFocus={() => setHover(day)} onBlur={() => setHover(null)} />)}
        </div>
      </div>
    </div>
    <div className="oa-heatmap-readout" aria-live="polite">{hover ? `${hover.date}: ${number(hover.count)} sessions` : `${days.length} calendar ${days.length === 1 ? 'day' : 'days'} in selected period`}</div>
    <footer className="oa-heatmap-legend"><span>Less</span>{[0, 1, 2, 3, 4].map(level => <i className={`intensity-${level}`} key={level} />)}<span>More</span></footer>
  </article>
}
