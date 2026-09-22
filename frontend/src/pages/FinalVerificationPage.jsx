import React, { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  Bell,
  Check,
  ChevronDown,
  FileText,
  Flag,
  Info,
  MapPinned,
  Network,
  ScanFace,
  ShieldCheck,
  UserCircle,
  X
} from 'lucide-react'
import CSIIGraphDialog from './upload/CSIIGraphDialog'
import { csiiMockResult } from '../data/csiiMockResult'
import { analyzeCsii } from '../utils/csii'
import { sessionStore, useSessionStore } from '../store/sessionStore'
import { useRBACStore } from '../store/rbacStore'
import {
  FLAG_REASONS,
  REJECT_REASONS,
  buildVerificationModel,
  documentTypeLabel,
  extractSubjectFields,
  recordSessionDecision,
  updateCsiiForSession
} from '../services/sessionVerification'
import './FinalVerificationPage.css'

function initials(name) {
  return String(name || 'Officer').split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase()
}

function formatDate(value) {
  if (!value) return 'Not available'
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value))
}

function percent(value) {
  return value == null ? 'N/A' : `${Number(value).toFixed(1)}%`
}

function statusLabel(value) {
  return String(value || 'UNMEASURED').replaceAll('_', ' ')
}

function scoreStatus(score) {
  if (score == null) return 'Pending'
  if (score >= 85) return 'Clear'
  if (score >= 60) return 'Review'
  return 'Alert'
}

function tamperTone(score) {
  if (score == null) return 'pending'
  if (score >= 85) return 'good'
  if (score >= 60) return 'review'
  return 'critical'
}

function readForensicModelScore(forensics, keys) {
  for (const key of keys) {
    const value = forensics?.models?.[key] ?? forensics?.[key]
    if (Number.isFinite(Number(value?.score))) return Number(value.score)
    if (Number.isFinite(Number(value?.confidence))) return Number(value.confidence) <= 1 ? Number(value.confidence) * 100 : Number(value.confidence)
    if (Number.isFinite(Number(value))) return Number(value) <= 1 ? Number(value) * 100 : Number(value)
  }
  return null
}

function DocumentPreview({ source }) {
  if (!source) {
    return <div className="fv-empty-media"><FileText size={24} /><span>Document preview unavailable</span></div>
  }
  if (String(source).startsWith('data:application/pdf')) {
    return <object className="fv-document-object" data={source} type="application/pdf" aria-label="Document front page"><span>PDF preview unavailable</span></object>
  }
  return <img src={source} alt="Document front page" />
}

function CircularScore({ value, label, size = 140, stroke = 12, color = '#2563eb', muted = false, showLabel = true }) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const progress = value == null ? 0 : Math.max(0, Math.min(100, value))
  const dashOffset = circumference - (progress / 100) * circumference
  return (
    <div className={`fv-ring ${muted || value == null ? 'muted' : ''}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e8edf5" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={value == null ? '#cbd5e1' : color}
          strokeLinecap="round"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span><strong>{value == null ? 'N/A' : Math.round(value)}</strong>{showLabel && <small>{label}</small>}</span>
    </div>
  )
}

function SignalCard({ signal }) {
  const [open, setOpen] = useState(false)
  return (
    <article className={`fv-signal ${signal.status.toLowerCase().replaceAll('_', '-')}`}>
      <button type="button" onClick={() => setOpen(value => !value)} aria-expanded={open}>
        <CircularScore value={signal.score} label={signal.label} size={82} stroke={8} color={signal.color} muted={signal.mock} showLabel={false} />
        <span>
          <strong>{signal.label}</strong>
          <small>{signal.mock ? 'Synthetic demo' : signal.source}</small>
        </span>
        <em>{statusLabel(signal.status)}</em>
        <ChevronDown size={16} />
      </button>
      {open && (
        <dl>
          <div><dt>Detail</dt><dd>{signal.detail}</dd></div>
          {signal.trace.map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}
        </dl>
      )}
    </article>
  )
}

function LiveEvidencePanel({ model, session }) {
  return (
    <section className="fv-left-panel">
      <div className="fv-live-card">
        <div className="fv-media-label"><span>LIVE CAPTURE</span><strong>{model.face.provider}</strong></div>
        {model.face.liveFaceBase64 ? <img src={model.face.liveFaceBase64} alt="Live face capture" /> : <div className="fv-empty-media"><ScanFace size={26} /><span>Live capture unavailable</span></div>}
        <div className="fv-stat-chips" aria-label="Capture evidence">
          <span className={model.face.liveFaceBase64 ? 'ok' : 'warn'}>Face {model.face.liveFaceBase64 ? 'captured' : 'missing'}</span>
          <span className="unknown">Lighting not measured</span>
          <span className="unknown">Quality not measured</span>
        </div>
      </div>

      <div className="fv-evidence-grid">
        <article className="fv-small-media">
          <header><span>Document front page</span><strong>{session.documentAnalysis?.filename || documentTypeLabel(session.documentType)}</strong></header>
          <div className="fv-document-preview"><DocumentPreview source={model.documentPreviewBase64} /></div>
        </article>
        <article className="fv-small-media">
          <header><span>Document portrait</span><strong>{model.face.documentFaceBase64 ? 'Extracted' : 'Unavailable'}</strong></header>
          <div className="fv-portrait-preview">{model.face.documentFaceBase64 ? <img src={model.face.documentFaceBase64} alt="Extracted document portrait" /> : <div className="fv-empty-media"><UserCircle size={24} /><span>No portrait crop</span></div>}</div>
        </article>
      </div>

      <ModelScoreCard model={model} />
    </section>
  )
}

function ModelScoreCard({ model }) {
  const forensics = model.session?.documentAnalysis?.forensics || {}
  const models = [
    { label: 'Photo tampering', keys: ['photoTampering', 'photo_tampering', 'photo'], fallback: model.face.similarity },
    { label: 'Text tampering', keys: ['textTampering', 'text_tampering', 'text'], fallback: model.signals.find(signal => signal.id === 'ocr')?.score },
    { label: 'Stamp and material tampering', keys: ['stampMaterialTampering', 'stamp_material_tampering', 'stamp', 'material'], fallback: model.signals.find(signal => signal.id === 'forensic')?.score },
    { label: 'Multiclass tampering', keys: ['multiclassTampering', 'multiclass_tampering', 'multiclass'], fallback: model.overall.score }
  ].map(item => {
    const score = readForensicModelScore(forensics, item.keys) ?? item.fallback ?? null
    return { ...item, score, status: scoreStatus(score), tone: tamperTone(score) }
  })

  return (
    <article className="fv-model-score-card">
      <header>
        <div><span>Model score</span><strong>Document tampering models</strong></div>
        <small>Ready for connected model outputs</small>
      </header>
      <div className="fv-model-bars">
        {models.map(item => (
          <div className={`fv-model-row ${item.tone}`} key={item.label}>
            <span>{item.label}</span>
            <div><i style={{ width: `${Math.max(0, Math.min(100, item.score || 0))}%` }} /></div>
            <strong>{item.score == null ? 'N/A' : Math.round(item.score)}</strong>
            <em>{item.status}</em>
          </div>
        ))}
      </div>
    </article>
  )
}

function OverallCard({ model }) {
  const color = model.overall.tone === 'good' ? '#059669' : model.overall.tone === 'review' ? '#d97706' : model.overall.tone === 'critical' ? '#dc2626' : '#94a3b8'
  return (
    <article className="fv-overall-card">
      <CircularScore value={model.overall.score} label="Score" size={140} stroke={12} color={color} />
      <div>
        <span>Overall verification score</span>
        <h2>{model.overall.label}</h2>
        <p>AI models deignation</p>
        <dl>
          <div><dt>Risk score</dt><dd>{Number(model.risk.score || 0).toFixed(3)} ({model.risk.level})</dd></div>
          <div><dt>Advisory status</dt><dd>{statusLabel(model.risk.advisoryStatus)}</dd></div>
        </dl>
      </div>
    </article>
  )
}

function OcrTextModal({ text, onClose }) {
  useEffect(() => {
    const handleKey = event => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div className="fv-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="fv-modal fv-ocr-modal" role="dialog" aria-modal="true" aria-labelledby="fv-ocr-title" onMouseDown={event => event.stopPropagation()}>
        <header>
          <span id="fv-ocr-title">Detailed OCR text</span>
          <button type="button" aria-label="Close OCR text" onClick={onClose}><X size={18} /></button>
        </header>
        <pre>{text}</pre>
      </section>
    </div>
  )
}

function ExtractedFieldsCard({ model }) {
  const [ocrOpen, setOcrOpen] = useState(false)
  const fieldRows = [
    ['Full name', model.fields.maskedName],
    ['Document type', model.fields.documentType],
    ['Document number', model.fields.maskedDocumentNumber],
    ['Nationality', model.fields.nationality],
    ['Date of birth', model.fields.maskedDob],
    ['Expiry', model.fields.expiry || 'Not extracted'],
    ['Gender', model.fields.gender || 'Not extracted']
  ]
  return (
    <article className="fv-card">
      <header className="fv-card-header"><span><FileText size={17} /> Extracted fields</span><em>Masked</em></header>
      <dl className="fv-field-grid">{fieldRows.map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>
      {model.fields.rawOcrText?.trim() ? <button type="button" className="fv-details-trigger" onClick={() => setOcrOpen(true)}>Detailed OCR text</button> : <p className="fv-muted-line">No detailed OCR text was recorded.</p>}
      {!model.mrz.applicable && <p className="fv-muted-line">MRZ validation is hidden because this document type does not use an MRZ.</p>}
      {ocrOpen && <OcrTextModal text={model.fields.rawOcrText} onClose={() => setOcrOpen(false)} />}
    </article>
  )
}

function MRZValidationCard({ model }) {
  if (!model.mrz.applicable) return null
  const valid = model.mrz.detected && model.mrz.status === 'valid'
  return (
    <article className="fv-card">
      <header className="fv-card-header"><span><FileText size={17} /> MRZ validation</span><em className={valid ? 'good' : 'review'}>{valid ? 'VALID' : statusLabel(model.mrz.status)}</em></header>
      <div className="fv-mrz-grid">
        <div><span>Detected</span><strong>{model.mrz.detected ? 'Yes' : 'No'}</strong></div>
        <div><span>Format</span><strong>{model.mrz.format}</strong></div>
        <div><span>Check digits</span><strong>{valid ? 'Passed' : model.mrz.issues.length ? 'Review' : 'Unmeasured'}</strong></div>
        <div><span>OCR consistency</span><strong>{model.mrz.consistencyKnown ? (model.mrz.ocrConsistency?.visible_to_mrz_match === false ? 'Mismatch' : 'Checked') : 'Not measured'}</strong></div>
      </div>
      {model.mrz.lines.length > 0 && <pre className="fv-mrz-lines">{model.mrz.lines.join('\n')}</pre>}
      {model.mrz.issues.length > 0 && <ul className="fv-issue-list">{model.mrz.issues.map(issue => <li key={issue}>{issue.replaceAll('_', ' ')}</li>)}</ul>}
    </article>
  )
}

function CSIISummaryCard({ model, session, onOpenGraph }) {
  const anomalies = model.csii?.anomalies || []
  return (
    <article className="fv-card fv-csii-card">
      <header className="fv-card-header"><span><Network size={17} /> CSII cross-session intelligence</span><em>DEMO</em></header>
      <p>{model.csii?.summary || 'No real cross-session match has been recorded. A synthetic graph can be opened for workflow review only.'}</p>
      <div className="fv-csii-actions">
        <button type="button" onClick={onOpenGraph}><Network size={16} /> Open CSII graph</button>
        <Link to={`/geopol?identity=${encodeURIComponent(session.id)}`}><MapPinned size={16} /> Open Geo view</Link>
      </div>
      {anomalies.length > 0 ? (
        <ul className="fv-issue-list">{anomalies.slice(0, 3).map(item => <li key={`${item.type}-${item.explanation}`}>{String(item.type || 'ALERT').replaceAll('_', ' ')}: {item.explanation}</li>)}</ul>
      ) : (
        <p className="fv-muted-line">First-session or no-history state. Synthetic CSII is not used for the final confidence score.</p>
      )}
    </article>
  )
}

function DecisionModal({ type, onClose, onSubmit, busy }) {
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const isPass = type === 'pass'
  const isReject = type === 'reject'
  const title = isPass ? 'Pass verification' : isReject ? 'Reject verification' : 'Flag for review'
  const reasons = isReject ? REJECT_REASONS : FLAG_REASONS

  useEffect(() => {
    const handleKey = event => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div className="fv-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="fv-modal" role="dialog" aria-modal="true" aria-labelledby="fv-decision-title" onMouseDown={event => event.stopPropagation()}>
        <header>
          <span id="fv-decision-title">{title}</span>
          <button type="button" aria-label="Close dialog" onClick={onClose}><X size={18} /></button>
        </header>
        {isPass ? (
          <div className="fv-pass-box">
            <ShieldCheck size={28} />
            <div><strong>Confirm officer pass decision</strong><p>The risk evidence remains attached to the session record after approval.</p></div>
          </div>
        ) : (
          <fieldset className="fv-reason-grid">
            <legend>{isReject ? 'Select rejection reason' : 'Select flag reason'}</legend>
            {reasons.map(item => <label key={item.id}><input type="radio" value={item.id} checked={reason === item.id} onChange={() => setReason(item.id)} /><span>{item.label}</span></label>)}
          </fieldset>
        )}
        <label className="fv-notes">Officer notes<textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder={isPass ? 'Optional note for the audit record' : 'Add context for the audit record'} /></label>
        <footer>
          <button type="button" className="fv-secondary-action" onClick={onClose}>Cancel</button>
          <button type="button" className={`fv-primary-action ${type}`} disabled={busy || (!isPass && !reason)} onClick={() => onSubmit({ reason, notes })}>
            {isPass ? <Check size={16} /> : isReject ? <Ban size={16} /> : <Flag size={16} />} {busy ? 'Recording' : title}
          </button>
        </footer>
      </section>
    </div>
  )
}

function BottomActionBar({ disabled, busy, onOpen }) {
  return (
    <nav className="fv-bottom-bar" aria-label="Verification decision actions">
      <button type="button" className="flag" disabled={disabled || busy} onClick={() => onOpen('flag')}><Flag size={17} /> Flag review</button>
      <button type="button" className="reject" disabled={disabled || busy} onClick={() => onOpen('reject')}><Ban size={17} /> Reject</button>
      <button type="button" className="pass" disabled={disabled || busy} onClick={() => onOpen('pass')}><Check size={17} /> Pass verification</button>
    </nav>
  )
}

function FinalVerificationPage({ sessionId: explicitSessionId, embedded = false, onStartAnother }) {
  const params = useParams()
  const navigate = useNavigate()
  const sessionId = explicitSessionId || params.sessionId
  const session = useSessionStore(state => state.sessions.find(item => item.id === sessionId))
  const currentUser = useRBACStore(state => state.users.find(user => user.id === state.currentUserId))
  const currentUserId = useRBACStore(state => state.currentUserId)
  const hasPermission = useRBACStore(state => state.hasPermission)
  const [modal, setModal] = useState(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')
  const [csiiOpen, setCsiiOpen] = useState(false)
  const [csiiLoading, setCsiiLoading] = useState(false)
  const [csiiError, setCsiiError] = useState('')

  const model = useMemo(() => session ? buildVerificationModel(session) : null, [session])
  const canDecide = Boolean(session && hasPermission(currentUserId, 'sessions', 'update') && !['VERIFIED', 'REJECTED'].includes(session.status))
  const graphResult = model?.csii || csiiMockResult

  useEffect(() => {
    if (!session || session.csiiResult || csiiLoading || csiiError) return
    const fields = extractSubjectFields(session.documentAnalysis)
    if (!fields.name && !fields.documentNumber) return
    let cancelled = false
    setCsiiLoading(true)
    analyzeCsii({ fields, documentType: session.documentType, scenario: 'travel_alert' })
      .then(result => {
        if (cancelled) return
        updateCsiiForSession(session.id, result)
      })
      .catch(error => {
        if (!cancelled) setCsiiError(error.message || 'Synthetic CSII graph could not be built.')
      })
      .finally(() => { if (!cancelled) setCsiiLoading(false) })
    return () => { cancelled = true }
  }, [session?.id])

  if (!session) {
    if (embedded) return <Navigate to="/upload/processing" replace />
    return <Navigate to="/verifications" replace state={{ toast: 'Session was not found.' }} />
  }

  const submitDecision = async ({ reason, notes }) => {
    setBusy(true)
    try {
      recordSessionDecision(session.id, modal, { reason, notes, actor: currentUser })
      setToast(modal === 'pass' ? 'Verification passed and audit event recorded.' : modal === 'reject' ? 'Session rejected and audit event recorded.' : 'Session flagged for manual review.')
      setModal(null)
      if (modal === 'pass') window.setTimeout(() => navigate('/verifications'), 1500)
    } catch (error) {
      setToast(error.message || 'Decision could not be recorded.')
    } finally {
      setBusy(false)
    }
  }

  const page = (
    <main className="final-verification-page">
      {toast && <div className="fv-toast" role="status">{toast}<button type="button" onClick={() => setToast('')} aria-label="Dismiss"><X size={14} /></button></div>}
      <header className="fv-topbar">
        <div className="fv-brand">
          <Link to={embedded ? '/upload/processing' : '/verifications'} aria-label="Back"><ArrowLeft size={19} /></Link>
          <div><span>TALON / {session.id}</span><h1>Final verification</h1></div>
        </div>
        <div className="fv-top-actions">
          <button type="button" aria-label="Flag session" onClick={() => setModal('flag')} disabled={!canDecide}><Flag size={18} /></button>
          <button type="button" aria-label="Notifications"><Bell size={18} /></button>
          <span className="fv-user"><b>{initials(currentUser?.fullName || session.officerName)}</b>{currentUser?.fullName || session.officerName}</span>
        </div>
      </header>

      <section className="fv-session-strip">
        <span>Status <strong>{statusLabel(session.status)}</strong></span>
        <span>Checkpoint <strong>{session.checkpointName || 'Not recorded'}</strong></span>
        <span>Recorded <strong>{formatDate(session.createdAt)}</strong></span>
      </section>

      <div className="fv-workspace">
        <LiveEvidencePanel model={model} session={session} />
        <section className="fv-right-panel">
          <OverallCard model={model} />
          <section className="fv-card">
            <header className="fv-card-header"><span><Info size={17} /> Signal breakdown</span></header>
            <div className="fv-signal-grid">{model.signals.map(signal => <SignalCard signal={signal} key={signal.id} />)}</div>
          </section>
          <ExtractedFieldsCard model={model} />
          <MRZValidationCard model={model} />
          <CSIISummaryCard model={model} session={session} onOpenGraph={() => setCsiiOpen(true)} />
        </section>
      </div>

      {embedded && <div className="fv-upload-return"><button type="button" onClick={onStartAnother}>Start another session</button><button type="button" onClick={() => navigate(`/verifications/${encodeURIComponent(session.id)}`)}>Open from verification logs</button></div>}
      {!canDecide && <p className="fv-locked-note"><AlertTriangle size={15} /> Decision actions are locked for this account or this session state.</p>}
      <BottomActionBar disabled={!canDecide} busy={busy} onOpen={setModal} />
      {modal && <DecisionModal type={modal} busy={busy} onClose={() => setModal(null)} onSubmit={submitDecision} />}
      {csiiOpen && <CSIIGraphDialog result={graphResult} loading={csiiLoading} error={csiiError && !model.csii ? `${csiiError} Showing generic synthetic demo graph.` : ''} onClose={() => setCsiiOpen(false)} onScenarioChange={() => {}} />}
    </main>
  )

  return embedded ? page : page
}

export default FinalVerificationPage
