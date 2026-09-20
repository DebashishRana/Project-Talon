import React from 'react'
import { ChartSkeleton } from './LoadingSkeleton'

export default function VerificationChart({ points, loading }) {
  if (loading) return <ChartSkeleton />
  const max = Math.max(1, ...points.map(point => point.total))
  return (
    <div className="vd-chart" role="img" aria-label="Verification volume chart">
      <div className="vd-chart-grid"><span /> <span /> <span /></div>
      <div className="vd-chart-bars">
        {points.length === 0 ? <p>No chart data for this period.</p> : points.map(point => (
          <div className="vd-chart-bar" key={point.period}>
            <span className="flagged" style={{ height: `${Math.max(4, (point.flagged / max) * 100)}%` }} />
            <span className="approved" style={{ height: `${Math.max(5, (point.approved / max) * 100)}%` }} />
            <b style={{ height: `${Math.max(8, (point.total / max) * 100)}%` }} />
            <small>{point.period}</small>
          </div>
        ))}
      </div>
    </div>
  )
}
