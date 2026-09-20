import React, { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, FileText, Fingerprint, ImageOff, ScanFace, ShieldCheck, ShieldAlert, UserRound, X } from 'lucide-react'
import DocumentEvidence from './upload/DocumentEvidence'
import { useSessionStore } from '../store/sessionStore'
import './VerificationDetail.css'

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'identity', label: 'ID verification' },
  { id: 'face-match', label: 'Face match' },
  { id: 'forensics', label: 'Forensic screening' }
]

function label(value) {
  return String(value || 'Not available').replaceAll('_', ' ')
}

function stageFor(session, name) {
  return (session.pipeline || []).find(item => item.stage === name) || { stage: name, status: 'NOT_RUN', detail: 'No result was recorded.' }
}

function formatDate(value) {
  if (!value) return 'Not available'
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function statusClass(status) {
  return String(status || 'NOT_RUN').toLowerCase().replaceAll('_', '-')
}

function MediaPanel({ source, label: mediaLabel }) {
  return (
    <figure className="verification-media-panel">
      {source ? <img src={source} alt={mediaLabel} /> : <div className="verification-media-empty"><ImageOff size={28} /><span>Not available</span></div>}
      <figcaption>{mediaLabel}</figcaption>
    </figure>
  )
}

function VerificationDetail() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const session = useSessionStore(state => state.sessions.find(item => item.id === sessionId))

  const analysis = session?.documentAnalysis || {}
  const metadata = analysis.metadata || {}
  const faceScore = Number(session?.faceMatch || 0)
  const faceProvider = session?.faceVerification?.provider === 'aws-rekognition' ? 'AWS Rekognition' : session?.faceVerification?.provider === 'unavailable' ? 'Face service unavailable' : 'Face comparison'
  const faceObservations = session?.faceObservations?.length ? session.faceObservations : [
    { title: 'Document portrait', status: session?.documentFaceBase64 ? 'PASS' : 'REVIEW', detail: session?.documentFaceBase64 ? 'A portrait was isolated from the document.' : 'No document portrait was returned.' },
    { title: 'Live capture', status: session?.liveFaceBase64 ? 'PASS' : 'REVIEW', detail: session?.liveFaceBase64 ? 'A live capture is available for review.' : 'No live capture was recorded.' }
  ]
  const identityFields = useMemo(() => [
    ['Subject', session?.subjectNameMasked],
    ['Nationality', session?.subjectNationality],
    ['Date of birth', session?.subjectDobMasked],
    ['Document number', session?.documentNumberMasked],
    ['Document country', session?.documentCountry],
    ['Document type', label(session?.documentType)]
  ], [session])

  if (!session) return <Navigate to="/verifications" replace />

  const classification = stageFor(session, 'CLASSIFICATION')
  const ocr = stageFor(session, 'OCR')
  const mrz = stageFor(session, 'MRZ')
  const forensics = stageFor(session, 'FORENSICS')
  const biometrics = stageFor(session, 'BIOMETRICS')
  const csii = stageFor(session, 'CSII')

  const selectTab = tabId => {
    setActiveTab(tabId)
    document.getElementById(tabId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <main className="verification-detail-page">
      <header className="verification-detail-header">
        <div className="verification-detail-heading">
          <Link className="verification-back" to="/verifications"><ArrowLeft size={18} /> Verifications</Link>
          <div>
            <p>Verification event</p>
            <h1>{session.id}</h1>
          </div>
        </div>
        <div className="verification-header-actions">
          <span className={`verification-status ${statusClass(session.status)}`}>{label(session.status)}</span>
          <button type="button" className="verification-close" onClick={() => navigate('/verifications')} aria-label="Close event details"><X size={20} /></button>
        </div>
      </header>

      <nav className="verification-detail-tabs" aria-label="Verification sections">
        {tabs.map(tab => <button className={activeTab === tab.id ? 'active' : ''} type="button" key={tab.id} onClick={() => selectTab(tab.id)}>{tab.label}</button>)}
      </nav>

      <section className="verification-overview" id="overview">
        <div className="verification-section-heading">
          <div><p>Case summary</p><h2>{session.subjectNameMasked}</h2></div>
          <span>Recorded {formatDate(session.createdAt)}</span>
        </div>
        <div className="verification-summary-grid">
          <article><span>Subject</span><strong>{session.subjectNameMasked}</strong><small>{session.subjectNationality} / DOB {session.subjectDobMasked}</small></article>
          <article><span>Document</span><strong>{label(session.documentType)}</strong><small>{session.documentCountry} / {session.documentNumberMasked}</small></article>
          <article><span>Decision</span><strong>{label(session.status)}</strong><small>{session.riskLevel} risk / {Number(session.riskScore || 0).toFixed(3)}</small></article>
          <article><span>Officer</span><strong>{session.officerName || 'Not available'}</strong><small>{session.checkpointName || 'Checkpoint not recorded'}</small></article>
        </div>
      </section>

      <section className="verification-section verification-id-section" id="identity">
        <div className="verification-section-heading"><div><p>ID verification</p><h2>Document evidence</h2></div><FileText size={22} /></div>
        <div className="verification-id-layout">
          <dl className="verification-field-grid">
            {identityFields.map(([field, value]) => <div key={field}><dt>{field}</dt><dd>{value || 'Not extracted'}</dd></div>)}
          </dl>
          <div className="verification-id-results">
            <DocumentEvidence analysis={analysis} />
          </div>
        </div>
      </section>

      <section className="verification-section verification-face-section" id="face-match">
        <div className="verification-section-heading"><div><p>Face match</p><h2>Document-to-live comparison</h2></div><Fingerprint size={22} /></div>
        <div className="verification-face-layout">
          <MediaPanel source={session.liveFaceBase64} label="Captured live photo" />
          <div className="verification-face-result">
            <div className="verification-score-block">
              <span>Similarity score</span>
              <strong>{faceScore.toFixed(1)}<small>/100</small></strong>
              <div className="verification-score-track"><i style={{ width: `${Math.min(100, faceScore)}%` }} /></div>
              <p>{faceProvider}</p>
            </div>
            <MediaPanel source={session.documentFaceBase64} label="Extracted document portrait" />
          </div>
        </div>
        <div className="verification-observation-grid">
          {faceObservations.map(item => <article className={statusClass(item.status)} key={item.title}><span><ScanFace size={18} /></span><div><strong>{item.title}</strong><p>{item.detail}</p></div></article>)}
        </div>
        <div className="verification-signal-strip">
          <span className={statusClass(biometrics.status)}><CheckCircle2 size={17} /> {label(biometrics.status)}</span>
          <p>{biometrics.detail || 'No biometric result detail was recorded.'}</p>
        </div>
      </section>

      <section className="verification-section verification-forensics-section" id="forensics">
        <div className="verification-section-heading"><div><p>Forensic screening</p><h2>Evidence layers and monitoring</h2></div><ShieldCheck size={22} /></div>
        <div className="verification-screening-summary">
          <div><span>Tampering analysis</span><strong>{label(analysis.forensics?.status || forensics.status)}</strong><p>{analysis.forensics?.detail || forensics.detail || 'No tampering result was recorded.'}</p></div>
          <div><span>CSII monitoring</span><strong>{label(session.csiiStatus)}</strong><p>{session.csiiAnomalies?.length ? session.csiiAnomalies.join(', ') : 'No CSII anomalies recorded.'}</p></div>
          <div><span>SentinelTrail</span><strong>{session.sentinelCase?.recorded ? 'Recorded' : 'Local session'}</strong><p>{session.sentinelCase?.recorded ? session.sentinelCase.case_reference : session.sentinelCase?.error || 'No remote case reference.'}</p></div>
        </div>
        <div className="verification-layer-list">
          {[classification, ocr, mrz, forensics, biometrics, csii].map(item => <article key={item.stage} className={statusClass(item.status)}><span>{item.stage}</span><strong>{label(item.status)}</strong><p>{item.confidence !== undefined ? `${Number(item.confidence).toFixed(1)}% confidence / ` : ''}{item.detail || 'No detail recorded.'}</p></article>)}
        </div>
        {metadata.extracted_text?.trim() && <details className="verification-ocr-details"><summary>Extracted OCR text</summary><pre>{metadata.extracted_text}</pre></details>}
        {session.notes && <div className="verification-notes"><ShieldAlert size={18} /><p>{session.notes}</p></div>}
      </section>
    </main>
  )
}

export default VerificationDetail
