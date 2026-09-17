import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import './DashboardPage.css'
import './DashboardTheme.css'
import './HeatmapTheme.css'
import './RiskChartTheme.css'

const metrics = [
  { label: "ID's verefied today ", value: '12', detail: 'Compared to last week', tone: 'green' },
  { label: 'Pending Cases', value: '43', detail: '+8% Compared to last week ', tone: 'amber'  },
  { label: 'Flagged Sessions', value: '12', detail: '+12% compred to last month', tone: 'red' },
  { label: 'CSII Anomalies ', value: '8', detail: '-3% compared to last week', tone: 'red',  },
]

const todaysSessions = [
  ['S-5004', '08:00', 'Raxaul', 'Indian Passport', 'Processing', 'LOW', 'Omkar Singh'],
  ['S-5003', '09:30', 'Jhulaghat', 'Aadhaar + Visa', 'Flagged', 'HIGH', 'Meera Kulkarni'],
  ['S-5001', '11:15', 'Raxaul', 'Indian Passport', 'Verified', 'LOW', 'Omkar Singh'],
]

const flaggedSessions = [
  ['S-4998', '14:30', 'Raxaul → Delhi', 'Passport J1234567', 'CRITICAL', 'HIGH', 'Riya Sharma'],
  ['S-4995', '09:45', 'Jhulaghat → Haldwani', 'Aadhaar Mismatch', 'Identity Hopping', 'CRITICAL', 'Arjun Kumar'],
  ['S-4990', '16:00', 'Raxaul', 'Visa US-B1-5678', 'Tampered', 'HIGH', 'Omkar Singh'],
  ['S-4986', '16:00', 'Raxaul', 'Passport K9876543', 'Verified', 'LOW', 'Meera Kulkarni'],
]

const flaggedCasesByMonth = [
  [0, 1, 2, 0, 1, 3, 2, 1, 0, 2, 1, 3],
  [1, 4, 3, 2, 4, 5, 3, 2, 1, 4, 3, 2],
  [2, 5, 4, 6, 5, 7, 4, 5, 3, 6, 5, 4],
  [4, 3, 5, 4, 6, 5, 7, 6, 5, 4, 6, 3],
  [1, 2, 3, 1, 2, 4, 3, 2, 1, 3, 2, 4],
]

const heatmapMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const heatmapDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const heatmapMonthDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

const verificationSummary = [
  { label: 'Sessions screened', value: '323', change: '+16%', tone: 'blue' },
  { label: 'Accepted', value: '234', change: '+79%', tone: 'green' },
  { label: 'Flagged', value: '404', change: '-36%', tone: 'red' },
  { label: 'Verified', value: '342', change: '+23%', tone: 'green' },
  { label: 'Anomalies', value: '323', change: '+16%', tone: 'amber' },
]

// The three values form the layered bars: capacity/baseline, observed trend,
// and the confirmed detection rate. Keeping them together makes the chart
// readable instead of treating the blue bars as unrelated columns.
const weeklyRiskDetection = [
  { day: 'Mon', baseline: 80, observed: 64, detected: 43 },
  { day: 'Tue', baseline: 89, observed: 72, detected: 40 },
  { day: 'Wed', baseline: 97, observed: 92, detected: 24 },
  { day: 'Thu', baseline: 71, observed: 67, detected: 47 },
  { day: 'Fri', baseline: 87, observed: 86, detected: 77 },
  { day: 'Sat', baseline: 100, observed: 96, detected: 57 },
  { day: 'Sun', baseline: 87, observed: 76, detected: 30 },
]

function SessionTable({ rows, flagged = false }) {
  return (
    <div className="shipment-table">
      <div className="shipment-row shipment-header">
        <span>Session</span>
        <span>Time</span>
        <span>{flagged ? 'Route' : 'Checkpoint'}</span>
        <span>Document</span>
        <span>{flagged ? 'Anomaly Type' : 'Status'}</span>
        <span>{flagged ? 'Severity' : 'Risk'}</span>
        <span>Officer</span>
      </div>
      {rows.map((row) => (
        <div className="shipment-row" key={row[0]}>
          <span className="shipment-id">
            <i className={`row-dot ${flagged ? row[5] : row[5]}`} />
            {row[0]}
          </span>
          <span>{row[1]}</span>
          <span>{row[2]}</span>
          <span>{row[3]}</span>
          {flagged ? (
            <span><b className={`status-badge ${row[4] === 'Verified' ? 'green' : row[4] === 'Tampered' ? 'red' : 'amber'}`}>{row[4]}</b></span>
          ) : (
            <span><b className={`status-badge ${row[4] === 'Verified' ? 'green' : row[4] === 'Flagged' ? 'red' : 'blue'}`}>{row[4]}</b></span>
          )}
          <span><b className={`status-badge ${row[5] === 'CRITICAL' ? 'red' : row[5] === 'HIGH' ? 'amber' : 'green'}`}>{row[5]}</b></span>
          <span className="officer-name">{row[6]}</span>
        </div>
      ))}
    </div>
  )
}

function DashboardPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sessionTab, setSessionTab] = useState('today')
  const [heatmapPeriod, setHeatmapPeriod] = useState('year')

  return (
    <div className={`dashboard-page ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className="dashboard-sidebar">
        <div className="sidebar-tools">
          <div className="sidebar-search"><span>⌕</span><input placeholder="Search by session ID" /></div>
          <button className="sidebar-toggle" onClick={() => setSidebarCollapsed(v => !v)} aria-label={sidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'}>
            {sidebarCollapsed ? '›' : '‹'}
          </button>
        </div>

        <p className="sidebar-label">Workspace</p>
        <Link className="side-link selected" to="/dashboard"><span>◈</span> Overview</Link>
        <Link className="side-link" to="/upload"><span>＋</span> Start new session</Link>
        <Link className="side-link" to="/dashboard"><span>▦</span> Batch processing</Link>
        <Link className="side-link" to="/dashboard"><span>◌</span> Flagged cases</Link>
        <Link className="side-link" to="/verifications"><span>▤</span> Verification logs</Link>

        <p className="sidebar-label">Intelligence</p>
        <Link className="side-link" to="/dashboard"><span>⬡</span> CSII Graph</Link>
        <Link className="side-link" to="/dashboard"><span>✧</span> Anomaly explorer <b className="count">7</b></Link>
        <Link className="side-link" to="/dashboard"><span>✦</span> Ask Sarvam</Link>

        <p className="sidebar-label">Controls</p>
        <Link className="side-link" to="/dashboard"><span>◒</span> Risk analysis <i>⌄</i></Link>
        <Link className="side-link" to="/dashboard"><span>✓</span> Compliance <i>⌄</i></Link>
        <Link className="side-link" to="/dashboard"><span>▤</span> Reports <b className="count">3</b></Link>

        <div className="sidebar-footer">
          <span className="secure-icon">◇</span>
          <div><strong>Protected workspace</strong><small>Encrypted processing active</small></div>
        </div>
      </aside>

      <main className="dashboard-main-content">
        <header className="dashboard-heading">
          <div>
            <p className="dashboard-kicker">OPERATIONS CENTER</p>
            <h1>Dashboard</h1>
            <p className="dashboard-subtitle">Border screening activity and identity intelligence at a glance.</p>
          </div>
          <button className="dashboard-notification" aria-label="Notifications">♧<b>2</b></button>
        </header>

        <section className="metric-grid">
          {metrics.map(metric => (
            <article className={`metric-card ${metric.tone}`} key={metric.label}>
              <div className="metric-top">
                <span className="metric-icon">{metric.icon}</span>
                <span>{metric.label}</span>
                <small>30-day ↗</small>
              </div>
              <strong>{metric.value}</strong>
              {metric.detail && <b className="metric-change">{metric.detail}</b>}
            </article>
          ))}
        </section>

        <section className="alert-grid">
          <article className="alert-card red">
            <span className="alert-icon">▣</span>
            <div>
              <strong>SESSION-20260914: CRITICAL risk detected</strong>
              <small>Identity hopping + impossible travel · Raxaul checkpoint</small>
            </div>
            <span className="alert-arrow">↗</span>
          </article>
          <article className="alert-card blue">
            <span className="alert-icon">▣</span>
            <div>
              <strong>Model v2.3 deployed: accuracy improvement</strong>
              <small>Few-shot adaptation layer updated · 5 new visa patterns</small>
            </div>
            <span className="alert-arrow">↗</span>
          </article>
        </section>

        <div className="dashboard-content-grid">
          <div className="dashboard-main-column">
            <section className="panel-card shipments-panel">
              <div className="panel-heading compact">
                <div className="shipment-tabs">
                  <button className={sessionTab === 'today' ? 'active' : ''} onClick={() => setSessionTab('today')}>Today's</button>
                  <button className={sessionTab === 'flagged' ? 'active' : ''} onClick={() => setSessionTab('flagged')}>Flagged</button>
                </div>
                <button className="panel-link">View all</button>
              </div>
              {sessionTab === 'today'
                ? <SessionTable rows={todaysSessions} />
                : <SessionTable rows={flaggedSessions} flagged />}
            </section>

            <section className="panel-card shipments-panel latest-panel">
              <div className="panel-heading compact">
                <h2>Latest Verifications</h2>
                <button className="panel-link">View all</button>
              </div>
              <SessionTable rows={flaggedSessions} flagged />
              <div className="summary-section">
                <h3>Overall cases</h3>
                <div className="summary-metrics" aria-label="Verification summary">
                  {verificationSummary.map(item => (
                    <div className="summary-metric" key={item.label}>
                      <span className={`summary-icon ${item.tone}`}>◌</span>
                      <small>{item.label}</small>
                      <strong>{item.value}</strong>
                      <b className={item.tone}>{item.change}</b>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          <aside className="dashboard-side-column">
            <section className="panel-card profitability-panel">
              <div className="panel-heading compact">
                <h2>Risk &amp; Detection</h2>
                <button className="panel-link">More</button>
              </div>
              <div className="bar-chart" role="img" aria-label="Risk and detection trend for Monday through Sunday">
                {weeklyRiskDetection.map(({ day, baseline, observed, detected }) => (
                  <div className="bar-group" key={day} aria-label={`${day}: ${detected}% confirmed detection, ${observed}% observed trend, ${baseline}% baseline`}>
                    <div className="bar-track">
                      <span className="bar-total" style={{ height: `${baseline}%` }} />
                      <i className="bar-secondary" style={{ height: `${observed}%` }} />
                      <i className="bar-primary" style={{ height: `${detected}%` }} />
                    </div>
                    <span>{day}</span>
                  </div>
                ))}
              </div>
              <div className="profit-stats">
                <div><strong>94.2%</strong><small>Detection Accuracy</small></div>
                <div><strong>1.8%</strong><small>False Positive Rate</small></div>
                <div><strong>0.4%</strong><small>False Negative Rate</small></div>
              </div>
              <div className="legend">
                <span><i className="legend-profit" /> Detection rate</span>
                <span><i className="legend-cost" /> Baseline</span>
                <small>This week⌄</small>
              </div>
            </section>

            <section className="panel-card heatmap-panel">
              <div className="panel-heading compact">
                <h2>Flagged Cases Heatmap</h2>
                <select className="heatmap-period" value={heatmapPeriod} onChange={event => setHeatmapPeriod(event.target.value)} aria-label="Heatmap period">
                  <option value="year">This year</option>
                  {heatmapMonths.map(month => <option value={month} key={month}>{month} 2026</option>)}
                </select>
              </div>
              <div className="heatmap flagged-cases-heatmap">
                {heatmapPeriod === 'year' ? <>
                  <div className="heatmap-months"><span />{heatmapMonths.map(month => <span key={month}>{month}</span>)}</div>
                  {flaggedCasesByMonth.map((week, weekIndex) => (
                    <div className="heatmap-row" key={heatmapDays[weekIndex]}>
                      <span>{heatmapDays[weekIndex]}</span>
                      {week.map((count, monthIndex) => <i className={`heat-cell level-${count}`} key={`${weekIndex}-${monthIndex}`} title={`${heatmapMonths[monthIndex]} 2026: ${count} flagged cases`} />)}
                    </div>
                  ))}
                </> : <>
                  <div className="heatmap-months daily-head"><span />{Array.from({ length: 7 }, (_, index) => <span key={index}>{index + 1}</span>)}</div>
                  {heatmapMonthDays.map((day, dayIndex) => (
                    <div className="heatmap-row daily-row" key={day}>
                      <span>{day}</span>
                      {Array.from({ length: 7 }, (_, index) => {
                        const count = (dayIndex * 3 + index * 2 + heatmapMonths.indexOf(heatmapPeriod)) % 8
                        return <i className={`heat-cell level-${count}`} key={`${dayIndex}-${index}`} title={`${heatmapPeriod} 2026, ${day} ${index + 1}: ${count} flagged cases`} />
                      })}
                    </div>
                  ))}
                </>}
              </div>
              <div className="heatmap-scale"><span>Fewer</span><i className="heat-legend level-0" /><i className="heat-legend level-2" /><i className="heat-legend level-4" /><i className="heat-legend level-6" /><i className="heat-legend level-7" /><span>More</span></div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  )
}

export default DashboardPage
