import React from 'react'

const labels = {
  approved: 'Approved',
  pending: 'Pending',
  flagged: 'Flagged',
  rejected: 'Rejected',
  pass: 'Pass',
  fail: 'Fail',
  unknown: 'Unknown'
}

export default function StatusBadge({ status }) {
  const normalized = String(status || 'unknown').toLowerCase()
  return <span className={`vd-status-badge ${normalized}`}>{labels[normalized] || normalized}</span>
}
