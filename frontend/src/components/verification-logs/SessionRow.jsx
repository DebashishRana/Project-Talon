import React from 'react'

const stageLabels = {
  CLASSIFICATION: 'CLASS',
  OCR: 'OCR',
  MRZ: 'MRZ',
  BIOMETRICS: 'BIO',
  CSII: 'CSII'
}

function initials(name) {
  return String(name || 'Officer').split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase()
}

function displayFaceReference(value) {
  return String(value || '').replace(/^FACE-REF-/, '').slice(0, 8) || 'UNKNOWN'
}

function formatDate(iso) {
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso))
}

function formatTime(iso) {
  return new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(new Date(iso))
}

function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.max(0, Math.round(diff / 60000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.round(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

function pipelineFor(session) {
  const map = new Map((session.pipeline || []).map(item => [item.stage, item]))
  return Object.keys(stageLabels).map(stage => map.get(stage) || { stage, status: 'SKIPPED' })
}

function SessionRow({ session, selected, onSelect, onOpen, onContextMenu }) {
  return (
    <tr
      className={selected ? 'selected' : ''}
      onClick={() => onOpen(session)}
      onContextMenu={event => onContextMenu(event, session)}
    >
      <td className="vl-check-cell" onClick={event => event.stopPropagation()}>
        <input type="checkbox" checked={selected} onChange={() => onSelect(session.id)} aria-label={`Select ${session.id}`} />
      </td>
      <td>
        <div className="vl-session-cell">
          {session.documentFaceBase64 || session.liveFaceBase64
            ? <img className="vl-face-thumb" src={session.documentFaceBase64 || session.liveFaceBase64} alt="Captured face" />
            : <span className="vl-hash">{displayFaceReference(session.faceHash)}...</span>}
          <div>
            <strong>{session.id}</strong>
            <small>{session.subjectNameMasked} · {session.subjectNationality} · <b>{session.documentType.replaceAll('_', ' ')}</b></small>
          </div>
        </div>
      </td>
      <td className="vl-pipeline-cell">
        <div className="vl-pipeline">
          {pipelineFor(session).map(result => (
            <span
              className={`pipe ${String(result.status).toLowerCase()}`}
              key={result.stage}
              title={`${result.stage}: ${result.status}${result.confidence ? `, ${result.confidence}% confidence` : ''}${result.detail ? ` - ${result.detail}` : ''}`}
            >
              {stageLabels[result.stage]}
            </span>
          ))}
        </div>
      </td>
      <td><span className={`vl-pill status ${session.status.toLowerCase()}`}>{session.status.replaceAll('_', ' ')}</span></td>
      <td>
        <span className={`vl-pill risk ${session.riskLevel.toLowerCase()}`}>{session.riskLevel}</span>
        <small className="vl-score">{Number(session.riskScore || 0).toFixed(3)}</small>
      </td>
      <td className="vl-officer-cell">
        <span className="vl-avatar">{initials(session.officerName)}</span>
        <div><strong>{session.officerName}</strong><small>{session.checkpointName}</small></div>
      </td>
      <td title={new Date(session.createdAt).toLocaleString()}>
        <strong className="vl-date">{formatDate(session.createdAt)}</strong>
        <small>{formatTime(session.createdAt)}</small>
        <small>{relativeTime(session.createdAt)}</small>
      </td>
      <td>
        <span className={`vl-csii ${session.csiiStatus.toLowerCase()}`}><i />{session.csiiStatus}</span>
        {session.csiiAnomalyCount > 0 && <small className="vl-anomaly">{session.csiiAnomalyCount} anomalies</small>}
      </td>
    </tr>
  )
}

export default SessionRow
