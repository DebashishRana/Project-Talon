import React from 'react'

export default function DashboardMetricCard({ title, value, helper, trend, tone = 'blue', loading }) {
  if (loading) return <article className="vd-metric-card loading" aria-label={`${title} loading`}><i /><b /><span /></article>
  const trendValue = Number(trend || 0)
  return (
    <article className={`vd-metric-card ${tone}`}>
      <div className="vd-metric-top">
        <span>{title}</span>
        <b className={trendValue < 0 ? 'down' : 'up'}>{trendValue > 0 ? '+' : ''}{trendValue}%</b>
      </div>
      <strong>{value}</strong>
      <p>{helper}</p>
      <div className="vd-metric-bars" aria-hidden="true">
        {Array.from({ length: 18 }).map((_, index) => <i key={index} style={{ opacity: 0.45 + ((index % 5) * 0.1) }} />)}
      </div>
    </article>
  )
}
