import React, { useState } from 'react'
import { ImageOff, X } from 'lucide-react'
import StatusBadge from './StatusBadge'

function formatDate(value) {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function EvidenceBox({ title, src }) {
  return (
    <figure className="vd-evidence-box">
      {src ? <img src={src} alt={title} /> : <div><ImageOff size={22} /><span>Reserved for backend evidence</span></div>}
      <figcaption>{title}</figcaption>
    </figure>
  )
}

export default function VerificationDetailsPanel({ record, permissions, onClose, onAction }) {
  const [notes, setNotes] = useState(record?.reviewNotes || '')
  if (!record) return null
  return (
    <aside className="vd-details" aria-label="Verification details">
      <div className="vd-details-backdrop" onClick={onClose} />
      <section className="vd-details-panel">
        <header>
          <div>
            <span>Verification details</span>
            <h2>{record.id}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close details"><X size={19} /></button>
        </header>
        <div className="vd-details-grid">
          <article><span>User</span><strong>{record.userName}</strong><small>{record.userId}</small></article>
          <article><span>Submitted</span><strong>{formatDate(record.submittedAt)}</strong><small>{record.source}</small></article>
          <article><span>Verification type</span><strong>{record.verificationType}</strong><small>Session {record.sessionId}</small></article>
          <article><span>Status</span><StatusBadge status={record.status} /><small>Updated {formatDate(record.updatedAt)}</small></article>
          <article><span>Face match</span><strong>{record.matchScore == null ? 'Not available' : `${record.matchScore.toFixed(1)}%`}</strong><small>Backend score field</small></article>
          <article><span>Liveness</span><strong>{record.livenessScore == null ? 'Not available' : `${record.livenessScore.toFixed(1)}%`}</strong><small>{record.livenessStatus}</small></article>
        </div>
        <section className="vd-evidence-grid">
          <EvidenceBox title="Captured selfie" src={record.evidence?.capturedSelfie} />
          <EvidenceBox title="Reference image" src={record.evidence?.referenceImage} />
          <EvidenceBox title="Document image" src={record.evidence?.documentImage} />
        </section>
        <label className="vd-review-notes">
          <span>Review notes</span>
          <textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder="Add notes for manual review" />
        </label>
        <section className="vd-event-history">
          <h3>Verification event history</h3>
          {(record.eventHistory || []).map(event => (
            <div key={event.id}>
              <StatusBadge status={event.status} />
              <span>{event.eventType}</span>
              <small>{formatDate(event.timestamp)}</small>
            </div>
          ))}
        </section>
        <footer>
          {permissions.canFlag && <button type="button" onClick={() => onAction('flag', record, notes)}>Flag</button>}
          {permissions.canReject && <button className="danger" type="button" onClick={() => onAction('reject', record, notes)}>Reject</button>}
          {permissions.canApprove && <button className="primary" type="button" onClick={() => onAction('approve', record, notes)}>Approve</button>}
        </footer>
      </section>
    </aside>
  )
}
