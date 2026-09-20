import React from 'react'
import StatusBadge from './StatusBadge'
import ActionMenu from './ActionMenu'
import { EmptyState } from './StateMessages'
import { SkeletonRows } from './LoadingSkeleton'
import { actionsForRecord } from '../../utils/dashboardAuthorization'

function formatTime(value) {
  return new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }).format(new Date(value))
}

function SortButton({ label, field, sortBy, sortDirection, onSort }) {
  const active = sortBy === field
  return (
    <button className={active ? 'active' : ''} type="button" onClick={() => onSort(field)}>
      {label}{active ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : ''}
    </button>
  )
}

export default function VerificationTable({
  records,
  loading,
  page,
  totalPages,
  total,
  sortBy,
  sortDirection,
  onSort,
  onPageChange,
  onOpen,
  onAction,
  permissions
}) {
  return (
    <section className="vd-table-card">
      <div className="vd-table-head">
        <div><h2>Recent Verification Records</h2><span>{total} records</span></div>
      </div>
      <div className="vd-table-scroll">
        <table className="vd-table">
          <thead>
            <tr>
              <th>R. No</th>
              <th>User</th>
              <th>Type</th>
              <th><SortButton label="Submitted" field="submittedAt" sortBy={sortBy} sortDirection={sortDirection} onSort={onSort} /></th>
              <th><SortButton label="Match" field="matchScore" sortBy={sortBy} sortDirection={sortDirection} onSort={onSort} /></th>
              <th>Source</th>
              <th><SortButton label="Status" field="status" sortBy={sortBy} sortDirection={sortDirection} onSort={onSort} /></th>
              <th>Review notes</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <SkeletonRows count={8} /> : records.map((record, index) => (
              <tr key={record.id} onClick={() => onOpen(record.id)}>
                <td>#{String((page - 1) * 10 + index + 105).padStart(3, '0')}</td>
                <td><strong>{record.userName}</strong><small>{record.id}</small></td>
                <td>{record.verificationType}</td>
                <td>{formatTime(record.submittedAt)}</td>
                <td>{record.matchScore == null ? 'N/A' : `${Number(record.matchScore).toFixed(1)}%`}</td>
                <td>{record.source}</td>
                <td><StatusBadge status={record.status} /></td>
                <td>{record.reviewNotes || 'No review notes'}</td>
                <td><ActionMenu actions={actionsForRecord(record, permissions)} onAction={action => onAction(action, record)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!loading && records.length === 0 && <EmptyState />}
      <footer className="vd-pagination">
        <span>Page {page} of {totalPages}</span>
        <div>
          <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Previous</button>
          <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Next</button>
        </div>
      </footer>
    </section>
  )
}
