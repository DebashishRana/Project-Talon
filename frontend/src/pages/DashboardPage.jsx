import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import './DashboardPage.css'
import './DashboardTheme.css'

const metrics = [
  { label: 'Total submissions', value: '1,847', detail: '+12.4%', tone: 'blue' },
  { label: 'Verified count', value: '1,450', detail: '78.5% success', tone: 'green' },
  { label: 'Pending review', value: '397', detail: '21.5% of volume', tone: 'amber' },
  { label: 'Flagged documents', value: '42', detail: '2.3% of volume', tone: 'red' },
  { label: 'Avg. processing', value: '18.4s', detail: '↓ 8.2% faster', tone: 'blue' },
]

const queue = [
  { id: 'VR-24981', name: 'Aadhaar_front_042.pdf', type: 'Aadhaar Card', time: '2 min ago', status: 'In review', tone: 'amber' },
  { id: 'VR-24980', name: 'passport_scan.png', type: 'Passport', time: '7 min ago', status: 'Verified', tone: 'green' },
  { id: 'VR-24979', name: 'pan_card_march.jpg', type: 'PAN Card', time: '11 min ago', status: 'Verified', tone: 'green' },
  { id: 'VR-24978', name: 'license_front.pdf', type: 'Driving License', time: '18 min ago', status: 'Flagged', tone: 'red' },
]

function DashboardPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className={`dashboard-page ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className="dashboard-sidebar">
        <div className="sidebar-tools"><div className="sidebar-search"><span>⌕</span><input placeholder="Search verification ID" /></div><button className="sidebar-toggle" onClick={() => setSidebarCollapsed(value => !value)} aria-label={sidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'}>{sidebarCollapsed ? '›' : '‹'}</button></div>
        <p className="sidebar-label">Workspace</p>
        <Link className="side-link selected" to="/dashboard"><span>◈</span> Overview</Link>
        <Link className="side-link" to="/upload"><span>＋</span> Upload documents <b>NEW</b></Link>
        <Link className="side-link" to="/scan"><span>⌁</span> Verification scanner</Link>
        <Link className="side-link" to="/dashboard"><span>▦</span> Verification logs</Link>
        <p className="sidebar-label">Controls</p>
        <Link className="side-link" to="/dashboard"><span>◒</span> Risk analysis <i>⌄</i></Link>
        <Link className="side-link" to="/dashboard"><span>✓</span> Compliance <i>⌄</i></Link>
        <Link className="side-link" to="/dashboard"><span>▤</span> Reports <b className="count">3</b></Link>
        <div className="sidebar-footer"><span className="secure-icon">◇</span><div><strong>Protected workspace</strong><small>Encrypted processing active</small></div></div>
      </aside>

      <main className="dashboard-main-content">
        <div className="dashboard-heading"><div><p className="eyebrow">OPERATIONS CENTER <span className="live-pill"><i /> LIVE</span></p><h1>Verification overview</h1><p>Monitor document intake, identity checks, and review activity in real time.</p></div><Link className="primary-action" to="/upload"><span>＋</span> Upload document</Link></div>
        <section className="metric-grid">{metrics.map(metric => <article className={`metric-card ${metric.tone}`} key={metric.label}><div className="metric-top"><span>{metric.label}</span><span className="metric-icon">↗</span></div><strong>{metric.value}</strong><small>{metric.detail}</small></article>)}</section>
        <section className="trend-card panel-card"><div className="panel-heading"><div><p className="eyebrow">ACTIVITY SIGNAL</p><h2>Verification trends</h2><strong className="trend-total">1,450 <small>verified</small></strong></div><div className="range-tabs"><button className="active">1D</button><button>1W</button><button>1M</button><button>1Y</button><button>ALL</button></div></div><div className="chart"><div className="chart-y"><span>2,000</span><span>1,500</span><span>1,000</span><span>500</span><span>0</span></div><svg viewBox="0 0 900 230" preserveAspectRatio="none" role="img" aria-label="Verification trend chart"><defs><linearGradient id="fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#3987ff" stopOpacity=".24"/><stop offset="1" stopColor="#3987ff" stopOpacity="0"/></linearGradient></defs><path className="area" d="M0 185 C80 178 110 115 180 134 S285 160 350 92 S445 118 520 88 S640 108 700 64 S820 80 900 32 L900 230 L0 230Z"/><path className="line" d="M0 185 C80 178 110 115 180 134 S285 160 350 92 S445 118 520 88 S640 108 700 64 S820 80 900 32"/></svg><div className="chart-x"><span>00:00</span><span>04:00</span><span>08:00</span><span>12:00</span><span>16:00</span><span>20:00</span><span>24:00</span></div></div></section>
        <div className="dashboard-lower-grid"><section className="panel-card queue-panel"><div className="panel-heading compact"><div><p className="eyebrow">LIVE QUEUE</p><h2>Verification queue</h2></div><button className="ghost-button">Refresh ↻</button></div><div className="table-tools"><button className="filter-chip active">All <span>397</span></button><button className="filter-chip">In review <span>84</span></button><button className="filter-chip">Flagged <span>12</span></button></div><div className="queue-list">{queue.map(item => <div className="queue-row" key={item.id}><div className="doc-symbol">▤</div><div className="queue-file"><strong>{item.name}</strong><small>{item.id} · {item.type}</small></div><span className={`status-badge ${item.tone}`}>{item.status}</span><small className="queue-time">{item.time}</small><span className="row-arrow">›</span></div>)}</div><Link className="table-footer-link" to="/dashboard">View all verification logs <span>→</span></Link></section><section className="panel-card pulse-panel"><div className="panel-heading compact"><div><p className="eyebrow">SYSTEM PULSE</p><h2>Queue health</h2></div><span className="healthy-dot">Healthy</span></div><div className="pulse-score"><strong>94<span>%</span></strong><div><small>Processing capacity</small><div className="score-bar"><i /></div></div></div><div className="pulse-stat"><span>Average processing</span><strong>18.4s <em>↓ 8.2%</em></strong></div><div className="pulse-stat"><span>Flagged this week</span><strong>42 <em className="red-text">↑ 4.1%</em></strong></div><div className="pulse-stat"><span>API availability</span><strong>99.98%</strong></div><Link className="outline-action" to="/scan">Open scanner <span>→</span></Link></section></div>
      </main>
    </div>
  )
}

export default DashboardPage
