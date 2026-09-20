import React from 'react'

export function SkeletonCard() {
  return <div className="vd-skeleton-card" aria-hidden="true"><i /><b /><span /></div>
}

export function SkeletonRows({ count = 6 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <tr className="vd-skeleton-row" key={index}>
          {Array.from({ length: 8 }).map((__, cell) => <td key={cell}><i /></td>)}
        </tr>
      ))}
    </>
  )
}

export function ChartSkeleton() {
  return <div className="vd-chart-skeleton" aria-hidden="true">{Array.from({ length: 10 }).map((_, index) => <i style={{ height: `${24 + (index % 5) * 13}%` }} key={index} />)}</div>
}
